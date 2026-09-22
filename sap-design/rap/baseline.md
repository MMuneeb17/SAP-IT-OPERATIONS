# RAP baseline mapping

This is a design inventory, not executable ABAP or the full phase 10 package.

| Entity | Planned persistence | Interface / projection | BO relationship |
| --- | --- | --- | --- |
| Employee | Released SAP employee/user source; local fixtures until available | ZI_IT_Employee / ZC_IT_EmployeeProfile | Read-only reference |
| Ticket | ZIT_TICKET | ZI_IT_Ticket / ZC_IT_Ticket | Root |
| TicketComment | ZIT_TICKET_COMMENT | ZI_IT_TicketComment / ZC_IT_TicketComment | Ticket composition |
| TicketHistory | ZIT_TICKET_HISTORY | ZI_IT_TicketHistory / ZC_IT_TicketHistory | Ticket composition, read-only externally |
| Asset | ZIT_ASSET | ZI_IT_Asset / ZC_IT_Asset | Root |
| AssetAssignment | ZIT_ASSET_ASSIGN | ZI_IT_AssetAssignment / ZC_IT_AssetAssignment | Asset composition |
| AssetRepair | ZIT_ASSET_REPAIR | ZI_IT_AssetRepair / ZC_IT_AssetRepair | Asset composition |
| Material | ZIT_MATERIAL or standard material integration | ZI_IT_Material / ZC_IT_Material | Root |
| Stock | ZIT_STOCK or standard inventory integration | ZI_IT_Stock / ZC_IT_Stock | Material composition |
| Reservation | ZIT_RESERVATION or standard reservation integration | ZI_IT_Reservation / ZC_IT_Reservation | Material composition |
| StockTransaction | ZIT_STOCK_TXN or standard movement integration | ZI_IT_StockTransaction / ZC_IT_StockTransaction | Material composition, read-only externally |

`ZC_IT_Inventory` in the original design is reserved for an overview, not an entity
that merges material, reservation and transaction identity. The service definition
`ZUI_IT_OPERATIONS` exposes projection entities with the entity-set aliases in the
entity model; CDS associations become the corresponding OData navigation properties.

| BO | Planned actions | Backend enforcement |
| --- | --- | --- |
| Ticket | Submit, AssignTechnician, StartWork, PutOnHold, Resume, Resolve, Close, Reopen | State transitions, required resolution/reasons, authorization, history; determine number, initial state and later SLA |
| Asset | Tag, MakeAvailable, Assign, Transfer, Return, SendToRepair, CompleteRepair, Retire, Dispose | Unique tag, one current assignment, lifecycle eligibility and assignment history |
| Material / inventory | Receive, Reserve, Issue, Return, Transfer, Adjust, CancelReservation | Positive quantities, units, availability, reservation fulfillment, paired transfer, mandatory adjustment reason and immutable movements |

Cross-BO repair orchestration must perform reservation/issue and ticket/asset history
updates consistently through RAP behavior/ABAP services. Lock scope, ETags, draft,
action parameter types, operation grouping and standard SAP integration constraints
must be finalized against the actual ABAP landscape in phases 2 and 10. Business
rules never reside solely in Fiori event handlers or mock middleware.
