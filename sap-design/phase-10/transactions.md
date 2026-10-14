# Transactions, locking and recovery

## One command, one consistent unit of work

A stock issue must not commit its balance before its reservation, movement and
ticket history. Equipment receipt must not leave a catalogue row with only half
its assets. Use a single SAP LUW and the RAP transactional buffer for every write
set in the action map. The mock's JavaScript queue and compensating journal are
not an implementation of distributed SAP locking or database atomicity.

SAP prohibits COMMIT WORK, ROLLBACK WORK, COMMIT ENTITIES and ROLLBACK ENTITIES
inside RAP handlers. Let the RAP/OData transaction owner run the save sequence.
An external EML consumer may own commit/rollback at its transaction boundary.
Use the transactional buffer for validation; do not read only persisted rows and
miss staged modifications. [SAP handler contract](https://help.sap.com/docs/ABAP_PLATFORM_NEW/fc4c71aa50014fd1b43721701471913d/1040b81372d44ed38b07a409fa0e1769.html).

## Lock policy

Ticket and Asset are lock masters; their children depend on the parent. Material
is the lock master for Stocks, Reservations and StockTransactions, including
direct child-bound actions. Configuration roots lock independently. Discover the
full dependency set from authorized records, lock, then reread and validate.
If a link changed during discovery, abort and retry from fresh context.

For cross-BO actions use a nonblocking lock coordinator with target-release
supported custom lock implementations (`lock master unmanaged` where needed).
Canonical acquisition order is Tickets, Assets, Materials, configuration; within
a family sort UUIDs. A request may already hold its bound BO lock before entering
the action: never block waiting for another root in that situation. A failed
additional acquisition aborts the request; the runtime rolls back/releases its
locks. Return a conflict for refresh/retry. Bound the retry count and backoff to
avoid livelock. Do not claim ordering alone fixes locks acquired by the framework
before the coordinator runs. [SAP lock definitions](https://help.sap.com/docs/abap-cloud/abap-rap/lock-definition).

```mermaid
sequenceDiagram
  participant U as Fiori
  participant B as RAP action
  participant L as Lock coordinator
  participant T as Transactional buffer
  participant D as Database
  U->>B: IssueReservation(key, quantity, reason, If-Match)
  B->>B: Authenticate and check scope
  B->>L: Acquire related ticket / asset / material locks (no wait)
  L-->>B: Locks or conflict
  B->>T: Reread reservation, stock and linked repair
  B->>T: Validate; stage balance, reservation, movement, history
  B-->>U: Pending result / reported failure
  Note over B,D: RAP transaction owner runs save sequence
  T->>D: Save all changes atomically
  D-->>U: Committed response and ETag, or failure
```

## Concurrency invariants

| Concurrent requests | Required outcome |
| --- | --- |
| Two reservations for the last available item | One success; other conflict; availability never negative |
| Two issues against one reservation | Combined issues never exceed original quantity; only committed movements |
| Two returns against one original issue | Sum of returns <= issue; serialize through original material root |
| Transfer A→B and B→A | No deadlock from blocking additional locks; either serialized success or retriable conflict |
| CompleteRepair versus RequestPart | No completed repair with a newly outstanding request |
| Resolve versus linked issue/repair update | Re-evaluate linked reservations/repairs while holding relevant roots |
| Concurrent equipment receipt | Unique tags, serial checks and Material totals from committed Asset rows |
| Two configuration edits with same Revision | Exactly one success and one audit entry; other stale-write failure |

Use separate high-resolution LocalChangedAt for optimistic concurrency. Keep
Revision checks for existing configuration action compatibility. On child writes,
bump the Material/Asset/Ticket root timestamp as appropriate, including history
appends, so dependent ETags invalidate. A bound root's ETag does not validate other
roots: lock and reread them. Confirm generated If-Match behavior for each action
on the target binding; never assume the mock already enforces ETags.

## Retry and failure policy

- Reject stale ETags with the binding's concurrency error and stale Revision
  with a domain conflict. UI refreshes the bound context and affected lists.
- No automatic blind retry for receipt, create, issue, transfer or return after
  a lost response. First reconcile by returned/correlated UUID and audit evidence.
- A production idempotency extension can use ZIT_IDEM: client request ID + actor
  + operation, a canonical payload hash and successful result IDs. Claim/check
  it under a unique key and persist it with the business transaction. Same key
  and payload returns original result; different payload rejects. This is an
  explicit contract extension, not a feature of the current mock or action fields.
- Inject failures before persistence and during save: no partial balance,
  assignment, reservation, movement or audit may remain. Number-range gaps may
  remain; never recycle numbers solely because a business transaction rolled back.
- No emails, remote stock postings or external side effects before commit. An
  eventual integration needs a transactional outbox/reconciliation design in its
  own phase. A remote BAPI that commits independently cannot satisfy this package's
  single-LUW guarantee merely by being called from a RAP handler.

Do not use cross-BO `IN LOCAL MODE` to bypass authorization: SAP restricts local
mode to consumption within the same behavior pool. Cross-BO orchestration must
use approved interfaces and explicit scoped checks. [SAP EML reference](https://help.sap.com/docs/abap-cloud/abap-rap/entity-manipulation-language-eml).
