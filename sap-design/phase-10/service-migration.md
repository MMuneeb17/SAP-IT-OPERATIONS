# CDS exposure, compatibility and migration

## CDS and service construction

Create interface and projection entities using the names in blueprint.json.
The dictionary specifies persisted versus computed fields; navigation-map.md
specifies joins and composition ownership. Each child has a parent association;
redirect associations to exposed projections. Preserve collection and optional
association cardinality, including null Technician/Asset and reverse navigation.
Do not turn every reverse collection into a composition.

Expose projections with the aliases in service.srvd.example, then create an
OData V4 UI binding `ZUI_IT_OPERATIONS_O4`. A binding connects a service definition
to the communication protocol; the actual generated metadata must be inspected.
[SAP service binding documentation](https://help.sap.com/docs/abap-cloud/abap-rap/service-binding).

The old `ZC_IT_Inventory` proposal is an optional overview, not a merged replacement
for Materials, Stocks, Reservations or StockTransactions. Reuse Phase 9's
[analytical fact design](../analytics/README.md); apply authorization before
aggregation and keep quantities separated by unit. SQL-pushable computed fields
or a query provider must implement live SLA filtering/counting before paging.
Post-processing a single returned page produces incorrect counts and dashboards.

## UI and query mapping

| Existing artifact | Target responsibility |
| --- | --- |
| Metadata UI.LineItem, Identification and FieldGroup | Projection metadata extensions retain field/action labels and placement |
| Common.ValueList and text associations | Employee, asset, stock, category and configuration value helps with authorized filtering |
| Can* and criticality | Backend user/state feature control plus stable public computed fields |
| UnitOfMeasure and quantities | Quantity/unit annotations and exact decimal facets; same valid unit code mapping |
| Requester/Technician/Asset navigation | Redirected projections with matching keys and optionality |
| Root actions and custom-page bindings | Native actions with exact input/result semantics; explicit adapter mapping where native shape differs |

Validate `$select`, `$expand`, `$filter` (including null), `$orderby`, `$count`,
`$skip`, `$top` and `$search` against the real service. Order paged results stably
with UUID as a tie-breaker; support server-driven continuation through the OData
model. Filter authorized rows before count/aggregation. Freeze the evaluation
instant within each live-SLA query. Do not advertise an unsupported query option
or silently ignore it. Test the UI's `$batch` reads and independent commands;
membership in a batch does not itself make separate change sets atomic.

## Explicit compatibility decisions

| Surface | Preserve / adapt |
| --- | --- |
| Set names, technical keys, field semantics, navigation and workflows | Preserve as specified; domain redesign is not required |
| URL `/odata/v4/it-operations/` | Destination/proxy maps to the actual binding URL |
| Namespace `ITOperations` | Generated SAP namespace may differ; a URL proxy alone does not rename it |
| Collection CreateInventoryItem | Implement a supported static/factory action and verify binding/result; introduce a compatibility mapping if generated collection invocation differs |
| PreviewSLA | Keep POST read-only action semantics at the compatibility boundary, even if implemented internally as a query helper |
| Nullable public values | Test actual null serialization; if native CDS/SADL cannot preserve it, an explicit OData-aware mapping layer is required |
| Date/decimal facets and ETags | Verify generated EDMX and payloads; internal precision must not silently alter the public contract |

Preferred migration is native RAP exposure with a small **technical** frontend
namespace/endpoint configuration adjustment, preserving domain fields and routes.
Record every difference. Namespace-qualified action calls exist in
`ext/inventory/InventoryItem.controller.js`, `RepairWorkspace.controller.js`,
`ext/operations/Operations.controller.js` and action annotations. Update their
qualified names together. A compatibility gateway is the fallback when the
existing wire contract must remain byte-for-byte stable; it must understand
metadata, actions, errors, nulls, ETags and batch, not just forward paths. Never
claim drop-in compatibility before the target metadata/protocol tests pass.

## Migration sequence and rollback

1. Capture current metadata and export approved operational records through a
   controlled process. Do not commit real employee data, dumps or credentials.
2. Approve landscape gates, persistence authority, identity mapping and number
   ranges. Provision configuration through an audited migration identity.
3. Load identity mappings, configuration and Materials; then Assets/Tickets;
   then assignments/repairs/history, Stocks, Reservations and movements. Resolve
   dependency order in configuration (locations → teams → categories → subcategories).
4. Preserve UUIDs, legacy numbers/tags, null presence, timestamps and all origin
   references. Ensure number ranges cannot issue any imported business identifier.
5. Reconcile physical/reserved balances, transaction deltas, open assignments,
   repairs, issued/returned quantities, SLA snapshots and immutable history counts.
   Reject inconsistent imports instead of silently correcting custody or stock.
6. Compare generated metadata and payloads; implement approved technical mappings.
   Run acceptance against SAP using synthetic/UAT data and multiple identities.
7. Freeze writes for final delta transfer, reconcile again, back up destination
   data, then switch the destination and run smoke tests. No uncontrolled dual-write.
8. Before new SAP writes, a failed cutover can switch back to the prior service.
   After SAP writes, freeze and reconcile/export the delta before rollback; simply
   pointing the UI back at an old mock loses work. Production must never use the
   in-memory mock as its recovery database.

## Errors and authorization

Carry field-targeted validation messages into the Fiori message model. Distinguish
invalid inputs, not found, forbidden scope, stale state/ETag and unavailable
service. Exact HTTP status mapping depends on the binding and must be tested;
do not build business logic around a mock-only error text. Denied reads, expanded
collections, value helps and aggregate counts must not disclose inaccessible data.

Use [the role policy](../authorization/README.md) for explicit grants and scopes.
An IT Manager does not automatically receive mutation permission, and a System
Administrator does not inherit store/custody permissions. Administrative migration
privileges must be separate, time-bound and audited.
