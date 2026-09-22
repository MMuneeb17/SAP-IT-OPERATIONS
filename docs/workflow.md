# SAP Fiori IT Operations Management System — Workflow

## 1. Purpose

This document defines the functional workflow for the **SAP Fiori IT Operations Management System (ITOMS)**. The first implementation will be developed locally with SAP Fiori/Fiori Elements and a mock OData-compatible service contract. When an SAP ABAP environment becomes available, the mock service will be replaced by **ABAP RAP + CDS + OData V4 + SAP persistence** without redesigning the business workflow.

## 2. Main Actors

- **Employee** — reports IT incidents, views own tickets/assets, confirms resolution.
- **IT Technician** — accepts assigned tickets, diagnoses issues, requests parts, records work and resolves tickets.
- **Help Desk Supervisor** — triages tickets, assigns technicians, changes permitted priorities and monitors SLA.
- **Asset Administrator** — registers, assigns, transfers, repairs, returns and retires IT assets.
- **MIS / Store Officer** — receives, reserves, issues, returns and transfers IT inventory.
- **IT Manager** — monitors KPIs, SLA, asset health, inventory and workload.
- **System Administrator** — maintains categories, teams, priorities, SLA rules, locations and configuration.

## 3. Core Domain Flow

```text
Employee
   |
   +---- owns/uses ----> Asset
   |
   +---- creates ------> Ticket
                           |
                           +---- references ----> Asset
                           |
                           +---- assigned ------> Technician
                           |
                           +---- may require ---> Reservation
                                                  |
                                                  v
                                               Material
                                                  |
                                                  v
                                                Stock
                                                  |
                                                  v
                                           Stock Transaction
                           |
                           +---- produces ------> Repair History
                           |
                           +---- produces ------> Ticket History
```

## 4. Primary End-to-End Workflow — IT Incident

### 4.1 Employee reports an issue

1. Employee opens **My IT Support**.
2. Employee chooses **Create Ticket**.
3. System identifies the logged-in employee.
4. System offers assets currently assigned to that employee.
5. Employee selects an affected asset or chooses **No Specific Asset**.
6. Employee selects category/subcategory, enters subject and description, and submits.
7. System creates the ticket with status `SUBMITTED` and records creation history.
8. Future RAP implementation determines initial priority/SLA/team where rules exist.

```text
Employee -> Create Ticket -> Select Asset -> Describe Problem -> Submit
                                                        |
                                                        v
                                                   SUBMITTED
```

### 4.2 Help Desk triage and assignment

1. New ticket appears in **Help Desk**.
2. Supervisor reviews requester, location, category, asset and impact.
3. Supervisor assigns a support team/technician.
4. Status becomes `ASSIGNED`.
5. Assignment is written to ticket history.

```text
SUBMITTED -> Triage -> Assign Technician -> ASSIGNED
```

### 4.3 Technician work

1. Technician opens **Technician Workbench**.
2. Technician sees assigned/open/at-risk tickets.
3. Technician opens a ticket and reviews:
   - requester
   - affected asset
   - previous tickets
   - repair history
   - warranty
   - comments/attachments
4. Technician chooses **Start Work**.
5. Status becomes `IN_PROGRESS`.
6. Technician adds work notes and diagnosis.

### 4.4 Waiting / dependency flow

A ticket can be placed into `WAITING` when work cannot continue, for example:

- waiting for employee information
- waiting for spare part
- waiting for vendor/warranty
- waiting for approval

The reason and timestamp must be stored. Future SLA logic may pause selected SLA clocks according to configuration.

### 4.5 Spare-part workflow

If a repair requires an inventory item:

```text
Ticket
  |
  v
Part Required
  |
  v
Check Material / Stock
  |
  +---- Available ----> Reserve -> MIS Issue -> Repair
  |
  +---- Unavailable --> Shortage / Procurement Follow-up
```

1. Technician selects **Request Part**.
2. Technician chooses material and quantity.
3. System checks available stock.
4. If available, reservation is created against ticket + asset.
5. MIS officer sees pending reservations.
6. MIS officer issues material.
7. System creates an immutable stock transaction.
8. Reservation is completed/reduced.
9. Ticket records that the required part has been issued.

### 4.6 Repair and asset history

When a part or repair is performed:

1. Technician records diagnosis.
2. Technician records repair action.
3. Replaced/used part is linked where applicable.
4. Asset repair history is updated.
5. Ticket remains the source reference for the repair.

```text
Ticket IT-10452
   |
   +--> Asset IT-LAP-00452
   |
   +--> Repair: SSD replaced
   |
   +--> Material: SSD-512 x 1
```

### 4.7 Resolution and closure

1. Technician enters resolution notes.
2. Technician chooses **Resolve**.
3. Validation requires a resolution before status change.
4. Status becomes `RESOLVED`.
5. Employee reviews resolution.
6. Employee either:
   - **Confirms** -> `CLOSED`
   - **Reopens** with reason -> `IN_PROGRESS`

```text
IN_PROGRESS -> RESOLVED -> Employee Confirmation -> CLOSED
                       \
                        -> Reopen -> IN_PROGRESS
```

## 5. Ticket State Machine

```text
NEW
 |
 v
SUBMITTED
 |
 v
ASSIGNED
 |
 v
IN_PROGRESS <-------------------------+
 |                                    |
 +----------> WAITING ----------------+
 |
 v
RESOLVED
 |      \
 |       +---- Reopen ----------------+
 v
CLOSED
```

Business actions, not unrestricted status dropdown editing, should control state transitions.

## 6. IT Asset Lifecycle Workflow

```text
RECEIVED
   |
   v
TAGGED
   |
   v
AVAILABLE
   |
   v
ASSIGNED
   |
   +------> TRANSFER ------> ASSIGNED
   |
   +------> REPAIR --------> AVAILABLE / ASSIGNED
   |
   +------> RETURN --------> AVAILABLE
                              |
                              v
                           RETIRED
                              |
                              v
                           DISPOSED
```

### Asset assignment

1. Asset Administrator selects an available asset.
2. Selects employee, department/location and assignment date.
3. System validates that the asset is assignable.
4. Assignment history record is created.
5. Asset current custodian/status is updated.

### Asset transfer

1. Existing assignment is closed.
2. New assignment is created.
3. Transfer reason and actor are stored.
4. Full history remains visible.

### Asset repair

A repair can originate from a help-desk ticket or be created independently. Ticket-originated repairs should retain the ticket reference.

## 7. MIS Inventory Workflow

### Receive

```text
Goods/Items Received -> RECEIVE transaction -> Physical Stock increases
```

### Reserve

```text
Ticket/Business Need -> RESERVE -> Reserved Qty increases -> Available Qty decreases
```

### Issue

```text
Reservation -> ISSUE -> Physical Qty decreases -> Reservation fulfilled
```

### Return

```text
Returned Item -> RETURN transaction -> Physical Qty increases
```

### Transfer

```text
Storage Location A -> TRANSFER -> Storage Location B
```

### Adjustment

Adjustments require authorization and a mandatory reason. A transaction record must always be created.

## 8. SLA Workflow

```text
Ticket Submitted
      |
      v
Determine Priority
      |
      v
Read SLA Rule
      |
      +--> Response Deadline
      +--> Resolution Deadline
      |
      v
Monitor Consumption
      |
      +--> Within SLA
      +--> At Risk
      +--> Breached -> Escalation
```

Initial local development will simulate SLA calculations. Real backend enforcement will later be implemented in RAP/ABAP.

## 9. Escalation Workflow

```text
Technician
    |
    | SLA at risk / rule triggered
    v
Team Lead / Supervisor
    |
    | breach / configured threshold
    v
IT Manager
```

Escalation rules should ultimately be configuration-driven.

## 10. Fiori Application Workflow

### Employee

```text
Fiori Launchpad
  +-- My IT Support
  |     +-- Create Ticket
  |     +-- My Tickets
  |     +-- Ticket Object Page
  |     +-- Confirm / Reopen
  |
  +-- My IT Assets
        +-- Assigned Assets
        +-- Asset Object Page
        +-- Report Problem
```

### IT Support

```text
Fiori Launchpad
  +-- Help Desk
  |     +-- Ticket List Report
  |     +-- Ticket Object Page
  |     +-- Assignment / Actions
  |
  +-- Technician Workbench
  |     +-- My Open Tickets
  |     +-- SLA At Risk
  |     +-- Waiting for Parts
  |
  +-- Asset Management
  |
  +-- MIS Inventory
```

### Management

```text
Fiori Launchpad
  +-- IT Operations Dashboard
        +-- Ticket KPIs
        +-- SLA KPIs
        +-- Asset KPIs
        +-- Inventory KPIs
```

## 11. Target SAP Technical Workflow

```text
Fiori Elements / SAPUI5
        |
        v
OData V4 Service
        |
        v
RAP Projection / Service Definition
        |
        v
RAP Business Objects
        |
        +-- Actions
        +-- Validations
        +-- Determinations
        +-- Authorization
        |
        v
ABAP CDS Interface Views
        |
        v
Persistence
        |
        +-- Custom Z Tables
        +-- Standard SAP Objects/Data
```

## 12. Local Development Workflow Before SAP Backend Access

```text
Fiori Elements / SAPUI5
        |
        v
OData-compatible local/mock contract
        |
        v
Realistic Development Data
```

The local service must preserve the planned entity names, relationships and actions as closely as practical so the Fiori applications can later be switched to the real RAP OData V4 service.

## 13. Flagship Demonstration

The project's primary demo scenario is:

```text
Employee reports laptop issue
        -> ticket linked to assigned laptop
        -> help desk assigns technician
        -> technician starts work
        -> diagnoses failed SSD
        -> reserves SSD from MIS inventory
        -> MIS issues SSD
        -> technician records repair
        -> asset repair history updates
        -> ticket resolved
        -> employee confirms
        -> management KPIs update
```

This scenario demonstrates the integration of Help Desk, Asset Lifecycle and MIS Inventory rather than three isolated CRUD applications.
