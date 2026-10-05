# Phase 2 public service → planned RAP mapping

Status: implementation blueprint, 22 September 2026. The local read contract is
specified in [service-contract.md](../../docs/service-contract.md). This document
contains planned mappings, not deployed SAP artifacts or executable ABAP.

## Service boundary

Keep `/odata/v4/it-operations/`, namespace `ITOperations`, UUID keys, public field
names and navigation names stable. A destination/proxy will map that frontend path
to the future `ZUI_IT_OPERATIONS` service definition and `ZUI_IT_OPERATIONS_O4`
OData V4 UI service binding. Actual generated namespace and binding URLs must be
compared with UI annotations before migration; a matching URL alone is insufficient.

| Public entity set / type | Source or planned persistence | CDS interface → projection | Ownership |
| --- | --- | --- | --- |
| Employees / Employee | Released SAP employee/user source; no new HR master | ZI_IT_Employee → ZC_IT_EmployeeProfile | Read-only reference |
| Tickets / Ticket | ZIT_TICKET | ZI_IT_Ticket → ZC_IT_Ticket | RAP root |
| Assets / Asset | ZIT_ASSET | ZI_IT_Asset → ZC_IT_Asset | RAP root |
| TicketComments / TicketComment | ZIT_TICKET_COMMENT | ZI_IT_TicketComment → ZC_IT_TicketComment | Ticket composition child |
| TicketHistory / TicketHistory | ZIT_TICKET_HISTORY | ZI_IT_TicketHistory → ZC_IT_TicketHistory | Ticket composition child, read-only externally |

The table names are design identifiers. Validate supported ABAP identifier lengths,
released APIs, source availability and RAP features against the target release.
Employee UUIDs require a stable mapping to the source identity; employee numbers
and email addresses must not replace technical keys. `CreatedBy` and
`LastChangedBy` are string actor identifiers (EmployeeNumber in local fixtures),
not GUID associations or an assumed SAP login. AuthorUUID and ActorUUID provide
explicit UUID associations to the employee reference for comments/history.

## Types, associations and behavior

Map UUIDs to an ABAP UUID representation exposed as `Edm.Guid`; strings retain
public maximum lengths, UTC audit timestamps retain `Edm.DateTimeOffset`, and
warranty dates retain `Edm.Date`. Optional UUIDs/dates/text remain nullable across
the service boundary rather than becoming empty strings or zero UUIDs. Confirm
actual generated precision and null handling with metadata and payload tests.

Ticket's Comments and History become compositions with child-to-parent Ticket
associations. Requester, Technician, Asset, Author, Actor and CurrentEmployee are
cross-object associations. Reverse navigation is a query association, not ownership.
Service projections must expose and redirect associations so their public names,
cardinality and navigation bindings match the phase 2 EDMX.

Use managed persistence where supported and appropriate; integrate released SAP
master data through a read-only projection or query provider. Backend behaviors
must own number assignment, timestamps, actor identity, validations, authorization,
state transitions and audit writes. Fiori controls and fixtures do not enforce
these rules. Retain root records with audit dependencies; composition does not
permit deleting history. Comments/history must remain attached to their root.

## Ticket actions — implemented locally in phase 3, planned for RAP

| Action | Proposed input | Result / required backend rule |
| --- | --- | --- |
| Submit | Ticket context | NEW → SUBMITTED; requester and required incident details validated |
| AssignTechnician | TechnicianUUID | SUBMITTED → ASSIGNED; technician eligibility validated; reassignment policy to be finalized |
| StartWork | Ticket context | ASSIGNED → IN_PROGRESS; assigned technician and authorization checked |
| PutOnHold | Reason | IN_PROGRESS → WAITING; nonblank reason and history required |
| Resume | Ticket context | WAITING → IN_PROGRESS; previous wait retained in history |
| Resolve | Resolution | IN_PROGRESS → RESOLVED; nonblank resolution required |
| Close | Ticket context | RESOLVED → CLOSED; employee confirmation/authorized closure |
| Reopen | Reason | RESOLVED → IN_PROGRESS; nonblank reason required |

Phase 3 now defines these bound actions in EDMX, with a Ticket return value and
the [parameters/errors documented in the workflow guide](../../docs/help-desk-workflow.md).
Local contributors implement validation and history; the target RAP package must
implement the corresponding behavior with real identity, authorization, locking
and transactional guarantees. Reassignment and reopening CLOSED tickets are not
supported in the MVP. `Reopen` is never a persisted `REOPENED` status.

Phase 4 implements MakeAvailable, AssignAsset, TransferAsset, ReturnAsset,
SendForRepair, CompleteRepair, RetireAsset and DisposeAsset locally. AssetAssignments,
AssetRepairs and AssetHistory are now concrete sets; map them to asset-owned RAP
children. Tag allocation remains future work. Materials, Stocks, Reservations
and StockTransactions remain later entities.
See the [asset contract and RAP continuation](../../docs/asset-lifecycle.md) for
parameters, ownership, persistence mappings and consistency requirements.

## Concurrency, transactions and security decisions

Phase 2 supplies no ETag or draft contract. `LastChangedAt` is an audit value,
not a promise that If-Match works. Choose and validate RAP ETag/total ETag fields,
lock ownership, draft capability and generated draft keys against the target
release before enabling writes. Read-only batch requests support the local UI;
this does not specify transactional change sets, atomicity or rollback behavior.

Future backend writes must validate references, status codes, transition
eligibility and authorized actors and append history in the same logical
transaction. Audit/event records are append-only to business users. Implement
RAP authorization and CDS access controls according to the phase 8 role design;
the local preview has no authenticated user or production security boundary.

## Migration acceptance

1. Compare metadata entity-set aliases, namespace references, keys, field types,
   lengths, nullability and all navigation bindings with the canonical local EDMX.
2. Exercise key reads, null associations, reverse collections, nested expansion,
   projection, filtering, ordering, counts and paging with the same service tests.
3. Confirm OData V4 error payloads, batch behavior, server paging and continuation
   links in the target environment; do not infer full protocol parity from mocks.
4. Define and test action signatures, validation errors, authorization, concurrency
   conflicts and draft flows before enabling Fiori mutation controls.
5. Change destination/proxy configuration and rerun Fiori acceptance tests with
   real data. No SAP deployment or drop-in compatibility is claimed by phase 2.

See the [phase 0 RAP inventory](../rap/baseline.md) for later inventory and
cross-module mappings and the [architecture](../../docs/architecture.md) for
ownership and consistency rules.
