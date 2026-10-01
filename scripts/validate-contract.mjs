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
  Assets: { Status: ['RECEIVED', 'TAGGED', 'AVAILABLE', 'ASSIGNED', 'IN_REPAIR', 'RETIRED', 'DISPOSED'] }
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
  assert.deepEqual(Object.keys(sets).sort(), ['Assets', 'Employees', 'TicketComments', 'TicketHistory', 'Tickets']);
  const businessKeys = { Employees: 'EmployeeNumber', Tickets: 'TicketNumber', Assets: 'AssetTag' };
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
  assert.equal(fs.readFileSync(path.join(root, 'apps/help-desk/webapp/localService/mainService/metadata.xml'), 'utf8'), metadata, 'App metadata differs from canonical contract');
  return Object.values(sets).map(set => `${set.name}: ${set.rows.length} records`).join(', ');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Contract valid — ${validateContract()}`);
}
