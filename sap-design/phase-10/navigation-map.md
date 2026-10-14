# Generated Phase 10 contract mapping

Design only; no SAP activation or compilation is claimed. Edit blueprint.json, then run
`npm run design:render`; `npm run design:check` checks these artifacts for drift.

## Employees

| Public navigation | Target set | Cardinality | Ownership | Join (public fields) |
| --- | --- | --- | --- | --- |
| RequestedTickets | Tickets | 0..* | association | Inverse of Tickets.Requester |
| AssignedTickets | Tickets | 0..* | association | Inverse of Tickets.Technician |
| Assets | Assets | 0..* | association | Inverse of Assets.CurrentEmployee |

## Tickets

| Public navigation | Target set | Cardinality | Ownership | Join (public fields) |
| --- | --- | --- | --- | --- |
| Requester | Employees | 1 | association | Tickets.RequesterUUID = Employees.EmployeeUUID |
| Technician | Employees | 0..1 | association | Tickets.TechnicianUUID = Employees.EmployeeUUID |
| Asset | Assets | 0..1 | association | Tickets.AssetUUID = Assets.AssetUUID |
| Comments | TicketComments | 0..* | composition | Inverse of TicketComments.Ticket |
| History | TicketHistory | 0..* | composition | Inverse of TicketHistory.Ticket |
| Reservations | Reservations | 0..* | association | Inverse of Reservations.Ticket |
| StockTransactions | StockTransactions | 0..* | association | Inverse of StockTransactions.Ticket |
| Team | Teams | 1 | association | Tickets.TeamUUID = Teams.TeamUUID |
| Location | Locations | 1 | association | Tickets.LocationUUID = Locations.LocationUUID |
| Subcategory | Subcategories | 0..1 | association | Tickets.SubcategoryUUID = Subcategories.SubcategoryUUID |

## Assets

| Public navigation | Target set | Cardinality | Ownership | Join (public fields) |
| --- | --- | --- | --- | --- |
| CurrentEmployee | Employees | 0..1 | association | Assets.CurrentEmployeeUUID = Employees.EmployeeUUID |
| Tickets | Tickets | 0..* | association | Inverse of Tickets.Asset |
| Assignments | AssetAssignments | 0..* | composition | Inverse of AssetAssignments.Asset |
| Repairs | AssetRepairs | 0..* | composition | Inverse of AssetRepairs.Asset |
| History | AssetHistory | 0..* | composition | Inverse of AssetHistory.Asset |
| Reservations | Reservations | 0..* | association | Inverse of Reservations.Asset |
| StockTransactions | StockTransactions | 0..* | association | Inverse of StockTransactions.Asset |
| Material | Materials | 1 | association | Assets.MaterialUUID = Materials.MaterialUUID |

## TicketComments

| Public navigation | Target set | Cardinality | Ownership | Join (public fields) |
| --- | --- | --- | --- | --- |
| Ticket | Tickets | 1 | association | TicketComments.TicketUUID = Tickets.TicketUUID |
| Author | Employees | 1 | association | TicketComments.AuthorUUID = Employees.EmployeeUUID |

## TicketHistory

| Public navigation | Target set | Cardinality | Ownership | Join (public fields) |
| --- | --- | --- | --- | --- |
| Ticket | Tickets | 1 | association | TicketHistory.TicketUUID = Tickets.TicketUUID |
| Actor | Employees | 1 | association | TicketHistory.ActorUUID = Employees.EmployeeUUID |

## AssetAssignments

| Public navigation | Target set | Cardinality | Ownership | Join (public fields) |
| --- | --- | --- | --- | --- |
| Asset | Assets | 1 | association | AssetAssignments.AssetUUID = Assets.AssetUUID |
| Employee | Employees | 1 | association | AssetAssignments.EmployeeUUID = Employees.EmployeeUUID |

## AssetRepairs

| Public navigation | Target set | Cardinality | Ownership | Join (public fields) |
| --- | --- | --- | --- | --- |
| Asset | Assets | 1 | association | AssetRepairs.AssetUUID = Assets.AssetUUID |
| Ticket | Tickets | 0..1 | association | AssetRepairs.TicketUUID = Tickets.TicketUUID |
| Technician | Employees | 1 | association | AssetRepairs.TechnicianUUID = Employees.EmployeeUUID |
| Reservations | Reservations | 0..* | association | Inverse of Reservations.Repair |
| StockTransactions | StockTransactions | 0..* | association | Inverse of StockTransactions.Repair |

## AssetHistory

| Public navigation | Target set | Cardinality | Ownership | Join (public fields) |
| --- | --- | --- | --- | --- |
| Asset | Assets | 1 | association | AssetHistory.AssetUUID = Assets.AssetUUID |
| Actor | Employees | 1 | association | AssetHistory.ActorUUID = Employees.EmployeeUUID |
| PreviousEmployee | Employees | 0..1 | association | AssetHistory.OldEmployeeUUID = Employees.EmployeeUUID |
| NewEmployee | Employees | 0..1 | association | AssetHistory.NewEmployeeUUID = Employees.EmployeeUUID |

## Materials

| Public navigation | Target set | Cardinality | Ownership | Join (public fields) |
| --- | --- | --- | --- | --- |
| Stocks | Stocks | 0..* | composition | Inverse of Stocks.Material |
| Reservations | Reservations | 0..* | composition | Inverse of Reservations.Material |
| StockTransactions | StockTransactions | 0..* | composition | Inverse of StockTransactions.Material |
| Assets | Assets | 0..* | association | Inverse of Assets.Material |

## Stocks

| Public navigation | Target set | Cardinality | Ownership | Join (public fields) |
| --- | --- | --- | --- | --- |
| Material | Materials | 1 | association | Stocks.MaterialUUID = Materials.MaterialUUID |
| Reservations | Reservations | 0..* | association | Inverse of Reservations.Stock |
| StockTransactions | StockTransactions | 0..* | association | Inverse of StockTransactions.Stock |

## Reservations

| Public navigation | Target set | Cardinality | Ownership | Join (public fields) |
| --- | --- | --- | --- | --- |
| Material | Materials | 1 | association | Reservations.MaterialUUID = Materials.MaterialUUID |
| Stock | Stocks | 1 | association | Reservations.StockUUID = Stocks.StockUUID |
| Ticket | Tickets | 0..1 | association | Reservations.TicketUUID = Tickets.TicketUUID |
| Asset | Assets | 0..1 | association | Reservations.AssetUUID = Assets.AssetUUID |
| Repair | AssetRepairs | 0..1 | association | Reservations.AssetRepairUUID = AssetRepairs.AssetRepairUUID |
| Transactions | StockTransactions | 0..* | association | Inverse of StockTransactions.Reservation |

## StockTransactions

| Public navigation | Target set | Cardinality | Ownership | Join (public fields) |
| --- | --- | --- | --- | --- |
| Material | Materials | 1 | association | StockTransactions.MaterialUUID = Materials.MaterialUUID |
| Stock | Stocks | 1 | association | StockTransactions.StockUUID = Stocks.StockUUID |
| Ticket | Tickets | 0..1 | association | StockTransactions.TicketUUID = Tickets.TicketUUID |
| Asset | Assets | 0..1 | association | StockTransactions.AssetUUID = Assets.AssetUUID |
| Repair | AssetRepairs | 0..1 | association | StockTransactions.AssetRepairUUID = AssetRepairs.AssetRepairUUID |
| Reservation | Reservations | 0..1 | association | StockTransactions.ReservationUUID = Reservations.ReservationUUID |

## SLAPolicies

| Public navigation | Target set | Cardinality | Ownership | Join (public fields) |
| --- | --- | --- | --- | --- |

## Categories

| Public navigation | Target set | Cardinality | Ownership | Join (public fields) |
| --- | --- | --- | --- | --- |
| Team | Teams | 1 | association | Categories.TeamUUID = Teams.TeamUUID |

## Subcategories

| Public navigation | Target set | Cardinality | Ownership | Join (public fields) |
| --- | --- | --- | --- | --- |
| Category | Categories | 1 | association | Subcategories.CategoryUUID = Categories.CategoryUUID |

## Teams

| Public navigation | Target set | Cardinality | Ownership | Join (public fields) |
| --- | --- | --- | --- | --- |
| Location | Locations | 1 | association | Teams.LocationUUID = Locations.LocationUUID |
| Lead | Employees | 1 | association | Teams.LeadUUID = Employees.EmployeeUUID |

## Locations

| Public navigation | Target set | Cardinality | Ownership | Join (public fields) |
| --- | --- | --- | --- | --- |

## WaitingReasons

| Public navigation | Target set | Cardinality | Ownership | Join (public fields) |
| --- | --- | --- | --- | --- |

## EscalationRules

| Public navigation | Target set | Cardinality | Ownership | Join (public fields) |
| --- | --- | --- | --- | --- |

## ConfigurationHistory

| Public navigation | Target set | Cardinality | Ownership | Join (public fields) |
| --- | --- | --- | --- | --- |
