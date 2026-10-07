module.exports = {
  ...require('./_asset-child')(),
  executeAction(definition, parameters, keys, request) {
    return require('./_inventory').execute(this, 'Stocks', definition.name.split('.').at(-1), parameters, keys, request);
  }
};
