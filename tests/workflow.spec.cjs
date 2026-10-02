const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const requester = '00000001-0000-4000-8000-000000000001';
const technician = '00000001-0000-4000-8000-000000000004';
const asset = '00000002-0000-4000-8000-000000000001';
const sample = { Subject: 'Laptop screen goes black', Description: 'The display goes black after signing in.', Category: 'Hardware', Priority: 'HIGH', RequesterUUID: requester, AssetUUID: asset };

function client(request) {
  const tenant = `workflow-${randomUUID()}`;
  const url = path => `/odata/v4/it-operations/${path}${path.includes('?') ? '&' : '?'}sap-client=${tenant}`;
  return {
    get: path => request.get(url(path)),
    post: (path, data = {}) => request.post(url(path), { data }),
    patch: (path, data) => request.patch(url(path), { data }),
    delete: path => request.delete(url(path))
  };
}
async function json(response, status = 200) {
  expect(response.status(), await response.text()).toBe(status);
  return response.json();
}
async function create(api, data = {}) { return json(await api.post('Tickets', { ...sample, ...data }), 201); }
const path = ticket => `Tickets(${ticket.TicketUUID})`;
async function act(api, ticket, action, parameters) { return json(await api.post(`${path(ticket)}/ITOperations.${action}`, parameters)); }

test('create through closure retains correct audit states and service-owned fields', async ({ request }) => {
  const api = client(request);
  let ticket = await create(api, { Status: 'CLOSED', TicketNumber: 'FORGED', CreatedBy: 'FORGED', CanClose: true });
  expect(ticket).toMatchObject({ Status: 'NEW', CreatedBy: 'EMP-0001', CanSubmit: true, CanClose: false, PriorityCriticality: 2 });
  expect(ticket.TicketNumber).toMatch(/^IT-\d+$/);
  const events = ['Create'];
  for (const [action, state, input] of [
    ['Submit', 'SUBMITTED'], ['AssignTechnician', 'ASSIGNED', { TechnicianUUID: technician }],
    ['StartWork', 'IN_PROGRESS'], ['Resolve', 'RESOLVED', { Resolution: 'Updated display driver and verified operation.' }], ['Close', 'CLOSED']
  ]) {
    ticket = await act(api, ticket, action, input);
    expect(ticket.Status).toBe(state); events.push(action);
  }
  const detail = await json(await api.get(`${path(ticket)}?$expand=History,Requester,Asset`));
  expect(detail.Requester.EmployeeUUID).toBe(requester);
  expect(detail.Asset.AssetUUID).toBe(asset);
  expect(detail.History.map(event => event.Action)).toEqual(events);
  expect(detail.History.map(event => [event.OldValue, event.NewValue])).toEqual([
    [null, 'NEW'], ['NEW', 'SUBMITTED'], ['SUBMITTED', 'ASSIGNED'], ['ASSIGNED', 'IN_PROGRESS'], ['IN_PROGRESS', 'RESOLVED'], ['RESOLVED', 'CLOSED']
  ]);
  expect(detail.History.map(event => event.CreatedBy)).toEqual(['EMP-0001', 'EMP-0001', 'EMP-0006', 'EMP-0004', 'EMP-0004', 'EMP-0001']);
  expect(detail.ResolvedAt).toBeTruthy(); expect(detail.ClosedAt).toBeTruthy();
  expect(detail.CanReopen).toBe(false);
});

test('invalid creation is rejected without a ticket or audit event', async ({ request }) => {
  const api = client(request);
  for (const change of [
    { Subject: '  ' }, { Description: '' }, { Subject: 'a'.repeat(201) },
    { RequesterUUID: randomUUID() }, { AssetUUID: randomUUID() },
    { AssetUUID: '00000002-0000-4000-8000-000000000002' },
    { Category: 'Unknown' }, { Priority: 'URGENT' }
  ]) expect((await api.post('Tickets', { ...sample, ...change })).status()).toBe(400);
  expect((await json(await api.get('Tickets?$count=true')))['@odata.count']).toBe(9);
  expect((await json(await api.get('TicketHistory?$count=true')))['@odata.count']).toBe(31);
  expect((await create(api, { AssetUUID: null })).AssetUUID).toBeNull();
});

test('invalid transitions, reasons and technicians preserve ticket and history', async ({ request }) => {
  const api = client(request); let ticket = await create(api);
  expect((await api.post(`${path(ticket)}/ITOperations.Close`)).status()).toBe(409);
  ticket = await act(api, ticket, 'Submit');
  expect((await api.post(`${path(ticket)}/ITOperations.AssignTechnician`, { TechnicianUUID: requester })).status()).toBe(400);
  ticket = await act(api, ticket, 'AssignTechnician', { TechnicianUUID: technician });
  ticket = await act(api, ticket, 'StartWork');
  for (const [action, data] of [['Resolve', { Resolution: ' ' }], ['PutOnHold', { Reason: '' }]]) {
    expect((await api.post(`${path(ticket)}/ITOperations.${action}`, data)).status()).toBe(400);
  }
  let detail = await json(await api.get(`${path(ticket)}?$expand=History`));
  expect(detail.Status).toBe('IN_PROGRESS'); expect(detail.History).toHaveLength(4);
  ticket = await act(api, ticket, 'PutOnHold', { Reason: 'Waiting for a replacement cable.' });
  expect(ticket.WaitingReason).toBe('Waiting for a replacement cable.');
  ticket = await act(api, ticket, 'Resume'); expect(ticket.WaitingReason).toBeNull();
  ticket = await act(api, ticket, 'Resolve', { Resolution: 'Cable replaced.' });
  expect((await api.post(`${path(ticket)}/ITOperations.Reopen`, { Reason: '' })).status()).toBe(400);
  ticket = await act(api, ticket, 'Reopen', { Reason: 'The display still flickers.' });
  expect(ticket).toMatchObject({ Status: 'IN_PROGRESS', Resolution: null, ResolvedAt: null, ClosedAt: null });
  detail = await json(await api.get(`${path(ticket)}?$expand=History`));
  expect(detail.History.at(-1)).toMatchObject({ Action: 'Reopen', OldValue: 'RESOLVED', NewValue: 'IN_PROGRESS', Reason: 'The display still flickers.' });
});

test('direct mutation cannot bypass workflow or modify audit/reference data', async ({ request }) => {
  const api = client(request); const ticket = await create(api);
  expect((await api.patch(path(ticket), { Status: 'CLOSED' })).status()).toBe(405);
  expect((await api.delete(path(ticket))).status()).toBe(405);
  for (const [set, key] of [['Employees', requester], ['Assets', asset], ['TicketComments', '00000004-0000-4000-8000-000000000001'], ['TicketHistory', '00000005-0000-4000-8000-000000000001']]) {
    expect((await api.post(set, {})).status()).toBe(405);
    expect((await api.patch(`${set}(${key})`, { Text: 'Tamper' })).status()).toBe(405);
    expect((await api.delete(`${set}(${key})`)).status()).toBe(405);
  }
  expect((await json(await api.get(path(ticket)))).Status).toBe('NEW');
});

test('concurrent creation is unique and duplicate action attempts create only one event', async ({ request }) => {
  const api = client(request);
  const tickets = await Promise.all(Array.from({ length: 4 }, () => create(api)));
  expect(new Set(tickets.map(ticket => ticket.TicketNumber)).size).toBe(4);
  const responses = await Promise.all([api.post(`${path(tickets[0])}/ITOperations.Submit`), api.post(`${path(tickets[0])}/ITOperations.Submit`)]);
  expect(responses.map(response => response.status()).sort()).toEqual([200, 409]);
  expect((await json(await api.get(`${path(tickets[0])}?$expand=History`))).History).toHaveLength(2);
});

test('search ignores case and works together with filter/sort/paging', async ({ request }) => {
  const api = client(request);
  const lower = await json(await api.get('Tickets?$search=laptop&$count=true'));
  const upper = await json(await api.get('Tickets?$search=LAPTOP&$count=true'));
  expect(lower.value.map(ticket => ticket.TicketUUID)).toEqual(upper.value.map(ticket => ticket.TicketUUID));
  expect(lower.value.some(ticket => ticket.TicketNumber === 'IT-10452')).toBeTruthy();
  const constrained = await json(await api.get("Tickets?$search=laptop&$filter=Status%20eq%20'WAITING'&$orderby=TicketNumber%20desc&$top=1&$count=true"));
  expect(constrained.value).toHaveLength(1); expect(constrained.value[0].TicketNumber).toBe('IT-10452');
});
