sap.ui.define(['sap/fe/core/PageController', 'sap/ui/model/json/JSONModel', './metrics'], function (PageController, JSONModel, metrics) {
  'use strict';
  return PageController.extend('itoms.helpdesk.ext.analytics.Dashboard', {
    onHome: function () { this.getExtensionAPI().getRouting().navigateToRoute('Home'); },
    onInit: function () {
      PageController.prototype.onInit.apply(this, arguments);
      this.getView().setModel(new JSONModel({ busy: false, error: '', days: '90', loaded: false, asOf: '', metrics: [], trend: [], consumption: [], details: [], detailTitle: 'Select a metric or trend count to inspect its records.' }), 'dash');
      this.getView().getModel('dash').setSizeLimit(100000);
      this._route = this.getAppComponent().getRouter().getRoute('Dashboard');
      this._route.attachPatternMatched(this.onEnter, this);
    },
    onEnter: function () { this.getView().getModel('dash').setProperty('/loaded', false); },
    onExit: function () { this._route?.detachPatternMatched(this.onEnter, this); },
    onPageReady: function () { return this.onRefresh(); },
    read: async function (name) {
      const binding = this.getView().getModel().bindList('/' + name, null, null, null, { $$groupId: '$direct' });
      const rows = [];
      try { for (let n = 0; ; n += 100) { const contexts = await binding.requestContexts(n, 100); rows.push(...contexts.map(c => c.getObject())); if (contexts.length < 100) return rows; } }
      finally { binding.destroy(); }
    },
    onRefresh: async function () {
      const s = this.getView().getModel('dash'); if (s.getProperty('/busy')) return;
      s.setProperty('/busy', true); s.setProperty('/error', ''); s.setProperty('/loaded', false);
      try {
        const names = ['Tickets', 'Assets', 'Materials', 'Stocks', 'StockTransactions'];
        const rows = await Promise.all(names.map(name => this.read(name)));
        this._data = Object.fromEntries(names.map((name, i) => [name, rows[i]])); this._asOf = new Date().toISOString();
        this.onPeriod(); s.setProperty('/loaded', true);
      } catch (error) {
        this._data = null; this._result = null;
        for (const field of ['metrics', 'trend', 'consumption', 'details']) s.setProperty('/' + field, []);
        s.setProperty('/error', error.message || 'Dashboard could not be loaded. Try Refresh.');
      } finally { s.setProperty('/busy', false); }
    },
    onPeriod: function () {
      if (!this._data) return;
      const s = this.getView().getModel('dash');
      const signature = this._asOf + ':' + s.getProperty('/days');
      if (this._signature === signature && this._result) return;
      this._result = metrics.calculate(this._data, this._asOf, Number(s.getProperty('/days')));
      this._signature = signature;
      for (const field of ['metrics', 'trend', 'consumption']) s.setProperty('/' + field, this._result[field]);
      s.setProperty('/asOf', this._asOf); s.setProperty('/details', []); s.setProperty('/detailTitle', 'Select a metric or trend count to inspect its records.');
    },
    show: function (title, rows) { const s = this.getView().getModel('dash'); s.setProperty('/detailTitle', title); s.setProperty('/details', rows); this.byId('records').getDomRef()?.scrollIntoView({ block: 'start' }); },
    onMetric: function (event) { const row = event.getSource().getBindingContext('dash').getObject(); this.show(row.label + ' · ' + row.count + ' supporting records', this._result.groups[row.id]); },
    onCreated: function (event) { const row = event.getSource().getBindingContext('dash').getObject(); this.show('Tickets created · ' + row.label, row.createdRows); },
    onResolved: function (event) { const row = event.getSource().getBindingContext('dash').getObject(); this.show('Current cycles resolved · ' + row.label, row.resolvedRows); },
    onConsumption: function (event) { const row = event.getSource().getBindingContext('dash').getObject(); this.show('Consumption movements · ' + row.title + ' · ' + row.unit, this._result.consumptionRows(row.key, row.unit)); },
    onRecord: function (event) { const row = event.getSource().getBindingContext('dash').getObject(); this.getExtensionAPI().getRouting().navigateToRoute(row.route, { key: row.key }); },
    onHelpDesk: function () { this.getExtensionAPI().getRouting().navigateToRoute('TicketsList'); }
  });
});
