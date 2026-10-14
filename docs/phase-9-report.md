# Phase 9 — Analytics and home navigation

## Delivered

The IT Operations Dashboard reads the existing mock OData service and reports ten
indicators: open tickets, critical tickets, SLA breaches, response and resolution
averages, assets under repair, expiring warranties, high-incident assets, low-stock
locations and inventory consumption movements.

Users select 30, 90 or 365 days for period metrics. Current workload and stock
counts remain current. Every indicator opens its contributing records; record
links open existing ticket, asset, stock or movement object pages. Ticket trend
counts also open contributing tickets. Consumption shows issued, returned and
net quantities separately per material and unit.

All five source collections must load successfully before metrics appear.
Refresh replaces the snapshot; a failed request clears partial results and offers
a retry. Empty averages display “No samples”. Calculations and date boundaries
are documented in [analytics-workflow.md](analytics-workflow.md).

The new default Home page contains 13 module tiles. Help Desk has its own
`Tickets` route and no longer serves as the module launcher. Every list, record
and custom page provides Home navigation. The standalone Repair Workspace now
has a ticket selector. These remain routes in one app with shared data.

## Manual learning material

- [Dashboard use and implementation, step by step](beginner-guide-phase-9.md)
- [Home tiles and routing, step by step](home-navigation.md)
- [Planned CDS analytical design](../sap-design/analytics/README.md)
- [Consolidated architecture and mock/ABAP setup](../PROJECT_ARCHITECTURE_AND_WORKFLOW.md)

## Scope limits

This is the local mock implementation. CDS objects are a design package, not
activated ABAP. The browser aggregates source rows; production must aggregate
authorized data in the backend. The five reads are not a database transaction.
Resolution trends describe currently completed cycles, not a complete historical
backlog or every prior reopen cycle. Seed data ages naturally with the date.
Role policy entries document intended access; the mock does not enforce it.

## Verification

Calculation tests cover date boundaries, missing samples, paused resolution
time, warranty endpoints, incident cohorts, stock thresholds, decimal quantities,
mixed-unit drill-downs and event bucket boundaries. Browser checks cover metric
navigation, refresh recovery, module tiles, keyboard operation and phone layouts.
Verified on 14 October 2026:

- Full suite: 128 tests executed; 126 passed on the initial run. Two dashboard
  browser cases needed follow-up (a preview startup timeout and an accessible-name
  selector that omitted the table column label).
- Follow-up uncovered and fixed a dashboard re-entry refresh race and changed
  the repair picker to navigate on a committed choice instead of a highlighted
  option. The dashboard now waits for a fresh load on entry and ignores duplicate
  period events for the same snapshot.
- After the fixes, five of six targeted dashboard, Home and integrated-repair
  checks passed together. The remaining drill-down check passed separately after
  its wait was corrected and a blank-page startup timeout was retried.
- All 128 distinct tests therefore have passing results across the full run and
  targeted reruns; this was not a single uninterrupted green run. The UI5 preview
  reported intermittent connection resets during browser startup.
- `npm run build`, `npm run doctor`, mock synchronization/contract validation,
  XML parsing, document links and `git diff --check` passed.
- Desktop and phone evidence was reviewed: [Home](evidence/home-desktop.png),
  [Home on phone](evidence/home-mobile.png),
  [dashboard](evidence/phase-9-dashboard.png) and
  [dashboard on phone](evidence/phase-9-dashboard-mobile.png).

The preview runs at `http://localhost:8082/test/flp.html#app-preview`.
The Phase 9 and Home changes are delivered on the repository's `main` branch.
The earlier completed checkpoint was pushed as `0bf79f8` before this phase began.
