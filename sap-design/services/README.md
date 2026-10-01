# Service design

Public root: `/odata/v4/it-operations/`. Namespace: `ITOperations`.
Future service: `ZUI_IT_OPERATIONS`, OData V4 UI binding `ZUI_IT_OPERATIONS_O4`.

Phase 2 implements Employees, Tickets, Assets, TicketComments and TicketHistory,
with typed UUID relationships, navigation bindings and deterministic sample data.

- [Current service contract and field dictionary](../../docs/service-contract.md)
- [Detailed future RAP mapping](rap-mapping.md)
- [Complete domain baseline](../data-model/entities.md)
- [Canonical local metadata and fixtures](../../mock/README.md)

Actions are documented as future business operations, not advertised as working
local endpoints. Inventory/assignment/repair entities remain later-phase work.
