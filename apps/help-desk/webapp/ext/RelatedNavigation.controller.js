sap.ui.define(['sap/ui/core/mvc/ControllerExtension'], function (ControllerExtension) {
  'use strict';
  return ControllerExtension.extend('itoms.helpdesk.ext.RelatedNavigation', {
    override: {
      routing: {
        onBeforeNavigation: function (contextInfo) {
          const record = contextInfo.bindingContext?.getObject() || contextInfo.sourceBindingContext || {};
          const routing = this.base.getExtensionAPI().getRouting();
          const inventoryRoute = record.StockTransactionUUID ? ['StockTransactionsObjectPage', record.StockTransactionUUID]
            : record.ReservationUUID ? ['ReservationsObjectPage', record.ReservationUUID]
            : record.StockUUID ? ['StocksObjectPage', record.StockUUID]
            : record.MaterialUUID && record.MaterialNumber ? ['MaterialsObjectPage', record.MaterialUUID] : null;
          if (inventoryRoute) {
            routing.navigateToRoute(inventoryRoute[0], { key: inventoryRoute[1] });
            return true;
          }
          // Related tables use navigation paths, while these pages are shared
          // across modules. Route their keys to the canonical root object pages.
          if (record.TicketUUID && record.TicketNumber) {
            routing.navigateToRoute('TicketsObjectPage', { key: record.TicketUUID });
            return true;
          }
          if (record.AssetUUID && record.AssetTag) {
            routing.navigateToRoute('AssetsObjectPage', { key: record.AssetUUID });
            return true;
          }
          return false;
        }
      }
    }
  });
});
