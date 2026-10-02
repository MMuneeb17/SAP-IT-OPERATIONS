# Phase 3 Help Desk workflow

The local Help Desk MVP uses the existing OData V4 service. It adds a guided
**My IT Support** page and ticket actions to the Fiori Elements object page.
Changes are held in mock-server memory and survive browser refresh, but reset
when the server restarts or fixtures reload. This is not a persistent SAP backend.

## Employee flow

1. Open Help Desk and choose **My IT Support**.
2. Select a preview employee. The table shows that employee's tickets; the asset
   selector shows their assigned equipment, including equipment under repair.
3. Enter subject, category, description and priority. Choose an asset or
   **No specific asset**. Choose **Create ticket**.
4. Review the new ticket and choose **Submit ticket**.
5. Return to Help Desk to see the request in the Fiori List Report. Later, open
   the resolved ticket and choose **Confirm and close**, or **Reopen ticket**
   with a reason.

The preview employee selector is a simulation, not authentication. Actor values
are determined locally: requester for create/submit/close/reopen, demo supervisor
EMP-0006 for assignment, assigned technician for work/hold/resume/resolve.
All preview users can exercise this flow. Production roles and authenticated
identity remain phases 8 and 12.

## Service operations

`POST /odata/v4/it-operations/Tickets` accepts Subject (1–200), Description
(1–4000), Category, Priority, RequesterUUID and optional AssetUUID. Text is trimmed;
blank required text, invalid references, unknown categories/priorities and assets
not assigned to the requester are rejected. Categories are Hardware, Software,
Network, SAP, Email, Printer, Access and Other. Priority defaults to MEDIUM.

The service assigns UUID, ticket number, NEW status and audit values, ignoring
client attempts to set service-owned fields. It appends a Create history event.
Missing asset references are represented as null. Shared equipment may still
appear in historical fixtures; new employee requests select assigned equipment
or no specific asset.

Bound action endpoint: `POST Tickets(<TicketUUID>)/ITOperations.<Action>`.

| Action | JSON parameters | Transition |
| --- | --- | --- |
| Submit | `{}` | NEW → SUBMITTED |
| AssignTechnician | `{"TechnicianUUID":"<UUID>"}` | SUBMITTED → ASSIGNED |
| StartWork | `{}` | ASSIGNED → IN_PROGRESS |
| PutOnHold | `{"Reason":"<1–500 characters>"}` | IN_PROGRESS → WAITING |
| Resume | `{}` | WAITING → IN_PROGRESS |
| Resolve | `{"Resolution":"<1–4000 characters>"}` | IN_PROGRESS → RESOLVED |
| Close | `{}` | RESOLVED → CLOSED |
| Reopen | `{"Reason":"<1–500 characters>"}` | RESOLVED → IN_PROGRESS |

Every action returns the updated Ticket. Assignment accepts only Employees whose
Department is IT Support. Invalid transitions return 409; invalid input returns
400; missing tickets return 404. Direct PATCH/DELETE of tickets and external
writes to reference, comment and history sets return 405. Ticket comments are
read-only in this MVP; adding comments is a later enhancement.

History retains old/new status, action, actor, UTC time and the required reason.
Resolve sets ResolvedAt. Close sets ClosedAt. Reopen clears the current resolution
and resolution/closure timestamps while retaining the prior resolution in history.
There is no reopen of CLOSED tickets or reassignment in this phase.

## Integrity and UI behavior

Local writes are serialized to avoid duplicate ticket numbers and duplicate
transitions. Each ticket write appends history; the local implementation restores
the ticket if the history insertion fails. This does not claim full OData batch
changeset rollback, durable transaction isolation, ETags or RAP draft support.

The service owns StatusCriticality, PriorityCriticality and Can<Action> flags.
Criticality uses standard SAP semantics (0 neutral, 1 negative, 2 critical,
3 positive, 5 information). Action visibility follows these flags; the service
independently checks transitions. Search is case-insensitive over the mock
middleware's searchable string values. Standard list filtering, sorting and
paging remain available.

**View requester** and **View asset** navigate to read-only Fiori detail pages.
View asset is disabled for tickets without an affected asset. This is
ticket context navigation, not the full asset lifecycle app planned in phase 4.

## RAP continuation

The local actions now have concrete EDMX parameters and return types. Map these
to RAP behavior actions and implement backend identity, authorizations, validations,
determinations, locking/ETags and transactional audit writes against the target
SAP release. The [RAP mapping](../sap-design/services/rap-mapping.md) retains the
target table/CDS/service design; local mock hooks are not deployable ABAP.
