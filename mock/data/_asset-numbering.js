// Local demonstration of internal number ranges, not live SAP Customizing.
// Production allocates numbers in the backend using the company/class range.
const companyCode = '1000';
const ranges = Object.freeze({
  LAPTOP: { assetClass: 'IT_LAPTOP', from: 100000000001, to: 109999999999 },
  DESKTOP: { assetClass: 'IT_DESKTOP', from: 110000000001, to: 119999999999 },
  MONITOR: { assetClass: 'IT_MONITOR', from: 120000000001, to: 129999999999 },
  PRINTER: { assetClass: 'IT_PRINTER', from: 130000000001, to: 139999999999 },
  NETWORK: { assetClass: 'IT_NETWORK', from: 140000000001, to: 149999999999 },
  OTHER: { assetClass: 'IT_OTHER', from: 190000000001, to: 199999999999 }
});
function allocate(type, count, assets) {
  const range = Object.hasOwn(ranges, type) ? ranges[type] : null;
  if (!range) throw new Error('Choose a supported equipment class.');
  let next = range.from;
  for (const asset of assets) {
    for (const value of [asset.AssetNumber, asset.AssetTag]) {
      if (/^\d{12}$/.test(value || '') && Number(value) >= range.from && Number(value) <= range.to) next = Math.max(next, Number(value) + 1);
    }
  }
  if (next + count - 1 > range.to) throw new Error('The asset number range is exhausted. Contact the administrator.');
  return Array.from({ length: count }, (_, i) => ({ CompanyCode: companyCode,
    AssetClass: range.assetClass, AssetNumber: String(next + i), AssetSubnumber: '0000', AssetTag: String(next + i) }));
}
module.exports = { allocate, ranges, companyCode };
