# SAP Fiori IT Operations Management System

ITOMS connects Help Desk, IT Asset Lifecycle and MIS Inventory. Phases 0 and 1
establish the architecture and a generated SAP Fiori Elements OData V4 application
that runs locally without an SAP backend.

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
synthetic `SETUP-001` ticket, then open its object page. `npm start` runs the same
server without opening the browser. Stop with Ctrl+C. Internet is needed for npm
installation and SAPUI5 CDN resources; no SAP account or backend is needed.

```sh
npm run doctor   # Node/Git and service configuration checks
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
| `mock/` | Minimal canonical setup metadata; phase 2 service starting point |
| `sap-design/` | Domain model, naming, initial CDS/RAP/service mapping |
| `docs/` | Workflow, phase plan, original vision, architecture and completion report |
| `scripts/` | Safe generator (new output directory only) and environment check |
| `tests/` | Local service and browser smoke verification |

## Design and scope

- [Architecture baseline](docs/architecture.md)
- [Workflow](docs/workflow.md)
- [Phases](docs/phases.md)
- [Original product and architecture document](docs/SAP_Fiori_IT_Operations_Management_System.md)
- [SAP design package](sap-design/README.md)
- [Phase 0–1 completion report](docs/phase-0-1-report.md)

This is an environment starter, with one synthetic ticket and read-only UI. Realistic
Employee/Asset/Ticket contracts belong to phase 2; ticket creation and workflows to
phase 3 onward. There is no SAP deployment, persistent backend or authorization yet.

The app was generated using SAP's `@sap-ux/fiori-elements-writer` 3.1.60, with SAPUI5
1.144.0 and Horizon. `npm run generate:help-desk -- /tmp/itoms-fresh-help-desk` creates
a fresh original scaffold for comparison; it refuses existing directories. The
checked-in app additionally pins the preview runtime, disables random data and
unconfigured backend proxies, adds the fixture, and simplifies local commands.

Generation reference: [SAP Open UX tools](https://github.com/SAP/open-ux-tools/tree/main/packages/fiori-elements-writer).
Extension reference: [SAP Fiori tools](https://marketplace.visualstudio.com/items?itemName=SAPSE.sap-ux-fiori-tools-extension-pack).
