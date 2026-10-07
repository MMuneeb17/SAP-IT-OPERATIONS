const { randomUUID } = require('node:crypto');
const { INTERNAL, serialize, fail, text, timestamp, history } = require('./_workflow');
const actor = { EmployeeUUID: '00000001-0000-4000-8000-000000000006', EmployeeNumber: 'EMP-0006' };
const limit = 999999999999999;
function units(value) {
  if (!['string', 'number'].includes(typeof value) || !/^-?\d{1,12}(\.\d{1,3})?$/.test(String(value))) throw new Error('Use a quantity with at most 12 whole digits and 3 decimal places.');
  const [whole, fraction = ''] = String(value).replace('-', '').split('.');
  const result = Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
  if (result > limit) throw new Error('Quantity exceeds the supported range.');
  return String(value).startsWith('-') ? -result : result;
}
const decimal = value => (value / 1000).toFixed(3);
function decorateStock(row) {
  const available = units(row.PhysicalQuantity) - units(row.ReservedQuantity);
  row.AvailableQuantity = decimal(available);
  row.LowStock = available <= units(row.ReorderLevel);
  row.StockCriticality = available === 0 ? 1 : row.LowStock ? 2 : 3;
  return row;
}
function decorateReservation(row) {
  row.OutstandingQuantity = row.Status === 'CANCELLED' ? '0.000' : decimal(units(row.Quantity) - units(row.IssuedQuantity));
  row.CanIssueReservation = ['OPEN', 'PARTIAL'].includes(row.Status);
  row.CanCancelReservation = row.CanIssueReservation;
  return row;
}
// All callers enter the same queue as ticket and asset actions. This journal
// compensates individual mock writes, including writes that throw after mutation.
async function commit(operations) {
  const applied = [], internal = { [INTERNAL]: true };
  try {
    for (const op of operations) {
      applied.push(op);
      if (op.before) await op.entity.updateEntry(op.keys, op.after, op.after, internal);
      else await op.entity.addEntry(op.after, internal);
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const op of applied.reverse()) {
      try {
        if (op.before) await op.entity.updateEntry(op.keys, op.before, op.before, internal);
        else await op.entity.removeEntry(op.keys, internal);
      } catch (rollbackError) { rollbackErrors.push(rollbackError); }
    }
    if (rollbackErrors.length) throw new AggregateError([error, ...rollbackErrors], 'Inventory write and compensation failed. Restart the local mock service.');
    throw error;
  }
}
async function execute(ctx, set, action, input, keys, request) {
  const interfaces = {}, operations = [], now = timestamp();
  const entity = async name => interfaces[name] ||= await ctx.base.getEntityInterface(name);
  const rows = async (name, filter = {}) => (await (await entity(name)).fetchEntries(filter, request)).map(row => structuredClone(row));
  const one = async (name, key, value) => {
    if (!value) fail(ctx, `Choose a valid ${name} record.`, 400, key);
    const result = (await rows(name, { [key]: value }))[0];
    if (!result) fail(ctx, `${name} record not found.`, 404, key);
    return result;
  };
  const save = async (name, key, after, before) => operations.push({ entity: await entity(name), keys: { [key]: after[key] }, after: structuredClone(after), before: before && structuredClone(before) });
  const quantity = (value, signed = false) => {
    let number;
    try { number = units(value); } catch (error) { fail(ctx, error.message, 400, 'Quantity'); }
    if (number === 0 || (!signed && number < 0)) fail(ctx, 'Quantity must be positive and nonzero.', 400, 'Quantity');
    return number;
  };
  const reason = text(ctx, input.Reason, 'Reason', 500);
  const q = action === 'CancelReservation' ? 0 : quantity(input.Quantity, action === 'AdjustStock');
  const rootKey = { Stocks: 'StockUUID', Reservations: 'ReservationUUID', Tickets: 'TicketUUID' }[set];
  const root = await one(set, rootKey, keys[rootKey]);
  const stock = set === 'Stocks' ? root : await one('Stocks', 'StockUUID', set === 'Tickets' ? input.StockUUID : root.StockUUID);
  const material = await one('Materials', 'MaterialUUID', stock.MaterialUUID);
  if (material.UnitOfMeasure === 'EA' && q % 1000) fail(ctx, 'EA materials require whole quantities.', 400, 'Quantity');
  let ticket = null, repair = null, asset = null, reservation = null;
  let result = root;
  const changeStock = async (before, physicalDelta, reservedDelta) => {
    if (units(before.PhysicalQuantity) + physicalDelta > limit || units(before.ReservedQuantity) + reservedDelta > limit) fail(ctx, 'Resulting quantity exceeds the supported range.', 400, 'Quantity');
    const next = { ...before, PhysicalQuantity: decimal(units(before.PhysicalQuantity) + physicalDelta), ReservedQuantity: decimal(units(before.ReservedQuantity) + reservedDelta), LastChangedAt: now };
    if (units(next.PhysicalQuantity) < 0 || units(next.ReservedQuantity) < 0 || units(next.PhysicalQuantity) < units(next.ReservedQuantity)) fail(ctx, 'Insufficient available stock. Reserved quantities cannot be consumed by another operation.', 409);
    decorateStock(next);
    await save('Stocks', 'StockUUID', next, before);
    return next;
  };
  const movement = async (target, kind, physicalDelta, reservedDelta, extra = {}) => {
    const row = { StockTransactionUUID: randomUUID(), MaterialUUID: target.MaterialUUID, StockUUID: target.StockUUID,
      ReservationUUID: reservation?.ReservationUUID || null, TicketUUID: ticket?.TicketUUID || null,
      AssetUUID: asset?.AssetUUID || null, AssetRepairUUID: repair?.AssetRepairUUID || null,
      MovementType: kind, Quantity: decimal(Math.abs(physicalDelta || reservedDelta)), PhysicalDelta: decimal(physicalDelta), ReservedDelta: decimal(reservedDelta),
      UnitOfMeasure: material.UnitOfMeasure, TransferUUID: null, OriginalTransactionUUID: null, Reason: reason, CreatedAt: now, CreatedBy: actor.EmployeeNumber, ...extra };
    await save('StockTransactions', 'StockTransactionUUID', row);
  };
  const references = async (ticketUUID, assetUUID, repairUUID) => {
    if (ticketUUID) {
      ticket = await one('Tickets', 'TicketUUID', ticketUUID);
      if (!['IN_PROGRESS', 'WAITING'].includes(ticket.Status)) fail(ctx, 'Parts can be requested or issued only for an in-progress or waiting ticket.', 409);
      if (assetUUID && ticket.AssetUUID !== assetUUID) fail(ctx, 'Ticket and asset must match.', 400);
      assetUUID = ticket.AssetUUID;
    }
    if (assetUUID) asset = await one('Assets', 'AssetUUID', assetUUID);
    if (repairUUID) {
      repair = await one('AssetRepairs', 'AssetRepairUUID', repairUUID);
      if (repair.Status !== 'OPEN' || repair.AssetUUID !== asset?.AssetUUID || repair.TicketUUID !== (ticket?.TicketUUID || null)) fail(ctx, 'Choose an open repair for the same ticket and asset.', 409);
    }
  };
  if (['ReserveStock', 'RequestPart'].includes(action)) {
    let ticketUUID = set === 'Tickets' ? root.TicketUUID : input.TicketUUID;
    let assetUUID = set === 'Tickets' ? root.AssetUUID : input.AssetUUID;
    let repairUUID = input.AssetRepairUUID;
    if (set === 'Tickets' && root.AssetUUID) {
      const open = (await rows('AssetRepairs', { AssetUUID: root.AssetUUID })).filter(row => row.Status === 'OPEN' && row.TicketUUID === root.TicketUUID);
      if (open.length !== 1) fail(ctx, 'Start a repair for this ticket before requesting a part.', 409);
      repairUUID = open[0].AssetRepairUUID;
    }
    await references(ticketUUID, assetUUID, repairUUID);
    if (asset && !repair) fail(ctx, 'Select an open repair when reserving parts for an asset.', 400);
    reservation = decorateReservation({ ReservationUUID: randomUUID(), MaterialUUID: stock.MaterialUUID, StockUUID: stock.StockUUID,
      TicketUUID: ticket?.TicketUUID || null, AssetUUID: asset?.AssetUUID || null, AssetRepairUUID: repair?.AssetRepairUUID || null,
      Quantity: decimal(q), IssuedQuantity: '0.000', Status: 'OPEN', Reason: reason, CancelReason: null, CreatedAt: now, CreatedBy: actor.EmployeeNumber, LastChangedAt: now });
    result = await changeStock(stock, 0, q);
    await save('Reservations', 'ReservationUUID', reservation);
    await movement(stock, 'RESERVE', 0, q);
  } else if (['IssueReservation', 'CancelReservation'].includes(action)) {
    reservation = root;
    if (!['OPEN', 'PARTIAL'].includes(root.Status)) fail(ctx, 'Reservation has already been fulfilled or cancelled.', 409);
    const outstanding = units(root.Quantity) - units(root.IssuedQuantity);
    if (action === 'IssueReservation') {
      await references(root.TicketUUID, root.AssetUUID, root.AssetRepairUUID);
      if (q > outstanding) fail(ctx, 'Issue quantity exceeds the remaining reservation.', 409);
      result = decorateReservation({ ...root, IssuedQuantity: decimal(units(root.IssuedQuantity) + q), Status: q === outstanding ? 'FULFILLED' : 'PARTIAL', LastChangedAt: now });
      await changeStock(stock, -q, -q);
      await movement(stock, 'ISSUE', -q, -q);
    } else {
      // Cancelling releases only the unissued remainder. Historical links remain.
      ticket = root.TicketUUID ? await one('Tickets', 'TicketUUID', root.TicketUUID) : null;
      asset = root.AssetUUID ? await one('Assets', 'AssetUUID', root.AssetUUID) : null;
      repair = root.AssetRepairUUID ? await one('AssetRepairs', 'AssetRepairUUID', root.AssetRepairUUID) : null;
      result = decorateReservation({ ...root, Status: 'CANCELLED', CancelReason: reason, LastChangedAt: now });
      await changeStock(stock, 0, -outstanding);
      await movement(stock, 'CANCEL', 0, -outstanding);
    }
    await save('Reservations', 'ReservationUUID', result, root);
  } else if (action === 'TransferStock') {
    const target = await one('Stocks', 'StockUUID', input.TargetStockUUID);
    if (target.StockUUID === stock.StockUUID || target.MaterialUUID !== stock.MaterialUUID) fail(ctx, 'Choose another stock location for the same material.', 400, 'TargetStockUUID');
    const transfer = randomUUID();
    result = await changeStock(stock, -q, 0);
    await changeStock(target, q, 0);
    await movement(stock, 'TRANSFER_OUT', -q, 0, { TransferUUID: transfer });
    await movement(target, 'TRANSFER_IN', q, 0, { TransferUUID: transfer });
  } else if (action === 'ReturnStock') {
    const original = await one('StockTransactions', 'StockTransactionUUID', input.IssueTransactionUUID);
    if (original.MovementType !== 'ISSUE' || original.StockUUID !== stock.StockUUID) fail(ctx, 'Select an issue from this stock location.', 400, 'IssueTransactionUUID');
    const returned = (await rows('StockTransactions', { OriginalTransactionUUID: original.StockTransactionUUID })).reduce((sum, row) => sum + units(row.Quantity), 0);
    if (returned + q > units(original.Quantity)) fail(ctx, 'Return quantity exceeds the unreturned issue quantity.', 409);
    reservation = await one('Reservations', 'ReservationUUID', original.ReservationUUID);
    ticket = original.TicketUUID ? await one('Tickets', 'TicketUUID', original.TicketUUID) : null;
    asset = original.AssetUUID ? await one('Assets', 'AssetUUID', original.AssetUUID) : null;
    repair = original.AssetRepairUUID ? await one('AssetRepairs', 'AssetRepairUUID', original.AssetRepairUUID) : null;
    result = await changeStock(stock, q, 0);
    await movement(stock, 'RETURN', q, 0, { OriginalTransactionUUID: original.StockTransactionUUID });
  } else if (['ReceiveStock', 'AdjustStock'].includes(action)) {
    result = await changeStock(stock, q, 0);
    await movement(stock, action === 'ReceiveStock' ? 'RECEIVE' : 'ADJUST', q, 0);
  } else fail(ctx, 'Unknown inventory action.', 400);
  if (ticket) {
    const label = ({ ReserveStock: 'PartRequested', RequestPart: 'PartRequested', IssueReservation: 'PartIssued', CancelReservation: 'PartCancelled', ReturnStock: 'PartReturned' })[action];
    await save('TicketHistory', 'TicketHistoryUUID', history(ticket, actor, label, ticket.Status, `${material.MaterialNumber}: ${reason}`, now));
  }
  if (asset) await save('AssetHistory', 'AssetHistoryUUID', { AssetHistoryUUID: randomUUID(), AssetUUID: asset.AssetUUID, ActorUUID: actor.EmployeeUUID,
    Action: ({ ReserveStock: 'PartRequested', RequestPart: 'PartRequested', IssueReservation: 'PartIssued', CancelReservation: 'PartCancelled', ReturnStock: 'PartReturned' })[action],
    OldStatus: asset.Status, NewStatus: asset.Status, OldEmployeeUUID: asset.CurrentEmployeeUUID, NewEmployeeUUID: asset.CurrentEmployeeUUID,
    Reason: `${material.MaterialNumber}: ${reason}`, CreatedAt: now });
  await commit(operations);
  return set === 'Tickets' ? root : result;
}
module.exports = { units, decimal, decorateStock, decorateReservation, commit,
  execute(ctx, set, action, input, keys, request) { return serialize(() => execute(ctx, set, action, input || {}, keys, request)); } };
