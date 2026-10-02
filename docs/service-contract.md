# IT Operations OData service contract — phases 2–3

The contract supports Fiori reads of Employees, Tickets, Assets, TicketComments
and TicketHistory. Phase 3 adds validated ticket creation and workflow actions;
see the [operation signatures and walkthrough](help-desk-workflow.md). Durable
persistence and production authorization remain later work.

## Identity and source of truth

| Item | Contract |
| --- | --- |
| Protocol | OData V4 |
| Service root | `/odata/v4/it-operations/` |
| Local preview origin | `http://localhost:8082` |
| Metadata | `/odata/v4/it-operations/$metadata` |
| Namespace / container | `ITOperations` / `Container` |
| Canonical schema | [`mock/metadata.xml`](../mock/metadata.xml) |
| Runtime schema | [`apps/help-desk/webapp/localService/mainService/metadata.xml`](../apps/help-desk/webapp/localService/mainService/metadata.xml) |
| Canonical fixtures | [`mock/data/`](../mock/data/) |
| Runtime fixtures | [`apps/help-desk/webapp/localService/mainService/data/`](../apps/help-desk/webapp/localService/mainService/data/) |
| Planned SAP service | `ZUI_IT_OPERATIONS`, binding `ZUI_IT_OPERATIONS_O4` |

The canonical and runtime schemas must remain identical. UUID fields are technical
identifiers; TicketNumber, EmployeeNumber and AssetTag are business identifiers.
Use exact PascalCase names and UPPER_SNAKE_CASE status/priority codes. Missing
optional values are JSON `null`, never an empty GUID or empty date. All fixture
identities and contact details are fictional development data.

## Fields and relationships

The following tables mirror the EDMX. `String(n)` means `Edm.String` with maximum
length n; all other types retain the `Edm.` prefix. “Yes” in Nullable permits JSON
`null`. Every key is non-nullable. Employees are source master-data references and
have no local transactional audit fields.

### Employees

| Field | EDM type | Nullable |
| --- | --- | --- |
| `EmployeeUUID` (key) | Edm.Guid | No |
| `EmployeeNumber` | String(20) | No |
| `DisplayName` | String(100) | No |
| `Email` | String(254) | No |
| `Department` | String(80) | No |
| `Location` | String(80) | No |

| Navigation | Target set | Cardinality | Foreign key |
| --- | --- | --- | --- |
| `RequestedTickets` | Tickets | 0..* | Reverse association through partner |
| `AssignedTickets` | Tickets | 0..* | Reverse association through partner |
| `Assets` | Assets | 0..* | Reverse association through partner |

### Tickets

| Field | EDM type | Nullable |
| --- | --- | --- |
| `TicketUUID` (key) | Edm.Guid | No |
| `TicketNumber` | String(20) | No |
| `Subject` | String(200) | No |
| `Description` | String(4000) | No |
| `Status` | String(20) | No |
| `Priority` | String(10) | No |
| `Category` | String(40) | No |
| `RequesterUUID` | Edm.Guid | No |
| `TechnicianUUID` | Edm.Guid | Yes |
| `AssetUUID` | Edm.Guid | Yes |
| `Resolution` | String(4000) | Yes |
| `WaitingReason` | String(500) | Yes |
| `ResolvedAt` | Edm.DateTimeOffset | Yes |
| `ClosedAt` | Edm.DateTimeOffset | Yes |
| `CreatedAt` | Edm.DateTimeOffset | No |
| `CreatedBy` | String(80) | No |
| `LastChangedAt` | Edm.DateTimeOffset | No |
| `LastChangedBy` | String(80) | No |

Phase 3 adds non-null, service-computed `StatusCriticality` and `PriorityCriticality`
(`Edm.Int32`), plus `CanSubmit`, `CanAssignTechnician`, `CanStartWork`,
`CanPutOnHold`, `CanResume`, `CanResolve`, `CanClose` and `CanReopen` (`Edm.Boolean`).
DateTimeOffset fields use the default precision of zero: timestamps have whole seconds.

| Navigation | Target set | Cardinality | Foreign key |
| --- | --- | --- | --- |
| `Requester` | Employees | 1 | `RequesterUUID` |
| `Technician` | Employees | 0..1 | `TechnicianUUID` |
| `Asset` | Assets | 0..1 | `AssetUUID` |
| `Comments` | TicketComments | 0..* | Reverse association through partner |
| `History` | TicketHistory | 0..* | Reverse association through partner |

### Assets

| Field | EDM type | Nullable |
| --- | --- | --- |
| `AssetUUID` (key) | Edm.Guid | No |
| `AssetTag` | String(30) | No |
| `SerialNumber` | String(80) | Yes |
| `AssetType` | String(40) | No |
| `Manufacturer` | String(80) | No |
| `Model` | String(100) | No |
| `Status` | String(20) | No |
| `CurrentEmployeeUUID` | Edm.Guid | Yes |
| `Location` | String(80) | No |
| `PurchaseDate` | Edm.Date | Yes |
| `WarrantyEnd` | Edm.Date | Yes |
| `CreatedAt` | Edm.DateTimeOffset | No |
| `CreatedBy` | String(80) | No |
| `LastChangedAt` | Edm.DateTimeOffset | No |
| `LastChangedBy` | String(80) | No |

| Navigation | Target set | Cardinality | Foreign key |
| --- | --- | --- | --- |
| `CurrentEmployee` | Employees | 0..1 | `CurrentEmployeeUUID` |
| `Tickets` | Tickets | 0..* | Reverse association through partner |

### TicketComments

| Field | EDM type | Nullable |
| --- | --- | --- |
| `TicketCommentUUID` (key) | Edm.Guid | No |
| `TicketUUID` | Edm.Guid | No |
| `AuthorUUID` | Edm.Guid | No |
| `Text` | String(4000) | No |
| `CreatedAt` | Edm.DateTimeOffset | No |
| `CreatedBy` | String(80) | No |

| Navigation | Target set | Cardinality | Foreign key |
| --- | --- | --- | --- |
| `Ticket` | Tickets | 1 | `TicketUUID` |
| `Author` | Employees | 1 | `AuthorUUID` |

### TicketHistory

| Field | EDM type | Nullable |
| --- | --- | --- |
| `TicketHistoryUUID` (key) | Edm.Guid | No |
| `TicketUUID` | Edm.Guid | No |
| `ActorUUID` | Edm.Guid | No |
| `Action` | String(40) | No |
| `OldValue` | String(1000) | Yes |
| `NewValue` | String(1000) | Yes |
| `Reason` | String(4000) | Yes |
| `CreatedAt` | Edm.DateTimeOffset | No |
| `CreatedBy` | String(80) | No |

| Navigation | Target set | Cardinality | Foreign key |
| --- | --- | --- | --- |
| `Ticket` | Tickets | 1 | `TicketUUID` |
| `Actor` | Employees | 1 | `ActorUUID` |

`CreatedBy` and `LastChangedBy` are string actor identifiers, represented by
`EmployeeNumber` values in fixtures; they are not GUID foreign keys or navigation
properties. `AuthorUUID` and `ActorUUID` provide typed employee references for
comments and history. Category is currently descriptive text; configuration/value
help entities and category codes are deferred. Priority codes are `LOW`, `MEDIUM`,
`HIGH` and `CRITICAL`.

## Fixture coverage

| Set | Records | Coverage |
| --- | --- | --- |
| Employees | 6 | Requesters, technicians, supervisor and asset administrator |
| Assets | 6 | Assigned, repair, available and retired equipment; nullable custody and warranty |
| Tickets | 9 | All seven lifecycle states, four priorities, tickets with/without assets and technicians |
| TicketComments | 14 | Employee notes and technician work notes linked to tickets |
| TicketHistory | 31 | Ordered create/submit/assign/work/wait/resolve/close events |

`IT-10452` links Ayesha Khan to laptop `IT-LAP-00452`, a technician, comments and
history for the waiting-for-SSD scenario. This is a readable snapshot; reservation,
stock issue and repair orchestration remain future phases. Historical fixtures
demonstrate lifecycle context without implementing those actions.

## Read operations

Examples are relative to the service root. URL-encode spaces and other reserved
characters when sending requests. Replace `<TicketUUID>` with a returned UUID;
GUID key literals in OData V4 are unquoted.

```text
GET Employees?$select=EmployeeUUID,EmployeeNumber,DisplayName
GET Assets?$select=AssetUUID,AssetTag,Status&$expand=CurrentEmployee
GET Tickets?$count=true&$orderby=TicketNumber&$top=5&$skip=0
GET Tickets?$filter=Status eq 'WAITING'
GET Tickets?$select=TicketUUID,TicketNumber,Subject&$expand=Requester,Asset
GET Tickets(<TicketUUID>)?$expand=Comments($expand=Author),History($expand=Actor)
GET Tickets(<TicketUUID>)/Requester
GET Tickets(<TicketUUID>)/Comments?$orderby=CreatedAt
```

Supported local read patterns include collection/key reads, `$select`, `$filter`,
`$orderby`, `$top`, `$skip`, `$count=true`, navigation and `$expand`, including
nested relationships used by Fiori. Use an explicit stable `$orderby` when paging.
Clients must distinguish an empty collection (`value: []`) from a nullable to-one
relationship (`null`). `$count=true` reports the filtered collection count before
client paging. This phase does not define a maximum page size, server-driven
continuation policy, every filter function or a complete OData conformance claim.
Phase 3 enables case-insensitive `$search` on Tickets; it can be combined with
property filters, ordering and paging.

The installed FE mock middleware 2.4.17 mishandles equality filters on null
GUID/string/date fields. A small contributor adapter in `mock/data/_nullable-filter.js`
implements `eq null` and `ne null`, preserving the distinction from the quoted
string `'null'`. Service regression tests cover these cases; other comparisons
continue through the standard middleware.

The Fiori model uses OData batch reads and bound actions. Tickets permits insert;
direct update/delete remain disabled and are rejected by local contributors.
Other sets reject external insert/update/delete. Workflow actions append history
internally. Individual writes are serialized locally, but batch changeset rollback
and durable transaction guarantees are not part of this mock contract.

## Workflow and compatibility boundary

Ticket status values are `NEW`, `SUBMITTED`, `ASSIGNED`, `IN_PROGRESS`, `WAITING`,
`RESOLVED` and `CLOSED`. `Reopen` returns a ticket to `IN_PROGRESS`; `REOPENED` is
not a status. Asset lifecycle values are `RECEIVED`, `TAGGED`, `AVAILABLE`,
`ASSIGNED`, `IN_REPAIR`, `RETIRED` and `DISPOSED`; transfer and return are actions.
These are domain codes represented as strings; phase 3 ticket actions control
their permitted transitions. Asset lifecycle behavior remains later work.

Comments belong to a ticket; history captures ticket events and is append-only in
the future business model. Requester/technician/asset references cross root
boundaries and do not transfer ownership. Asset.CurrentEmployeeUUID represents
current custody; a historical ticket's requester need not match the current asset
custodian. Asset assignment and repair history are later entities.

Phase 3 exposes eight bound ticket actions. There are no ETag/If-Match guarantees,
draft entities, SLA calculations, role enforcement or authenticated identity.
Audit fields do not imply optimistic concurrency. Production concurrency, draft,
transactional errors and authorization must be verified against the SAP landscape.
See the [planned RAP mapping](../sap-design/services/rap-mapping.md).

Keep public identifiers stable. A future service change that renames/removes fields,
changes types/nullability or alters relationships needs an explicit contract
version decision and UI migration review. Adding SAP persistence requires checking
actual generated metadata and behavior, not merely changing the URL.
