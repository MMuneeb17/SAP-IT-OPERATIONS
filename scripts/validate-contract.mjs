import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const array = value => value == null ? [] : Array.isArray(value) ? value : [value];
const guid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
export const domains = {
  Tickets: { Status: ['NEW', 'SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'], Priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
  Assets: { Status: ['RECEIVED', 'TAGGED', 'AVAILABLE', 'ASSIGNED', 'IN_REPAIR', 'RETIRED', 'DISPOSED'] },
  AssetRepairs: { Status: ['OPEN', 'COMPLETED'] },
  Materials: { UnitOfMeasure: ['EA', 'M'] },
  Reservations: { Status: ['OPEN', 'PARTIAL', 'FULFILLED', 'CANCELLED'] },
  StockTransactions: { MovementType: ['RECEIVE', 'RESERVE', 'ISSUE', 'CANCEL', 'RETURN', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUST'] }
};

export function loadContract() {
  const metadata = fs.readFileSync(path.join(root, 'mock/metadata.xml'), 'utf8');
  assert.equal(XMLValidator.validate(metadata), true, 'EDMX must be well-formed XML');
  const document = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', removeNSPrefix: true }).parse(metadata);
  assert.equal(document.Edmx.Version, '4.0');
  const schema = document.Edmx.DataServices.Schema;
  assert.equal(schema.Namespace, 'ITOperations');
  const types = Object.fromEntries(array(schema.EntityType).map(type => [type.Name, {
    name: type.Name,
    keys: array(type.Key?.PropertyRef).map(key => key.Name),
    properties: array(type.Property),
    navigation: array(type.NavigationProperty).map(nav => ({ ...nav, constraints: array(nav.ReferentialConstraint), collection: nav.Type.startsWith('Collection('), type: nav.Type.replace(/^Collection\(|\)$/g, '').split('.').at(-1) }))
  }]));
  const sets = Object.fromEntries(array(schema.EntityContainer.EntitySet).map(set => [set.Name, {
    name: set.Name, type: types[set.EntityType.split('.').at(-1)], bindings: array(set.NavigationPropertyBinding),
    rows: JSON.parse(fs.readFileSync(path.join(root, `mock/data/${set.Name}.json`), 'utf8'))
  }]));
  return { root, metadata, types, sets };
}

export function relatedRows(contract, set, row, nav) {
  const binding = set.bindings.find(item => item.Path === nav.Name);
  assert.ok(binding, `${set.name}.${nav.Name}: missing entity-set binding`);
  const target = contract.sets[binding.Target];
  assert.ok(target, `${set.name}.${nav.Name}: unknown target ${binding.Target}`);
  if (nav.constraints.length) {
    return target.rows.filter(candidate => nav.constraints.every(constraint => row[constraint.Property] != null && row[constraint.Property] === candidate[constraint.ReferencedProperty]));
  }
  const partner = target.type.navigation.find(item => item.Name === nav.Partner);
  assert.ok(partner?.constraints.length, `${set.name}.${nav.Name}: missing inverse constraints`);
  return target.rows.filter(candidate => partner.constraints.every(constraint => candidate[constraint.Property] === row[constraint.ReferencedProperty]));
}

export function validateContract(contract = loadContract()) {
  const { sets, metadata } = contract;
  assert.deepEqual(Object.keys(sets).sort(), ['AssetAssignments', 'AssetHistory', 'AssetRepairs', 'Assets', 'Employees', 'Materials', 'Reservations', 'StockTransactions', 'Stocks', 'TicketComments', 'TicketHistory', 'Tickets']);
  const businessKeys = { Employees: 'EmployeeNumber', Tickets: 'TicketNumber', Assets: 'AssetTag', Materials: 'MaterialNumber' };
  for (const set of Object.values(sets)) {
    assert.ok(set.type, `${set.name}: missing entity type`);
    assert.ok(set.rows.length > 0, `${set.name}: expected realistic data`);
    assert.equal(set.type.keys.length, 1, `${set.name}: expected single UUID key`);
    const seen = new Set();
    const businessSeen = new Set();
    const key = set.type.keys[0];
    assert.equal(set.type.properties.find(property => property.Name === key)?.Type, 'Edm.Guid');
    for (const row of set.rows) {
      const label = `${set.name}(${row[key]})`;
      assert.ok(!seen.has(row[key]), `${label}: duplicate primary key`);
      seen.add(row[key]);
      assert.ok(guid.test(row[key]), `${label}: invalid UUID key`);
      for (const field of Object.keys(row)) assert.ok(set.type.properties.some(property => property.Name === field), `${label}.${field}: undeclared field`);
      for (const property of set.type.properties) {
        const value = row[property.Name];
        const field = `${label}.${property.Name}`;
        assert.ok(Object.hasOwn(row, property.Name), `${field}: fixture must explicitly provide a value or null`);
        if (value == null) {
          assert.notEqual(property.Nullable, 'false', `${field}: required field is null`);
          continue;
        }
        switch (property.Type) {
          case 'Edm.Guid': assert.ok(typeof value === 'string' && guid.test(value), `${field}: invalid UUID`); break;
          case 'Edm.String':
            assert.equal(typeof value, 'string', `${field}: expected string`);
            if (property.MaxLength && property.MaxLength !== 'max') assert.ok(value.length <= Number(property.MaxLength), `${field}: exceeds MaxLength`);
            break;
          case 'Edm.Boolean': assert.equal(typeof value, 'boolean', `${field}: expected boolean`); break;
          case 'Edm.Decimal': assert.ok(/^-?\d{1,12}(\.\d{1,3})?$/.test(String(value)), `${field}: invalid decimal quantity`); break;
          case 'Edm.Int16': case 'Edm.Int32': case 'Edm.Byte': {
            const bounds = { 'Edm.Byte': [0, 255], 'Edm.Int16': [-32768, 32767], 'Edm.Int32': [-2147483648, 2147483647] }[property.Type];
            assert.ok(Number.isInteger(value) && value >= bounds[0] && value <= bounds[1], `${field}: invalid integer`); break;
          }
          case 'Edm.Date':
            assert.ok(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, `${field}: invalid date`); break;
          case 'Edm.DateTimeOffset':
            assert.ok(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)), `${field}: invalid timestamp`); break;
          default: assert.fail(`${field}: add validation for ${property.Type}`);
        }
        if (domains[set.name]?.[property.Name]) assert.ok(domains[set.name][property.Name].includes(value), `${field}: unknown domain value ${value}`);
      }
      const businessKey = businessKeys[set.name];
      if (businessKey) {
        assert.ok(row[businessKey]?.trim(), `${label}: blank business identifier`);
        assert.ok(!businessSeen.has(row[businessKey]), `${label}: duplicate ${businessKey}`);
        businessSeen.add(row[businessKey]);
      }
      for (const nav of set.type.navigation) {
        const target = sets[set.bindings.find(binding => binding.Path === nav.Name)?.Target];
        assert.ok(target && target.type.name === nav.type, `${label}.${nav.Name}: invalid target type`);
        const partner = target.type.navigation.find(item => item.Name === nav.Partner);
        if (nav.Partner) assert.ok(partner && partner.Partner === nav.Name && partner.type === set.type.name, `${label}.${nav.Name}: invalid partner`);
        for (const constraint of nav.constraints) {
          assert.ok(set.type.properties.some(property => property.Name === constraint.Property), `${label}.${nav.Name}: unknown FK field`);
          assert.ok(target.type.keys.includes(constraint.ReferencedProperty), `${label}.${nav.Name}: FK must reference target key`);
        }
        const related = relatedRows(contract, set, row, nav);
        if (!nav.collection && nav.constraints.every(constraint => row[constraint.Property] != null)) assert.equal(related.length, 1, `${label}.${nav.Name}: dangling foreign key`);
        if (!nav.collection && nav.Nullable === 'false') assert.equal(related.length, 1, `${label}.${nav.Name}: missing required navigation`);
      }
      if (set.name === 'Tickets' && ['RESOLVED', 'CLOSED'].includes(row.Status)) assert.ok(row.Resolution?.trim(), `${label}: resolved tickets need resolution notes`);
      if (row.CreatedAt && row.LastChangedAt) assert.ok(Date.parse(row.CreatedAt) <= Date.parse(row.LastChangedAt), `${label}: LastChangedAt precedes CreatedAt`);
      if (row.ResolvedAt) assert.ok(Date.parse(row.ResolvedAt) >= Date.parse(row.CreatedAt), `${label}: resolution predates creation`);
      if (row.ClosedAt) assert.ok(row.ResolvedAt && Date.parse(row.ClosedAt) >= Date.parse(row.ResolvedAt), `${label}: closure predates resolution`);
      if (set.name === 'Tickets' && row.Status === 'WAITING') assert.ok(row.WaitingReason?.trim(), `${label}: waiting tickets need a reason`);
    }
    const appFile = path.join(root, `apps/help-desk/webapp/localService/mainService/data/${set.name}.json`);
    assert.deepEqual(JSON.parse(fs.readFileSync(appFile, 'utf8')), set.rows, `${set.name}: app fixture differs from canonical data`);
  }
  validateAssetLifecycle(contract);
  validateInventory(contract);
  assert.equal(fs.readFileSync(path.join(root, 'apps/help-desk/webapp/localService/mainService/metadata.xml'), 'utf8'), metadata, 'App metadata differs from canonical contract');
  return Object.values(sets).map(set => `${set.name}: ${set.rows.length} records`).join(', ');
}

export function validateAssetLifecycle({ sets }) {
  for (const asset of sets.Assets.rows) {
    const assignments = sets.AssetAssignments.rows.filter(row => row.AssetUUID === asset.AssetUUID);
    const open = assignments.filter(row => row.EndAt === null);
    assert.equal(open.length, asset.CurrentEmployeeUUID ? 1 : 0, 'Asset needs exactly one open assignment per custodian');
    if (open.length) assert.equal(open[0].EmployeeUUID, asset.CurrentEmployeeUUID, 'Current custodian must match open assignment');
    if (asset.CurrentEmployeeUUID) assert.ok(['ASSIGNED', 'IN_REPAIR'].includes(asset.Status), 'Custodian requires assigned or repair status');
    for (const [index, row] of assignments.entries()) {
      assert.ok(!row.EndAt || Date.parse(row.EndAt) >= Date.parse(row.StartAt), 'Assignment end precedes start');
      for (const other of assignments.slice(index + 1)) {
        assert.ok(Date.parse(row.StartAt) >= (other.EndAt ? Date.parse(other.EndAt) : Infinity) || Date.parse(other.StartAt) >= (row.EndAt ? Date.parse(row.EndAt) : Infinity), 'Assignment intervals overlap');
      }
    }
    const openRepairs = sets.AssetRepairs.rows.filter(row => row.AssetUUID === asset.AssetUUID && row.Status === 'OPEN');
    assert.equal(openRepairs.length, asset.Status === 'IN_REPAIR' ? 1 : 0, 'Repair state must match open repair');
  }
  for (const repair of sets.AssetRepairs.rows) {
    assert.equal(sets.Employees.rows.find(row => row.EmployeeUUID === repair.TechnicianUUID).Department, 'IT Support', 'Repair technician must belong to IT Support');
    if (repair.TicketUUID) assert.equal(sets.Tickets.rows.find(row => row.TicketUUID === repair.TicketUUID).AssetUUID, repair.AssetUUID, 'Repair ticket must reference the same asset');
    if (repair.Status === 'COMPLETED') assert.ok(repair.RepairDescription?.trim() && repair.RepairedAt && Date.parse(repair.RepairedAt) >= Date.parse(repair.StartedAt), 'Completed repair needs description and valid completion time');
    else assert.ok(!repair.RepairedAt && !repair.RepairDescription, 'Open repair cannot have completion data');
  }
}

export function validateInventory({ sets }) {
  const n = value => Math.round(Number(value) * 1000);
  const movements = sets.StockTransactions.rows;
  const seen = new Set();
  for (const stock of sets.Stocks.rows) {
    const unique = stock.MaterialUUID + stock.StorageLocation;
    assert.ok(!seen.has(unique), 'Duplicate material and storage location'); seen.add(unique);
    assert.ok(n(stock.PhysicalQuantity) >= n(stock.ReservedQuantity) && n(stock.ReservedQuantity) >= 0 && n(stock.ReorderLevel) >= 0, 'Invalid physical or reserved stock');
    assert.equal(n(stock.AvailableQuantity), n(stock.PhysicalQuantity) - n(stock.ReservedQuantity), 'Available stock must equal physical minus reserved');
    assert.equal(stock.LowStock, n(stock.AvailableQuantity) <= n(stock.ReorderLevel), 'Low stock indicator mismatch');
    assert.equal(stock.UnitOfMeasure, sets.Materials.rows.find(m => m.MaterialUUID === stock.MaterialUUID).UnitOfMeasure, 'Stock unit mismatch');
    const reservations = sets.Reservations.rows.filter(r => r.StockUUID === stock.StockUUID);
    assert.equal(n(stock.ReservedQuantity), reservations.reduce((sum,r) => sum + n(r.OutstandingQuantity),0), 'Reserved quantity must match outstanding requests');
    const ledger = movements.filter(t => t.StockUUID === stock.StockUUID);
    assert.equal(n(stock.PhysicalQuantity), ledger.reduce((sum,t) => sum + n(t.PhysicalDelta),0), 'Physical stock must reconcile to movement ledger');
    assert.equal(n(stock.ReservedQuantity), ledger.reduce((sum,t) => sum + n(t.ReservedDelta),0), 'Reserved stock must reconcile to movement ledger');
  }
  for (const reservation of sets.Reservations.rows) {
    assert.ok(n(reservation.Quantity) > 0 && n(reservation.IssuedQuantity) >= 0 && n(reservation.IssuedQuantity) <= n(reservation.Quantity), 'Invalid reservation quantities');
    assert.equal(n(reservation.OutstandingQuantity), reservation.Status === 'CANCELLED' ? 0 : n(reservation.Quantity) - n(reservation.IssuedQuantity), 'Outstanding reservation mismatch');
    assert.ok(reservation.Status !== 'FULFILLED' || n(reservation.OutstandingQuantity) === 0, 'Fulfilled reservation cannot have outstanding quantity');
    const issued = movements.filter(t => t.ReservationUUID === reservation.ReservationUUID && t.MovementType === 'ISSUE').reduce((sum,t) => sum+n(t.Quantity),0);
    assert.equal(n(reservation.IssuedQuantity),issued,'Issued quantity must reconcile to movements');
  }
  for (const row of [...sets.Reservations.rows,...movements]) {
    const stock = sets.Stocks.rows.find(s => s.StockUUID === row.StockUUID);
    assert.equal(row.MaterialUUID,stock.MaterialUUID,'Stock and material mismatch');
    if (row.TicketUUID) assert.equal(row.AssetUUID,sets.Tickets.rows.find(t=>t.TicketUUID===row.TicketUUID).AssetUUID,'Ticket and inventory asset mismatch');
    if (row.AssetRepairUUID) {
      const repair=sets.AssetRepairs.rows.find(r=>r.AssetRepairUUID===row.AssetRepairUUID);
      assert.equal(row.AssetUUID,repair.AssetUUID,'Repair and inventory asset mismatch');
      assert.equal(row.TicketUUID,repair.TicketUUID,'Repair and inventory ticket mismatch');
    }
    if (stock.UnitOfMeasure==='EA') assert.equal(n(row.Quantity)%1000,0,'EA quantity must be whole');
    if (row.StockTransactionUUID) {
      assert.equal(row.UnitOfMeasure,stock.UnitOfMeasure,'Movement unit mismatch');
      if(row.ReservationUUID) {
        const reservation=sets.Reservations.rows.find(r=>r.ReservationUUID===row.ReservationUUID);
        for(const key of ['StockUUID','MaterialUUID','TicketUUID','AssetUUID','AssetRepairUUID'])assert.equal(row[key],reservation[key],'Movement reservation reference mismatch');
      }
      if(row.OriginalTransactionUUID) {
        const original=movements.find(t=>t.StockTransactionUUID===row.OriginalTransactionUUID);
        assert.ok(original && original.MovementType==='ISSUE' && original.StockUUID===row.StockUUID,'Return must link original issue');
        assert.ok(movements.filter(t=>t.OriginalTransactionUUID===original.StockTransactionUUID).reduce((sum,t)=>sum+n(t.Quantity),0)<=n(original.Quantity),'Returns exceed original issue');
      }
      if(row.TransferUUID) {
        const pair=movements.filter(t=>t.TransferUUID===row.TransferUUID);
        assert.equal(pair.length,2,'Transfer requires two movements');
        assert.equal(pair.reduce((sum,t)=>sum+n(t.PhysicalDelta),0),0,'Transfer movements must balance');
        assert.ok(pair[0].StockUUID!==pair[1].StockUUID && pair[0].MaterialUUID===pair[1].MaterialUUID,'Transfer locations or materials invalid');
      }
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Contract valid — ${validateContract()}`);
}
