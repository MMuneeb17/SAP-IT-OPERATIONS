import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDesign, validateDesign, artifacts } from '../validate-backend-design.mjs';

test('complete reviewed package and generated artifacts match the live contract', () => {
  assert.match(validateDesign(), /20 sets, 243 fields, 36 bound actions/);
  assert.equal(Object.keys(artifacts(loadDesign())).length, 5);
});
function rejects(title, change, message) {
  test(title, () => { const d = loadDesign(); change(d); assert.throws(() => validateDesign(d, { documents: false }), message); });
}
rejects('nullable wire changes cannot silently enter the backend blueprint', d => { d.contract.entities.Tickets.properties[0].Nullable = 'true'; }, /Public contract drift/);
rejects('navigation binding drift is detected', d => { d.contract.entities.Tickets.bindings[0].Target = 'Materials'; }, /Public contract drift/);
rejects('new or missing actions require an explicit design', d => { delete d.operations.RequestPart; }, /Operation mapping coverage/);
rejects('every property needs an explicit storage/source decision', d => { delete d.entities.Assets.fields.AssetTag; }, /Field storage mapping coverage/);
rejects('decimal quantity storage cannot lose scale', d => { d.entities.Stocks.fields.PhysicalQuantity.abapType = 'abap.int4'; }, /Storage type\/facets drift/);
rejects('derived availability cannot become an independent balance', d => { d.entities.Stocks.fields.AvailableQuantity.kind = 'stored'; }, /Storage classification/);
rejects('an asset repair cannot acquire a second ticket owner', d => { d.entities.AssetRepairs.parent = 'Tickets'; }, /Composition ownership drift/);
rejects('two public entities cannot accidentally share one persistence table', d => { d.entities.Assets.table = d.entities.Tickets.table; }, /Duplicate table mapping/);
rejects('permission changes require policy alignment', d => { d.operations.IssueReservation.roles = ['EMPLOYEE']; }, /Role drift/);
rejects('read-only SLA preview cannot acquire persistent side effects', d => { d.operations.PreviewSLA.writes = ['Tickets']; }, /Expected values to be strictly deep-equal/);
rejects('optional dates need a null-presence mapping', d => { d.entities.Assets.fields.WarrantyEnd.presenceColumn = null; }, /Nullable stored fields/);
rejects('audit data cannot expose generic deletion', d => { d.entities.TicketHistory.externalDelete = true; }, /Public DELETE forbidden/);
test('changed decisions require regenerated documentation', () => {
  const d = loadDesign(); d.operations.Submit.guard += ' changed';
  assert.throws(() => validateDesign(d), /action-map.md: generated design drift/);
});
