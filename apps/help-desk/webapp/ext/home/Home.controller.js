sap.ui.define(['sap/fe/core/PageController'], function (PageController) {
  'use strict';
  return PageController.extend('itoms.helpdesk.ext.home.Home', {
    onModule: function (event) {
      this.getExtensionAPI().getRouting().navigateToRoute(event.getSource().data('route'));
    }
  });
});
