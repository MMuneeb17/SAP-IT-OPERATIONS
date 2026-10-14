# Backend implementation and acceptance

Phase 10 is a locally validated design package. Every SAP test below is **pending**;
passing JavaScript checks does not establish ABAP compilation, database atomicity,
authorization or target-release compatibility.

## Implementation order for Phase 11

1. Record the SAP product/release, ADT version, allowed language version, development
   package, transport route and service-binding support. Resolve the owners and
   integration decisions in [architecture](architecture.md).
2. Approve custom operational persistence, employee identity source and organization
   scopes. Approve number ranges and asset tag format; do not assume a mock tag is
   an SAP-wide standard or an FI-AA asset number.
3. Split the table template into individual ADT objects. Review types, indexes,
   uniqueness, nullable projections and timestamp support before activation.
4. Implement employee reference access, interface views and root/child compositions.
   Start with Ticket, then Asset, then Material and configuration roots.
5. Implement private behavior and transactional orchestration. Add scoped
   authorization, locks, validations, determinations, audit and feature control.
   Do not expose unrestricted child writes to make orchestration easier.
6. Create projection views/behaviors, UI annotations and value helps. Implement
   derived-field query semantics before claiming filtering or analytics parity.
7. Activate the service definition and OData V4 UI binding. Export its metadata;
   compare it with the field/navigation/action maps. Resolve namespace and nullable
   differences explicitly as described in [service migration](service-migration.md).
8. Test with separate users and concurrent sessions in a nonproduction client.
   Import reconciled fixtures, connect Fiori through its destination, and execute
   the existing workflows against SAP. Store results with release/transport IDs.
9. Obtain technical and business acceptance before cutover. Retain a tested
   rollback route to the previous supported backend, never production mock data.

## Evidence matrix

Existing tests are scenario references, not an assertion that they already run
against SAP. Adapt their connection, identity and fixture setup for the SAP client.

| ID | Required SAP proof | Local scenario reference |
| --- | --- | --- |
| SAP-01 | All 20 sets, keys, 243 fields, nulls, decimal facets, 59 navigations and 36 action signatures match the approved migration contract | `tests/contract.spec.cjs`; `npm run design:check` |
| SAP-02 | Ticket POST produces NEW with server identity/number/history; spoofed requester and forbidden writes fail | `tests/workflow.spec.cjs` |
| SAP-03 | Each allowed transition succeeds; invalid state, missing reason and unresolved repair/reservation prevent completion | `tests/workflow.spec.cjs`, `tests/operations.spec.cjs` |
| SAP-04 | Assign/transfer/return preserve one active custodian; repairs and retirement retain history | `tests/assets.spec.cjs` |
| SAP-05 | Equipment receipt creates one shared Asset per unit; quantity parts create none; concurrent receipts cannot duplicate approved tags | `tests/catalogue.spec.cjs` |
| SAP-06 | Reserve, partial issue, cancel, transfer, adjust and return conserve balances; cumulative return never exceeds original issue | `tests/inventory.spec.cjs` |
| SAP-07 | Concurrent reservations/issues/returns and opposing transfers satisfy every invariant in transactions.md | New SAP concurrent integration tests required |
| SAP-08 | Injected save failure leaves no partial balance, custody, reservation, movement or history | New SAP rollback tests required |
| SAP-09 | Same configuration Revision gives one winner; failed/stale writes create no audit; successful change creates exactly one | `tests/operations.spec.cjs` |
| SAP-10 | SLA exact deadlines, waiting pauses, completed cycles and read-only PreviewSLA preserve documented semantics | `tests/operations.spec.cjs` |
| SAP-11 | Counts and analytics apply authorization before aggregation; quantities remain separated by unit; no duplicate facts from joins | `tests/analytics.spec.cjs` |
| SAP-12 | Filter/search/order/count/paging/expand agree, including derived SLA fields and stable ordering | Contract and analytics tests plus SAP query tests |
| SAP-13 | Missing/stale If-Match follows approved binding policy; child writes invalidate appropriate root ETag | New SAP binding tests required |
| SAP-14 | Every role/scope denies unauthorized direct URLs, actions, expansions and counts; identity cannot be selected by browser header | Access-policy matrix plus separate SAP users |
| SAP-15 | Lost-response recovery avoids duplicate business writes; if idempotency extension is adopted, same-key replay returns original result and changed payload fails | New SAP recovery tests required |
| SAP-16 | Migrated row counts, references, stock totals, custody and number ranges reconcile; rollback rehearsal succeeds | Migration reconciliation scripts and signed evidence |
| SAP-17 | Fiori creation, repair, inventory, configuration and dashboard work against the activated service | `tests/phase3-ui.spec.cjs`, `tests/phase56-ui.spec.cjs`, `tests/phase78-ui.spec.cjs`, `tests/analytics-ui.spec.cjs` |

Phase 10 exits with the domain and contract mapped, local drift checks passing and
SAP gates explicit. Phase 11 exits only with activated backend artifacts and the
same Fiori workflows demonstrated against SAP. Production role provisioning,
workflow delivery and rollout remain later phases; baseline backend authorization
must already protect Phase 11 testing.
