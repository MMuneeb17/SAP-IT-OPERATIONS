sap.ui.define(['sap/fe/core/PageController','sap/ui/model/json/JSONModel','sap/ui/model/Filter','sap/ui/model/FilterOperator','sap/m/MessageToast'],
function(PageController,JSONModel,Filter,FilterOperator,MessageToast){
  'use strict';
  return PageController.extend('itoms.helpdesk.ext.inventory.RepairWorkspace',{
    onInit:function(){
      PageController.prototype.onInit.apply(this,arguments);
      this.getView().setModel(new JSONModel({busy:true,error:'',ticket:{},stocks:[],requests:[],movements:[],repair:null,stock:'',quantity:'1',reason:'',diagnosis:'',work:'',canStart:false,canRequest:false,canComplete:false}),'repair');
      this.getView().getModel('repair').setSizeLimit(10000);
      this._route=this.getAppComponent().getRouter().getRoute('RepairWorkspace');
      this._route.attachPatternMatched(this.onRoute,this);
    },
    onExit:function(){this._route?.detachPatternMatched(this.onRoute,this);},
    onRoute:function(event){this.setTicket(event.getParameter('arguments')['?query']?.ticket);this.onRefresh();},
    setTicket:function(key){
      if(key!==this._key){
        const state=this.getView().getModel('repair');
        for(const field of ['reason','diagnosis','work','stock'])state.setProperty('/'+field,'');
        for(const [field,value] of Object.entries({ticket:{},stocks:[],requests:[],movements:[],repair:null,canStart:false,canRequest:false,canComplete:false,quantity:'1'}))state.setProperty('/'+field,value);
      }
      this._key=key;
    },
    onPageReady:function(){
      const router=this.getAppComponent().getRouter();
      this.setTicket(router.getRouteInfoByHash(router.getHashChanger().getHash())?.arguments['?query']?.ticket);
      return this.onRefresh();
    },
    text:function(key){return this.getView().getModel('i18n').getResourceBundle().getText(key);},
    readOne:async function(path,expand){
      const binding=this.getView().getModel().bindContext(path,null,{$$groupId:'$direct',...(expand?{$expand:expand}:{})});
      try{return await binding.requestObject();}finally{binding.destroy();}
    },
    readList:async function(path,filters,expand){
      const binding=this.getView().getModel().bindList(path,null,null,filters,{$$groupId:'$direct',...(expand?{$expand:expand}:{})}),rows=[];
      try{for(let offset=0;;offset+=100){const contexts=await binding.requestContexts(offset,100);rows.push(...contexts.map(c=>c.getObject()));if(contexts.length<100)return rows;}}
      finally{binding.destroy();}
    },
    onRefresh:async function(){
      const state=this.getView().getModel('repair'),version=this._version=(this._version||0)+1;
      if(!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(this._key||'')){state.setProperty('/error',this.text('repairMissingTicket'));state.setProperty('/busy',false);return;}
      state.setProperty('/busy',true);state.setProperty('/error','');
      try{
        const filter=[new Filter('TicketUUID',FilterOperator.EQ,this._key)];
        const [ticket,stocks,repairs,requests,movements]=await Promise.all([
          this.readOne('/Tickets('+this._key+')','Asset,Technician'),this.readList('/Stocks',[],'Material'),
          this.readList('/AssetRepairs',filter),this.readList('/Reservations',filter,'Material,Stock'),this.readList('/StockTransactions',filter,'Material,Stock')]);
        if(version!==this._version)return;
        const repair=repairs.find(r=>r.Status==='OPEN')||null;
        const active=['IN_PROGRESS','WAITING'].includes(ticket.Status);
        for(const [key,value] of Object.entries({ticket,stocks,requests,movements,repair,canStart:active&&!!ticket.AssetUUID&&!!ticket.TechnicianUUID&&!repair&&['ASSIGNED','AVAILABLE'].includes(ticket.Asset?.Status),canRequest:active&&(!ticket.AssetUUID||!!repair),canComplete:!!repair&&!requests.some(r=>r.AssetRepairUUID===repair.AssetRepairUUID&&['OPEN','PARTIAL'].includes(r.Status))}))state.setProperty('/'+key,value);
        if(!state.getProperty('/stock'))state.setProperty('/stock',stocks[0]?.StockUUID||'');
      }catch(error){if(version===this._version){state.setProperty('/error',error.message||this.text('loadFailed'));for(const key of ['canStart','canRequest','canComplete'])state.setProperty('/'+key,false);}}
      finally{if(version===this._version)state.setProperty('/busy',false);}
    },
    invoke:async function(path,action,parameters){
      const binding=this.getView().getModel().bindContext(path+'/ITOperations.'+action+'(...)');
      try{for(const [key,value] of Object.entries(parameters))binding.setParameter(key,value);await binding.execute('$direct');}
      finally{binding.destroy();}
    },
    run:async function(work){
      const state=this.getView().getModel('repair');if(state.getProperty('/busy'))return;
      state.setProperty('/busy',true);state.setProperty('/error','');
      try{await work();await this.onRefresh();MessageToast.show(this.text('inventorySaved'));}
      catch(error){state.setProperty('/error',error.message||this.text('inventoryFailed'));}
      finally{state.setProperty('/busy',false);}
    },
    onStartRepair:function(){const s=this.getView().getModel('repair');return this.run(()=>this.invoke('/Assets('+s.getProperty('/ticket/AssetUUID')+')','SendForRepair',{TechnicianUUID:s.getProperty('/ticket/TechnicianUUID'),TicketUUID:this._key,Diagnosis:s.getProperty('/diagnosis')}));},
    onRequestPart:function(){const s=this.getView().getModel('repair');return this.run(()=>this.invoke('/Tickets('+this._key+')','RequestPart',{StockUUID:s.getProperty('/stock'),Quantity:s.getProperty('/quantity'),Reason:s.getProperty('/reason')}));},
    onCompleteRepair:function(){const s=this.getView().getModel('repair');return this.run(()=>this.invoke('/Assets('+s.getProperty('/ticket/AssetUUID')+')','CompleteRepair',{RepairDescription:s.getProperty('/work')}));},
    onIssue:function(event){const row=event.getSource().getBindingContext('repair').getObject();return this.run(()=>this.invoke('/Reservations('+row.ReservationUUID+')','IssueReservation',{Quantity:row.OutstandingQuantity,Reason:this.text('guidedIssueReason')}));},
    onOpenReservation:function(event){const row=event.getSource().getBindingContext('repair').getObject();this.getExtensionAPI().getRouting().navigateToRoute('ReservationsObjectPage',{key:row.ReservationUUID});},
    onTicket:function(){this.getExtensionAPI().getRouting().navigateToRoute('TicketsObjectPage',{key:this._key});},
    onInventory:function(){this.getExtensionAPI().getRouting().navigateToRoute('MaterialsList');},
    stockText:function(label,available,unit){return label+' · '+available+' '+unit+' '+this.text('availableSuffix');}
  });
});
