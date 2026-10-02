sap.ui.define([
  "sap/fe/core/PageController", "sap/ui/model/json/JSONModel", "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator", "sap/ui/model/Sorter", "sap/ui/core/Messaging", "sap/m/MessageToast"
], function (PageController, JSONModel, Filter, FilterOperator, Sorter, Messaging, MessageToast) {
  "use strict";
  const emptyForm = () => ({ Subject: "", Description: "", Category: "Hardware", Priority: "MEDIUM", AssetUUID: "" });
  return PageController.extend("itoms.helpdesk.ext.support.MySupport", {
    onInit: function () {
      PageController.prototype.onInit.apply(this, arguments);
      this.getView().setModel(new JSONModel({ busy: true, error: "", employee: "", employees: [], assets: [], tickets: [],
        form: emptyForm(), states: { Subject: "None", Description: "None" }, showForm: true,
        categories: ["Hardware", "Software", "Network", "SAP", "Email", "Printer", "Access", "Other"].map(key => ({ key })) }), "support");
    },
    onPageReady: async function () { await this.onRefresh(); },
    text: function (key) { return this.getView().getModel("i18n").getResourceBundle().getText(key); },
    read: async function (path, filters, sorters) {
      const binding = this.getView().getModel().bindList(path, null, sorters, filters, { $$groupId: "$direct" });
      try { return (await binding.requestContexts(0, 100)).map(context => context.getObject()); }
      finally { binding.destroy(); }
    },
    onRefresh: async function () {
      const vm = this.getView().getModel("support");
      vm.setProperty("/busy", true); vm.setProperty("/error", "");
      try {
        if (!vm.getProperty("/employees").length) {
          const employees = await this.read("/Employees", [], [new Sorter("DisplayName")]);
          vm.setProperty("/employees", employees);
          vm.setProperty("/employee", employees[0]?.EmployeeUUID || "");
        }
        const id = vm.getProperty("/employee");
        if (!id) throw new Error(this.text("noEmployees"));
        const [assets, tickets] = await Promise.all([
          this.read("/Assets", [new Filter("CurrentEmployeeUUID", FilterOperator.EQ, id)]),
          this.read("/Tickets", [new Filter("RequesterUUID", FilterOperator.EQ, id)], [new Sorter("CreatedAt", true)])
        ]);
        vm.setProperty("/assets", [{ AssetUUID: "", AssetTag: this.text("noAsset") }, ...assets.filter(asset => ["ASSIGNED", "IN_REPAIR"].includes(asset.Status))]);
        vm.setProperty("/tickets", tickets);
      } catch (error) { vm.setProperty("/error", error.message || this.text("loadFailed")); }
      finally { vm.setProperty("/busy", false); }
    },
    onEmployeeChange: async function () {
      this.getView().getModel("support").setProperty("/form/AssetUUID", "");
      await this.onRefresh();
    },
    onCreate: async function () {
      const vm = this.getView().getModel("support");
      if (vm.getProperty("/busy")) return;
      if (!vm.getProperty("/employee")) { vm.setProperty("/error", this.text("noEmployees")); return; }
      const form = { ...vm.getProperty("/form") };
      let invalid = false;
      for (const field of ["Subject", "Description"]) {
        const missing = !form[field].trim();
        vm.setProperty(`/states/${field}`, missing ? "Error" : "None"); invalid ||= missing;
      }
      if (invalid) { vm.setProperty("/error", this.text("completeRequired")); this.byId(!form.Subject.trim() ? "subject" : "description").focus(); return; }
      vm.setProperty("/busy", true); vm.setProperty("/error", "");
      const model = this.getView().getModel();
      const list = model.bindList("/Tickets", null, null, null, { $$updateGroupId: "$direct" });
      let context;
      try {
        const completed = new Promise((resolve, reject) => list.attachCreateCompleted(event => {
          if (event.getParameter("success")) resolve();
          else {
            const message = Messaging.getMessageModel().getData().filter(item => item.getType() === "Error").at(-1);
            reject(new Error(message?.getMessage() || this.text("createFailed")));
          }
        }));
        context = list.create({ ...form, AssetUUID: form.AssetUUID || null, RequesterUUID: vm.getProperty("/employee") });
        // Failed creates remain transient for retry; cancel them explicitly in the error path.
        context.created().catch(() => {});
        await completed;
        const ticket = context.getObject();
        vm.setProperty("/form", emptyForm());
        MessageToast.show(this.text("ticketCreated") + " " + ticket.TicketNumber);
        this.getExtensionAPI().getRouting().navigateToRoute("TicketsObjectPage", { key: ticket.TicketUUID });
      } catch (error) {
        vm.setProperty("/error", error.message || this.text("createFailed"));
        if (context?.isTransient()) await context.delete("$direct");
      } finally { list.destroy(); vm.setProperty("/busy", false); }
    },
    onOpenTicket: function (event) {
      const ticket = event.getSource().getBindingContext("support").getObject();
      this.getExtensionAPI().getRouting().navigateToRoute("TicketsObjectPage", { key: ticket.TicketUUID });
    },
    onHelpDesk: function () { this.getExtensionAPI().getRouting().navigateToRoute("TicketsList"); },
    criticalityState: function (value) { return ({ 1: "Error", 2: "Warning", 3: "Success", 5: "Information" })[value] || "None"; }
  });
});
