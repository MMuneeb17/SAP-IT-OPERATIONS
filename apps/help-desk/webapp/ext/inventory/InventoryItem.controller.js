sap.ui.define(['sap/fe/core/PageController', 'sap/ui/model/json/JSONModel'], function (PageController, JSONModel) {
  'use strict';
  const defaults = () => ({ MaterialNumber: '', Description: '', Category: '', TrackingMode: 'EQUIPMENT', UnitOfMeasure: 'EA',
    AssetType: 'LAPTOP', Manufacturer: '', Model: '', Quantity: '1', StorageLocation: '', SerialNumbers: '',
    PurchaseDate: new Date().toISOString().slice(0, 10), WarrantyEnd: '', ReorderLevel: '0', Reason: '' });
  return PageController.extend('itoms.helpdesk.ext.inventory.InventoryItem', {
    onInit: function () {
      PageController.prototype.onInit.apply(this, arguments);
      this.getView().setModel(new JSONModel({ busy: false, error: '', existing: false, saved: false, result: null, assets: [], form: defaults() }), 'item');
      this.getView().getModel('item').setSizeLimit(100);
      this._route = this.getAppComponent().getRouter().getRoute('InventoryItem');
      this._route.attachPatternMatched(this.onRouteMatched, this);
    },
    onExit: function () {
      this._route?.detachPatternMatched(this.onRouteMatched, this);
      PageController.prototype.onExit?.apply(this, arguments);
    },
    onRouteMatched: async function (event) {
      const state = this.getView().getModel('item');
      const id = event.getParameter('arguments')?.['?query']?.material;
      this._material = id && /^[\da-f-]{36}$/i.test(id) ? id : null;
      state.setData({ busy: !!this._material, error: '', existing: !!this._material, saved: false, result: null, assets: [], form: defaults() });
      if (!this._material) return;
      const binding = this.getView().getModel().bindContext('/Materials(' + this._material + ')', null, { $$groupId: '$direct' });
      try {
        const material = await binding.requestObject();
        if (material.TrackingMode !== 'EQUIPMENT') throw Error(this.text('equipmentOnlyReceipt'));
        state.setProperty('/form', { ...defaults(), ...material });
      } catch (error) { state.setProperty('/error', error.message); }
      finally { binding.destroy(); state.setProperty('/busy', false); }
    },
    text: function (key) { return this.getView().getModel('i18n').getResourceBundle().getText(key); },
    onTrackingChange: function () {
      const state = this.getView().getModel('item');
      if (state.getProperty('/form/TrackingMode') === 'EQUIPMENT') state.setProperty('/form/UnitOfMeasure', 'EA');
    },
    onSave: async function () {
      const state = this.getView().getModel('item');
      if (state.getProperty('/busy') || state.getProperty('/saved')) return;
      const form = state.getProperty('/form');
      const equipment = form.TrackingMode === 'EQUIPMENT';
      const required = ['StorageLocation', 'Reason', ...(this._material ? [] : ['MaterialNumber', 'Description', 'Category']), ...(equipment ? ['Manufacturer', 'Model', 'SerialNumbers', 'PurchaseDate'] : [])];
      const missing = required.find(key => !String(form[key] || '').trim());
      if (missing) {
        state.setProperty('/error', this.text('completeRequired'));
        this.byId(missing)?.focus(); return;
      }
      state.setProperty('/busy', true); state.setProperty('/error', '');
      const path = this._material ? '/Materials(' + this._material + ')/ITOperations.ReceiveEquipment(...)' : '/Materials/ITOperations.CreateInventoryItem(...)';
      const binding = this.getView().getModel().bindContext(path);
      try {
        const input = { Quantity: form.Quantity, StorageLocation: form.StorageLocation, Reason: form.Reason,
          SerialNumbers: equipment ? form.SerialNumbers : null, PurchaseDate: equipment ? form.PurchaseDate : null, WarrantyEnd: equipment ? form.WarrantyEnd || null : null };
        if (!this._material) Object.assign(input, { MaterialNumber: form.MaterialNumber, Description: form.Description, Category: form.Category,
          TrackingMode: form.TrackingMode, UnitOfMeasure: form.UnitOfMeasure, AssetType: equipment ? form.AssetType : null,
          Manufacturer: equipment ? form.Manufacturer : null, Model: equipment ? form.Model : null, ReorderLevel: equipment ? null : form.ReorderLevel });
        for (const [key, value] of Object.entries(input)) binding.setParameter(key, value);
        await binding.execute('$direct');
        const result = await binding.getBoundContext().requestObject();
        state.setProperty('/result', result); state.setProperty('/saved', true);
        if (equipment) {
          const list = this.getView().getModel().bindList('/Materials(' + result.MaterialUUID + ')/Assets', null, null, null, { $$groupId: '$direct' });
          try {
            const all = [];
            for (let offset = 0; ; offset += 100) {
              const contexts = await list.requestContexts(offset, 100); all.push(...contexts.map(c => c.getObject()));
              if (contexts.length < 100) break;
            }
            const serials = new Set(form.SerialNumbers.split(/\r?\n/).map(s => s.trim()));
            state.setProperty('/assets', all.filter(asset => serials.has(asset.SerialNumber)));
          } finally { list.destroy(); }
        }
      } catch (error) { state.setProperty('/error', error.message); }
      finally { binding.destroy(); state.setProperty('/busy', false); }
    },
    onInventory: function () { this.getExtensionAPI().getRouting().navigateToRoute('MaterialsList'); },
    onOpenMaterial: function () { this.getExtensionAPI().getRouting().navigateToRoute('MaterialsObjectPage', { key: this.getView().getModel('item').getProperty('/result/MaterialUUID') }); },
    onOpenAsset: function (event) { this.getExtensionAPI().getRouting().navigateToRoute('AssetsObjectPage', { key: event.getSource().getBindingContext('item').getProperty('AssetUUID') }); },
    onAnother: function () {
      this._material = null;
      this.getView().getModel('item').setData({ busy: false, error: '', existing: false, saved: false, result: null, assets: [], form: defaults() });
    }
  });
});
