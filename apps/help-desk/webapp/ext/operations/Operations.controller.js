sap.ui.define(['sap/fe/core/PageController','sap/ui/model/json/JSONModel','sap/m/MessageToast'],function(PageController,JSONModel,MessageToast){
  'use strict';
  return PageController.extend('itoms.helpdesk.ext.operations.Operations',{
    onInit:function(){
      PageController.prototype.onInit.apply(this,arguments);
      this.getView().setModel(new JSONModel({busy:true,error:'',tickets:[],ticket:'',selected:{},preview:null,asOf:new Date(Date.now()+3600000).toISOString(),priority:'HIGH',reason:'',sets:[],set:'SLAPolicies',records:[],record:'',fields:[],revision:0,configReason:'',history:[]}),'ops');
      this.getView().getModel('ops').setSizeLimit(10000);
      this._spec=fetch(sap.ui.require.toUrl('itoms/helpdesk/model/configuration.json')).then(r=>{if(!r.ok)throw Error('Configuration schema could not be loaded.');return r.json();});
    },
    onPageReady:function(){return this.onRefresh();},
    text:function(key){return this.getView().getModel('i18n').getResourceBundle().getText(key);},
    read:async function(path){const binding=this.getView().getModel().bindList(path,null,null,null,{$$groupId:'$direct'}),rows=[];try{for(let n=0;;n+=100){const contexts=await binding.requestContexts(n,100);rows.push(...contexts.map(c=>c.getObject()));if(contexts.length<100)return rows;}}finally{binding.destroy();}},
    onRefresh:async function(){
      const s=this.getView().getModel('ops');s.setProperty('/busy',true);s.setProperty('/error','');
      try{
        this._sets=await this._spec;s.setProperty('/sets',this._sets);
        const names=['Tickets','Employees','ConfigurationHistory',...this._sets.map(x=>x.name)];
        const results=await Promise.all(names.map(name=>this.read('/'+name)));this._data=Object.fromEntries(names.map((name,i)=>[name,results[i]]));
        s.setProperty('/tickets',this._data.Tickets);s.setProperty('/history',this._data.ConfigurationHistory.sort((a,b)=>b.CreatedAt.localeCompare(a.CreatedAt)));
        if(!s.getProperty('/ticket'))s.setProperty('/ticket',this._data.Tickets[0]?.TicketUUID||'');this.onTicketChange();this.onSetChange();
      }catch(error){s.setProperty('/error',error.message);}finally{s.setProperty('/busy',false);}
    },
    onTicketChange:function(){const s=this.getView().getModel('ops');s.setProperty('/selected',(s.getProperty('/tickets')||[]).find(t=>t.TicketUUID===s.getProperty('/ticket'))||{});s.setProperty('/preview',null);},
    onSetChange:function(){
      const s=this.getView().getModel('ops'),spec=this._sets?.find(x=>x.name===s.getProperty('/set'));if(!spec)return;
      const rows=this._data[spec.name].map(r=>({...r,key:r[spec.key],label:r.Priority||r.Name||r.TriggerStatus||r.Code}));s.setProperty('/records',rows);
      if(!rows.some(r=>r.key===s.getProperty('/record')))s.setProperty('/record',rows[0]?.key||'');this.onRecordChange();
    },
    onRecordChange:function(){
      const s=this.getView().getModel('ops'),spec=this._sets.find(x=>x.name===s.getProperty('/set')),row=s.getProperty('/records').find(r=>r.key===s.getProperty('/record'));if(!row){s.setProperty('/fields',[]);return;}
      s.setProperty('/revision',row.Revision);s.setProperty('/configReason','');
      s.setProperty('/fields',spec.fields.map(f=>{
        let options=[];const target={TeamUUID:['Teams','TeamUUID','Name'],LocationUUID:['Locations','LocationUUID','Name'],LeadUUID:['Employees','EmployeeUUID','DisplayName']}[f.name];
        if(target)options=(this._data[target[0]]||[]).filter(r=>f.name!=='LeadUUID'||r.Department==='IT Support').map(r=>({key:r[target[1]],text:r[target[2]]}));
        if(f.name==='DefaultPriority')options=['LOW','MEDIUM','HIGH','CRITICAL'].map(key=>({key,text:key}));
        if(f.name==='TargetRole')options=['SUPERVISOR','IT_MANAGER'].map(key=>({key,text:key}));
        return {...f,value:row[f.name],booleanValue:f.type==='Edm.Boolean'?row[f.name]:false,options,isBoolean:f.type==='Edm.Boolean',isSelect:options.length>0,isText:f.type!=='Edm.Boolean'&&!options.length};
      }));
    },
    invoke:async function(path,action,parameters){const binding=this.getView().getModel().bindContext(path+'/ITOperations.'+action+'(...)');try{for(const [key,value]of Object.entries(parameters))binding.setParameter(key,value);await binding.execute('$direct');return await binding.getBoundContext().requestObject();}finally{binding.destroy();}},
    run:async function(work,refresh=true){const s=this.getView().getModel('ops');if(s.getProperty('/busy'))return;s.setProperty('/busy',true);s.setProperty('/error','');try{await work();if(refresh)await this.onRefresh();MessageToast.show(this.text('slaLoaded'));}catch(error){s.setProperty('/error',error.message);}finally{s.setProperty('/busy',false);}},
    ticketPath:function(){const id=this.getView().getModel('ops').getProperty('/ticket');if(!id)throw Error(this.text('slaChooseTicket'));return '/Tickets('+id+')';},
    onPreview:function(){const s=this.getView().getModel('ops');return this.run(async()=>s.setProperty('/preview',await this.invoke(this.ticketPath(),'PreviewSLA',{AsOf:s.getProperty('/asOf')})),false);},
    onCheck:function(){return this.run(()=>this.invoke(this.ticketPath(),'CheckSLA',{}));},
    onPriority:function(){const s=this.getView().getModel('ops');return this.run(()=>this.invoke(this.ticketPath(),'ChangePriority',{Priority:s.getProperty('/priority'),Reason:s.getProperty('/reason')}));},
    onSave:function(){const s=this.getView().getModel('ops');return this.run(async()=>{
      if(!s.getProperty('/record'))throw Error(this.text('slaChooseConfig'));
      const parameters={Revision:s.getProperty('/revision'),Reason:s.getProperty('/configReason')};
      for(const field of s.getProperty('/fields')){
        if(field.type==='Edm.Int32'&&!/^\d+$/.test(String(field.value)))throw Error(field.label+' requires a whole number.');
        parameters[field.name]=field.isBoolean?field.booleanValue:field.type==='Edm.Int32'?Number(field.value):field.value;
      }
      await this.invoke('/'+s.getProperty('/set')+'('+s.getProperty('/record')+')','Save'+s.getProperty('/set'),parameters);
    });},
    onOpenTicket:function(){const id=this.getView().getModel('ops').getProperty('/ticket');if(id)this.getExtensionAPI().getRouting().navigateToRoute('TicketsObjectPage',{key:id});},
    onRoles:function(){this.getExtensionAPI().getRouting().navigateToRoute('RoleAccess');},
    onHelpDesk:function(){this.getExtensionAPI().getRouting().navigateToRoute('TicketsList');},
    state:function(value){return {BREACHED:'Error',AT_RISK:'Warning',WITHIN_SLA:'Success',MET:'Success',PAUSED:'Information'}[value]||'None';}
  });
});
