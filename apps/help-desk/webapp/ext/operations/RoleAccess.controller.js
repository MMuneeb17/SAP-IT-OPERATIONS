sap.ui.define(['sap/fe/core/PageController','sap/ui/model/json/JSONModel'],function(PageController,JSONModel){
  'use strict';
  return PageController.extend('itoms.helpdesk.ext.operations.RoleAccess',{
    onInit:function(){PageController.prototype.onInit.apply(this,arguments);this.getView().setModel(new JSONModel({busy:true,error:'',role:'EMPLOYEE',roles:[],pages:[],actions:[],entities:[]}), 'access');},
    onPageReady:async function(){const s=this.getView().getModel('access');try{const response=await fetch(sap.ui.require.toUrl('itoms/helpdesk/model/access-policy.json'));if(!response.ok)throw Error('Access design could not be loaded.');this._policy=await response.json();s.setProperty('/roles',this._policy.roles);this.onRoleChange();}catch(error){s.setProperty('/error',error.message);}finally{s.setProperty('/busy',false);}},
    onRoleChange:function(){const s=this.getView().getModel('access'),role=s.getProperty('/role');if(!this._policy)return;s.setProperty('/description',this._policy.roles.find(r=>r.code===role).description);s.setProperty('/pages',this._policy.pages.filter(p=>p.roles.includes(role)));s.setProperty('/actions',Object.entries(this._policy.operations).map(([name,p])=>({name,entity:p.entity,allowed:p.roles.includes(role),condition:p.condition})));s.setProperty('/entities',Object.entries(this._policy.entities).map(([name,scopes])=>({name,scope:scopes[role]||'No read access'})));},
    onOpen:function(event){const row=event.getSource().getBindingContext('access').getObject();this.getExtensionAPI().getRouting().navigateToRoute(row.route);},
    onHelpDesk:function(){this.getExtensionAPI().getRouting().navigateToRoute('TicketsList');},
    decision:function(allowed){return this.getView().getModel('i18n').getResourceBundle().getText(allowed?'slaPermitted':'slaDenied');}
  });
});
