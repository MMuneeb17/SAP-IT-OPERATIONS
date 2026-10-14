# Service design

Public local root: `/odata/v4/it-operations/`. Namespace: `ITOperations`.
Target service: `ZUI_IT_OPERATIONS`, OData V4 UI binding `ZUI_IT_OPERATIONS_O4`.

The local service implements 20 entity sets and 36 bound actions plus standard
POST /Tickets. The [Phase 10 package](../phase-10/README.md) maps the full contract
and provides a service definition template. No SAP binding is deployed yet.

- [Current service contract](../../docs/service-contract.md)
- [Complete field dictionary](../phase-10/field-dictionary.md)
- [Action signatures and rules](../phase-10/action-map.md)
- [Binding and migration decisions](../phase-10/service-migration.md)
- [Canonical local metadata and fixtures](../../mock/README.md)
- [Historical Phase 2 mapping](rap-mapping.md)

Compare generated SAP metadata before connecting Fiori. A matching URL does not
ensure matching namespaces, nullable fields, actions or ETags.
