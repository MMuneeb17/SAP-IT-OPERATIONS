const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const createPath = 'Materials/ITOperations.CreateInventoryItem';
const payload = overrides => ({ MaterialNumber: 'LAP-NEW', Description: 'New office laptop', Category: 'Computers', TrackingMode: 'EQUIPMENT',
  UnitOfMeasure: 'EA', AssetType: 'LAPTOP', Manufacturer: 'Dell', Model: 'Latitude test', Quantity: '2', StorageLocation: 'Karachi store',
  SerialNumbers: 'NEW-SERIAL-A\nNEW-SERIAL-B', PurchaseDate: '2026-10-08', WarrantyEnd: '2029-10-08', Reason: 'Purchase receipt', ...overrides });
function api(request) {
  const tenant = 'catalogue-' + randomUUID(), url = p => '/odata/v4/it-operations/' + p + (p.includes('?') ? '&' : '?') + 'sap-client=' + tenant;
  return { get: async p => { const r = await request.get(url(p)); expect(r.ok(), await r.text()).toBe(true); return r.json(); },
    post: (p, data) => request.post(url(p), { data }) };
}
async function good(response) { expect(response.status(), await response.text()).toBe(200); return response.json(); }
test('equipment creation shares asset identity, generates internal tags and follows asset lifecycle', async ({ request }) => {
  const a = api(request), material = await good(await a.post(createPath, payload({ AssetTag: 'FORGED', AssetNumber: '9' })));
  expect(material.TotalAssets).toBe(2); expect(material.AvailableAssets).toBe(2);
  const assets = (await a.get(`Materials(${material.MaterialUUID})/Assets`)).value;
  expect(assets.map(r => r.AssetTag)).toEqual(['100000000001', '100000000002']);
  for (const asset of assets) {
    expect(asset).toMatchObject({ MaterialUUID: material.MaterialUUID, CompanyCode: '1000', AssetClass: 'IT_LAPTOP', AssetSubnumber: '0000', Status: 'AVAILABLE' });
    expect((await a.get(`Assets(${asset.AssetUUID})/Material`)).MaterialUUID).toBe(material.MaterialUUID);
    expect((await a.get(`Assets(${asset.AssetUUID})/History`)).value).toHaveLength(1);
  }
  await good(await a.post(`Assets(${assets[0].AssetUUID})/ITOperations.AssignAsset`, { EmployeeUUID: '00000001-0000-4000-8000-000000000002', Reason: 'New starter' }));
  expect((await a.get(`Materials(${material.MaterialUUID})`)).AvailableAssets).toBe(1);
  expect((await a.get(`Materials(${material.MaterialUUID})/Assets`)).value[0].Status).toBe('ASSIGNED');
  expect((await a.get('Stocks')).value.some(s => s.MaterialUUID === material.MaterialUUID)).toBe(false);
});
test('new parts create stock and opening ledger without creating assets', async ({ request }) => {
  const a = api(request), before = (await a.get('Assets')).value.length;
  const material = await good(await a.post(createPath, payload({ MaterialNumber: 'cable-test', TrackingMode: 'QUANTITY', UnitOfMeasure: 'M', Quantity: '12.500', ReorderLevel: '5.250' })));
  expect(material.MaterialNumber).toBe('CABLE-TEST'); expect(material.AssetType).toBeNull();
  const stock = (await a.get(`Materials(${material.MaterialUUID})/Stocks`)).value[0];
  expect(Number(stock.PhysicalQuantity)).toBe(12.5); expect(Number(stock.AvailableQuantity)).toBe(12.5);
  const movement = (await a.get(`Stocks(${stock.StockUUID})/StockTransactions`)).value[0];
  expect(movement.MovementType).toBe('RECEIVE'); expect(Number(movement.PhysicalDelta)).toBe(12.5);
  expect((await a.get('Assets')).value).toHaveLength(before);
});
test('invalid receipts and duplicate identities do not leave partial catalogue records', async ({ request }) => {
  const a = api(request), before = await a.get('Materials');
  for (const change of [{ Quantity: '0' }, { Quantity: '1.5' }, { Quantity: '101' }, { SerialNumbers: 'one' }, { SerialNumbers: 'dup\nDUP' },
    { SerialNumbers: 'SYNTH-00001\nnew' }, { MaterialNumber: 'SSD-512' }, { TrackingMode: 'OTHER' }, { AssetType: 'INVALID' },
    { AssetType: 'toString' }, { UnitOfMeasure: 'M' }, { PurchaseDate: '2026-02-30' }, { WarrantyEnd: '2020-01-01' }, { Reason: '' }, { MaterialNumber: 'spaces are invalid' },
    { TrackingMode: 'QUANTITY', ReorderLevel: '-1' }, { TrackingMode: 'QUANTITY', ReorderLevel: '1.5' }]) {
    const response = await a.post(createPath, payload(change)); expect([400, 409], await response.text()).toContain(response.status());
  }
  expect((await a.get('Materials')).value).toEqual(before.value);
  expect((await a.get('Assets')).value).toHaveLength(8);
});
test('concurrent receipts allocate unique tags and duplicate serial receipt is rejected', async ({ request }) => {
  const a = api(request), material = await good(await a.post(createPath, payload()));
  const path = `Materials(${material.MaterialUUID})/ITOperations.ReceiveEquipment`;
  const receipts = await Promise.all(['C', 'D'].map(s => a.post(path, payload({ Quantity: '1', SerialNumbers: s }))));
  for (const response of receipts) await good(response);
  const assets = (await a.get(`Materials(${material.MaterialUUID})/Assets`)).value;
  expect(new Set(assets.map(a => a.AssetTag)).size).toBe(4);
  expect(assets.map(a => a.AssetTag)).toEqual(['100000000001', '100000000002', '100000000003', '100000000004']);
  const duplicate = await Promise.all([1, 2].map(() => a.post(path, payload({ Quantity: '1', SerialNumbers: 'E' }))));
  expect(duplicate.map(r => r.status()).sort()).toEqual([200, 409]);
  expect((await a.get(`Materials(${material.MaterialUUID})`)).TotalAssets).toBe(5);
});
test('concurrent catalogue creation rejects duplicate material number and parts reject equipment receipt', async ({ request }) => {
  const a = api(request);
  const responses = await Promise.all([1, 2].map(() => a.post(createPath, payload({ TrackingMode: 'QUANTITY', Quantity: '1' }))));
  expect(responses.map(r => r.status()).sort()).toEqual([200, 409]);
  const material = await responses.find(r => r.status() === 200).json();
  expect((await a.post(`Materials(${material.MaterialUUID})/ITOperations.ReceiveEquipment`, payload())).status()).toBe(400);
});
test('number ranges are class-specific, skip used numbers and reject exhaustion', () => {
  const { allocate, ranges } = require('../mock/data/_asset-numbering');
  expect(allocate('MONITOR', 1, [])[0].AssetTag).toBe('120000000001');
  expect(allocate('LAPTOP', 1, [{ AssetTag: '100000000004' }])[0].AssetTag).toBe('100000000005');
  expect(() => allocate('LAPTOP', 1, [{ AssetNumber: String(ranges.LAPTOP.to) }])).toThrow('exhausted');
});
test('receipt journal rolls back catalogue, asset, stock and history after a post-insert failure', async () => {
  const { execute } = require('../mock/data/_catalogue');
  for (const failure of ['Materials', 'Assets', 'AssetHistory', 'Stocks', 'StockTransactions']) {
    const data = { Materials: [], Assets: [], AssetHistory: [], Stocks: [], StockTransactions: [] };
    const entity = name => ({ fetchEntries: async () => structuredClone(data[name]),
      addEntry: async row => { data[name].push(structuredClone(row)); if (name === failure) throw Error('Post-insert failure'); },
      removeEntry: async keys => { data[name] = data[name].filter(r => !Object.entries(keys).every(([k, v]) => r[k] === v)); } });
    const ctx = { base: { getEntityInterface: async name => entity(name) }, throwError(message) { throw Error(message); } };
    await expect(execute(ctx, 'CreateInventoryItem', payload({ TrackingMode: ['Stocks', 'StockTransactions'].includes(failure) ? 'QUANTITY' : 'EQUIPMENT' }), {}, {})).rejects.toThrow('Post-insert failure');
    for (const records of Object.values(data)) expect(records).toHaveLength(0);
  }
});
