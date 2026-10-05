# Initial entity relationship model — v1

All technical primary keys are UUIDs. `?` means nullable. Fields below are the
minimum domain design. The five original entities have a complete
[field dictionary](../../docs/service-contract.md). Phase 4 adds assignment,
repair and asset-event sets documented in the [asset contract](../../docs/asset-lifecycle.md).
Inventory entities remain conceptual.

| Entity / set | Key | Principal fields and foreign keys | Owner |
| --- | --- | --- | --- |
| Employee / Employees | EmployeeUUID | EmployeeNumber, DisplayName, Email, Department, Location | External reference |
| Ticket / Tickets | TicketUUID | TicketNumber, Subject, Description, Status, Priority, RequesterUUID, TechnicianUUID?, AssetUUID?, Resolution? | Ticket root |
| Asset / Assets | AssetUUID | AssetTag, SerialNumber?, AssetType, Status, CurrentEmployeeUUID?, WarrantyEnd? | Asset root |
| TicketComment / TicketComments | TicketCommentUUID | TicketUUID, AuthorUUID, Text, CreatedAt | Ticket child |
| TicketHistory / TicketHistory | TicketHistoryUUID | TicketUUID, ActorUUID, Action, OldValue?, NewValue?, Reason?, CreatedAt | Ticket child, append-only |
| AssetAssignment / AssetAssignments | AssetAssignmentUUID | AssetUUID, EmployeeUUID, StartAt, EndAt?, Reason | Asset child |
| AssetRepair / AssetRepairs | AssetRepairUUID | AssetUUID, TicketUUID?, TechnicianUUID, Status, Diagnosis, RepairDescription?, StartedAt, RepairedAt? | Asset child |
| AssetHistory / AssetHistory | AssetHistoryUUID | AssetUUID, ActorUUID, Action, OldStatus?, NewStatus, OldEmployeeUUID?, NewEmployeeUUID?, Reason, CreatedAt | Asset child, append-only |
| Material / Materials | MaterialUUID | MaterialNumber, Description, UnitOfMeasure | Material root |
| Stock / Stocks | StockUUID | MaterialUUID, StorageLocation, PhysicalQuantity, ReservedQuantity, AvailableQuantity (derived) | Material child |
| Reservation / Reservations | ReservationUUID | MaterialUUID, StockUUID, TicketUUID?, AssetUUID?, Quantity, IssuedQuantity, Status, Reason | Material child |
| StockTransaction / StockTransactions | StockTransactionUUID | MaterialUUID, StockUUID, ReservationUUID?, TicketUUID?, AssetUUID?, AssetRepairUUID?, MovementType, Quantity, UnitOfMeasure, TransferUUID?, Reason, CreatedAt, CreatedBy | Material child, append-only |

```mermaid
erDiagram
  Employee ||--o{ Ticket : requests
  Employee o|--o{ Ticket : assigned_technician
  Employee o|--o{ Asset : current_custodian
  Employee ||--o{ AssetAssignment : receives
  Employee ||--o{ TicketComment : authors
  Employee ||--o{ TicketHistory : acts
  Employee ||--o{ AssetRepair : performs
  Asset o|--o{ Ticket : affected_asset
  Ticket ||--o{ TicketComment : owns
  Ticket ||--o{ TicketHistory : owns
  Asset ||--o{ AssetAssignment : owns
  Asset ||--o{ AssetRepair : owns
  Asset ||--o{ AssetHistory : owns
  Employee ||--o{ AssetHistory : acts
  Ticket o|--o{ AssetRepair : originates
  Material ||--o{ Stock : owns
  Material ||--o{ Reservation : owns
  Material ||--o{ StockTransaction : owns
  Stock ||--o{ Reservation : reserves_from
  Stock ||--o{ StockTransaction : records
  Ticket o|--o{ Reservation : requests
  Asset o|--o{ Reservation : needs
  Reservation o|--o{ StockTransaction : fulfilled_by
  Ticket o|--o{ StockTransaction : consumes
  Asset o|--o{ StockTransaction : repaired_with
  AssetRepair o|--o{ StockTransaction : uses_part
```

Stock is unique by material + storage location. Assignment end is exclusive; open
assignments have null EndAt. CurrentEmployeeUUID is maintained from the current
assignment, never edited separately. AssetTag, MaterialNumber and TicketNumber
are unique business identifiers. EmployeeNumber uniqueness depends on source-system
scope. History and stock transactions cannot be deleted or overwritten by business
users; corrections append compensating records. Roots with audit dependencies are
retained or deactivated rather than cascade-deleted. Child ownership does not imply
permission to delete audit data.

Material, stock, reservation and movement references must agree. An optional asset
on a ticket-linked reservation must agree with the ticket's affected asset. Repeated
issues can fulfill one reservation in parts; transactions retain the originating
repair where applicable. Configuration entities are designed in phase 7.
