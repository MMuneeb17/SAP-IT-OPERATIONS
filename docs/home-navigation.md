# Home and module navigation

Open `http://localhost:8082/test/flp.html#app-preview`. The default page is now
**Home**, rather than the Help Desk ticket table. The shell title is IT Operations.

The 13 SAPUI5 tiles are grouped as follows:

| Group | Tiles |
| --- | --- |
| Service and equipment | Help Desk, My IT Support, Asset Management, My Assets, Repair Workspace |
| MIS inventory | MIS Inventory, New Inventory Item, Stock Overview, Reservations, Stock Movements |
| Management and administration | IT Operations Dashboard, SLA & Configuration, Role Access Design |

Select a tile to open its module. Select **Home** to return from a module or
record page; on narrow screens, toolbar actions may appear in the overflow menu.
Help Desk now has a Home action instead of acting as the module launcher.
Contextual links, such as a ticket's asset and repair workflow, remain available.

The Repair Workspace tile opens a ticket selector. Choose a ticket before using
the repair actions. Opening repair from a ticket still selects that ticket for you.
All tiles use the same component and OData model: these are module routes,
not separate deployed applications or copies of the data.

## Build it manually

1. Add an FPM custom page under `webapp/ext/home` using a PageController and XML view.
2. Use `sap.m.GenericTile` inside wrapping FlexBoxes, with the responsive grid
   rules in `webapp/css/home.css` registered in the manifest. Give each tile a label,
   description, icon and route in `core:CustomData`.
3. In the press handler, call the Fiori routing extension's `navigateToRoute`.
4. Set the empty manifest route to Home; move TicketsList to `Tickets:?query:`.
   Record routes such as `Tickets({key})` keep their existing URLs.
5. Add a Home handler and action to the list, object and custom pages.
6. Add Home to the design-only role policy for all seven roles. The local demo
   displays every tile; production service authorization is still future work.
7. Run `npx playwright test tests/home-ui.spec.cjs`. It visits all 13 modules,
   returns Home, checks phone overflow and opens a tile using the keyboard.

This is the local app's module launcher. Productive FLP catalogs, spaces, pages
and business-role assignments remain part of the later SAP deployment phases.
