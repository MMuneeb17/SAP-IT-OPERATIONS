# Beginner manual guide — Phases 7 and 8

Part A teaches the finished application; Part B explains how to reproduce it.
Continue from the [Phases 5–6 guide](beginner-guide-phases-5-6.md).

## Part A — Use the application

### 1. Start the preview

In the project root, run `npm run preview`. If dependencies are missing, run
`npm ci` first. Reuse the existing server if this project already occupies 8082.
Open `http://localhost:8082/test/flp.html#app-preview`. Press **Go** on a List Report.

### 2. Understand an SLA

An SLA is a time target. Response measures acknowledgment; resolution measures
completion. This mock counts AssignTechnician as first response and Resolve as
completion, using elapsed time across nights/weekends.

MEDIUM defaults to 120 response minutes and 480 resolution minutes. A 75% warning
means an unanswered ticket becomes AT_RISK at 90 minutes and BREACHED at 120.
Assignment within target records MET for response while resolution keeps running.

### 3. Create a fresh example

1. Open **My IT Support**, choose an employee and enter subject/description.
2. Select **Hardware**, optionally **SSD / storage**, and no specific asset.
3. Leave priority as **Use category default**, then create the ticket.
4. Note its ticket number. Initially its SLA should be WITHIN_SLA.

September seed tickets can already be overdue. Use a fresh ticket to observe the
complete within-target → warning → breach sequence.

### 4. Read service levels

Open the ticket's **Service levels** section. Inspect both deadlines, first response,
pause duration, team/location and escalation details. The ticket list also includes
an SLA column/filter. Text accompanies color, so BREACHED is meaningful without color.

### 5. Preview future time

1. Open **SLA and configuration** from the header. If hidden, use **Additional
   Options (⋯)**. Select your new ticket.
2. Enter an ISO timestamp in Preview time: its creation time plus 90 minutes.
   For example, `2026-10-08T12:00:00Z` means noon UTC; use your actual ticket date.
3. Choose **Preview future time**: at the warning boundary, response is AT_RISK.
4. Preview creation plus 120 minutes: response is BREACHED.
5. Choose **Refresh live status**: the saved ticket still uses current time.

Preview creates no audit event/escalation and does not change the server clock.
It projects the current snapshot forward, so choose a time at/after the latest
ticket change. It does not reconstruct earlier historical states.

### 6. Record an escalation

Select overdue active seed ticket **IT-10453**, then **Check SLA now**. A breached
ticket should show level 2 / IT_MANAGER. Open its History to find EscalateSLA.
Repeat the check: no additional event at the same level. This does not send email
or assign a manager. The action uses current time, not the preview timestamp.

### 7. Practise waiting and pausing

1. Submit the fresh ticket, assign a technician, then start work.
2. Choose **Put on hold**, enter an explanation and select WAIT_USER using value
   help for Waiting Reason Code.
3. Refresh SLA details: resolution is PAUSED, preserving remaining work time.
4. Choose **Resume work**: accumulated pause seconds remain and time continues.
5. Repeat with WAIT_PARTS: this default reason keeps the clock running.

A pause does not erase an existing breach. Omitting the code uses OTHER, which
continues the clock by default. Rule changes do not alter an already-open pause.

### 8. Change priority

In SLA and configuration, select an open ticket, choose a different priority,
enter Change reason and choose **Change priority**. The current policy is applied
without resetting creation time or elapsed work. The new deadline can already be
past. History records old/new priorities. Resolved/closed tickets reject changes.

### 9. Edit an SLA policy

1. Scroll to **Configuration**, select SLAPolicies and Record MEDIUM.
2. Set Response Minutes `60`, Resolution Minutes `480`, Warning Percent `75`.
3. Enter a change reason and choose **Save configuration**.
4. Check the increased Revision and new Configuration history row.
5. Create another MEDIUM ticket: its response snapshot is now 60 minutes.
6. The earlier ticket keeps its snapshot unless explicitly reprioritized.

Try response `0` or warning `100`: validation rejects them. If two tabs edit the
same Revision, the second save fails until refreshed, preventing silent overwrite.

### 10. Edit other configuration

| Set | Exercise |
| --- | --- |
| Categories | Change Hardware's default priority or routing team |
| Subcategories | Rename or deactivate a subcategory |
| Teams | Choose a location and eligible IT Support lead |
| Locations | Change display name or active flag |
| WaitingReasons | Change whether a reason pauses resolution |
| EscalationRules | Disable a trigger temporarily or change its target role |

Supply a reason for every save. New tickets use active configuration; existing
routing/snapshots remain stable. Stable codes and parent links cannot be renamed
through this editor. Creating new master records is currently a fixture exercise.

### 11. Explore the seven roles

Open **Access design**. Select each role and compare visible landing pages, action
decisions and backend entity read scopes. Employee creates/confirms own tickets;
Technician requests parts; Store Officer issues them. System Administrator maintains
configuration but does not automatically receive stock-adjustment permission.

**This is a teaching/design preview, not a login or security control.** Other routes
and mock endpoints remain accessible. Read the
[full authorization matrix](../sap-design/authorization/README.md) for ownership,
team/location restrictions and production acceptance cases.

### 12. Finish the ticket

Resolve, then confirm and close the fresh ticket. Finished clocks retain MET or
BREACHED while employee confirmation is pending. Reopening an eligible RESOLVED
ticket starts a new resolution cycle and preserves the original response result.
CLOSED tickets cannot reopen in this MVP.

## Part B — Build it manually

### 13. Create an isolated practice copy

The Phase 5–6 checkpoint is `ef0db52`. From the main project:

```sh
git worktree add ../itoms-phase78-practice -b practice/phase78 ef0db52
cd ../itoms-phase78-practice
npm ci
```

Keep the completed folder as a reference. Run only one preview at a time, or
configure separate HTTP and live-reload ports in the practice copy.

### 14. Define data before screens

Read [the SLA contract](sla-configuration-workflow.md). Add the eight entity types
and sets in `mock/metadata.xml`, with UUID keys and explicit types. Create JSON
fixtures/contributors in `mock/data/`. Extend Ticket with routing, policy snapshot,
clock, pause and escalation fields. Add the matching navigation bindings.

An entity set exposes rows. A bound action changes one row through business rules.
For example, SaveSLAPolicies accepts minutes, warning percentage, Revision and
Reason. It returns the updated policy; arbitrary direct PATCH stays blocked.

### 15. Implement the pure calculation

Read `mock/data/_sla.js`, starting with `assess()`:

```text
response deadline = creation + response target
resolution deadline = cycle start + target + completed pauses + current pause
warning starts = deadline - target * (1 - warning percentage / 100)
```

Keep calculations separate from writes. Use fixed timestamps to test exact
boundaries, late acknowledgment, paused clocks, completed tickets and reopen;
do not wait real hours during tests.

### 16. Connect ticket transitions

In Tickets.js, initialize the service-owned snapshot at creation. Record response
on assignment. On hold, read the configured reason; on resume, accumulate paused
seconds. Resolve stops resolution; reopen starts a new cycle. Derive display
fields before query filtering. PreviewSLA must not write to persistence.

### 17. Add safe configuration and escalation writes

Read `_configuration.js`. Validate editable fields/references, compare Revision,
increment it, then commit the record and ConfigurationHistory through the shared
journal. The queue prevents concurrent saves accepting the same revision.
CheckSLA writes history only when the current severity raises escalation level.
Scheduling and notifications remain SAP continuation work.

### 18. Build the Fiori views

Add SLA to ticket UI.LineItem, UI.SelectionFields and a Service levels facet.
Add Operations and RoleAccess routes and navigation buttons. Read each XML view
beside its controller under `webapp/ext/operations/`.

XML controls bind to a named JSON model for form/display state; controllers read
and invoke the shared OData model. The JSON model is not a second backend.
Load active categories/subcategories in MySupport, leave priority empty to use
the category default, and retain the existing manual practice table.

### 19. Define explicit permissions

In `webapp/model/access-policy.json`, cover every role, entity scope, action and
page target. Begin denied and grant only intended roles. Separate read scope,
action permission and business-state eligibility. Add a coverage test so future
entities/actions cannot silently escape the matrix. Document RAP/PFCG mappings
and instance checks before claiming real authorization.

### 20. Verify and document

```sh
npm run mock:sync
npm run validate:contract
npm test
npm run build
npm run doctor
git diff --check
```

Check desktop/mobile screens. Verify policy saves through API reads and audit rows.
Confirm future preview leaves live records unchanged. Update the architecture,
phase status, report and evidence. Phase 9 adds management analytics/drill-downs.
