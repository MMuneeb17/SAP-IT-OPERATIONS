# Local OData contract and Help Desk workflow

`metadata.xml` and `data/*.json` are the canonical service inputs.
The `data/*.js` contributors implement validated ticket creation/actions, protect
reference/audit records, adapt null comparisons and provide case-insensitive search.
They retain the native JSON loader. The twelve public entity sets are Employees,
Tickets, Assets, TicketComments, TicketHistory, AssetAssignments, AssetRepairs,
AssetHistory, Materials, Stocks, Reservations and StockTransactions.
All people, identifiers and incidents are synthetic; email uses `example.test`.
The fixed September 2026 snapshot contains 6 employees, 8 assets, 9 tickets,
14 comments, 31 ticket history events, 4 assignments, 2 repairs, 8 asset events,
3 materials, 4 stock locations, 2 reservations and 8 stock movements (99 records).
See the [contract](../docs/service-contract.md)
for fields, nullability, navigation, allowed codes, sample queries and limitations.

`npm run mock:sync` copies these inputs into the generated app's `localService`
directory. Root `npm start` and `npm run preview` synchronize automatically.
`npm run mock:check` detects stale copies; `npm run validate:contract` checks types,
keys and relationships; `npm test` runs both checks before service/browser tests.
After changing metadata, restart the server and reload the browser to clear caches.

The FE mock middleware serves OData V4 reads and batch requests with strict key
matching and no randomly generated records. Navigation is defined by EDMX partners,
referential constraints and entity-set bindings. UI-specific annotations live in
`apps/help-desk/webapp/annotations/annotation.xml`.

Phase 3 enables Tickets POST and eight bound workflow actions. Direct ticket
PATCH/DELETE and external writes to Employees, Assets, TicketComments and
TicketHistory are rejected. See the [workflow/API guide](../docs/help-desk-workflow.md).
Writes are serialized locally with audit history; this is not a secured, durable
backend or a promise of batch changeset atomicity. Restart to restore fixtures.
Workflow tests use unique `sap-client` namespaces so they do not modify preview data.

Phase 4 adds eight bound asset lifecycle actions. Direct writes to Assets and its
assignment/repair/history sets remain blocked. Actions update custody intervals,
repair completion and append lifecycle events using the same write queue as tickets.
See the [asset lifecycle guide](../docs/asset-lifecycle.md). There are 22 synchronized
files in Phase 4; the fixture validator also checks custody intervals and repair consistency.

Phases 5–6 add inventory and RequestPart actions, a compensating write journal,
ledger reconciliation and repair/ticket completion guards. There are now **31
synchronized files**. See the [inventory contract](../docs/inventory-workflow.md).
