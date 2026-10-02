# SAP Fiori IT Operations Management System

ITOMS connects Help Desk, IT Asset Lifecycle and MIS Inventory. Phases 0–3 provide
the architecture, OData V4 contract and a local Help Desk MVP with employee ticket
creation and validated workflow actions, without an SAP backend.

## Run locally

Prerequisites: Node.js 24 LTS, npm, Git, VS Code/VS Code Insiders with SAP Fiori tools.

```sh
# If you use nvm:
nvm install
nvm use
npm ci
npm run preview
```

Without nvm, install Node 24 LTS, then run `npm ci` and `npm run preview`.
The repository also pins a project-local Node 24 runtime as a development dependency;
npm scripts use it automatically after installation. The system-wide Node installation
is not changed. VS Code's new workspace terminals use that local runtime too.

Open **http://localhost:8082/test/flp.html#app-preview**. Click **Go** to load the
`IT-10452` laptop incident, then open its object page to inspect the requester,
affected asset, comments and history. Choose **My IT Support** to create a ticket,
then submit it and use the Help Desk actions to assign, work, resolve and close it.
See the [Help Desk walkthrough](docs/help-desk-workflow.md). `npm start` runs the same
server without opening the browser. Stop with Ctrl+C. Internet is needed for npm
installation and SAPUI5 CDN resources; no SAP account or backend is needed.

```sh
npm run doctor   # Node/Git and service configuration checks
npm run validate:contract # Validate all 66 synthetic records against metadata
npm run build    # Build the Fiori application into apps/help-desk/dist
npm test         # OData + actual browser smoke tests (Google Chrome required)
```

VS Code: open this repository, install the recommended extension pack if needed,
and use Terminal → Run Task → ITOMS: preview/build/smoke tests. The installed
VS Code Insiders application on this machine already has SAP Fiori tools.

## Repository map

| Location | Purpose |
| --- | --- |
| `apps/help-desk/` | Generated Fiori Elements List Report / Object Page |
| `mock/` | Canonical EDMX, deterministic fixtures and local workflow contributors |
| `sap-design/` | Domain model, naming, initial CDS/RAP/service mapping |
| `docs/` | Workflow, phase plan, original vision, architecture and completion report |
| `scripts/` | Safe generator (new output directory only) and environment check |
| `tests/` | Local service and browser smoke verification |

## Design and scope

- [Beginner teaching guide: Phases 0–3](docs/beginner-guide-phases-0-3.md)
- [Architecture baseline](docs/architecture.md)
- [Workflow](docs/workflow.md)
- [Phases](docs/phases.md)
- [Original product and architecture document](docs/SAP_Fiori_IT_Operations_Management_System.md)
- [SAP design package](sap-design/README.md)
- [Phase 0–1 completion report](docs/phase-0-1-report.md)
- [Phase 2 service contract](docs/service-contract.md)
- [Phase 2 completion and swarm review report](docs/phase-2-report.md)
- [Phase 3 workflow and API operations](docs/help-desk-workflow.md)
- [Phase 3 completion report](docs/phase-3-report.md)

The app starts with 6 employees, 6 assets, 9 tickets, 14 comments and 31 history
events. All data is synthetic. New tickets and workflow history persist in server
memory until restart/fixture reload. Preview employee selection is not authentication;
production backend persistence and authorization remain later phases.

Edit service inputs in `mock/`, then run `npm run mock:sync`; root start/preview
commands synchronize automatically. Tests verify metadata/data parity before
checking types, referential integrity, service queries and actual Fiori model reads.

The app was generated using SAP's `@sap-ux/fiori-elements-writer` 3.1.60, with SAPUI5
1.144.0 and Horizon. `npm run generate:help-desk -- /tmp/itoms-fresh-help-desk` creates
a fresh original scaffold for comparison; it refuses existing directories. The
checked-in app additionally pins the preview runtime, disables random data and
unconfigured backend proxies, adds the phase 2 fixtures and presentation annotations, and simplifies local commands.

Generation reference: [SAP Open UX tools](https://github.com/SAP/open-ux-tools/tree/main/packages/fiori-elements-writer).
Extension reference: [SAP Fiori tools](https://marketplace.visualstudio.com/items?itemName=SAPSE.sap-ux-fiori-tools-extension-pack).
