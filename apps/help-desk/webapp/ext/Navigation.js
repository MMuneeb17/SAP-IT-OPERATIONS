sap.ui.define([], function () {
  "use strict";
  return {
    newInventoryItem: function () { this.getRouting().navigateToRoute("InventoryItem"); },
    receiveEquipment: function (context) { this.getRouting().navigateToRoute("InventoryItem", { "?query": { material: context.getProperty("MaterialUUID") } }); },
    inventoryItem: async function (context) { this.getRouting().navigateToRoute("MaterialsObjectPage", { key: await context.requestProperty("MaterialUUID") }); },
    operations: function () { this.getRouting().navigateToRoute("Operations"); },
    roleAccess: function () { this.getRouting().navigateToRoute("RoleAccess"); },
    inventory: function () { this.getRouting().navigateToRoute("MaterialsList"); },
    stocks: function () { this.getRouting().navigateToRoute("StocksList"); },
    reservations: function () { this.getRouting().navigateToRoute("ReservationsList"); },
    movements: function () { this.getRouting().navigateToRoute("StockTransactionsList"); },
    repair: function (context) { this.getRouting().navigateToRoute("RepairWorkspace", { "?query": { ticket: context.getProperty("TicketUUID") } }); },
    mySupport: function () { this.getRouting().navigateToRoute("MySupport"); },
    helpDesk: function () { this.getRouting().navigateToRoute("TicketsList"); },
    assets: function () { this.getRouting().navigateToRoute("AssetsList"); },
    myAssets: function () { this.getRouting().navigateToRoute("MyAssets"); },
    requester: function (context) { this.getRouting().navigateToRoute("RequesterObjectPage", { key: context.getProperty("TicketUUID") }); },
    asset: function (context) { this.getRouting().navigateToRoute("AssetObjectPage", { key: context.getProperty("TicketUUID") }); }
  };
});
