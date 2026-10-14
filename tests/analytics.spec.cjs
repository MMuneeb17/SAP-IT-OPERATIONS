const { test, expect } = require('@playwright/test');
const { calculate } = require('../apps/help-desk/webapp/ext/analytics/metrics');
const now = '2026-10-12T12:00:00Z';
const ticket = changes => ({ TicketUUID: 't', TicketNumber: 'IT-T', Subject: 'Example', Status: 'IN_PROGRESS', Priority: 'HIGH', SLAStatus: 'WITHIN_SLA', CreatedAt: '2026-10-01T12:00:00Z', AssetUUID: null, ...changes });
const asset = changes => ({ AssetUUID: 'a', AssetTag: 'A-1', Model: 'Laptop', Location: 'Karachi', Status: 'AVAILABLE', WarrantyEnd: null, ...changes });
const value = (result, id) => result.metrics.find(m => m.id === id).value;
test('current workload counts ignore period but exclude completed tickets and retain distinct breaches', () => {
  const data = { Tickets: [ticket({ CreatedAt: '2025-01-01T00:00:00Z', Priority: 'CRITICAL', SLAStatus: 'BREACHED' }), ticket({ TicketUUID: 'done', Status: 'CLOSED', Priority: 'CRITICAL', SLAStatus: 'BREACHED' })] };
  for (const days of [30, 90, 365]) { const r = calculate(data, now, days); expect(value(r, 'open')).toBe('1'); expect(value(r, 'critical')).toBe('1'); expect(value(r, 'breached')).toBe('1'); }
});
test('averages exclude missing and future responses and account for completed cycle pauses', () => {
  const data = { Tickets: [ticket({ FirstResponseAt: '2026-10-01T13:00:00Z' }), ticket({ TicketUUID: '2', FirstResponseAt: null }), ticket({ TicketUUID: '3', FirstResponseAt: '2026-11-01T00:00:00Z' }),
    ticket({ TicketUUID: '4', Status: 'RESOLVED', ResolutionStartedAt: '2026-10-02T12:00:00Z', ResolvedAt: '2026-10-02T14:00:00Z', SLAPausedSeconds: 1800 })] };
  const r = calculate(data, now, 30); expect(value(r, 'response')).toBe('60.0 min'); expect(r.groups.response).toHaveLength(1); expect(value(r, 'resolution')).toBe('90.0 min');
  expect(value(calculate({}, now, 30), 'response')).toBe('No samples');
});
test('warranty window uses UTC calendar dates and excludes retired, disposed, expired and missing values', () => {
  const r = calculate({ Assets: [asset({ WarrantyEnd: '2026-10-12' }), asset({ AssetUUID: '2', WarrantyEnd: '2027-01-10' }), asset({ AssetUUID: '3', WarrantyEnd: '2027-01-11' }), asset({ WarrantyEnd: '2026-10-11' }), asset({ Status: 'RETIRED', WarrantyEnd: '2026-11-01' }), asset({})] }, now, 90);
  expect(r.groups.warranty.map(x => x.key)).toEqual(['a', '2']);
});
test('incident frequency uses the selected creation cohort and ignores null asset references', () => {
  const r = calculate({ Assets: [asset({})], Tickets: [ticket({ AssetUUID: 'a' }), ticket({ TicketUUID: '2', AssetUUID: 'a' }), ticket({ TicketUUID: 'old', AssetUUID: 'a', CreatedAt: '2025-01-01T00:00:00Z' }), ticket({})] }, now, 30);
  expect(r.groups.incidents).toHaveLength(1); expect(r.groups.incidents[0].value).toBe('2 tickets');
});
test('low stock counts locations and compares available quantity to reorder level', () => {
  const r = calculate({ Stocks: [{ StockUUID: '1', MaterialUUID: 'm', AvailableQuantity: '0.000', ReorderLevel: '1.000', UnitOfMeasure: 'EA' }, { StockUUID: '2', MaterialUUID: 'm', AvailableQuantity: '2', ReorderLevel: '2', UnitOfMeasure: 'EA' }, { StockUUID: '3', AvailableQuantity: '3', ReorderLevel: '2' }] }, now, 30);
  expect(value(r, 'low')).toBe('2'); expect(r.groups.low[0].route).toBe('StocksObjectPage');
});
test('consumption keeps material units separate and nets returns exactly, including negative periods', () => {
  const movement = (key, type, quantity, material = 'm', unit = 'M') => ({ StockTransactionUUID: key, MaterialUUID: material, UnitOfMeasure: unit, MovementType: type, Quantity: quantity, CreatedAt: now });
  const r = calculate({ StockTransactions: [movement('1', 'ISSUE', '0.300'), movement('2', 'RETURN', '0.100'), movement('3', 'RETURN', '2', 'n', 'EA'), movement('4', 'RECEIVE', '10')] }, now, 30);
  expect(r.consumption.map(x => x.net)).toEqual(['0.200', '-2.000']); expect(r.consumptionRows('m')).toHaveLength(2); expect(r.groups.consumption).toHaveLength(3);
});
test('trend boundaries count events once and do not count reopened tickets as currently resolved', () => {
  const start = Date.parse(now) - 30 * 86400000, boundary = new Date(start + 7 * 86400000).toISOString();
  const r = calculate({ Tickets: [ticket({ CreatedAt: new Date(start).toISOString() }), ticket({ TicketUUID: 'boundary', CreatedAt: boundary }), ticket({ TicketUUID: 'now', CreatedAt: now }), ticket({ TicketUUID: 'future', CreatedAt: '2026-12-01T00:00:00Z' }), ticket({ TicketUUID: 'reopen', CreatedAt: '2025-01-01T00:00:00Z', ResolvedAt: boundary, Status: 'IN_PROGRESS' })] }, now, 30);
  expect(r.trend.reduce((n, b) => n + b.created, 0)).toBe(3); expect(r.trend[0].created).toBe(1); expect(r.trend[1].created).toBe(1); expect(r.trend.reduce((n, b) => n + b.resolved, 0)).toBe(0);
  expect(() => calculate({}, 'invalid', 30)).toThrow(); expect(() => calculate({}, now, 60)).toThrow();
});
test('consumption drill-down keeps the selected unit when a material has mixed-unit history', () => {
  const base = { MaterialUUID: 'm', MovementType: 'ISSUE', Quantity: '1', CreatedAt: now };
  const r = calculate({ StockTransactions: [{ ...base, StockTransactionUUID: 'one', UnitOfMeasure: 'EA' }, { ...base, StockTransactionUUID: 'two', UnitOfMeasure: 'M' }] }, now, 30);
  expect(r.consumption).toHaveLength(2);
  expect(r.consumptionRows('m', 'EA').map(x => x.key)).toEqual(['one']);
});
