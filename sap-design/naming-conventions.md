# Naming conventions — v1

| Area | Convention | Example |
| --- | --- | --- |
| App folder | kebab-case | `apps/help-desk` |
| UI5 component | lowercase dotted namespace | `itoms.helpdesk` |
| OData namespace | PascalCase | `ITOperations` |
| Entity type | singular PascalCase | `TicketComment` |
| Entity set | plural PascalCase, History exception | `TicketComments`, `TicketHistory` |
| Key | entity name + UUID, Edm.Guid | `TicketUUID` |
| Foreign key | role/entity + UUID | `RequesterUUID`, `AssetUUID` |
| Human identifier | descriptive suffix; never technical key | `TicketNumber`, `AssetTag` |
| Fields/navigation/actions | PascalCase | `CreatedAt`, `Requester`, `Submit` |
| Enum values | UPPER_SNAKE_CASE | `IN_PROGRESS` |
| Custom tables | ZIT_ prefix, ABAP release limits checked later | `ZIT_TICKET` |
| CDS interface / projection | ZI_IT_ / ZC_IT_ | `ZI_IT_Ticket`, `ZC_IT_Ticket` |
| Service / binding | ZUI_IT_OPERATIONS / ZUI_IT_OPERATIONS_O4 | OData V4 UI |

Use UTC `Edm.DateTimeOffset` audit timestamps and `Edm.Date` for calendar dates.
Quantities use `Edm.Decimal` (15,3) with a unit code; money uses decimal (19,2) with
currency. UUID references use the same type as their target; missing optional
references are null, not empty strings. Actor references identify employees/users;
external user identity mapping is an integration concern. Transactional records
carry CreatedAt/CreatedBy and mutable roots also LastChangedAt/LastChangedBy.
Public names must change only through an explicit contract version decision.
