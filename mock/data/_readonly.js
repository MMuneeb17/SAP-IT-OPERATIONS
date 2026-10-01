const nullable = require('./_nullable-filter');
const { INTERNAL } = require('./_workflow');
module.exports = function readOnly() {
  return {
    ...nullable(),
    addEntry(row, request) {
      if (request?.[INTERNAL]) return this.base.addEntry(row);
      this.throwError('This entity is read-only. Use ticket workflow actions.', 405);
    },
    onBeforeUpdateEntry() { this.throwError('This entity is read-only.', 405); },
    removeEntry() { this.throwError('Audit and reference records cannot be deleted.', 405); }
  };
};
