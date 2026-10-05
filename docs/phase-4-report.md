# Phase 4 — Asset Lifecycle MVP report

Status: **Complete — 5 October 2026**. Final acceptance: **46 tests passed**.

## Delivered

| Requirement | Implementation |
| --- | --- |
| Asset List Report | Asset Management module with search, filters, sorting and a responsive Fiori table. |
| Asset Object Page | Asset identity, manufacturer/model, serial number, status, location, purchase date and warranty end. |
| Current assignment | Custodian reference derived through lifecycle actions; My IT Assets shows equipment for a selected preview employee. |
| Assignment history | Start/end intervals, employees, reasons and simulated actor identifiers; transfers close the previous interval. |
| Ticket history | Related tickets on each asset, with navigation to the existing Help Desk Object Page. |
| Repair history | Diagnosis, technician, optional originating ticket, open/completed state, work performed and timestamps. |
| Lifecycle | Make available, assign, transfer, return, send for repair, complete repair, retire and dispose. |
| Ticket/employee navigation | View asset opens asset details under the ticket route, preserving Back navigation; requester details show assigned assets; My IT Support links to My IT Assets. |
| Audit | AssetHistory records status and custodian changes with reason, simulated actor and timestamp. |

Asset Management is integrated into the existing application component under
`apps/help-desk`; it is not a second independently deployed application. Shared
metadata, routing and the OData model keep Help Desk and Asset Management connected.
The user's manual practice table remains intact.

## Service and consistency

Added AssetAssignments, AssetRepairs and AssetHistory with 12 new navigation
properties, bringing the service to eight entity sets and 26 navigation properties.
The canonical fixture now contains 82 synthetic records. Twenty-two metadata,
fixture and contributor files synchronize to the application.

The shared ticket/asset write queue prevents concurrent duplicate assignments.
Transfers close one interval and open the next at the same timestamp. Repairs
retain custody and return to the correct state on completion. Wrong-asset ticket
links, invalid technicians, missing reasons and illegal transitions are rejected
before mutation. Lifecycle history records are protected from direct writes.
Original records are retained for rollback if a later write fails.

The [workflow and field dictionary](asset-lifecycle.md) documents every action,
new property, relationship, limitation and RAP continuation.

## Verification coverage

Final verification on 5 October 2026:

| Check | Result |
| --- | --- |
| `npm test` | 46 passed in 1.8 minutes: 27 contract, 7 asset workflow, 6 ticket workflow and 6 preview/browser checks. |
| `npm run mock:check` | All 22 synchronized files match. Also runs before tests. |
| `npm run validate:contract` | All 82 seed records and eight entity sets validated. Also runs before tests. |
| `npm run build` | UI5 production build succeeded. |
| `npm run doctor` | Node/toolchain, Fiori component, OData configuration and metadata consistency passed. |
| Manual visual review | Desktop assignment history and 390 × 844 My IT Assets layout reviewed. |

- Contract tests cover reads, keys, projection, sorting, paging, null handling and
  every navigation property across all eight entity sets.
- Asset workflow tests cover receipt through disposal, custody during repairs,
  repeated repairs, invalid operations, direct-write protection and concurrent assignment.
- Fault injection checks restoration of the asset and assignment intervals when
  the lifecycle event write fails.
- Fixture validation checks matching custodians, nonoverlapping assignments,
  repair state, eligible technicians and same-asset ticket links.
- Browser tests exercise native lifecycle action dialogs, history display,
  My IT Assets employee selection/empty state, phone layout, asset-to-ticket and
  employee-to-asset navigation. Existing Help Desk tests remain in the suite.

Acceptance testing corrected related-table routing and preserved browser Back
from the ticket's asset details. Browser tests now wait for action dialogs to
close before continuing. Earlier runs encountered a network error and a preview
startup timeout; the final complete run passed without retries. The preview
still requires access to SAP's hosted UI5 resources.

Evidence: [desktop asset and assignment history](evidence/phase-4-asset-history.png)
and [My IT Assets on a phone-sized viewport](evidence/phase-4-my-assets-mobile.png).

## Usage

Run `npm run preview` and open http://localhost:8082/test/flp.html#app-preview.
Choose **Asset Management → Go**, then open **IT-LAP-00502** to begin the received
asset walkthrough. **IT-LAP-00452** demonstrates an existing repair linked to a
Help Desk ticket. The employee equipment page is available through **My IT Assets**.

## Scope and limits

This is a local mock MVP. Employee selection and the supervisor actor are simulated;
there is no authenticated identity, production authorization or SAP deployment.
The service starts from synthetic asset records; asset creation, tag allocation,
master-data editing and warranty calculation/alerts are outside this milestone.
Warranty dates are displayed as recorded, including an explicit missing-date state
in My IT Assets. Return retains the asset's last location; selecting a storage
destination is not implemented.

Most seeded asset events are labelled Baseline because earlier full lifecycle
events are not reconstructed. Existing assignments and repairs still retain their
history. New runtime actions append actual lifecycle events.

Writes remain in memory and reset on restart/fixture reload. Local compensation
is not durable database atomicity, full OData changeset rollback, ETag locking or
draft support. My IT Assets pages through service reads but has a 10,000-row JSON
display limit. Production scaling and dependency remediation remain later work.

Completing a repair does not close its linked ticket or consume inventory. Inventory
and the integrated parts/repair process remain Phases 5 and 6. No dependency
versions were changed in Phase 4. Changes have not been committed or pushed in
this implementation turn.

## Implementation reference

Related-table navigation uses SAP's supported Object Page controller-extension
routing hook to open canonical ticket/asset routes. See the
[SAP navigation-extension documentation](https://github.com/SAP-docs/sapui5/blob/main/docs/06_SAP_Fiori_Elements/replacing-standard-navigation-in-a-table-a12ad60.md).
The ticket header's View asset action retains its nested route so browser Back
returns to the originating ticket. Both asset routes use the same annotations
and lifecycle actions.
