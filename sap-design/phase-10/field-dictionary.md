# Generated Phase 10 contract mapping

Design only; no SAP activation or compilation is claimed. Edit blueprint.json, then run
`npm run design:render`; `npm run design:check` checks these artifacts for drift.

## Employees

Released employee source + ZIT_EMP_MAP identity mapping → ZI_IT_Employee → ZC_IT_Employee. Owner: Employees.

| Public field | OData facets | Storage/source | Null presence field |
| --- | --- | --- | --- |
| EmployeeUUID | Edm.Guid; nullable=false | reference | — |
| EmployeeNumber | Edm.String; length=20; nullable=false | reference | — |
| DisplayName | Edm.String; length=100; nullable=false | reference | — |
| Email | Edm.String; length=254; nullable=false | reference | — |
| Department | Edm.String; length=80; nullable=false | reference | — |
| Location | Edm.String; length=80; nullable=false | reference | — |

## Tickets

ZIT_TICKET → ZI_IT_Ticket → ZC_IT_Ticket. Owner: Tickets.

| Public field | OData facets | Storage/source | Null presence field |
| --- | --- | --- | --- |
| TicketUUID | Edm.Guid; nullable=false | ticket_uuid: abap.raw(16) | — |
| TicketNumber | Edm.String; length=20; nullable=false | ticket_number: abap.char(20) | — |
| Subject | Edm.String; length=200; nullable=false | subject: abap.char(200) | — |
| Description | Edm.String; length=4000; nullable=false | description: abap.string | — |
| Status | Edm.String; length=20; nullable=false | status: abap.char(20) | — |
| Priority | Edm.String; length=10; nullable=false | priority: abap.char(10) | — |
| Category | Edm.String; length=40; nullable=false | category: abap.char(40) | — |
| RequesterUUID | Edm.Guid; nullable=false | requester_uuid: abap.raw(16) | — |
| TechnicianUUID | Edm.Guid; nullable=true | technician_uuid: abap.raw(16) | has_technician_uuid |
| AssetUUID | Edm.Guid; nullable=true | asset_uuid: abap.raw(16) | has_asset_uuid |
| Resolution | Edm.String; length=4000; nullable=true | resolution: abap.string | has_resolution |
| WaitingReason | Edm.String; length=500; nullable=true | waiting_reason: abap.char(500) | has_waiting_reason |
| ResolvedAt | Edm.DateTimeOffset; nullable=true | resolved_at: abap.dec(21,7) | has_resolved_at |
| ClosedAt | Edm.DateTimeOffset; nullable=true | closed_at: abap.dec(21,7) | has_closed_at |
| CreatedAt | Edm.DateTimeOffset; nullable=false | created_at: abap.dec(21,7) | — |
| CreatedBy | Edm.String; length=80; nullable=false | created_by: abap.char(80) | — |
| LastChangedAt | Edm.DateTimeOffset; nullable=false | last_changed_at: abap.dec(21,7) | — |
| LastChangedBy | Edm.String; length=80; nullable=false | last_changed_by: abap.char(80) | — |
| StatusCriticality | Edm.Int32; nullable=false | derived | — |
| PriorityCriticality | Edm.Int32; nullable=false | derived | — |
| CanSubmit | Edm.Boolean; nullable=false | derived | — |
| CanAssignTechnician | Edm.Boolean; nullable=false | derived | — |
| CanStartWork | Edm.Boolean; nullable=false | derived | — |
| CanPutOnHold | Edm.Boolean; nullable=false | derived | — |
| CanResume | Edm.Boolean; nullable=false | derived | — |
| CanResolve | Edm.Boolean; nullable=false | derived | — |
| CanClose | Edm.Boolean; nullable=false | derived | — |
| CanReopen | Edm.Boolean; nullable=false | derived | — |
| TeamUUID | Edm.Guid; nullable=false | team_uuid: abap.raw(16) | — |
| LocationUUID | Edm.Guid; nullable=false | location_uuid: abap.raw(16) | — |
| SubcategoryUUID | Edm.Guid; nullable=true | subcategory_uuid: abap.raw(16) | has_subcategory_uuid |
| ResponseMinutes | Edm.Int32; nullable=false | response_minutes: abap.int4 | — |
| ResolutionMinutes | Edm.Int32; nullable=false | resolution_minutes: abap.int4 | — |
| WarningPercent | Edm.Int32; nullable=false | warning_percent: abap.int4 | — |
| SLAPolicyRevision | Edm.Int32; nullable=false | slapolicy_revision: abap.int4 | — |
| FirstResponseAt | Edm.DateTimeOffset; nullable=true | first_response_at: abap.dec(21,7) | has_first_response_at |
| ResolutionStartedAt | Edm.DateTimeOffset; nullable=false | resolution_started_at: abap.dec(21,7) | — |
| SLAPausedSeconds | Edm.Int32; nullable=false | slapaused_seconds: abap.int4 | — |
| SLAPauseStartedAt | Edm.DateTimeOffset; nullable=true | slapause_started_at: abap.dec(21,7) | has_slapause_started_at |
| WaitingReasonCode | Edm.String; length=500; nullable=true | waiting_reason_code: abap.char(500) | has_waiting_reason_code |
| EscalationLevel | Edm.Int32; nullable=false | escalation_level: abap.int4 | — |
| EscalationTarget | Edm.String; length=500; nullable=true | escalation_target: abap.char(500) | has_escalation_target |
| LastEscalatedAt | Edm.DateTimeOffset; nullable=true | last_escalated_at: abap.dec(21,7) | has_last_escalated_at |
| SLALastCheckedAt | Edm.DateTimeOffset; nullable=true | slalast_checked_at: abap.dec(21,7) | has_slalast_checked_at |
| ResponseDueAt | Edm.DateTimeOffset; nullable=false | derived | — |
| ResolutionDueAt | Edm.DateTimeOffset; nullable=false | derived | — |
| ResponseSLAStatus | Edm.String; length=500; nullable=false | derived | — |
| ResolutionSLAStatus | Edm.String; length=500; nullable=false | derived | — |
| SLAStatus | Edm.String; length=500; nullable=false | derived | — |
| SLACriticality | Edm.Int32; nullable=false | derived | — |
| SLAEvaluatedAt | Edm.DateTimeOffset; nullable=false | derived | — |

## Assets

ZIT_ASSET → ZI_IT_Asset → ZC_IT_Asset. Owner: Assets.

| Public field | OData facets | Storage/source | Null presence field |
| --- | --- | --- | --- |
| AssetUUID | Edm.Guid; nullable=false | asset_uuid: abap.raw(16) | — |
| AssetTag | Edm.String; length=30; nullable=false | asset_tag: abap.char(30) | — |
| SerialNumber | Edm.String; length=80; nullable=true | serial_number: abap.char(80) | has_serial_number |
| AssetType | Edm.String; length=40; nullable=false | asset_type: abap.char(40) | — |
| Manufacturer | Edm.String; length=80; nullable=false | manufacturer: abap.char(80) | — |
| Model | Edm.String; length=100; nullable=false | model: abap.char(100) | — |
| Status | Edm.String; length=20; nullable=false | status: abap.char(20) | — |
| CurrentEmployeeUUID | Edm.Guid; nullable=true | current_employee_uuid: abap.raw(16) | has_current_employee_uuid |
| Location | Edm.String; length=80; nullable=false | location: abap.char(80) | — |
| PurchaseDate | Edm.Date; nullable=true | purchase_date: abap.dats | has_purchase_date |
| WarrantyEnd | Edm.Date; nullable=true | warranty_end: abap.dats | has_warranty_end |
| CreatedAt | Edm.DateTimeOffset; nullable=false | created_at: abap.dec(21,7) | — |
| CreatedBy | Edm.String; length=80; nullable=false | created_by: abap.char(80) | — |
| LastChangedAt | Edm.DateTimeOffset; nullable=false | last_changed_at: abap.dec(21,7) | — |
| LastChangedBy | Edm.String; length=80; nullable=false | last_changed_by: abap.char(80) | — |
| StatusCriticality | Edm.Int32; nullable=false | derived | — |
| CanMakeAvailable | Edm.Boolean; nullable=false | derived | — |
| CanAssignAsset | Edm.Boolean; nullable=false | derived | — |
| CanTransferAsset | Edm.Boolean; nullable=false | derived | — |
| CanReturnAsset | Edm.Boolean; nullable=false | derived | — |
| CanSendForRepair | Edm.Boolean; nullable=false | derived | — |
| CanCompleteRepair | Edm.Boolean; nullable=false | derived | — |
| CanRetireAsset | Edm.Boolean; nullable=false | derived | — |
| CanDisposeAsset | Edm.Boolean; nullable=false | derived | — |
| MaterialUUID | Edm.Guid; nullable=false | material_uuid: abap.raw(16) | — |
| CompanyCode | Edm.String; length=4; nullable=true | company_code: abap.char(4) | has_company_code |
| AssetClass | Edm.String; length=20; nullable=true | asset_class: abap.char(20) | has_asset_class |
| AssetNumber | Edm.String; length=12; nullable=true | asset_number: abap.char(12) | has_asset_number |
| AssetSubnumber | Edm.String; length=4; nullable=true | asset_subnumber: abap.char(4) | has_asset_subnumber |

## TicketComments

ZIT_TKT_COMMENT → ZI_IT_TicketComment → ZC_IT_TicketComment. Owner: Tickets.

| Public field | OData facets | Storage/source | Null presence field |
| --- | --- | --- | --- |
| TicketCommentUUID | Edm.Guid; nullable=false | ticket_comment_uuid: abap.raw(16) | — |
| TicketUUID | Edm.Guid; nullable=false | ticket_uuid: abap.raw(16) | — |
| AuthorUUID | Edm.Guid; nullable=false | author_uuid: abap.raw(16) | — |
| Text | Edm.String; length=4000; nullable=false | text: abap.string | — |
| CreatedAt | Edm.DateTimeOffset; nullable=false | created_at: abap.dec(21,7) | — |
| CreatedBy | Edm.String; length=80; nullable=false | created_by: abap.char(80) | — |

## TicketHistory

ZIT_TKT_HISTORY → ZI_IT_TicketHistory → ZC_IT_TicketHistory. Owner: Tickets.

| Public field | OData facets | Storage/source | Null presence field |
| --- | --- | --- | --- |
| TicketHistoryUUID | Edm.Guid; nullable=false | ticket_history_uuid: abap.raw(16) | — |
| TicketUUID | Edm.Guid; nullable=false | ticket_uuid: abap.raw(16) | — |
| ActorUUID | Edm.Guid; nullable=false | actor_uuid: abap.raw(16) | — |
| Action | Edm.String; length=40; nullable=false | action: abap.char(40) | — |
| OldValue | Edm.String; length=1000; nullable=true | old_value: abap.char(1000) | has_old_value |
| NewValue | Edm.String; length=1000; nullable=true | new_value: abap.char(1000) | has_new_value |
| Reason | Edm.String; length=4000; nullable=true | reason: abap.string | has_reason |
| CreatedAt | Edm.DateTimeOffset; nullable=false | created_at: abap.dec(21,7) | — |
| CreatedBy | Edm.String; length=80; nullable=false | created_by: abap.char(80) | — |

## AssetAssignments

ZIT_ASSET_ASSIGN → ZI_IT_AssetAssignment → ZC_IT_AssetAssignment. Owner: Assets.

| Public field | OData facets | Storage/source | Null presence field |
| --- | --- | --- | --- |
| AssetAssignmentUUID | Edm.Guid; nullable=false | asset_assignment_uuid: abap.raw(16) | — |
| AssetUUID | Edm.Guid; nullable=false | asset_uuid: abap.raw(16) | — |
| EmployeeUUID | Edm.Guid; nullable=false | employee_uuid: abap.raw(16) | — |
| StartAt | Edm.DateTimeOffset; nullable=false | start_at: abap.dec(21,7) | — |
| EndAt | Edm.DateTimeOffset; nullable=true | end_at: abap.dec(21,7) | has_end_at |
| Reason | Edm.String; length=4000; nullable=false | reason: abap.string | — |
| EndReason | Edm.String; length=4000; nullable=true | end_reason: abap.string | has_end_reason |
| CreatedBy | Edm.String; length=80; nullable=false | created_by: abap.char(80) | — |
| ClosedBy | Edm.String; length=80; nullable=true | closed_by: abap.char(80) | has_closed_by |

## AssetRepairs

ZIT_ASSET_REPAIR → ZI_IT_AssetRepair → ZC_IT_AssetRepair. Owner: Assets.

| Public field | OData facets | Storage/source | Null presence field |
| --- | --- | --- | --- |
| AssetRepairUUID | Edm.Guid; nullable=false | asset_repair_uuid: abap.raw(16) | — |
| AssetUUID | Edm.Guid; nullable=false | asset_uuid: abap.raw(16) | — |
| TicketUUID | Edm.Guid; nullable=true | ticket_uuid: abap.raw(16) | has_ticket_uuid |
| TechnicianUUID | Edm.Guid; nullable=false | technician_uuid: abap.raw(16) | — |
| Status | Edm.String; length=20; nullable=false | status: abap.char(20) | — |
| Diagnosis | Edm.String; length=4000; nullable=false | diagnosis: abap.string | — |
| RepairDescription | Edm.String; length=4000; nullable=true | repair_description: abap.string | has_repair_description |
| StartedAt | Edm.DateTimeOffset; nullable=false | started_at: abap.dec(21,7) | — |
| RepairedAt | Edm.DateTimeOffset; nullable=true | repaired_at: abap.dec(21,7) | has_repaired_at |
| CreatedBy | Edm.String; length=80; nullable=false | created_by: abap.char(80) | — |
| CompletedBy | Edm.String; length=80; nullable=true | completed_by: abap.char(80) | has_completed_by |

## AssetHistory

ZIT_ASSET_HIST → ZI_IT_AssetHistory → ZC_IT_AssetHistory. Owner: Assets.

| Public field | OData facets | Storage/source | Null presence field |
| --- | --- | --- | --- |
| AssetHistoryUUID | Edm.Guid; nullable=false | asset_history_uuid: abap.raw(16) | — |
| AssetUUID | Edm.Guid; nullable=false | asset_uuid: abap.raw(16) | — |
| ActorUUID | Edm.Guid; nullable=false | actor_uuid: abap.raw(16) | — |
| Action | Edm.String; length=40; nullable=false | action: abap.char(40) | — |
| OldStatus | Edm.String; length=20; nullable=true | old_status: abap.char(20) | has_old_status |
| NewStatus | Edm.String; length=20; nullable=false | new_status: abap.char(20) | — |
| OldEmployeeUUID | Edm.Guid; nullable=true | old_employee_uuid: abap.raw(16) | has_old_employee_uuid |
| NewEmployeeUUID | Edm.Guid; nullable=true | new_employee_uuid: abap.raw(16) | has_new_employee_uuid |
| Reason | Edm.String; length=4000; nullable=false | reason: abap.string | — |
| CreatedAt | Edm.DateTimeOffset; nullable=false | created_at: abap.dec(21,7) | — |

## Materials

ZIT_MATERIAL → ZI_IT_Material → ZC_IT_Material. Owner: Materials.

| Public field | OData facets | Storage/source | Null presence field |
| --- | --- | --- | --- |
| MaterialUUID | Edm.Guid; nullable=false | material_uuid: abap.raw(16) | — |
| MaterialNumber | Edm.String; length=4000; nullable=false | material_number: abap.string | — |
| Description | Edm.String; length=4000; nullable=false | description: abap.string | — |
| Category | Edm.String; length=4000; nullable=false | category: abap.string | — |
| UnitOfMeasure | Edm.String; length=4000; nullable=false | unit_of_measure: abap.string | — |
| TrackingMode | Edm.String; length=20; nullable=false | tracking_mode: abap.char(20) | — |
| AssetType | Edm.String; length=30; nullable=true | asset_type: abap.char(30) | has_asset_type |
| Manufacturer | Edm.String; length=100; nullable=true | manufacturer: abap.char(100) | has_manufacturer |
| Model | Edm.String; length=100; nullable=true | model: abap.char(100) | has_model |
| TotalAssets | Edm.Int32; nullable=false | derived | — |
| AvailableAssets | Edm.Int32; nullable=false | derived | — |

## Stocks

ZIT_STOCK → ZI_IT_Stock → ZC_IT_Stock. Owner: Materials.

| Public field | OData facets | Storage/source | Null presence field |
| --- | --- | --- | --- |
| StockUUID | Edm.Guid; nullable=false | stock_uuid: abap.raw(16) | — |
| MaterialUUID | Edm.Guid; nullable=false | material_uuid: abap.raw(16) | — |
| StockLabel | Edm.String; length=4000; nullable=false | derived | — |
| StorageLocation | Edm.String; length=4000; nullable=false | storage_location: abap.string | — |
| UnitOfMeasure | Edm.String; length=4000; nullable=false | unit_of_measure: abap.string | — |
| PhysicalQuantity | Edm.Decimal; precision=15; scale=3; nullable=false | physical_quantity: abap.dec(15,3) | — |
| ReservedQuantity | Edm.Decimal; precision=15; scale=3; nullable=false | reserved_quantity: abap.dec(15,3) | — |
| AvailableQuantity | Edm.Decimal; precision=15; scale=3; nullable=false | derived | — |
| ReorderLevel | Edm.Decimal; precision=15; scale=3; nullable=false | reorder_level: abap.dec(15,3) | — |
| LowStock | Edm.Boolean; nullable=false | derived | — |
| StockCriticality | Edm.Int32; nullable=false | derived | — |
| LastChangedAt | Edm.DateTimeOffset; nullable=false | last_changed_at: abap.dec(21,7) | — |

## Reservations

ZIT_RESERVATION → ZI_IT_Reservation → ZC_IT_Reservation. Owner: Materials.

| Public field | OData facets | Storage/source | Null presence field |
| --- | --- | --- | --- |
| ReservationUUID | Edm.Guid; nullable=false | reservation_uuid: abap.raw(16) | — |
| MaterialUUID | Edm.Guid; nullable=false | material_uuid: abap.raw(16) | — |
| StockUUID | Edm.Guid; nullable=false | stock_uuid: abap.raw(16) | — |
| TicketUUID | Edm.Guid; nullable=true | ticket_uuid: abap.raw(16) | has_ticket_uuid |
| AssetUUID | Edm.Guid; nullable=true | asset_uuid: abap.raw(16) | has_asset_uuid |
| AssetRepairUUID | Edm.Guid; nullable=true | asset_repair_uuid: abap.raw(16) | has_asset_repair_uuid |
| Quantity | Edm.Decimal; precision=15; scale=3; nullable=false | quantity: abap.dec(15,3) | — |
| IssuedQuantity | Edm.Decimal; precision=15; scale=3; nullable=false | issued_quantity: abap.dec(15,3) | — |
| OutstandingQuantity | Edm.Decimal; precision=15; scale=3; nullable=false | derived | — |
| Status | Edm.String; length=4000; nullable=false | status: abap.string | — |
| Reason | Edm.String; length=4000; nullable=false | reason: abap.string | — |
| CancelReason | Edm.String; length=4000; nullable=true | derived | — |
| CreatedAt | Edm.DateTimeOffset; nullable=false | created_at: abap.dec(21,7) | — |
| CreatedBy | Edm.String; length=4000; nullable=false | created_by: abap.string | — |
| LastChangedAt | Edm.DateTimeOffset; nullable=false | last_changed_at: abap.dec(21,7) | — |
| CanIssueReservation | Edm.Boolean; nullable=false | derived | — |
| CanCancelReservation | Edm.Boolean; nullable=false | derived | — |

## StockTransactions

ZIT_STOCK_TXN → ZI_IT_StockTransaction → ZC_IT_StockTransaction. Owner: Materials.

| Public field | OData facets | Storage/source | Null presence field |
| --- | --- | --- | --- |
| StockTransactionUUID | Edm.Guid; nullable=false | stock_transaction_uuid: abap.raw(16) | — |
| MaterialUUID | Edm.Guid; nullable=false | material_uuid: abap.raw(16) | — |
| StockUUID | Edm.Guid; nullable=false | stock_uuid: abap.raw(16) | — |
| ReservationUUID | Edm.Guid; nullable=true | reservation_uuid: abap.raw(16) | has_reservation_uuid |
| TicketUUID | Edm.Guid; nullable=true | ticket_uuid: abap.raw(16) | has_ticket_uuid |
| AssetUUID | Edm.Guid; nullable=true | asset_uuid: abap.raw(16) | has_asset_uuid |
| AssetRepairUUID | Edm.Guid; nullable=true | asset_repair_uuid: abap.raw(16) | has_asset_repair_uuid |
| MovementType | Edm.String; length=4000; nullable=false | movement_type: abap.string | — |
| Quantity | Edm.Decimal; precision=15; scale=3; nullable=false | quantity: abap.dec(15,3) | — |
| PhysicalDelta | Edm.Decimal; precision=15; scale=3; nullable=false | physical_delta: abap.dec(15,3) | — |
| ReservedDelta | Edm.Decimal; precision=15; scale=3; nullable=false | reserved_delta: abap.dec(15,3) | — |
| UnitOfMeasure | Edm.String; length=4000; nullable=false | unit_of_measure: abap.string | — |
| TransferUUID | Edm.Guid; nullable=true | transfer_uuid: abap.raw(16) | has_transfer_uuid |
| OriginalTransactionUUID | Edm.Guid; nullable=true | original_transaction_uuid: abap.raw(16) | has_original_transaction_uuid |
| Reason | Edm.String; length=4000; nullable=false | reason: abap.string | — |
| CreatedAt | Edm.DateTimeOffset; nullable=false | created_at: abap.dec(21,7) | — |
| CreatedBy | Edm.String; length=4000; nullable=false | created_by: abap.string | — |

## SLAPolicies

ZIT_SLA_POLICY → ZI_IT_SLAPolicy → ZC_IT_SLAPolicy. Owner: SLAPolicies.

| Public field | OData facets | Storage/source | Null presence field |
| --- | --- | --- | --- |
| SLAPolicyUUID | Edm.Guid; nullable=false | slapolicy_uuid: abap.raw(16) | — |
| Priority | Edm.String; length=500; nullable=false | priority: abap.char(500) | — |
| ResponseMinutes | Edm.Int32; nullable=false | response_minutes: abap.int4 | — |
| ResolutionMinutes | Edm.Int32; nullable=false | resolution_minutes: abap.int4 | — |
| WarningPercent | Edm.Int32; nullable=false | warning_percent: abap.int4 | — |
| Revision | Edm.Int32; nullable=false | revision: abap.int4 | — |
| LastChangedAt | Edm.DateTimeOffset; nullable=false | last_changed_at: abap.dec(21,7) | — |

## Categories

ZIT_CATEGORY → ZI_IT_Category → ZC_IT_Category. Owner: Categories.

| Public field | OData facets | Storage/source | Null presence field |
| --- | --- | --- | --- |
| CategoryUUID | Edm.Guid; nullable=false | category_uuid: abap.raw(16) | — |
| Name | Edm.String; length=500; nullable=false | name: abap.char(500) | — |
| DefaultPriority | Edm.String; length=500; nullable=false | default_priority: abap.char(500) | — |
| TeamUUID | Edm.Guid; nullable=false | team_uuid: abap.raw(16) | — |
| Active | Edm.Boolean; nullable=false | active: abap.char(1) | — |
| Revision | Edm.Int32; nullable=false | revision: abap.int4 | — |
| LastChangedAt | Edm.DateTimeOffset; nullable=false | last_changed_at: abap.dec(21,7) | — |

## Subcategories

ZIT_SUBCATEGORY → ZI_IT_Subcategory → ZC_IT_Subcategory. Owner: Subcategories.

| Public field | OData facets | Storage/source | Null presence field |
| --- | --- | --- | --- |
| SubcategoryUUID | Edm.Guid; nullable=false | subcategory_uuid: abap.raw(16) | — |
| Name | Edm.String; length=500; nullable=false | name: abap.char(500) | — |
| CategoryUUID | Edm.Guid; nullable=false | category_uuid: abap.raw(16) | — |
| Active | Edm.Boolean; nullable=false | active: abap.char(1) | — |
| Revision | Edm.Int32; nullable=false | revision: abap.int4 | — |
| LastChangedAt | Edm.DateTimeOffset; nullable=false | last_changed_at: abap.dec(21,7) | — |

## Teams

ZIT_TEAM → ZI_IT_Team → ZC_IT_Team. Owner: Teams.

| Public field | OData facets | Storage/source | Null presence field |
| --- | --- | --- | --- |
| TeamUUID | Edm.Guid; nullable=false | team_uuid: abap.raw(16) | — |
| Name | Edm.String; length=500; nullable=false | name: abap.char(500) | — |
| LocationUUID | Edm.Guid; nullable=false | location_uuid: abap.raw(16) | — |
| LeadUUID | Edm.Guid; nullable=false | lead_uuid: abap.raw(16) | — |
| Active | Edm.Boolean; nullable=false | active: abap.char(1) | — |
| Revision | Edm.Int32; nullable=false | revision: abap.int4 | — |
| LastChangedAt | Edm.DateTimeOffset; nullable=false | last_changed_at: abap.dec(21,7) | — |

## Locations

ZIT_LOCATION → ZI_IT_Location → ZC_IT_Location. Owner: Locations.

| Public field | OData facets | Storage/source | Null presence field |
| --- | --- | --- | --- |
| LocationUUID | Edm.Guid; nullable=false | location_uuid: abap.raw(16) | — |
| Name | Edm.String; length=500; nullable=false | name: abap.char(500) | — |
| Active | Edm.Boolean; nullable=false | active: abap.char(1) | — |
| Revision | Edm.Int32; nullable=false | revision: abap.int4 | — |
| LastChangedAt | Edm.DateTimeOffset; nullable=false | last_changed_at: abap.dec(21,7) | — |

## WaitingReasons

ZIT_WAIT_REASON → ZI_IT_WaitingReason → ZC_IT_WaitingReason. Owner: WaitingReasons.

| Public field | OData facets | Storage/source | Null presence field |
| --- | --- | --- | --- |
| WaitingReasonUUID | Edm.Guid; nullable=false | waiting_reason_uuid: abap.raw(16) | — |
| Code | Edm.String; length=500; nullable=false | code: abap.char(500) | — |
| Name | Edm.String; length=500; nullable=false | name: abap.char(500) | — |
| PauseResolution | Edm.Boolean; nullable=false | pause_resolution: abap.char(1) | — |
| Active | Edm.Boolean; nullable=false | active: abap.char(1) | — |
| Revision | Edm.Int32; nullable=false | revision: abap.int4 | — |
| LastChangedAt | Edm.DateTimeOffset; nullable=false | last_changed_at: abap.dec(21,7) | — |

## EscalationRules

ZIT_ESC_RULE → ZI_IT_EscalationRule → ZC_IT_EscalationRule. Owner: EscalationRules.

| Public field | OData facets | Storage/source | Null presence field |
| --- | --- | --- | --- |
| EscalationRuleUUID | Edm.Guid; nullable=false | escalation_rule_uuid: abap.raw(16) | — |
| TriggerStatus | Edm.String; length=500; nullable=false | trigger_status: abap.char(500) | — |
| Level | Edm.Int32; nullable=false | level: abap.int4 | — |
| TargetRole | Edm.String; length=500; nullable=false | target_role: abap.char(500) | — |
| Active | Edm.Boolean; nullable=false | active: abap.char(1) | — |
| Revision | Edm.Int32; nullable=false | revision: abap.int4 | — |
| LastChangedAt | Edm.DateTimeOffset; nullable=false | last_changed_at: abap.dec(21,7) | — |

## ConfigurationHistory

ZIT_CONFIG_HIST → ZI_IT_ConfigurationHistory → ZC_IT_ConfigurationHistory. Owner: ConfigurationHistory.

| Public field | OData facets | Storage/source | Null presence field |
| --- | --- | --- | --- |
| ConfigurationHistoryUUID | Edm.Guid; nullable=false | configuration_history_uuid: abap.raw(16) | — |
| EntitySet | Edm.String; length=500; nullable=false | entity_set: abap.char(500) | — |
| RecordUUID | Edm.Guid; nullable=false | record_uuid: abap.raw(16) | — |
| Revision | Edm.Int32; nullable=false | revision: abap.int4 | — |
| Reason | Edm.String; length=500; nullable=false | reason: abap.char(500) | — |
| Before | Edm.String; length=8000; nullable=false | before: abap.string | — |
| After | Edm.String; length=8000; nullable=false | after: abap.string | — |
| CreatedAt | Edm.DateTimeOffset; nullable=false | created_at: abap.dec(21,7) | — |
| CreatedBy | Edm.String; length=500; nullable=false | created_by: abap.char(500) | — |
