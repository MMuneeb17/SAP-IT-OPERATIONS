(function (factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else sap.ui.define([], factory);
}(function () {
  'use strict';
  const day = 86400000;
  const ms = value => value ? Date.parse(value) : NaN;
  const date = value => new Date(value).toISOString().slice(0, 10);
  const displayMinutes = n => n == null ? 'No samples' : n.toFixed(1) + ' min';
  function calculate(data, asOf, days) {
    const now = ms(asOf);
    if (!Number.isFinite(now) || ![30, 90, 365].includes(days)) throw Error('Choose a valid analysis time and period.');
    const start = now - days * day;
    const inPeriod = value => ms(value) >= start && ms(value) <= now;
    const tickets = data.Tickets || [], assets = data.Assets || [], stocks = data.Stocks || [];
    const materials = new Map((data.Materials || []).map(m => [m.MaterialUUID, m]));
    const ticketRow = t => ({ key: t.TicketUUID, title: t.TicketNumber, detail: t.Subject, value: t.Status, route: 'TicketsObjectPage' });
    const assetRow = a => ({ key: a.AssetUUID, title: a.AssetTag, detail: a.Model + ' · ' + a.Location, value: a.Status, route: 'AssetsObjectPage' });
    const current = tickets.filter(t => !['RESOLVED', 'CLOSED'].includes(t.Status));
    const cohort = tickets.filter(t => inPeriod(t.CreatedAt));
    const response = cohort.filter(t => Number.isFinite(ms(t.FirstResponseAt)) && ms(t.FirstResponseAt) >= ms(t.CreatedAt) && ms(t.FirstResponseAt) <= now)
      .map(t => ({ ...ticketRow(t), minutes: (ms(t.FirstResponseAt) - ms(t.CreatedAt)) / 60000 }));
    const resolution = tickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.Status) && inPeriod(t.ResolvedAt) && Number.isFinite(ms(t.ResolutionStartedAt)) && ms(t.ResolvedAt) >= ms(t.ResolutionStartedAt))
      .map(t => ({ ...ticketRow(t), minutes: Math.max(0, (ms(t.ResolvedAt) - ms(t.ResolutionStartedAt)) / 60000 - (t.SLAPausedSeconds || 0) / 60) }));
    const average = rows => rows.length ? rows.reduce((sum, r) => sum + r.minutes, 0) / rows.length : null;
    const incidents = new Map();
    for (const t of cohort) if (t.AssetUUID) incidents.set(t.AssetUUID, (incidents.get(t.AssetUUID) || 0) + 1);
    const high = assets.filter(a => (incidents.get(a.AssetUUID) || 0) >= 2).map(a => ({ ...assetRow(a), value: incidents.get(a.AssetUUID) + ' tickets' }));
    const today = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate());
    const warranty = assets.filter(a => !['RETIRED', 'DISPOSED'].includes(a.Status) && ms(a.WarrantyEnd) >= today && ms(a.WarrantyEnd) <= today + 90 * day)
      .map(a => ({ ...assetRow(a), value: a.WarrantyEnd }));
    const low = stocks.filter(s => Number(s.AvailableQuantity) <= Number(s.ReorderLevel)).map(s => ({ key: s.StockUUID,
      title: materials.get(s.MaterialUUID)?.MaterialNumber || s.MaterialUUID, detail: s.StorageLocation,
      value: Number(s.AvailableQuantity) + ' ' + s.UnitOfMeasure + ' available', route: 'StocksObjectPage' }));
    const movements = (data.StockTransactions || []).filter(m => ['ISSUE', 'RETURN'].includes(m.MovementType) && inPeriod(m.CreatedAt));
    const consumed = new Map();
    for (const m of movements) {
      const key = m.MaterialUUID + ':' + m.UnitOfMeasure;
      if (!consumed.has(key)) consumed.set(key, { key: m.MaterialUUID, title: materials.get(m.MaterialUUID)?.MaterialNumber || m.MaterialUUID,
        detail: materials.get(m.MaterialUUID)?.Description || '', unit: m.UnitOfMeasure, issued: 0, returned: 0, movementKeys: [] });
      const row = consumed.get(key);
      row[m.MovementType === 'ISSUE' ? 'issued' : 'returned'] += Math.round(Number(m.Quantity) * 1000);
      row.movementKeys.push(m.StockTransactionUUID);
    }
    const consumption = [...consumed.values()].map(r => ({ ...r, issued: (r.issued / 1000).toFixed(3), returned: (r.returned / 1000).toFixed(3),
      net: ((r.issued - r.returned) / 1000).toFixed(3) })).sort((a, b) => a.title.localeCompare(b.title));
    const movementRow = m => ({ key: m.StockTransactionUUID, title: materials.get(m.MaterialUUID)?.MaterialNumber || m.MaterialUUID,
      detail: m.MovementType + ' · ' + date(ms(m.CreatedAt)), value: m.Quantity + ' ' + m.UnitOfMeasure, route: 'StockTransactionsObjectPage' });
    const groups = {
      open: current.map(ticketRow), critical: current.filter(t => t.Priority === 'CRITICAL').map(ticketRow),
      breached: current.filter(t => t.SLAStatus === 'BREACHED').map(ticketRow),
      response: response.map(r => ({ ...r, value: displayMinutes(r.minutes) })),
      resolution: resolution.map(r => ({ ...r, value: displayMinutes(r.minutes) })),
      repairs: assets.filter(a => a.Status === 'IN_REPAIR').map(assetRow), warranty, incidents: high, low,
      consumption: movements.map(movementRow)
    };
    const metrics = [
      ['open', 'Open tickets', 'Current unresolved tickets'], ['critical', 'Critical tickets', 'Current unresolved critical tickets'],
      ['breached', 'SLA breaches', 'Current unresolved tickets with a response or resolution breach'],
      ['response', 'Average response time', 'Tickets created in the period with a recorded first response'],
      ['resolution', 'Average resolution time', 'Currently completed cycles resolved in the period; paused time excluded'],
      ['repairs', 'Assets under repair', 'Current equipment status'], ['warranty', 'Warranty expiring', 'Active assets expiring today through 90 days ahead (UTC)'],
      ['incidents', 'High incident assets', 'At least two tickets created in the selected period'],
      ['low', 'Low / out-of-stock locations', 'Available quantity at or below reorder level; parts only'],
      ['consumption', 'Inventory consumption', 'Issue and return movements in the selected period']
    ].map(([id, label, description]) => ({ id, label, description, count: groups[id].length,
      value: id === 'response' ? displayMinutes(average(response)) : id === 'resolution' ? displayMinutes(average(resolution)) : String(groups[id].length),
      scope: ['response', 'resolution', 'incidents', 'consumption'].includes(id) ? 'Selected period' : 'Current snapshot' }));
    // Fixed UTC intervals; these are event counts, not historical backlog snapshots.
    const width = days === 365 ? 30 : 7, trend = [];
    for (let from = start; from < now; from += width * day) {
      const to = Math.min(from + width * day, now), last = to === now;
      const belongs = value => ms(value) >= from && (last ? ms(value) <= to : ms(value) < to);
      const created = tickets.filter(t => belongs(t.CreatedAt)), resolved = tickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.Status) && belongs(t.ResolvedAt));
      trend.push({ id: String(trend.length), label: date(from) + ' – ' + date(to), created: created.length, resolved: resolved.length,
        createdRows: created.map(ticketRow), resolvedRows: resolved.map(ticketRow) });
    }
    const max = Math.max(1, ...trend.flatMap(t => [t.created, t.resolved]));
    for (const row of trend) { row.createdPercent = row.created / max * 100; row.resolvedPercent = row.resolved / max * 100; }
    return { asOf, start: new Date(start).toISOString(), metrics, groups, trend, consumption,
      consumptionRows: (key, unit) => movements.filter(m => m.MaterialUUID === key && (unit == null || m.UnitOfMeasure === unit)).map(movementRow) };
  }
  return { calculate };
}));
