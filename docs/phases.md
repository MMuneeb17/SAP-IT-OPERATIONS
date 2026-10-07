# SAP Fiori IT Operations Management System — Project Phases

## Development Strategy

The project will be built **Fiori-first but architecture-first**. Until an SAP ABAP backend is available, the frontend will use a local/mock OData-compatible service contract. At the same time, every entity and business action will be mapped to its future ABAP CDS/RAP implementation.

The goal is to avoid rebuilding the frontend when the official SAP backend becomes available.

---

## Phase 0 — Repository and Architecture Foundation

Status: **Complete — 22 September 2026**. See [completion report](phase-0-1-report.md).

### Objective
Create a clean project workspace and freeze the first version of the domain/service architecture.

### Deliverables
- Git repository
- `README.md`
- `workflow.md`
- `phases.md`
- `docs/architecture.md`
- `sap-design/` directory
- Initial entity relationship model
- Naming conventions

### Core entities
- Employee
- Ticket
- Asset
- TicketComment
- TicketHistory
- AssetAssignment
- AssetRepair
- Material
- Stock
- Reservation
- StockTransaction

### Exit criteria
The team can explain how Ticket, Asset and Inventory relate and how the local service will later map to RAP.

---

## Phase 1 — Local SAP Fiori Development Environment

Status: **Complete — 22 September 2026**. Generated app, local service and browser preview verified; see [completion report](phase-0-1-report.md).

### Objective
Prepare VS Code for SAP Fiori development.

### Components
- VS Code
- Node.js LTS
- npm
- Git
- SAP Fiori tools extensions
- UI5 tooling as generated/required by SAP Fiori tools

### Deliverables
- Working local Fiori project
- Browser preview works
- Source control initialized

### Exit criteria
A generated Fiori application runs locally without an SAP backend.

---

## Phase 2 — OData Service Contract and Mock Data

Status: **Complete — 1 October 2026**. Five-entity read contract, realistic fixtures,
Fiori integration and three-agent review verified; see [completion report](phase-2-report.md).

### Objective
Define the API/data contract that the Fiori applications will consume now and the RAP backend will implement later.

### Initial entities
```text
Employees
Tickets
Assets
TicketComments
TicketHistory
```

### Later entities
```text
AssetAssignments
AssetRepairs
Materials
Stocks
Reservations
StockTransactions
```

### Deliverables
- OData metadata/service model
- Navigation relationships
- Realistic sample data
- Stable field naming
- Planned RAP mapping document

### Exit criteria
Fiori can read realistic Employees, Tickets and Assets through the local service contract.

---

## Phase 3 — Help Desk MVP

Status: **Complete (local MVP)**. See the [completion report](phase-3-report.md)
for delivery, verification and deployment limitations.

### Objective
Build the first complete business vertical slice.

### Fiori features
- Ticket List Report
- Ticket Object Page
- Search/filter/sort
- Create ticket
- View ticket
- Priority/status criticality
- Requester and asset navigation

### Initial workflow
```text
Create -> Submit -> Assign -> Start Work -> Resolve -> Close
```

### Deliverables
- `Help Desk` app
- `My IT Support` flow
- Ticket sample dataset
- Ticket status model

### Future RAP mapping
- Ticket root BO
- `Submit`
- `AssignTechnician`
- `StartWork`
- `Resolve`
- `Close`
- `Reopen`

### Exit criteria
An employee can create a ticket and an IT user can open it from a Fiori List Report/Object Page.

---

## Phase 4 — Asset Lifecycle MVP

Status: **Complete — 5 October 2026**. Delivered as an Asset Management module
inside the existing application, with lifecycle actions, employee assets and
ticket navigation. All 46 tests pass; see [completion report](phase-4-report.md).

### Objective
Introduce serialized IT assets and connect them to tickets/employees.

### Features
- Asset List Report
- Asset Object Page
- Current assignment
- Assignment history
- Ticket history
- Warranty information
- Repair history

### Lifecycle
```text
RECEIVED -> AVAILABLE -> ASSIGNED -> RETURN/TRANSFER/REPAIR -> RETIRED -> DISPOSED
```

### Deliverables
- Asset Management app
- My IT Assets view
- Ticket-to-Asset navigation
- Employee-to-Asset navigation

### Exit criteria
Opening a ticket shows its affected asset and opening an asset shows its related tickets.

---

## Phase 5 — MIS Inventory MVP

Status: **Complete (local MVP) — 8 October 2026**. Materials, stock, reservations,
inventory actions, movement history and low-stock indicators are implemented in
the existing application. See the [Phases 5–6 report](phase-5-6-report.md) and
[manual beginner guide](beginner-guide-phases-5-6.md).

### Objective
Manage IT spare parts and consumables.

### Features
- Material List Report
- Stock overview
- Receive
- Reserve
- Issue
- Return
- Transfer
- Adjustment
- Stock transaction history

### Rule
Stock changes must be represented by transactions; do not rely only on editing a quantity field.

### Deliverables
- MIS Inventory app
- Stock and reservation views
- Transaction history
- Low-stock indicators

### Exit criteria
The system can reserve and issue a spare part while retaining an auditable transaction record.

---

## Phase 6 — Cross-Module Repair Workflow

Status: **Complete (local MVP) — 8 October 2026**. The SSD scenario runs from
ticket creation through diagnosis, reservation, issue, repair and closure, with
linked audit records and completion guards. See the
[Phases 5–6 report](phase-5-6-report.md).

### Objective
Connect Help Desk + Assets + Inventory into one process.

### Workflow
```text
Ticket
 -> Asset
 -> Diagnosis
 -> Spare Required
 -> Reservation
 -> MIS Issue
 -> Repair
 -> Asset History
 -> Resolution
```

### Deliverables
- Part request from ticket
- Ticket-linked reservation
- Ticket/asset-linked stock issue
- Asset repair record
- End-to-end demo scenario

### Exit criteria
The SSD-failure demo can be completed from ticket creation through repair and closure.

---

## Phase 7 — SLA, Escalation and Configuration

### Objective
Add enterprise operational controls.

### Features
- Priority rules
- Response SLA
- Resolution SLA
- SLA status/criticality
- Waiting reasons
- Escalation rules
- Categories/subcategories
- Teams/locations

### Deliverables
- Configuration model
- SLA simulation locally
- UI criticality indicators
- Escalation workflow design

### Future RAP mapping
- Determination for SLA deadlines
- Validation for state transitions
- Scheduled/background monitoring where supported

### Exit criteria
Tickets visibly show whether they are within SLA, at risk or breached.

---

## Phase 8 — Roles and Authorization Design

### Objective
Design role-specific access before implementing real SAP authorization.

### Roles
- Employee
- Technician
- Help Desk Supervisor
- Asset Administrator
- MIS / Store Officer
- IT Manager
- System Administrator

### Deliverables
- Role matrix
- Page/action visibility design
- Backend authorization requirements
- Future PFCG/RAP authorization mapping

### Exit criteria
Every app, entity and action has an identified authorized role.

---

## Phase 9 — Analytics and Management Dashboard

### Objective
Turn operational data into management information.

### KPIs
- Open tickets
- Critical tickets
- SLA breaches
- Average response/resolution time
- Assets under repair
- Warranty expiry
- High incident assets
- Low/out-of-stock materials
- Inventory consumption

### Deliverables
- IT Operations Dashboard
- Drill-downs
- Trend views
- Planned CDS analytical views

### Exit criteria
Management can move from KPI to the underlying operational records.

---

## Phase 10 — SAP RAP Backend Design Package

### Objective
Complete the backend blueprint before server access.

### Planned tables
```text
ZIT_TICKET
ZIT_TICKET_COMMENT
ZIT_TICKET_HISTORY
ZIT_ASSET
ZIT_ASSET_ASSIGN
ZIT_ASSET_REPAIR
ZIT_MATERIAL
ZIT_STOCK
ZIT_STOCK_TXN
ZIT_RESERVATION
```

### Planned CDS
```text
ZI_IT_Ticket
ZI_IT_Asset
ZI_IT_AssetAssignment
ZI_IT_AssetRepair
ZI_IT_Material
ZI_IT_Stock
ZI_IT_StockTransaction
ZI_IT_Reservation
```

### Planned projections/services
```text
ZC_IT_Ticket
ZC_IT_Asset
ZC_IT_Inventory
ZUI_IT_OPERATIONS
```

### Deliverables
- Table definitions/design
- CDS mapping
- BO compositions
- Actions
- Validations
- Determinations
- Service contract mapping

### Exit criteria
The backend can be implemented in SAP without redesigning the Fiori domain model.

---

## Phase 11 — Real ABAP/RAP Implementation (When SAP Access Is Available)

### Objective
Replace the local/mock backend with the official SAP backend.

### Implementation sequence
1. Create ABAP package.
2. Create database tables / integrate standard SAP sources.
3. Create CDS interface views.
4. Create RAP root/child business objects.
5. Create behavior definitions.
6. Implement actions, validations and determinations.
7. Create projection views.
8. Create service definition.
9. Create OData V4 service binding.
10. Test using Fiori Elements preview.
11. Point existing Fiori apps to the RAP service.

### Exit criteria
The same Fiori workflows run against the real RAP backend.

---

## Phase 12 — SAP Authorization, Workflow and Notifications

### Objective
Replace local simulations with enterprise SAP controls.

### Components
- RAP authorization
- SAP authorization objects
- PFCG roles
- Workflow capabilities available in target landscape
- Notifications/email integration where appropriate

### Exit criteria
Access and workflow are enforced by the backend, not merely the UI.

---

## Phase 13 — Launchpad and Production Readiness

### Objective
Prepare the application for controlled organizational use.

### Activities
- Fiori Launchpad content
- Catalogs/spaces/pages as applicable
- Role assignment
- Performance review
- Security review
- Error handling
- Logging
- Audit verification
- User acceptance testing
- Documentation

### Exit criteria
A production-ready release candidate is available for pilot deployment.

---

## Phase 14 — Future Enhancements

Potential iterations:

- Knowledge base
- Similar-ticket suggestions
- Vendor/warranty management
- Procurement integration
- QR/barcode asset scanning
- Physical asset audit
- Software license management
- Asset replacement indicators
- Repeated failure detection
- Stock shortage risk
- AI-assisted search/classification where governance permits

---

# Recommended Immediate Milestones

## Milestone 1
**Employee + Asset + Ticket**

An employee creates a ticket against an assigned asset and IT opens it in Help Desk.

## Milestone 2
**Ticket + Asset History**

Ticket and asset pages navigate to one another and display historical information.

## Milestone 3
**Ticket + Asset + Inventory**

A technician requests a spare part, MIS issues it, and the repair is recorded.

## Milestone 4
**Enterprise Controls**

SLA, roles, escalation and analytics are added.

## Milestone 5
**Real SAP Backend**

Mock/local service is replaced by RAP + CDS + OData V4.
