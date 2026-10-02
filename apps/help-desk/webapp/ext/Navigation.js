sap.ui.define([], function () {
  "use strict";
  return {
    mySupport: function () { this.getRouting().navigateToRoute("MySupport"); },
    helpDesk: function () { this.getRouting().navigateToRoute("TicketsList"); },
    requester: function (context) { this.getRouting().navigateToRoute("RequesterObjectPage", { key: context.getProperty("TicketUUID") }); },
    asset: function (context) { this.getRouting().navigateToRoute("AssetObjectPage", { key: context.getProperty("TicketUUID") }); }
  };
});
