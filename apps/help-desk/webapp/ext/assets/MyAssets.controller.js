sap.ui.define(['sap/fe/core/PageController', 'sap/ui/model/json/JSONModel', 'sap/ui/model/Filter', 'sap/ui/model/FilterOperator', 'sap/ui/model/Sorter'],
function (PageController, JSONModel, Filter, FilterOperator, Sorter) {
  'use strict';
  return PageController.extend('itoms.helpdesk.ext.assets.MyAssets', {
    onInit: function () {
      PageController.prototype.onInit.apply(this, arguments);
      const state = new JSONModel({ busy: true, error: '', employee: '', employees: [], rows: [] });
      state.setSizeLimit(10000);
      this.getView().setModel(state, 'assets');
    },
    onPageReady: async function () { await this.onRefresh(); },
    text: function (key) { return this.getView().getModel('i18n').getResourceBundle().getText(key); },
    read: async function (path, filters, order) {
      const binding = this.getView().getModel().bindList(path, null, [new Sorter(order)], filters, { $$groupId: '$direct' });
      const rows = [];
      try {
        for (let offset = 0; ; offset += 100) {
          const contexts = await binding.requestContexts(offset, 100);
          rows.push(...contexts.map(context => context.getObject()));
          if (contexts.length < 100) return rows;
        }
      } finally { binding.destroy(); }
    },
    onRefresh: async function () {
      const state = this.getView().getModel('assets');
      const version = this._loadVersion = (this._loadVersion || 0) + 1;
      state.setProperty('/busy', true); state.setProperty('/error', '');
      try {
        if (!state.getProperty('/employees').length) {
          const employees = await this.read('/Employees', [], 'DisplayName');
          if (version !== this._loadVersion) return;
          state.setProperty('/employees', employees); state.setProperty('/employee', employees[0]?.EmployeeUUID || '');
        }
        const employee = state.getProperty('/employee');
        if (!employee) throw new Error(this.text('noEmployees'));
        const rows = await this.read('/Assets', [new Filter('CurrentEmployeeUUID', FilterOperator.EQ, employee)], 'AssetTag');
        if (version === this._loadVersion) state.setProperty('/rows', rows);
      } catch (error) {
        if (version === this._loadVersion) { state.setProperty('/rows', []); state.setProperty('/error', error.message || this.text('loadFailed')); }
      } finally { if (version === this._loadVersion) state.setProperty('/busy', false); }
    },
    onOpenAsset: function (event) {
      const asset = event.getSource().getBindingContext('assets').getObject();
      this.getExtensionAPI().getRouting().navigateToRoute('AssetsObjectPage', { key: asset.AssetUUID });
    },
    onAssetManagement: function () { this.getExtensionAPI().getRouting().navigateToRoute('AssetsList'); },
    onSupport: function () { this.getExtensionAPI().getRouting().navigateToRoute('MySupport'); },
    criticalityState: function (value) { return ({ 1: 'Error', 2: 'Warning', 3: 'Success', 5: 'Information' })[value] || 'None'; },
    warrantyText: function (value) { return value || this.text('warrantyUnknown'); }
  });
});
