const catalogue = require('./_catalogue');
module.exports = {
  ...require('./_asset-child')(),
  async getAllEntries(request) { return catalogue.decorate(this, await this.base.getAllEntries(request), request); },
  async fetchEntries(keys, request) { return catalogue.decorate(this, await this.base.fetchEntries(keys, request), request); },
  executeAction(definition, parameters, keys, request) {
    return catalogue.execute(this, definition.name.split('.').at(-1), parameters, keys, request);
  }
};
