const allowed = {
  MakeAvailable: ['RECEIVED', 'TAGGED'], AssignAsset: ['AVAILABLE'],
  TransferAsset: ['ASSIGNED'], ReturnAsset: ['ASSIGNED'],
  SendForRepair: ['AVAILABLE', 'ASSIGNED'], CompleteRepair: ['IN_REPAIR'],
  RetireAsset: ['AVAILABLE'], DisposeAsset: ['RETIRED']
};
function decorateAsset(asset) {
  asset.StatusCriticality = ({ RECEIVED: 0, TAGGED: 0, AVAILABLE: 3, ASSIGNED: 5, IN_REPAIR: 2, RETIRED: 0, DISPOSED: 0 })[asset.Status];
  for (const [action, states] of Object.entries(allowed)) asset[`Can${action}`] = states.includes(asset.Status);
  return asset;
}
module.exports = { allowed, decorateAsset };
