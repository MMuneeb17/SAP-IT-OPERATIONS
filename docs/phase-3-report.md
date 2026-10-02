# Phase 3 — Help Desk MVP report

Status: complete for the local MVP. Report finalized 2 October 2026.

The Help Desk MVP implements the employee-to-support workflow on the existing
local OData V4 service. It uses SAP Fiori Elements List Report/Object Page,
SAP Horizon, and a focused custom Fiori page for employee ticket intake.

## Delivered

| Phase requirement | Implementation |
| --- | --- |
| Ticket List Report and Object Page | Existing generated Fiori app now consumes workflow availability and criticality fields; object-page actions update the ticket and history. |
| Search/filter/sort | Enabled case-insensitive ticket search and retained Fiori filters, sorting, pagination and counts. |
| Create/view ticket | My IT Support provides an employee selector, assigned-asset selector, required subject/description, category, priority and My tickets list. Creating a ticket opens its detail page for review/submission. |
| Status/priority indicators | Service-derived SAP criticality values give neutral/information/warning/error/success treatment without removing textual statuses. |
| Requester/asset navigation | View requester and View asset open related read-only Fiori detail pages. Asset navigation is disabled when there is no affected asset. |
| Initial workflow | Create → Submit → AssignTechnician → StartWork → Resolve → Close, with PutOnHold/Resume and Reopen from RESOLVED. |
| Ticket status model | Service validates allowed transitions, required resolution/reasons, valid employees and eligible technicians. Direct status PATCH is rejected. |
| Audit history | Every successful creation/action appends actor, UTC timestamp, action, old/new status and applicable reason. Audit and reference sets reject direct writes. |

## Implementation details that affect use

New tickets receive service-generated UUIDs, numbers, NEW status and audit fields.
The service ignores client-provided computed fields. New asset-linked requests
must reference the selected employee's assigned/in-repair equipment; users may
choose no specific asset. Local writes are serialized to keep ticket numbers and
state transitions consistent under simultaneous requests. Failed history writes
restore the associated ticket change.

My IT Support blocks creation until the employee data has loaded, validates
required fields, retains entries after errors and prevents duplicate clicks while
a request is in flight. Workflow availability and criticality are recomputed after
each successful action. Date values preserve the EDMX's whole-second precision.

The [workflow/API guide](help-desk-workflow.md) lists payloads, transitions, error
codes, actor simulation, reset behavior and the future RAP implementation boundary.
The service contract and RAP mapping documents have been updated for phase 3.

## Verification

- All 28 Playwright tests passed (18 contract, 6 workflow, 4 browser/preview tests).
- Mock synchronization verified all 14 files; fixture validation passed for all 66 records.
- Production build and environment doctor passed; `git diff --check` passed.
- [Browser evidence](evidence/phase-3-help-desk.png) shows the newly created ticket after closure.

Service tests cover successful creation through closure, invalid creation,
invalid transitions, technician eligibility, mandatory resolution/reasons,
hold/resume/reopen, append-only history, blocked direct mutations, simultaneous
creation/duplicate actions and case-insensitive search with filters and paging.

Browser acceptance covers employee creation, requester/asset navigation, native
Fiori action dialogs, assignment, start work, resolution, closure and finding the
new ticket in Help Desk. New test data is isolated using the middleware's `sap-client`
namespaces, preserving the normal preview fixtures.

## Scope and limits

This is a local demonstration. Employee selection and action actors are simulated;
there is no production login, role enforcement, persistence, SAP deployment,
ETag/draft guarantee or full batch changeset rollback. Data survives a browser
refresh but resets on server restart or fixture reload. Comments remain readable;
new comment entry is not implemented in this phase. Asset lifecycle operations
and inventory remain later phases.

The employee intake page currently loads up to 100 employees, assets and tickets
per query; larger datasets need paging before production use.

The existing development-tool dependency findings recorded in the phase 2 report
remain a production-readiness item. This phase did not change installed dependency
versions or claim remediation of those findings.

## Run

```sh
npm run preview
npm test
```

Preview: http://localhost:8082/test/flp.html#app-preview

Choose **My IT Support**, create a request and open it. Choose **Submit ticket**,
then use the Help Desk actions to complete the support flow. Phase 4, Asset
Lifecycle MVP, is the next planned phase.

## Git checkpoint

As requested, checkpoint `ee96467` was pushed to `origin/main` during this work.
That checkpoint contains completed phase 2 and the initial phase 3 implementation.
The final fixes, tests and this report were added locally after that checkpoint.
