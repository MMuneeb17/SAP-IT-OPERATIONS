# Generated Phase 10 contract mapping

Design only; no SAP activation or compilation is claimed. Edit blueprint.json, then run
`npm run design:render`; `npm run design:check` checks these artifacts for drift.

## Submit

ITOperations.Ticket → ITOperations.Ticket; public action ITOperations.Submit

| Parameter (including binding) | Public facets |
| --- | --- |
| ticket | ITOperations.Ticket; nullable=false |

- Roles: EMPLOYEE. Authenticated requester owns this NEW ticket.
- Guard: NEW -> SUBMITTED; apply ticket guards in behavior.md
- Writes (conditional members included): Tickets, TicketHistory.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Authenticated actor, UTC timestamp, status/feature fields and SLA lifecycle update; append event atomically.

## AssignTechnician

ITOperations.Ticket → ITOperations.Ticket; public action ITOperations.AssignTechnician

| Parameter (including binding) | Public facets |
| --- | --- |
| ticket | ITOperations.Ticket; nullable=false |
| TechnicianUUID | Edm.Guid; nullable=false |

- Roles: SUPERVISOR. Supervisor manages the ticket team; chosen technician must be eligible for that team.
- Guard: SUBMITTED -> ASSIGNED; apply ticket guards in behavior.md
- Writes (conditional members included): Tickets, TicketHistory.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Authenticated actor, UTC timestamp, status/feature fields and SLA lifecycle update; append event atomically.

## StartWork

ITOperations.Ticket → ITOperations.Ticket; public action ITOperations.StartWork

| Parameter (including binding) | Public facets |
| --- | --- |
| ticket | ITOperations.Ticket; nullable=false |

- Roles: TECHNICIAN. Authenticated technician is assigned to this ticket; enforce workflow and linked repair/parts constraints.
- Guard: ASSIGNED -> IN_PROGRESS; apply ticket guards in behavior.md
- Writes (conditional members included): Tickets, TicketHistory.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Authenticated actor, UTC timestamp, status/feature fields and SLA lifecycle update; append event atomically.

## PutOnHold

ITOperations.Ticket → ITOperations.Ticket; public action ITOperations.PutOnHold

| Parameter (including binding) | Public facets |
| --- | --- |
| ticket | ITOperations.Ticket; nullable=false |
| Reason | Edm.String; length=500; nullable=false |
| WaitingReasonCode | Edm.String; length=500; nullable=true |

- Roles: TECHNICIAN. Authenticated technician is assigned to this ticket; enforce workflow and linked repair/parts constraints.
- Guard: IN_PROGRESS -> WAITING; apply ticket guards in behavior.md
- Writes (conditional members included): Tickets, TicketHistory.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Authenticated actor, UTC timestamp, status/feature fields and SLA lifecycle update; append event atomically.

## Resume

ITOperations.Ticket → ITOperations.Ticket; public action ITOperations.Resume

| Parameter (including binding) | Public facets |
| --- | --- |
| ticket | ITOperations.Ticket; nullable=false |

- Roles: TECHNICIAN. Authenticated technician is assigned to this ticket; enforce workflow and linked repair/parts constraints.
- Guard: WAITING -> IN_PROGRESS; apply ticket guards in behavior.md
- Writes (conditional members included): Tickets, TicketHistory.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Authenticated actor, UTC timestamp, status/feature fields and SLA lifecycle update; append event atomically.

## Resolve

ITOperations.Ticket → ITOperations.Ticket; public action ITOperations.Resolve

| Parameter (including binding) | Public facets |
| --- | --- |
| ticket | ITOperations.Ticket; nullable=false |
| Resolution | Edm.String; length=4000; nullable=false |

- Roles: TECHNICIAN. Authenticated technician is assigned to this ticket; enforce workflow and linked repair/parts constraints.
- Guard: IN_PROGRESS -> RESOLVED; apply ticket guards in behavior.md
- Writes (conditional members included): Tickets, TicketHistory.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Authenticated actor, UTC timestamp, status/feature fields and SLA lifecycle update; append event atomically.

## Close

ITOperations.Ticket → ITOperations.Ticket; public action ITOperations.Close

| Parameter (including binding) | Public facets |
| --- | --- |
| ticket | ITOperations.Ticket; nullable=false |

- Roles: EMPLOYEE. Authenticated requester owns this RESOLVED ticket; CLOSED tickets cannot reopen in this MVP.
- Guard: RESOLVED -> CLOSED; apply ticket guards in behavior.md
- Writes (conditional members included): Tickets, TicketHistory.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Authenticated actor, UTC timestamp, status/feature fields and SLA lifecycle update; append event atomically.

## Reopen

ITOperations.Ticket → ITOperations.Ticket; public action ITOperations.Reopen

| Parameter (including binding) | Public facets |
| --- | --- |
| ticket | ITOperations.Ticket; nullable=false |
| Reason | Edm.String; length=500; nullable=false |

- Roles: EMPLOYEE. Authenticated requester owns this RESOLVED ticket; CLOSED tickets cannot reopen in this MVP.
- Guard: RESOLVED -> IN_PROGRESS; apply ticket guards in behavior.md
- Writes (conditional members included): Tickets, TicketHistory.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Authenticated actor, UTC timestamp, status/feature fields and SLA lifecycle update; append event atomically.

## MakeAvailable

ITOperations.Asset → ITOperations.Asset; public action ITOperations.MakeAvailable

| Parameter (including binding) | Public facets |
| --- | --- |
| asset | ITOperations.Asset; nullable=false |
| Reason | Edm.String; length=4000; nullable=false |

- Roles: ASSET_ADMIN. Validate role, record scope and current business state; reject direct field writes.
- Guard: RECEIVED or TAGGED -> AVAILABLE
- Writes (conditional members included): Assets, AssetHistory.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Derive current custody; close/create assignment intervals at the same instant; preserve custody during repair; append history.

## AssignAsset

ITOperations.Asset → ITOperations.Asset; public action ITOperations.AssignAsset

| Parameter (including binding) | Public facets |
| --- | --- |
| asset | ITOperations.Asset; nullable=false |
| EmployeeUUID | Edm.Guid; nullable=false |
| Reason | Edm.String; length=4000; nullable=false |

- Roles: ASSET_ADMIN. Validate role, record scope and current business state; reject direct field writes.
- Guard: AVAILABLE -> ASSIGNED; eligible employee
- Writes (conditional members included): Assets, AssetHistory, AssetAssignments.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Derive current custody; close/create assignment intervals at the same instant; preserve custody during repair; append history.

## TransferAsset

ITOperations.Asset → ITOperations.Asset; public action ITOperations.TransferAsset

| Parameter (including binding) | Public facets |
| --- | --- |
| asset | ITOperations.Asset; nullable=false |
| EmployeeUUID | Edm.Guid; nullable=false |
| Reason | Edm.String; length=4000; nullable=false |

- Roles: ASSET_ADMIN. Validate role, record scope and current business state; reject direct field writes.
- Guard: ASSIGNED -> ASSIGNED; different eligible employee
- Writes (conditional members included): Assets, AssetHistory, AssetAssignments.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Derive current custody; close/create assignment intervals at the same instant; preserve custody during repair; append history.

## ReturnAsset

ITOperations.Asset → ITOperations.Asset; public action ITOperations.ReturnAsset

| Parameter (including binding) | Public facets |
| --- | --- |
| asset | ITOperations.Asset; nullable=false |
| Reason | Edm.String; length=4000; nullable=false |

- Roles: ASSET_ADMIN. Validate role, record scope and current business state; reject direct field writes.
- Guard: ASSIGNED -> AVAILABLE
- Writes (conditional members included): Assets, AssetHistory, AssetAssignments.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Derive current custody; close/create assignment intervals at the same instant; preserve custody during repair; append history.

## SendForRepair

ITOperations.Asset → ITOperations.Asset; public action ITOperations.SendForRepair

| Parameter (including binding) | Public facets |
| --- | --- |
| asset | ITOperations.Asset; nullable=false |
| TechnicianUUID | Edm.Guid; nullable=false |
| TicketUUID | Edm.Guid; nullable=true |
| Diagnosis | Edm.String; length=4000; nullable=false |

- Roles: TECHNICIAN, ASSET_ADMIN. Technician has assigned linked work, or asset administrator controls the asset; preserve repair and parts invariants.
- Guard: AVAILABLE or ASSIGNED -> IN_REPAIR; at most one open repair; matching ticket and technician
- Writes (conditional members included): Assets, AssetHistory, AssetRepairs.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Derive current custody; close/create assignment intervals at the same instant; preserve custody during repair; append history.

## CompleteRepair

ITOperations.Asset → ITOperations.Asset; public action ITOperations.CompleteRepair

| Parameter (including binding) | Public facets |
| --- | --- |
| asset | ITOperations.Asset; nullable=false |
| RepairDescription | Edm.String; length=4000; nullable=false |

- Roles: TECHNICIAN, ASSET_ADMIN. Technician has assigned linked work, or asset administrator controls the asset; preserve repair and parts invariants.
- Guard: IN_REPAIR -> ASSIGNED if current custody exists, otherwise AVAILABLE; no outstanding linked requests
- Writes (conditional members included): Assets, AssetHistory, AssetRepairs.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Derive current custody; close/create assignment intervals at the same instant; preserve custody during repair; append history.

## RetireAsset

ITOperations.Asset → ITOperations.Asset; public action ITOperations.RetireAsset

| Parameter (including binding) | Public facets |
| --- | --- |
| asset | ITOperations.Asset; nullable=false |
| Reason | Edm.String; length=4000; nullable=false |

- Roles: ASSET_ADMIN. Validate role, record scope and current business state; reject direct field writes.
- Guard: AVAILABLE -> RETIRED
- Writes (conditional members included): Assets, AssetHistory.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Derive current custody; close/create assignment intervals at the same instant; preserve custody during repair; append history.

## DisposeAsset

ITOperations.Asset → ITOperations.Asset; public action ITOperations.DisposeAsset

| Parameter (including binding) | Public facets |
| --- | --- |
| asset | ITOperations.Asset; nullable=false |
| Reason | Edm.String; length=4000; nullable=false |

- Roles: ASSET_ADMIN. Validate role, record scope and current business state; reject direct field writes.
- Guard: RETIRED -> DISPOSED
- Writes (conditional members included): Assets, AssetHistory.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Derive current custody; close/create assignment intervals at the same instant; preserve custody during repair; append history.

## ReceiveStock

ITOperations.Stock → ITOperations.Stock; public action ITOperations.ReceiveStock

| Parameter (including binding) | Public facets |
| --- | --- |
| item | ITOperations.Stock; nullable=false |
| Quantity | Edm.Decimal; precision=15; scale=3; nullable=false |
| Reason | Edm.String; length=500; nullable=false |

- Roles: STORE_OFFICER. Store officer controls source and destination locations; validate quantities, references and mandatory reasons.
- Guard: positive quantity; parts only
- Writes (conditional members included): Stocks, StockTransactions.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Fixed decimal (15,3); EA whole units; recompute availability/status, pair transfers, retain all origin references; append immutable movement.

## ReserveStock

ITOperations.Stock → ITOperations.Stock; public action ITOperations.ReserveStock

| Parameter (including binding) | Public facets |
| --- | --- |
| item | ITOperations.Stock; nullable=false |
| Quantity | Edm.Decimal; precision=15; scale=3; nullable=false |
| Reason | Edm.String; length=500; nullable=false |
| TicketUUID | Edm.Guid; nullable=true |
| AssetUUID | Edm.Guid; nullable=true |
| AssetRepairUUID | Edm.Guid; nullable=true |

- Roles: TECHNICIAN, STORE_OFFICER. Store officer controls location, or technician has assigned linked work; prevent oversubscription.
- Guard: positive available quantity; matching optional ticket/asset/open repair
- Writes (conditional members included): Stocks, Reservations, StockTransactions, TicketHistory.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Fixed decimal (15,3); EA whole units; recompute availability/status, pair transfers, retain all origin references; append immutable movement.

## RequestPart

ITOperations.Ticket → ITOperations.Ticket; public action ITOperations.RequestPart

| Parameter (including binding) | Public facets |
| --- | --- |
| item | ITOperations.Ticket; nullable=false |
| StockUUID | Edm.Guid; nullable=false |
| Quantity | Edm.Decimal; precision=15; scale=3; nullable=false |
| Reason | Edm.String; length=500; nullable=false |

- Roles: TECHNICIAN. Authenticated technician is assigned to this ticket; enforce workflow and linked repair/parts constraints.
- Guard: IN_PROGRESS or WAITING ticket; matching open repair when affected asset exists; sufficient stock
- Writes (conditional members included): Stocks, Reservations, StockTransactions, TicketHistory.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Fixed decimal (15,3); EA whole units; recompute availability/status, pair transfers, retain all origin references; append immutable movement.

## TransferStock

ITOperations.Stock → ITOperations.Stock; public action ITOperations.TransferStock

| Parameter (including binding) | Public facets |
| --- | --- |
| item | ITOperations.Stock; nullable=false |
| TargetStockUUID | Edm.Guid; nullable=false |
| Quantity | Edm.Decimal; precision=15; scale=3; nullable=false |
| Reason | Edm.String; length=500; nullable=false |

- Roles: STORE_OFFICER. Store officer controls source and destination locations; validate quantities, references and mandatory reasons.
- Guard: distinct locations of same material; source available quantity sufficient
- Writes (conditional members included): Stocks, StockTransactions.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Fixed decimal (15,3); EA whole units; recompute availability/status, pair transfers, retain all origin references; append immutable movement.

## ReturnStock

ITOperations.Stock → ITOperations.Stock; public action ITOperations.ReturnStock

| Parameter (including binding) | Public facets |
| --- | --- |
| item | ITOperations.Stock; nullable=false |
| IssueTransactionUUID | Edm.Guid; nullable=false |
| Quantity | Edm.Decimal; precision=15; scale=3; nullable=false |
| Reason | Edm.String; length=500; nullable=false |

- Roles: STORE_OFFICER. Store officer controls source and destination locations; validate quantities, references and mandatory reasons.
- Guard: original ISSUE belongs to this stock; cumulative returns <= original issued quantity
- Writes (conditional members included): Stocks, StockTransactions, TicketHistory.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Fixed decimal (15,3); EA whole units; recompute availability/status, pair transfers, retain all origin references; append immutable movement.

## AdjustStock

ITOperations.Stock → ITOperations.Stock; public action ITOperations.AdjustStock

| Parameter (including binding) | Public facets |
| --- | --- |
| item | ITOperations.Stock; nullable=false |
| Quantity | Edm.Decimal; precision=15; scale=3; nullable=false |
| Reason | Edm.String; length=500; nullable=false |

- Roles: STORE_OFFICER. Store officer controls source and destination locations; validate quantities, references and mandatory reasons.
- Guard: nonzero signed adjustment; resulting physical >= reserved >= 0; reason required
- Writes (conditional members included): Stocks, StockTransactions.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Fixed decimal (15,3); EA whole units; recompute availability/status, pair transfers, retain all origin references; append immutable movement.

## IssueReservation

ITOperations.Reservation → ITOperations.Reservation; public action ITOperations.IssueReservation

| Parameter (including binding) | Public facets |
| --- | --- |
| item | ITOperations.Reservation; nullable=false |
| Quantity | Edm.Decimal; precision=15; scale=3; nullable=false |
| Reason | Edm.String; length=500; nullable=false |

- Roles: STORE_OFFICER. Store officer controls source and destination locations; validate quantities, references and mandatory reasons.
- Guard: OPEN or PARTIAL; positive quantity <= unissued remainder; linked ticket/repair eligible
- Writes (conditional members included): Stocks, Reservations, StockTransactions, TicketHistory.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Fixed decimal (15,3); EA whole units; recompute availability/status, pair transfers, retain all origin references; append immutable movement.

## CancelReservation

ITOperations.Reservation → ITOperations.Reservation; public action ITOperations.CancelReservation

| Parameter (including binding) | Public facets |
| --- | --- |
| item | ITOperations.Reservation; nullable=false |
| Reason | Edm.String; length=500; nullable=false |

- Roles: TECHNICIAN, STORE_OFFICER. Store officer controls stock location, or technician owns the linked part request; cancel only outstanding quantity.
- Guard: OPEN or PARTIAL; release only unissued remainder
- Writes (conditional members included): Stocks, Reservations, StockTransactions, TicketHistory.
- Potential lock roots: Tickets, Assets, Materials.
- Transaction: single SAP LUW.
- Determinations: Fixed decimal (15,3); EA whole units; recompute availability/status, pair transfers, retain all origin references; append immutable movement.

## CreateInventoryItem

Collection(ITOperations.Material) → ITOperations.Material; public action ITOperations.CreateInventoryItem

| Parameter (including binding) | Public facets |
| --- | --- |
| bindingParameter | Collection(ITOperations.Material); nullable=true |
| MaterialNumber | Edm.String; nullable=false |
| Description | Edm.String; nullable=false |
| Category | Edm.String; nullable=false |
| TrackingMode | Edm.String; nullable=false |
| UnitOfMeasure | Edm.String; nullable=false |
| AssetType | Edm.String; nullable=true |
| Manufacturer | Edm.String; nullable=true |
| Model | Edm.String; nullable=true |
| ReorderLevel | Edm.Decimal; precision=15; scale=3; nullable=true |
| Quantity | Edm.Decimal; precision=15; scale=3; nullable=false |
| StorageLocation | Edm.String; nullable=false |
| SerialNumbers | Edm.String; nullable=true |
| PurchaseDate | Edm.Date; nullable=true |
| WarrantyEnd | Edm.Date; nullable=true |
| Reason | Edm.String; nullable=false |

- Roles: STORE_OFFICER. Create catalogue items and receive into permitted locations; equipment creates shared assets.
- Guard: Unique material number; valid tracking mode/unit/location; equipment serials and quantity consistent; configured number range; existing receipt requires EQUIPMENT
- Writes (conditional members included): Materials, Assets, AssetHistory, Stocks, StockTransactions.
- Potential lock roots: Materials, Assets.
- Transaction: single SAP LUW.
- Determinations: Create equipment as shared Assets, or quantity parts as Stocks and opening movement; allocate UUIDs/numbers; bump catalogue root ETag.

## ReceiveEquipment

ITOperations.Material → ITOperations.Material; public action ITOperations.ReceiveEquipment

| Parameter (including binding) | Public facets |
| --- | --- |
| bindingParameter | ITOperations.Material; nullable=true |
| Quantity | Edm.Decimal; precision=15; scale=3; nullable=false |
| StorageLocation | Edm.String; nullable=false |
| SerialNumbers | Edm.String; nullable=true |
| PurchaseDate | Edm.Date; nullable=true |
| WarrantyEnd | Edm.Date; nullable=true |
| Reason | Edm.String; nullable=false |

- Roles: STORE_OFFICER. Receive serialized equipment into permitted locations; backend allocates tags.
- Guard: Unique material number; valid tracking mode/unit/location; equipment serials and quantity consistent; configured number range; existing receipt requires EQUIPMENT
- Writes (conditional members included): Materials, Assets, AssetHistory, Stocks, StockTransactions.
- Potential lock roots: Materials, Assets.
- Transaction: single SAP LUW.
- Determinations: Create equipment as shared Assets, or quantity parts as Stocks and opening movement; allocate UUIDs/numbers; bump catalogue root ETag.

## SaveSLAPolicies

ITOperations.SLAPolicy → ITOperations.SLAPolicy; public action ITOperations.SaveSLAPolicies

| Parameter (including binding) | Public facets |
| --- | --- |
| item | ITOperations.SLAPolicy; nullable=false |
| ResponseMinutes | Edm.Int32; nullable=false |
| ResolutionMinutes | Edm.Int32; nullable=false |
| WarningPercent | Edm.Int32; nullable=false |
| Revision | Edm.Int32; nullable=false |
| Reason | Edm.String; length=500; nullable=false |

- Roles: SYSTEM_ADMIN. Validate role, record scope and current business state; reject direct field writes.
- Guard: Expected Revision matches; editable parameter whitelist; validate active references and bounds; nonblank Reason
- Writes (conditional members included): SLAPolicies, ConfigurationHistory.
- Potential lock roots: SLAPolicies.
- Transaction: single SAP LUW.
- Determinations: Revision + 1, changed timestamp, immutable before/after audit; never rewrite prior ticket SLA snapshots.

## SaveCategories

ITOperations.Category → ITOperations.Category; public action ITOperations.SaveCategories

| Parameter (including binding) | Public facets |
| --- | --- |
| item | ITOperations.Category; nullable=false |
| DefaultPriority | Edm.String; length=500; nullable=false |
| TeamUUID | Edm.Guid; nullable=false |
| Active | Edm.Boolean; nullable=false |
| Revision | Edm.Int32; nullable=false |
| Reason | Edm.String; length=500; nullable=false |

- Roles: SYSTEM_ADMIN. Validate role, record scope and current business state; reject direct field writes.
- Guard: Expected Revision matches; editable parameter whitelist; validate active references and bounds; nonblank Reason
- Writes (conditional members included): Categories, ConfigurationHistory.
- Potential lock roots: Categories.
- Transaction: single SAP LUW.
- Determinations: Revision + 1, changed timestamp, immutable before/after audit; never rewrite prior ticket SLA snapshots.

## SaveSubcategories

ITOperations.Subcategory → ITOperations.Subcategory; public action ITOperations.SaveSubcategories

| Parameter (including binding) | Public facets |
| --- | --- |
| item | ITOperations.Subcategory; nullable=false |
| Name | Edm.String; length=500; nullable=false |
| Active | Edm.Boolean; nullable=false |
| Revision | Edm.Int32; nullable=false |
| Reason | Edm.String; length=500; nullable=false |

- Roles: SYSTEM_ADMIN. Validate role, record scope and current business state; reject direct field writes.
- Guard: Expected Revision matches; editable parameter whitelist; validate active references and bounds; nonblank Reason
- Writes (conditional members included): Subcategories, ConfigurationHistory.
- Potential lock roots: Subcategories.
- Transaction: single SAP LUW.
- Determinations: Revision + 1, changed timestamp, immutable before/after audit; never rewrite prior ticket SLA snapshots.

## SaveTeams

ITOperations.Team → ITOperations.Team; public action ITOperations.SaveTeams

| Parameter (including binding) | Public facets |
| --- | --- |
| item | ITOperations.Team; nullable=false |
| Name | Edm.String; length=500; nullable=false |
| LocationUUID | Edm.Guid; nullable=false |
| LeadUUID | Edm.Guid; nullable=false |
| Active | Edm.Boolean; nullable=false |
| Revision | Edm.Int32; nullable=false |
| Reason | Edm.String; length=500; nullable=false |

- Roles: SYSTEM_ADMIN. Validate role, record scope and current business state; reject direct field writes.
- Guard: Expected Revision matches; editable parameter whitelist; validate active references and bounds; nonblank Reason
- Writes (conditional members included): Teams, ConfigurationHistory.
- Potential lock roots: Teams.
- Transaction: single SAP LUW.
- Determinations: Revision + 1, changed timestamp, immutable before/after audit; never rewrite prior ticket SLA snapshots.

## SaveLocations

ITOperations.Location → ITOperations.Location; public action ITOperations.SaveLocations

| Parameter (including binding) | Public facets |
| --- | --- |
| item | ITOperations.Location; nullable=false |
| Name | Edm.String; length=500; nullable=false |
| Active | Edm.Boolean; nullable=false |
| Revision | Edm.Int32; nullable=false |
| Reason | Edm.String; length=500; nullable=false |

- Roles: SYSTEM_ADMIN. Validate role, record scope and current business state; reject direct field writes.
- Guard: Expected Revision matches; editable parameter whitelist; validate active references and bounds; nonblank Reason
- Writes (conditional members included): Locations, ConfigurationHistory.
- Potential lock roots: Locations.
- Transaction: single SAP LUW.
- Determinations: Revision + 1, changed timestamp, immutable before/after audit; never rewrite prior ticket SLA snapshots.

## SaveWaitingReasons

ITOperations.WaitingReason → ITOperations.WaitingReason; public action ITOperations.SaveWaitingReasons

| Parameter (including binding) | Public facets |
| --- | --- |
| item | ITOperations.WaitingReason; nullable=false |
| Name | Edm.String; length=500; nullable=false |
| PauseResolution | Edm.Boolean; nullable=false |
| Active | Edm.Boolean; nullable=false |
| Revision | Edm.Int32; nullable=false |
| Reason | Edm.String; length=500; nullable=false |

- Roles: SYSTEM_ADMIN. Validate role, record scope and current business state; reject direct field writes.
- Guard: Expected Revision matches; editable parameter whitelist; validate active references and bounds; nonblank Reason
- Writes (conditional members included): WaitingReasons, ConfigurationHistory.
- Potential lock roots: WaitingReasons.
- Transaction: single SAP LUW.
- Determinations: Revision + 1, changed timestamp, immutable before/after audit; never rewrite prior ticket SLA snapshots.

## SaveEscalationRules

ITOperations.EscalationRule → ITOperations.EscalationRule; public action ITOperations.SaveEscalationRules

| Parameter (including binding) | Public facets |
| --- | --- |
| item | ITOperations.EscalationRule; nullable=false |
| TargetRole | Edm.String; length=500; nullable=false |
| Active | Edm.Boolean; nullable=false |
| Revision | Edm.Int32; nullable=false |
| Reason | Edm.String; length=500; nullable=false |

- Roles: SYSTEM_ADMIN. Validate role, record scope and current business state; reject direct field writes.
- Guard: Expected Revision matches; editable parameter whitelist; validate active references and bounds; nonblank Reason
- Writes (conditional members included): EscalationRules, ConfigurationHistory.
- Potential lock roots: EscalationRules.
- Transaction: single SAP LUW.
- Determinations: Revision + 1, changed timestamp, immutable before/after audit; never rewrite prior ticket SLA snapshots.

## PreviewSLA

ITOperations.Ticket → ITOperations.Ticket; public action ITOperations.PreviewSLA

| Parameter (including binding) | Public facets |
| --- | --- |
| item | ITOperations.Ticket; nullable=false |
| AsOf | Edm.DateTimeOffset; nullable=false |

- Roles: TECHNICIAN, SUPERVISOR, IT_MANAGER. Technician reads assigned tickets, supervisor manages team tickets, manager reads all; only CheckSLA can write escalation history.
- Guard: Valid AsOf >= latest ticket change and <= 2100; authorized read
- Writes (conditional members included): none.
- Potential lock roots: none.
- Transaction: read-only.
- Determinations: Evaluate a copy; no state, audit, locks or ETag changes.

## CheckSLA

ITOperations.Ticket → ITOperations.Ticket; public action ITOperations.CheckSLA

| Parameter (including binding) | Public facets |
| --- | --- |
| item | ITOperations.Ticket; nullable=false |

- Roles: SUPERVISOR, IT_MANAGER. Technician reads assigned tickets, supervisor manages team tickets, manager reads all; only CheckSLA can write escalation history.
- Guard: Authorized scoped ticket; active escalation rules; no new escalation on completed ticket
- Writes (conditional members included): Tickets, TicketHistory.
- Potential lock roots: Tickets.
- Transaction: single SAP LUW.
- Determinations: Assess current time, escalate only above recorded level; update checked time; no external notifications in this phase.

## ChangePriority

ITOperations.Ticket → ITOperations.Ticket; public action ITOperations.ChangePriority

| Parameter (including binding) | Public facets |
| --- | --- |
| item | ITOperations.Ticket; nullable=false |
| Priority | Edm.String; length=500; nullable=false |
| Reason | Edm.String; length=500; nullable=false |

- Roles: SUPERVISOR. Supervisor manages the ticket team; chosen technician must be eligible for that team.
- Guard: Authorized supervisor; valid priority, policy and reason
- Writes (conditional members included): Tickets, TicketHistory.
- Potential lock roots: Tickets.
- Transaction: single SAP LUW.
- Determinations: Snapshot selected policy; preserve elapsed time and pauses; append audit; never reset historical first response.

## CreateTicket

POST /Tickets; standard RAP create, not an action import.

- Roles: EMPLOYEE. Requester must equal authenticated employee; use active configuration and assigned asset.
- Guard: Authenticated requester; active category/subcategory/team/location; affected asset belongs to requester; required subject/description
- Writes (conditional members included): Tickets, TicketHistory.
- Potential lock roots: Tickets, Assets.
- Transaction: single SAP LUW.
- Determinations: Generate UUID and number; NEW status; server actors and UTC times; snapshot routing/SLA and append Create history.
