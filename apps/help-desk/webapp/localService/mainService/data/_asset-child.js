const readOnly = require('./_readonly');
const { INTERNAL } = require('./_workflow');
// Internal updates close assignment/repair intervals. HTTP callers cannot supply
// this Symbol. Removal exists only for rollback of newly inserted child records.
module.exports = () => ({
  ...readOnly(),
  updateEntry(keys, data, patch, request) {
    if (!request?.[INTERNAL]) this.throwError('Use an asset lifecycle action.', 405);
    return this.base.updateEntry(keys, data, request);
  },
  removeEntry(keys, request) {
    if (!request?.[INTERNAL]) this.throwError('Asset history cannot be deleted.', 405);
    return this.base.removeEntry(keys, request);
  }
});
