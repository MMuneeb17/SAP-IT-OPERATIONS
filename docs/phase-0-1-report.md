# Phase 0 and 1 completion report

Date: 22 September 2026. Both phase exit criteria are met. The application is a
local development starter; phases 2 onward remain planned.

## Phase 0 — repository and architecture foundation

| Deliverable | Completed work / evidence |
| --- | --- |
| Git repository | Existing `.git` repository retained on `main`; added ignore rules for dependencies, builds, test output and local secrets. No remote or commit created. |
| README | Added install, preview, build, tests, editor tasks and repository navigation. |
| Workflow and phases | Reviewed existing `docs/workflow.md` and `docs/phases.md`; kept them in their supplied location and marked phases 0/1 complete. |
| Architecture | Created `docs/architecture.md`: local/SAP runtime boundaries, ownership, consistency, workflow decisions and RAP replacement plan. |
| SAP design directory | Populated existing `sap-design` folders with baseline documentation and future-phase boundaries. |
| Entity relationship model | Documented all 11 entities, UUID keys, foreign keys, cardinalities and a Mermaid ER diagram in `sap-design/data-model/entities.md`. |
| Naming conventions | Defined component, entity/set, field, enum, key, timestamp, quantity, table, CDS and service naming. |
| RAP mapping | Mapped every entity to planned persistence/interface/projection and BO ownership; identified actions, validations and determinations. |

Ticket references an employee and optional affected asset. A part reservation links
the ticket/asset to material and stock; issue produces immutable stock movements;
repair records retain the asset and originating ticket. This makes the cross-module
relationship and future RAP mapping explainable before implementation.

Resolved input differences explicitly: `Reopen` returns to `IN_PROGRESS`, employee
confirmation invokes `Close`, and asset transfer/return are actions. Standard SAP
master/inventory ownership takes precedence over duplicate custom persistence.

## Phase 1 — local Fiori environment

- Verified VS Code Insiders and installed SAP Fiori tools extension pack 1.32.1,
  Application Modeler, Service Modeler, annotation tools and UI5 language support.
  These were already installed; no global editor reinstall was necessary.
- Pinned Node 24.21.0 LTS locally and supplied `.nvmrc`, `.node-version`, npm workspace
  scripts, a lockfile and VS Code extension recommendations/tasks/terminal settings.
  System Node 26 remains untouched; npm scripts use the project-local LTS binary.
- Generated `apps/help-desk` using SAP's Fiori Elements writer 3.1.60: actual
  `sap.fe.templates.ListReport` and `sap.fe.templates.ObjectPage`, OData V4 model,
  routing, component, annotations, i18n and UI5 configuration.
- Pinned SAPUI5 1.144.0/Horizon; installed UI5 CLI 4.0.69, SAP UX UI5 tooling 1.32.0
  and FE mock middleware 2.4.17 (resolved versions recorded in the lockfile).
- Added a minimal read-only Ticket metadata fixture and one clearly synthetic
  `SETUP-001` record. Removed the generated unconfigured localhost backend proxy,
  disabled random fixture generation and supplied simple start/preview commands.
- Added a safe reproducible generator script, environment/configuration checker and
  two smoke tests covering local service reads/filtering and real browser navigation.

## Verification

| Check | Result |
| --- | --- |
| `npm run doctor` | Passed: Node v24.21.0, npm 11.12.1, Git 2.50.1, component ID, OData V4 and synchronized metadata. |
| `npm run build` | Passed: minification, manifest enhancement and Component-preload generation. Added English resource bundle to resolve generated fallback-locale warnings. |
| `npm test` | Passed: 2 tests. Local EDMX/read/filter response checked; Google Chrome loaded the Fiori list, fetched the fixture and navigated to its object page. No uncaught page errors. |
| Visual inspection | Object page screenshot inspected; setup ticket, subject, status and Overview render correctly. |
| `npm ls --depth=0` | All declared workspace/tool dependencies resolve. |
| `npm audit --omit=dev` | Passed: zero production dependency findings. |
| `npm audit` / compatible `npm audit fix` | 46 dependency findings remain: 28 high, 16 moderate, 2 low. See limitations below. |

[Verified object page screenshot](evidence/help-desk-object-page.png)

## Run and inspect

```sh
npm ci
npm run preview
```

Open http://localhost:8082/test/flp.html#app-preview, click **Go**, then open
**Local preview verification**. `npm start` serves without opening the browser.
Run `npm run doctor`, `npm run build`, and `npm test` from the repository root.
Chrome is required for the browser test. Stop the development server with Ctrl+C.

## Remaining boundaries and findings

The preview requires internet for SAPUI5 CDN resources. It runs without SAP backend
credentials. It does not implement persistence, real employees/assets, ticket
creation/actions, authentication, SAP roles or deployment. Those belong to subsequent
phases. The SAP sandbox emits nonfatal diagnostics for unavailable flexibility
storage/bundles and user-action services; browser rendering and navigation passed.

The npm findings are in development tooling and transitive dependencies. Compatible
`npm audit fix` did not clear them; proposed forced fixes include incompatible older
tooling, and some have no automatic fix. No forced downgrade or untested dependency
overrides were applied. This is not a security-cleared production release; dependency
remediation remains necessary before broader deployment.

All work is present in the working tree for review; no commit, push or SAP deployment
was performed. Phase 2 is next: complete Employees/Tickets/Assets/comments/history
metadata, navigation and realistic sample data against the frozen naming baseline.

## Tool references

- [SAP Fiori Elements writer](https://github.com/SAP/open-ux-tools/tree/main/packages/fiori-elements-writer)
- [SAP Fiori tools extension pack](https://marketplace.visualstudio.com/items?itemName=SAPSE.sap-ux-fiori-tools-extension-pack)
- [Node.js releases](https://nodejs.org/en/download)
