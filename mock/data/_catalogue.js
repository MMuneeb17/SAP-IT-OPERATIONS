const { randomUUID } = require('node:crypto');
const { serialize, fail, text, timestamp } = require('./_workflow');
const { units, decimal, decorateStock, commit } = require('./_inventory');
const { decorateAsset } = require('./_asset-workflow');
const numbering = require('./_asset-numbering');
const actor = '00000001-0000-4000-8000-000000000006';
function date(ctx, value, name, optional = false) {
  if (optional && !value) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail(ctx, `Enter a valid ${name}.`, 400, name);
  return value;
}
async function execute(ctx, action, input, keys, request) {
  const interfaces = {}, operations = [], now = timestamp();
  const entity = async name => interfaces[name] ||= await ctx.base.getEntityInterface(name);
  const rows = async name => (await (await entity(name)).fetchEntries({}, request)).map(r => structuredClone(r));
  const insert = async (name, key, row) => operations.push({ entity: await entity(name), keys: { [key]: row[key] }, after: row });
  if (!['CreateInventoryItem', 'ReceiveEquipment'].includes(action)) fail(ctx, 'Unknown catalogue action.', 400);
  const reason = text(ctx, input.Reason, 'Reason', 500);
  const location = text(ctx, input.StorageLocation, 'StorageLocation', 100);
  const materials = await rows('Materials');
  let material;
  if (action === 'CreateInventoryItem') {
    const number = text(ctx, input.MaterialNumber, 'MaterialNumber', 40).toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9._-]*$/.test(number)) fail(ctx, 'Use letters, numbers, dots, hyphens or underscores for the material number.', 400, 'MaterialNumber');
    if (materials.some(r => r.MaterialNumber.toUpperCase() === number)) fail(ctx, 'This material number already exists. Open the existing item to receive more units.', 409, 'MaterialNumber');
    if (!['EQUIPMENT', 'QUANTITY'].includes(input.TrackingMode)) fail(ctx, 'Choose equipment or quantity tracking.', 400, 'TrackingMode');
    if (!['EA', 'M'].includes(input.UnitOfMeasure) || (input.TrackingMode === 'EQUIPMENT' && input.UnitOfMeasure !== 'EA')) fail(ctx, 'Equipment must use EA; parts may use EA or M.', 400, 'UnitOfMeasure');
    material = { MaterialUUID: randomUUID(), MaterialNumber: number, Description: text(ctx, input.Description, 'Description', 200),
      Category: text(ctx, input.Category, 'Category', 100), UnitOfMeasure: input.UnitOfMeasure, TrackingMode: input.TrackingMode,
      AssetType: null, Manufacturer: null, Model: null, TotalAssets: 0, AvailableAssets: 0 };
    if (material.TrackingMode === 'EQUIPMENT') {
      if (!Object.hasOwn(numbering.ranges, input.AssetType)) fail(ctx, 'Choose a supported equipment class.', 400, 'AssetType');
      material.AssetType = input.AssetType;
      material.Manufacturer = text(ctx, input.Manufacturer, 'Manufacturer', 100);
      material.Model = text(ctx, input.Model, 'Model', 100);
    }
    await insert('Materials', 'MaterialUUID', material);
  } else {
    material = materials.find(r => r.MaterialUUID === keys.MaterialUUID);
    if (!material) fail(ctx, 'Material not found.', 404);
    if (material.TrackingMode !== 'EQUIPMENT') fail(ctx, 'Use Receive Stock for quantity-tracked parts.', 400);
  }
  let quantity;
  try { quantity = units(input.Quantity); } catch (error) { fail(ctx, error.message, 400, 'Quantity'); }
  if (quantity <= 0 || (material.UnitOfMeasure === 'EA' && quantity % 1000)) fail(ctx, 'Enter a positive quantity; EA requires whole units.', 400, 'Quantity');
  if (material.TrackingMode === 'EQUIPMENT') {
    const count = quantity / 1000;
    if (count > 100) fail(ctx, 'Receive at most 100 equipment units at a time.', 400, 'Quantity');
    const serials = text(ctx, input.SerialNumbers, 'SerialNumbers', 10000).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (serials.length !== count || serials.some(s => s.length > 100)) fail(ctx, 'Enter one serial number per unit, one per line (maximum 100 characters each).', 400, 'SerialNumbers');
    const assets = await rows('Assets');
    const seen = new Set(assets.filter(a => a.SerialNumber).map(a => a.SerialNumber.trim().toUpperCase()));
    for (const serial of serials) {
      if (seen.has(serial.toUpperCase())) fail(ctx, 'A serial number is duplicated or already registered.', 409, 'SerialNumbers');
      seen.add(serial.toUpperCase());
    }
    const purchased = date(ctx, input.PurchaseDate, 'PurchaseDate');
    const warranty = date(ctx, input.WarrantyEnd, 'WarrantyEnd', true);
    if (warranty && warranty < purchased) fail(ctx, 'Warranty end cannot precede purchase date.', 400, 'WarrantyEnd');
    let allocated;
    try { allocated = numbering.allocate(material.AssetType, count, assets); } catch (error) { fail(ctx, error.message, 409); }
    for (let i = 0; i < count; i++) {
      const asset = decorateAsset({ AssetUUID: randomUUID(), MaterialUUID: material.MaterialUUID, ...allocated[i], SerialNumber: serials[i],
        AssetType: material.AssetType, Manufacturer: material.Manufacturer, Model: material.Model,
        Status: 'AVAILABLE', CurrentEmployeeUUID: null, Location: location, PurchaseDate: purchased, WarrantyEnd: warranty,
        CreatedAt: now, CreatedBy: 'EMP-0006', LastChangedAt: now, LastChangedBy: 'EMP-0006' });
      await insert('Assets', 'AssetUUID', asset);
      await insert('AssetHistory', 'AssetHistoryUUID', { AssetHistoryUUID: randomUUID(), AssetUUID: asset.AssetUUID, ActorUUID: actor,
        Action: 'ReceiveEquipment', OldStatus: null, NewStatus: 'AVAILABLE', OldEmployeeUUID: null, NewEmployeeUUID: null, Reason: reason, CreatedAt: now });
    }
    material.TotalAssets = assets.filter(a => a.MaterialUUID === material.MaterialUUID).length + count;
    material.AvailableAssets = assets.filter(a => a.MaterialUUID === material.MaterialUUID && a.Status === 'AVAILABLE').length + count;
  } else {
    let reorder;
    try { reorder = units(input.ReorderLevel ?? '0'); } catch (error) { fail(ctx, error.message, 400, 'ReorderLevel'); }
    if (reorder < 0 || (material.UnitOfMeasure === 'EA' && reorder % 1000)) fail(ctx, 'Reorder level must be nonnegative and use whole units for EA.', 400, 'ReorderLevel');
    const stock = decorateStock({ StockUUID: randomUUID(), MaterialUUID: material.MaterialUUID,
      StockLabel: `${material.MaterialNumber} / ${location}`, StorageLocation: location, UnitOfMeasure: material.UnitOfMeasure,
      PhysicalQuantity: decimal(quantity), ReservedQuantity: '0.000', ReorderLevel: decimal(reorder), LastChangedAt: now });
    await insert('Stocks', 'StockUUID', stock);
    await insert('StockTransactions', 'StockTransactionUUID', { StockTransactionUUID: randomUUID(), MaterialUUID: material.MaterialUUID,
      StockUUID: stock.StockUUID, ReservationUUID: null, TicketUUID: null, AssetUUID: null, AssetRepairUUID: null,
      MovementType: 'RECEIVE', Quantity: decimal(quantity), PhysicalDelta: decimal(quantity), ReservedDelta: '0.000',
      UnitOfMeasure: material.UnitOfMeasure, TransferUUID: null, OriginalTransactionUUID: null, Reason: reason, CreatedAt: now, CreatedBy: 'EMP-0006' });
  }
  await commit(operations);
  return material;
}
async function decorate(ctx, records, request) {
  const entity = await ctx.base.getEntityInterface('Assets');
  const assets = await entity.fetchEntries({}, request);
  return records.map(row => ({ ...row, TotalAssets: assets.filter(a => a.MaterialUUID === row.MaterialUUID).length,
    AvailableAssets: assets.filter(a => a.MaterialUUID === row.MaterialUUID && a.Status === 'AVAILABLE').length }));
}
module.exports = { decorate, execute: (ctx, action, input, keys, request) => serialize(() => execute(ctx, action, input || {}, keys, request)) };
