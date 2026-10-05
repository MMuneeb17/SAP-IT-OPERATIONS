const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const tenant = `contract-${randomUUID()}`;
const base = '/odata/v4/it-operations';
let contract;
let relatedRows;

test.beforeAll(async () => {
  const validator = await import('../scripts/validate-contract.mjs');
  contract = validator.loadContract();
  relatedRows = validator.relatedRows;
  validator.validateContract(contract);
});

async function getJson(request, url) {
  const response = await request.get(`${url}${url.includes('?') ? '&' : '?'}sap-client=${tenant}`);
  expect(response.ok(), `${url}: HTTP ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.json();
}

for (const name of ['Employees', 'Tickets', 'Assets', 'TicketComments', 'TicketHistory', 'AssetAssignments', 'AssetRepairs', 'AssetHistory']) {
  test(`${name}: exposes seeded collection, count, key reads and projection`, async ({ request }) => {
    const set = contract.sets[name];
    const key = set.type.keys[0];
    const body = await getJson(request, `${base}/${name}?$count=true`);
    expect(body['@odata.count']).toBe(set.rows.length);
    expect(body.value).toHaveLength(set.rows.length);
    expect(body.value.map(row => row[key]).sort()).toEqual(set.rows.map(row => row[key]).sort());
    for (const row of set.rows) {
      const record = await getJson(request, `${base}/${name}(${row[key]})`);
      expect(record).toMatchObject(row);
    }
    const projected = await getJson(request, `${base}/${name}?$select=${key}&$top=1`);
    expect(projected.value).toHaveLength(1);
    expect(Object.keys(projected.value[0]).filter(field => !field.startsWith('@'))).toEqual([key]);
    const missing = await request.get(`${base}/${name}(ffffffff-ffff-ffff-ffff-ffffffffffff)?sap-client=${tenant}`);
    expect(missing.status()).toBe(404);
  });

  test(`${name}: filters, sorts and pages before returning count`, async ({ request }) => {
    const set = contract.sets[name];
    const key = set.type.keys[0];
    const sorted = [...set.rows].sort((left, right) => left[key].localeCompare(right[key])).reverse();
    const body = await getJson(request, `${base}/${name}?$orderby=${key}%20desc&$skip=1&$top=2&$count=true`);
    expect(body['@odata.count']).toBe(set.rows.length);
    expect(body.value.map(row => row[key])).toEqual(sorted.slice(1, 3).map(row => row[key]));
    const filtered = await getJson(request, `${base}/${name}?$filter=${key}%20eq%20${set.rows[0][key]}&$count=true`);
    expect(filtered['@odata.count']).toBe(1);
    expect(filtered.value).toHaveLength(1);
    expect(filtered.value[0][key]).toBe(set.rows[0][key]);
  });

  test(`${name}: every navigation and expansion matches its foreign keys`, async ({ request }) => {
    const set = contract.sets[name];
    const key = set.type.keys[0];
    for (const nav of set.type.navigation) {
      const target = contract.sets[set.bindings.find(binding => binding.Path === nav.Name).Target];
      const targetKey = target.type.keys[0];
      const row = set.rows.find(item => relatedRows(contract, set, item, nav).length);
      expect(row, `${name}.${nav.Name} should have a linked example`).toBeTruthy();
      const expected = relatedRows(contract, set, row, nav);
      const url = `${base}/${name}(${row[key]})`;
      const direct = await getJson(request, `${url}/${nav.Name}`);
      const expanded = await getJson(request, `${url}?$expand=${nav.Name}`);
      if (nav.collection) {
        expect(direct.value.map(item => item[targetKey]).sort(), `${name}.${nav.Name}`).toEqual(expected.map(item => item[targetKey]).sort());
        expect(expanded[nav.Name].map(item => item[targetKey]).sort()).toEqual(expected.map(item => item[targetKey]).sort());
      } else {
        expect(direct[targetKey], `${name}.${nav.Name}`).toBe(expected[0][targetKey]);
        expect(expanded[nav.Name][targetKey]).toBe(expected[0][targetKey]);
      }
      const empty = set.rows.find(item => !relatedRows(contract, set, item, nav).length);
      if (empty) {
        const emptyExpanded = await getJson(request, `${base}/${name}(${empty[key]})?$expand=${nav.Name}`);
        expect(emptyExpanded[nav.Name], `${name}.${nav.Name}: missing references`).toEqual(nav.collection ? [] : null);
      }
    }
  });
}

test('ticket filters handle status and optional references, including nested expansion', async ({ request }) => {
  const set = contract.sets.Tickets;
  const status = set.rows.find(row => row.Status === 'IN_PROGRESS')?.Status || set.rows[0].Status;
  const filtered = await getJson(request, `${base}/Tickets?$filter=Status%20eq%20'${status}'&$orderby=TicketNumber%20asc&$count=true`);
  const expected = set.rows.filter(row => row.Status === status).sort((a, b) => a.TicketNumber.localeCompare(b.TicketNumber));
  expect(filtered['@odata.count']).toBe(expected.length);
  expect(filtered.value.map(row => row.TicketNumber)).toEqual(expected.map(row => row.TicketNumber));
  const absent = await getJson(request, `${base}/Tickets?$filter=AssetUUID%20eq%20null&$count=true`);
  expect(absent['@odata.count']).toBe(set.rows.filter(row => row.AssetUUID === null).length);
  expect(absent.value.every(row => row.AssetUUID === null)).toBeTruthy();
  expect(absent.value.length).toBeGreaterThan(0);
  const nav = set.type.navigation.find(item => item.collection && item.type === 'TicketComment');
  const childSet = contract.sets[set.bindings.find(binding => binding.Path === nav.Name).Target];
  const author = childSet.type.navigation.find(item => item.type === 'Employee');
  const ticket = set.rows.find(row => relatedRows(contract, set, row, nav).length);
  const expanded = await getJson(request, `${base}/Tickets(${ticket.TicketUUID})?$expand=${nav.Name}($expand=${author.Name})`);
  for (const comment of expanded[nav.Name]) {
    expect(comment[author.Name].EmployeeUUID).toBe(comment.AuthorUUID);
  }
});

test('fixture validator rejects malformed records and broken references', async () => {
  const { validateContract } = await import('../scripts/validate-contract.mjs');
  const mutations = [
    [model => { model.sets.Tickets.rows[0].Subject = null; }, /required field is null/],
    [model => { model.sets.Tickets.rows[0].TicketUUID = 'invalid'; }, /invalid UUID/],
    [model => { model.sets.Tickets.rows[0].RequesterUUID = 'ffffffff-ffff-ffff-ffff-ffffffffffff'; }, /dangling foreign key/],
    [model => { model.sets.Tickets.rows[0].Subject = 'x'.repeat(201); }, /exceeds MaxLength/],
    [model => { model.sets.Tickets.rows[0].Status = 'REOPENED'; }, /unknown domain value/],
    [model => { model.sets.Tickets.rows[1].TicketUUID = model.sets.Tickets.rows[0].TicketUUID; }, /duplicate primary key/],
    [model => { model.sets.Tickets.rows[1].TicketNumber = model.sets.Tickets.rows[0].TicketNumber; }, /duplicate TicketNumber/]
  ];
  for (const [mutate, expected] of mutations) {
    const model = structuredClone(contract);
    mutate(model);
    expect(() => validateContract(model)).toThrow(expected);
  }
});

test('nullable GUID, text and date fields support null equality and inequality', async ({ request }) => {
  for (const [setName, field] of [['Tickets', 'AssetUUID'], ['Tickets', 'Resolution'], ['Tickets', 'ResolvedAt'], ['Assets', 'CurrentEmployeeUUID'], ['Assets', 'WarrantyEnd'], ['TicketHistory', 'OldValue']]) {
    const rows = contract.sets[setName].rows;
    for (const operator of ['eq', 'ne']) {
      const body = await getJson(request, `${base}/${setName}?$filter=${field}%20${operator}%20null&$count=true`);
      const expected = rows.filter(row => operator === 'eq' ? row[field] === null : row[field] !== null);
      expect(body['@odata.count'], `${setName}.${field} ${operator} null`).toBe(expected.length);
      expect(body.value.map(row => row[contract.sets[setName].type.keys[0]]).sort()).toEqual(expected.map(row => row[contract.sets[setName].type.keys[0]]).sort());
    }
  }
  const quoted = await getJson(request, `${base}/Tickets?$filter=Resolution%20eq%20'null'`);
  expect(quoted.value).toEqual([]);
});
