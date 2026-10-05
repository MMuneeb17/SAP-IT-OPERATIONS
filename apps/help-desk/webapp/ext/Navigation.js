sap.ui.define([], function () {
  "use strict";
  return {
    mySupport: function () { this.getRouting().navigateToRoute("MySupport"); },
    helpDesk: function () { this.getRouting().navigateToRoute("TicketsList"); },
    assets: function () { this.getRouting().navigateToRoute("AssetsList"); },
    myAssets: function () { this.getRouting().navigateToRoute("MyAssets"); },
    requester: function (context) { this.getRouting().navigateToRoute("RequesterObjectPage", { key: context.getProperty("TicketUUID") }); },
    asset: function (context) { this.getRouting().navigateToRoute("AssetObjectPage", { key: context.getProperty("TicketUUID") }); }
  };
});
