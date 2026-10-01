# Phase 2 local OData contract

`metadata.xml` and `data/*.json` are the canonical service inputs.
The `data/*.js` contributors adapt null comparisons in the installed mock middleware;
they retain the native JSON loader and delegate all other filtering to SAP middleware. The five public
entity sets are Employees, Tickets, Assets, TicketComments and TicketHistory.
All people, identifiers and incidents are synthetic; email uses `example.test`.
The fixed September 2026 snapshot contains 6 employees, 6 assets, 9 tickets,
14 comments and 31 ticket history events. See the [contract](../docs/service-contract.md)
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

The supported phase 2 contract is read-only; capability annotations hide mutations
in Fiori. The general-purpose mock server is not a secured, persistent business
backend and may accept direct mutations outside this supported contract. Restart it
to restore fixtures. Do not use it as evidence of RAP behavior or authorization.
Create/actions, server validation and transactional concurrency come in later phases.
