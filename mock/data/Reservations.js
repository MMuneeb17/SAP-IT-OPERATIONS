module.exports = {
  ...require('./_asset-child')(),
  executeAction(definition, parameters, keys, request) {
    return require('./_inventory').execute(this, 'Reservations', definition.name.split('.').at(-1), parameters, keys, request);
  }
};
