import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = path.join(root, 'sap-design/phase-10');
const array = x => x == null ? [] : Array.isArray(x) ? x : [x];
const attrs = x => x == null ? null : Object.fromEntries(Object.entries(x).filter(([k]) => k.startsWith('@_')).map(([k, v]) => [k.slice(2), v]));
export const loadDesign = () => JSON.parse(fs.readFileSync(path.join(folder, 'blueprint.json'), 'utf8'));
export function publicContract() {
  const schema = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true }).parse(fs.readFileSync(path.join(root, 'mock/metadata.xml'), 'utf8')).Edmx.DataServices.Schema;
  const types = Object.fromEntries(array(schema.EntityType).map(t => [t['@_Name'], t]));
  return { namespace: schema['@_Namespace'], entities: Object.fromEntries(array(schema.EntityContainer.EntitySet).map(s => {
    const t = types[s['@_EntityType'].split('.').at(-1)];
    return [s['@_Name'], { type: t['@_Name'], key: t.Key.PropertyRef['@_Name'], properties: array(t.Property).map(attrs),
      navigation: array(t.NavigationProperty).map(n => ({ ...attrs(n), constraints: array(n.ReferentialConstraint).map(attrs) })), bindings: array(s.NavigationPropertyBinding).map(attrs) }];
  })), actions: array(schema.Action).map(a => ({ ...attrs(a), parameters: array(a.Parameter).map(attrs), returns: attrs(a.ReturnType) })) };
}
const computed = {
  Tickets: ['ResponseDueAt', 'ResolutionDueAt', 'ResponseSLAStatus', 'ResolutionSLAStatus', 'SLAStatus', 'SLACriticality', 'SLAEvaluatedAt'],
  Materials: ['TotalAssets', 'AvailableAssets'], Stocks: ['StockLabel', 'AvailableQuantity', 'LowStock', 'StockCriticality'], Reservations: ['OutstandingQuantity']
};
const isDerived = (set, field) => field.startsWith('Can') || field.endsWith('Criticality') || (computed[set] || []).includes(field);
const parents = { TicketComments: 'Tickets', TicketHistory: 'Tickets', AssetAssignments: 'Assets', AssetRepairs: 'Assets', AssetHistory: 'Assets', Stocks: 'Materials', Reservations: 'Materials', StockTransactions: 'Materials' };
const appendOnly = ['TicketComments', 'TicketHistory', 'AssetHistory', 'StockTransactions', 'ConfigurationHistory'];
const facets = p => [p.Type, p.MaxLength && `length=${p.MaxLength}`, p.Precision && `precision=${p.Precision}`, p.Scale && `scale=${p.Scale}`, `nullable=${p.Nullable ?? 'true'}`].filter(Boolean).join('; ');
const introduction = '# Generated Phase 10 contract mapping\n\nDesign only; no SAP activation or compilation is claimed. Edit blueprint.json, then run\n`npm run design:render`; `npm run design:check` checks these artifacts for drift.\n\n';
export function artifacts(d) {
  let fields = introduction, nav = introduction, actions = introduction;
  let ddl = '// DESIGN TEMPLATE BUNDLE: split each define table into its own ADT object.\n// Review target-release types, nullable projection and client/ETag semantics before activation.\n';
  let service = '// DESIGN TEMPLATE: projections and behaviors must exist before activation.\ndefine service ZUI_IT_OPERATIONS {\n';
  for (const [set, e] of Object.entries(d.entities)) {
    const c = d.contract.entities[set];
    fields += `## ${set}\n\n${e.table || 'Released employee source + ZIT_EMP_MAP identity mapping'} → ${e.interface} → ${e.projection}. Owner: ${e.root}.\n\n| Public field | OData facets | Storage/source | Null presence field |\n| --- | --- | --- | --- |\n`;
    if (e.table) ddl += `\n// ${set}; public key ${c.key}; root ${e.root}\n@EndUserText.label: '${set}'\n@AbapCatalog.enhancement.category: #NOT_EXTENSIBLE\n@AbapCatalog.tableCategory: #TRANSPARENT\n@AbapCatalog.deliveryClass: #A\n@AbapCatalog.dataMaintenance: #RESTRICTED\ndefine table ${e.table.toLowerCase()} {\n  key client : abap.clnt not null;\n`;
    for (const p of c.properties) {
      const f = e.fields[p.Name];
      fields += `| ${p.Name} | ${facets(p)} | ${f.kind === 'stored' ? `${f.column}: ${f.abapType}` : f.kind} | ${f.presenceColumn || '—'} |\n`;
      if (f.kind === 'stored') {
        ddl += `  ${p.Name === c.key ? 'key ' : ''}${f.column} : ${f.abapType}${p.Name === c.key ? ' not null' : ''};\n`;
        if (f.presenceColumn) ddl += `  ${f.presenceColumn} : abap.char(1);\n`;
      }
    }
    fields += '\n';
    if (e.table) ddl += `  // Internal concurrency timestamp; separate from public precision-zero audit time.\n  local_changed_at : abp_locinst_lastchange_tstmpl;\n}\n`;
    service += `  expose ${e.projection} as ${set};\n`;
    nav += `## ${set}\n\n| Public navigation | Target set | Cardinality | Ownership | Join (public fields) |\n| --- | --- | --- | --- | --- |\n`;
    for (const n of c.navigation) {
      const target = c.bindings.find(b => b.Path === n.Name).Target;
      const collection = n.Type.startsWith('Collection(');
      const join = n.constraints.length ? n.constraints.map(x => `${set}.${x.Property} = ${target}.${x.ReferencedProperty}`).join(' AND ') : `Inverse of ${target}.${n.Partner}`;
      nav += `| ${n.Name} | ${target} | ${collection ? '0..*' : n.Nullable === 'false' ? '1' : '0..1'} | ${collection && d.entities[target].parent === set ? 'composition' : 'association'} | ${join} |\n`;
    }
    nav += '\n';
  }
  for (const [name, rule] of Object.entries(d.operations)) {
    const a = d.contract.actions.find(x => x.Name === name);
    actions += `## ${name}\n\n${a ? `${a.parameters[0].Type} → ${a.returns?.Type || 'no result'}; public action ${d.contract.namespace}.${name}` : 'POST /Tickets; standard RAP create, not an action import.'}\n\n`;
    if (a) actions += '| Parameter (including binding) | Public facets |\n| --- | --- |\n' + a.parameters.map(p => `| ${p.Name} | ${facets(p)} |`).join('\n') + '\n\n';
    actions += `- Roles: ${rule.roles.join(', ')}. ${rule.scope}\n- Guard: ${rule.guard}\n- Writes (conditional members included): ${rule.writes.join(', ') || 'none'}.\n- Potential lock roots: ${rule.lockRoots.join(', ') || 'none'}.\n- Transaction: ${rule.transaction}.\n- Determinations: ${rule.determinations}\n\n`;
  }
  return { 'field-dictionary.md': fields.trimEnd() + '\n', 'navigation-map.md': nav.trimEnd() + '\n', 'action-map.md': actions.trimEnd() + '\n', 'tables.ddl.example': ddl, 'service.srvd.example': service + '}\n' };
}
export function validateDesign(d = loadDesign(), { documents = true } = {}) {
  assert.deepEqual(d.contract, publicContract(), 'Public contract drift: fields, facets, keys, navigation or action signatures differ');
  const sets = Object.keys(d.contract.entities).sort();
  assert.deepEqual(Object.keys(d.entities).sort(), sets, 'Entity mapping coverage');
  const policy = JSON.parse(fs.readFileSync(path.join(root, 'apps/help-desk/webapp/model/access-policy.json')));
  assert.deepEqual(Object.keys(d.operations).sort(), [...d.contract.actions.map(a => a.Name), 'CreateTicket'].sort(), 'Operation mapping coverage');
  const tables = new Set();
  for (const [name, e] of Object.entries(d.entities)) {
    assert.equal(e.parent, parents[name] || null, 'Composition ownership drift');
    assert.equal(e.root, parents[name] || name, 'Composition root drift');
    assert.equal(e.appendOnly, appendOnly.includes(name), 'Audit immutability drift');
    assert.match(e.interface, /^ZI_IT_[A-Za-z0-9_]{1,24}$/); assert.match(e.projection, /^ZC_IT_[A-Za-z0-9_]{1,24}$/);
    assert.equal(e.externalCreate, name === 'Tickets', 'Only Tickets exposes standard create');
    assert.equal(e.externalUpdate, false, 'Public PATCH forbidden'); assert.equal(e.externalDelete, false, 'Public DELETE forbidden');
    assert.ok(d.entities[e.root] && !d.entities[e.root].parent, 'Root must exist and have no parent');
    assert.ok(!e.parent || e.parent === e.root, 'Child must belong directly to its declared root');
    if (name === 'Employees') assert.equal(e.table, null, 'Do not introduce duplicate HR persistence');
    else { assert.match(e.table, /^ZIT_[A-Z0-9_]{1,12}$/); assert.ok(!tables.has(e.table), 'Duplicate table mapping'); tables.add(e.table); assert.equal(e.lock, e.root); }
    const c = d.contract.entities[name];
    assert.deepEqual(Object.keys(e.fields).sort(), c.properties.map(p => p.Name).sort(), 'Field storage mapping coverage');
    const columns = new Set(['client', 'local_changed_at']);
    for (const p of c.properties) {
      const f = e.fields[p.Name], expected = name === 'Employees' ? 'reference' : isDerived(name, p.Name) ? 'derived' : 'stored';
      assert.equal(f.kind, expected, `Storage classification ${name}.${p.Name}`);
      if (f.kind === 'stored') {
        assert.ok(f.abapType, 'Stored field needs ABAP type');
        const length = Number(p.MaxLength || 0);
        const expectedType = { 'Edm.Guid': 'abap.raw(16)', 'Edm.Int32': 'abap.int4', 'Edm.Boolean': 'abap.char(1)', 'Edm.Date': 'abap.dats', 'Edm.DateTimeOffset': 'abap.dec(21,7)', 'Edm.String': length && length <= 1333 ? `abap.char(${length})` : 'abap.string', 'Edm.Decimal': `abap.dec(${p.Precision},${p.Scale})` }[p.Type];
        assert.equal(f.abapType, expectedType, `Storage type/facets drift: ${name}.${p.Name}`);
        for (const col of [f.column, f.presenceColumn].filter(Boolean)) { assert.match(col, /^[a-z][a-z0-9_]{0,29}$/); assert.ok(!columns.has(col), 'Duplicate column'); columns.add(col); }
        assert.equal(!!f.presenceColumn, p.Nullable !== 'false', 'Nullable stored fields require explicit presence');
        if (p.Type === 'Edm.Decimal') assert.equal(f.abapType, `abap.dec(${p.Precision},${p.Scale})`, 'Decimal facets must not lose precision');
      } else assert.ok(!f.column && !f.abapType && !f.presenceColumn, 'Derived/reference fields cannot have duplicate persistence');
    }
  }
  for (const [name, op] of Object.entries(d.operations)) {
    assert.deepEqual(op.roles, policy.operations[name].roles, `Role drift: ${name}`);
    assert.equal(op.scope, policy.operations[name].condition, `Scope drift: ${name}`);
    assert.ok(op.guard && op.determinations && op.transaction, 'Incomplete action design');
    for (const write of op.writes) assert.ok(d.entities[write]?.table, 'Unknown write target');
    for (const lock of op.lockRoots) assert.ok(d.entities[lock] && !d.entities[lock].parent && lock !== 'Employees', 'Lock target must be a persistent root');
    if (name === 'PreviewSLA') { assert.deepEqual(op.writes, []); assert.deepEqual(op.lockRoots, []); assert.equal(op.transaction, 'read-only'); }
    else { assert.ok(op.writes.length && op.lockRoots.length, 'Mutation needs writes and locks'); assert.equal(op.transaction, 'single SAP LUW'); }
  }
  if (documents) for (const [file, expected] of Object.entries(artifacts(d))) assert.equal(fs.readFileSync(path.join(folder, file), 'utf8'), expected, `${file}: generated design drift; run npm run design:render`);
  return `${sets.length} sets, ${Object.values(d.contract.entities).reduce((n, e) => n + e.properties.length, 0)} fields, ${d.contract.actions.length} bound actions + ticket create, ${tables.size} operational tables`;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--write')) { const d = loadDesign(); validateDesign(d, { documents: false }); for (const [file, text] of Object.entries(artifacts(d))) fs.writeFileSync(path.join(folder, file), text); }
  console.log('Backend design valid: ' + validateDesign());
}
