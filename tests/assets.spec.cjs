const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const id = (group, n) => `${group}-0000-4000-8000-${String(n).padStart(12, '0')}`;
const asset = n => `Assets(${id('00000002', n)})`;
const employee = n => id('00000001', n);
function client(request) {
  const tenant = `assets-${randomUUID()}`;
  const url = path => `/odata/v4/it-operations/${path}${path.includes('?') ? '&' : '?'}sap-client=${tenant}`;
  return {
    get: path => request.get(url(path)), post: (path, data = {}) => request.post(url(path), { data }),
    patch: (path, data) => request.patch(url(path), { data }), delete: path => request.delete(url(path))
  };
}
async function json(response, status = 200) { expect(response.status(), await response.text()).toBe(status); return response.json(); }
async function act(api, n, action, data = {}) { return json(await api.post(`${asset(n)}/ITOperations.${action}`, { Reason: 'Lifecycle acceptance test', ...data })); }
const details = (api, n) => api.get(`${asset(n)}?$expand=Assignments,Repairs,History,CurrentEmployee,Tickets`).then(json);

test('asset receipt, assignment, transfer, return, retirement and disposal retain history', async ({ request }) => {
  const api = client(request);
  expect((await act(api, 7, 'MakeAvailable')).Status).toBe('AVAILABLE');
  expect(await act(api, 7, 'AssignAsset', { EmployeeUUID: employee(1) })).toMatchObject({ Status: 'ASSIGNED', CurrentEmployeeUUID: employee(1), CanTransferAsset: true });
  await act(api, 7, 'TransferAsset', { EmployeeUUID: employee(2) });
  let record = await details(api, 7);
  expect(record.Location).toBe('Lahore');
  expect(record.CurrentEmployee.DisplayName).toBe('Bilal Ahmed');
  expect(record.Assignments).toHaveLength(2);
  expect(record.Assignments.filter(row => row.EndAt === null)).toHaveLength(1);
  expect(record.Assignments[0].EndAt).toBe(record.Assignments[1].StartAt);
  await act(api, 7, 'ReturnAsset');
  expect((await act(api, 7, 'RetireAsset')).CanDisposeAsset).toBe(true);
  expect((await act(api, 7, 'DisposeAsset')).Status).toBe('DISPOSED');
  record = await details(api, 7);
  expect(record.CurrentEmployeeUUID).toBeNull();
  expect(record.Assignments.every(row => row.EndAt && row.ClosedBy === 'EMP-0006')).toBe(true);
  expect(record.History.slice(1).map(row => [row.Action, row.OldStatus, row.NewStatus])).toEqual([
    ['MakeAvailable', 'RECEIVED', 'AVAILABLE'], ['AssignAsset', 'AVAILABLE', 'ASSIGNED'],
    ['TransferAsset', 'ASSIGNED', 'ASSIGNED'], ['ReturnAsset', 'ASSIGNED', 'AVAILABLE'],
    ['RetireAsset', 'AVAILABLE', 'RETIRED'], ['DisposeAsset', 'RETIRED', 'DISPOSED']
  ]);
  expect((await api.post(`${asset(7)}/ITOperations.AssignAsset`, { EmployeeUUID: employee(1), Reason: 'Invalid' })).status()).toBe(409);
});

test('repair preserves custody, validates ticket links and supports repeated repairs', async ({ request }) => {
  const api = client(request);
  await act(api, 2, 'SendForRepair', { TechnicianUUID: employee(4), TicketUUID: id('00000003', 7), Diagnosis: 'Display cable failed' });
  let record = await details(api, 2);
  expect(record).toMatchObject({ Status: 'IN_REPAIR', CurrentEmployeeUUID: employee(2), CanTransferAsset: false });
  expect(record.Repairs.filter(row => row.Status === 'OPEN')).toHaveLength(1);
  expect(record.Assignments.filter(row => row.EndAt === null)).toHaveLength(1);
  await act(api, 2, 'CompleteRepair', { RepairDescription: 'Replaced cable and tested display' });
  record = await details(api, 2);
  expect(record.Status).toBe('ASSIGNED');
  expect(record.Repairs.every(row => row.RepairedAt && row.Status === 'COMPLETED')).toBe(true);
  expect((await act(api, 5, 'SendForRepair', { TechnicianUUID: employee(5), TicketUUID: null, Diagnosis: 'Bench diagnostics' })).CurrentEmployeeUUID).toBeNull();
  expect((await act(api, 5, 'CompleteRepair', { RepairDescription: 'Passed bench tests' })).Status).toBe('AVAILABLE');
  expect((await act(api, 1, 'CompleteRepair', { RepairDescription: 'Replaced SSD' })).Status).toBe('ASSIGNED');
  await act(api, 1, 'SendForRepair', { TechnicianUUID: employee(4), Diagnosis: 'Follow-up diagnostics' });
  expect((await details(api, 1)).Repairs).toHaveLength(2);
});

test('invalid asset actions leave assignment, repair and history data unchanged', async ({ request }) => {
  const api = client(request);
  const before = await details(api, 2);
  for (const [action, data, status] of [
    ['TransferAsset', { EmployeeUUID: employee(2), Reason: 'Same employee' }, 400],
    ['TransferAsset', { EmployeeUUID: employee(99), Reason: 'Unknown employee' }, 400],
    ['ReturnAsset', { Reason: ' ' }, 400],
    ['RetireAsset', { Reason: 'Still assigned' }, 409],
    ['SendForRepair', { TechnicianUUID: employee(1), Diagnosis: 'Invalid technician' }, 400],
    ['SendForRepair', { TechnicianUUID: employee(4), TicketUUID: id('00000003', 1), Diagnosis: 'Wrong asset on ticket' }, 400],
    ['CompleteRepair', { RepairDescription: 'Not under repair' }, 409]
  ]) expect((await api.post(`${asset(2)}/ITOperations.${action}`, data)).status()).toBe(status);
  expect(await details(api, 2)).toEqual(before);
  expect((await api.post(`${asset(99)}/ITOperations.MakeAvailable`, { Reason: 'Missing' })).status()).toBe(404);
});

test('asset and child records reject direct writes', async ({ request }) => {
  const api = client(request);
  for (const [set, key] of [['Assets', 'AssetUUID'], ['AssetAssignments', 'AssetAssignmentUUID'], ['AssetRepairs', 'AssetRepairUUID'], ['AssetHistory', 'AssetHistoryUUID']]) {
    const record = (await json(await api.get(set))).value[0];
    expect((await api.post(set, record)).status()).toBe(405);
    expect((await api.patch(`${set}(${record[key]})`, { ...record })).status()).toBe(405);
    expect((await api.delete(`${set}(${record[key]})`)).status()).toBe(405);
  }
});

test('concurrent assignment creates only one open interval and lifecycle event', async ({ request }) => {
  const api = client(request);
  const results = await Promise.all([1, 2].map(n => api.post(`${asset(5)}/ITOperations.AssignAsset`, { EmployeeUUID: employee(n), Reason: 'Concurrent allocation' })));
  expect(results.map(response => response.status()).sort()).toEqual([200, 409]);
  const record = await details(api, 5);
  expect(record.Assignments).toHaveLength(1);
  expect(record.History.filter(row => row.Action === 'AssignAsset')).toHaveLength(1);
  const mine = await json(await api.get(`Employees(${record.CurrentEmployeeUUID})/Assets`));
  expect(mine.value.some(row => row.AssetUUID === record.AssetUUID)).toBe(true);
});

test('asset fixture validator rejects overlapping custody and inconsistent repairs', async () => {
  const { loadContract, validateAssetLifecycle } = await import('../scripts/validate-contract.mjs');
  const original = loadContract();
  const checks = [
    [model => { model.sets.Assets.rows[0].CurrentEmployeeUUID = employee(2); }, /Current custodian/],
    [model => { model.sets.AssetAssignments.rows[0].EndAt = '2026-09-02T08:00:00Z'; }, /intervals overlap/],
    [model => { model.sets.AssetRepairs.rows[0].TicketUUID = id('00000003', 7); }, /same asset/]
  ];
  for (const [mutate, expected] of checks) {
    const model = structuredClone(original); mutate(model);
    expect(() => validateAssetLifecycle(model)).toThrow(expected);
  }
});

test('failed lifecycle event write restores asset and assignment intervals', async () => {
  const contributor = require('../mock/data/Assets');
  const { loadContract } = await import('../scripts/validate-contract.mjs');
  const { sets } = loadContract();
  const data = Object.fromEntries(Object.entries(sets).map(([name, set]) => [name, structuredClone(set.rows)]));
  const before = structuredClone(data);
  const matches = (row, keys) => Object.entries(keys).every(([key, value]) => row[key] === value);
  const entity = name => ({
    fetchEntries: async keys => data[name].filter(row => matches(row, keys)),
    addEntry: async row => {
      if (name === 'AssetHistory') throw new Error('Simulated event storage failure');
      data[name].push(structuredClone(row));
    },
    updateEntry: async (keys, row) => Object.assign(data[name].find(item => matches(item, keys)), structuredClone(row)),
    removeEntry: async keys => { data[name] = data[name].filter(row => !matches(row, keys)); }
  });
  const context = { base: { ...entity('Assets'), getEntityInterface: async name => entity(name) },
    throwError(message) { throw new Error(message); } };
  await expect(contributor.executeAction.call(context, { name: 'ITOperations.TransferAsset' },
    { EmployeeUUID: employee(3), Reason: 'Transfer requiring atomic audit' }, { AssetUUID: id('00000002', 2) }, {})).rejects.toThrow('Simulated event storage failure');
  expect(data).toEqual(before);
});
