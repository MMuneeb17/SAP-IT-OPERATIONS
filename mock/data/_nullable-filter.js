// FE mockserver 2.4.17 compares null GUID/string/date fields as string/date values.
// Keep OData null equality semantics at the supported contributor boundary.
module.exports = function createContributor() {
  return {
    checkSearchQuery(value, query) {
      return value != null && String(value).toLocaleLowerCase().includes(String(query).toLocaleLowerCase());
    },
    checkFilterValue(type, value, literal, operator, request) {
      if (literal === 'null' || literal === null) {
        if (operator === 'eq') return value == null;
        if (operator === 'ne') return value != null;
      }
      return this.base.checkFilterValue(type, value, literal, operator, request);
    }
  };
};
