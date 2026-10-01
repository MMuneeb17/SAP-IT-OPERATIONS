sap.ui.define([], function () {
  "use strict";
  return {
    mySupport: function () { this.getRouting().navigateToRoute("MySupport"); },
    helpDesk: function () { this.getRouting().navigateToRoute("TicketsList"); }
  };
});
