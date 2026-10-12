const {test,expect}=require('@playwright/test');
const {randomUUID}=require('node:crypto');
const {assess,transition}=require('../mock/data/_sla');
const id=(g,n)=>`${String(g).padStart(8,'0')}-0000-4000-8000-${String(n).padStart(12,'0')}`;
function api(request){const tenant='ops-'+randomUUID();const url=p=>'/odata/v4/it-operations/'+p+(p.includes('?')?'&':'?')+'sap-client='+tenant;return{get:p=>request.get(url(p)),post:(p,data)=>request.post(url(p),{data}),patch:(p,data)=>request.patch(url(p),{data}),delete:p=>request.delete(url(p))};}
async function json(r,status=200){expect(r.status(),await r.text()).toBe(status);return r.json();}
const action=(a,set,key,name,data={})=>a.post(`${set}(${key})/ITOperations.${name}`,data).then(r=>json(r));
const create=a=>a.post('Tickets',{Subject:'SLA acceptance',Description:'Service level check',Category:'Hardware',RequesterUUID:id(1,2)}).then(r=>json(r,201));
const base=()=>({CreatedAt:'2026-10-08T00:00:00Z',LastChangedAt:'2026-10-08T00:00:00Z',Status:'IN_PROGRESS',FirstResponseAt:null,ResolvedAt:null,ResolutionStartedAt:'2026-10-08T00:00:00Z',ResponseMinutes:60,ResolutionMinutes:240,WarningPercent:75,SLAPausedSeconds:0,SLAPauseStartedAt:null});
test('SLA warning and breach boundaries are exact and late responses stay breached',()=>{
 expect(assess(base(),'2026-10-08T00:44:59Z').SLAStatus).toBe('WITHIN_SLA');
 expect(assess(base(),'2026-10-08T00:45:00Z').SLAStatus).toBe('AT_RISK');
 expect(assess(base(),'2026-10-08T01:00:00Z').SLAStatus).toBe('BREACHED');
 expect(assess({...base(),FirstResponseAt:'2026-10-08T01:00:00Z'},'2026-10-08T01:01:00Z').ResponseSLAStatus).toBe('MET');
 expect(assess({...base(),FirstResponseAt:'2026-10-08T01:00:01Z'},'2026-10-08T02:00:00Z').ResponseSLAStatus).toBe('BREACHED');
});
test('pause and resume preserve remaining resolution time without masking a prior breach',async()=>{
 const current={...base(),Status:'WAITING',FirstResponseAt:'2026-10-08T00:10:00Z',SLAPauseStartedAt:'2026-10-08T01:00:00Z'};
 const paused=assess(current,'2026-10-08T03:00:00Z');expect(paused.ResolutionDueAt).toBe('2026-10-08T06:00:00Z');expect(paused.ResolutionSLAStatus).toBe('PAUSED');
 const next={...current,Status:'IN_PROGRESS'};await transition({},current,next,'Resume',{},'2026-10-08T03:00:00Z',{});
 expect(next.SLAPausedSeconds).toBe(7200);expect(next.SLAPauseStartedAt).toBe(null);expect(next.ResolutionDueAt).toBe('2026-10-08T06:00:00Z');
 expect(assess({...current,SLAPauseStartedAt:'2026-10-08T05:00:00Z'},'2026-10-08T06:00:00Z').ResolutionSLAStatus).toBe('BREACHED');
});
test('resolution stops the clock and reopen starts a new resolution cycle',async()=>{
 const current={...base(),Status:'RESOLVED',FirstResponseAt:'2026-10-08T00:10:00Z',ResolvedAt:'2026-10-08T02:00:00Z',EscalationLevel:2};
 expect(assess(current,'2026-10-10T00:00:00Z').SLAStatus).toBe('MET');
 const next={...current,Status:'IN_PROGRESS',ResolvedAt:null};await transition({},current,next,'Reopen',{},'2026-10-10T00:00:00Z',{});
 expect(next.ResolutionDueAt).toBe('2026-10-10T04:00:00Z');expect(next.EscalationLevel).toBe(0);expect(next.ResponseSLAStatus).toBe('MET');
});
test('policy changes audit configuration and only affect new snapshots until explicit reprioritization',async({request})=>{
 const a=api(request),before=await create(a);
 await action(a,'SLAPolicies',id(13,3),'SaveSLAPolicies',{ResponseMinutes:30,ResolutionMinutes:180,WarningPercent:80,Revision:1,Reason:'Service hours agreed'});
 const after=await create(a);expect(after.ResponseMinutes).toBe(30);expect(after.SLAPolicyRevision).toBe(2);
 expect((await json(await a.get(`Tickets(${before.TicketUUID})`))).ResponseMinutes).toBe(120);
 const changed=await action(a,'Tickets',before.TicketUUID,'ChangePriority',{Priority:'CRITICAL',Reason:'Business service unavailable'});
 expect(changed.ResponseMinutes).toBe(15);expect(changed.CreatedAt).toBe(before.CreatedAt);
 const audit=(await json(await a.get('ConfigurationHistory'))).value;expect(audit).toHaveLength(2);expect(JSON.parse(audit[1].Before).ResponseMinutes).toBe(120);
});
test('configuration validates input, detects stale edits and protects direct writes',async({request})=>{
 const a=api(request),path=`SLAPolicies(${id(13,1)})/ITOperations.SaveSLAPolicies`;
 const good={ResponseMinutes:15,ResolutionMinutes:120,WarningPercent:75,Revision:1,Reason:'Checked'};
 for(const invalid of [{ResponseMinutes:0},{ResolutionMinutes:1},{WarningPercent:100},{ResponseMinutes:1.1},{Reason:' '}])expect((await a.post(path,{...good,...invalid})).status()).toBe(400);
 const results=await Promise.all([a.post(path,good),a.post(path,good)]);expect(results.map(r=>r.status()).sort()).toEqual([200,409]);
 for(const [set,key] of [['SLAPolicies','SLAPolicyUUID'],['Categories','CategoryUUID'],['Subcategories','SubcategoryUUID'],['Teams','TeamUUID'],['Locations','LocationUUID'],['WaitingReasons','WaitingReasonUUID'],['EscalationRules','EscalationRuleUUID'],['ConfigurationHistory','ConfigurationHistoryUUID']]){
  const row=(await json(await a.get(set))).value[0];expect((await a.post(set,row)).status()).toBe(405);expect((await a.patch(`${set}(${row[key]})`,row)).status()).toBe(405);expect((await a.delete(`${set}(${row[key]})`)).status()).toBe(405);
 }
});
test('active categories drive priority and routing; mismatched subcategories are rejected',async({request})=>{
 const a=api(request);
 await action(a,'Categories',id(14,1),'SaveCategories',{DefaultPriority:'HIGH',TeamUUID:id(16,2),Active:true,Revision:1,Reason:'Hardware routing'});
 const ticket=await create(a);expect(ticket.Priority).toBe('HIGH');expect(ticket.TeamUUID).toBe(id(16,2));expect(ticket.LocationUUID).toBe(id(17,2));
 expect((await a.post('Tickets',{Subject:'Mismatch',Description:'Invalid category pair',Category:'Hardware',RequesterUUID:id(1,2),SubcategoryUUID:id(15,3)})).status()).toBe(400);
 await action(a,'Categories',id(14,1),'SaveCategories',{DefaultPriority:'HIGH',TeamUUID:id(16,2),Active:false,Revision:2,Reason:'Temporarily inactive'});
 expect((await a.post('Tickets',{Subject:'Inactive',Description:'Inactive category',Category:'Hardware',RequesterUUID:id(1,2)})).status()).toBe(400);
});
test('future preview has no persistent side effects and rejects invalid timestamps',async({request})=>{
 const a=api(request),ticket=await create(a),path=`Tickets(${ticket.TicketUUID})`;
 const future=new Date(Date.parse(ticket.CreatedAt)+3*3600000).toISOString();
 const preview=await action(a,'Tickets',ticket.TicketUUID,'PreviewSLA',{AsOf:future});expect(preview.SLAStatus).toBe('BREACHED');expect(preview.EscalationLevel).toBe(0);
 const live=await json(await a.get(path));expect(live.SLAStatus).toBe('WITHIN_SLA');expect(live.LastEscalatedAt).toBe(null);
 expect((await json(await a.get(path+'/History'))).value).toHaveLength(1);
 expect((await a.post(path+'/ITOperations.PreviewSLA',{AsOf:'invalid'})).status()).toBe(400);
 expect((await a.post(path+'/ITOperations.PreviewSLA',{AsOf:'2020-01-01T00:00:00Z'})).status()).toBe(400);
});
test('current SLA checks escalate overdue tickets once and honor disabled rules',async({request})=>{
 const a=api(request),key=id(3,2);
 await action(a,'EscalationRules',id(19,2),'SaveEscalationRules',{TargetRole:'IT_MANAGER',Active:false,Revision:1,Reason:'Manual escalation review'});
 expect((await action(a,'Tickets',key,'CheckSLA')).EscalationLevel).toBe(0);
 await action(a,'EscalationRules',id(19,2),'SaveEscalationRules',{TargetRole:'IT_MANAGER',Active:true,Revision:2,Reason:'Enable escalation'});
 expect((await action(a,'Tickets',key,'CheckSLA')).EscalationLevel).toBe(2);
 await action(a,'Tickets',key,'CheckSLA');
 const events=(await json(await a.get(`Tickets(${key})/History`))).value.filter(e=>e.Action==='EscalateSLA');expect(events).toHaveLength(1);
 expect((await action(a,'Tickets',id(3,7),'CheckSLA')).EscalationLevel).toBe(0);
});
test('configured waiting reasons control the live SLA pause',async({request})=>{
 const a=api(request),ticket=await create(a),key=ticket.TicketUUID;
 for(const [name,params] of [['Submit',{}],['AssignTechnician',{TechnicianUUID:id(1,4)}],['StartWork',{}]])await action(a,'Tickets',key,name,params);
 let row=await action(a,'Tickets',key,'PutOnHold',{Reason:'Await confirmation',WaitingReasonCode:'WAIT_USER'});expect(row.ResolutionSLAStatus).toBe('PAUSED');expect(row.SLAPauseStartedAt).toBeTruthy();
 await action(a,'Tickets',key,'Resume');row=await action(a,'Tickets',key,'PutOnHold',{Reason:'Await stock',WaitingReasonCode:'WAIT_PARTS'});expect(row.SLAPauseStartedAt).toBe(null);
});
test('access policy covers every service set, bound action and page target without implicit admin privileges',async()=>{
 const fs=require('node:fs'),{XMLParser}=require('fast-xml-parser');
 const policy=require('../apps/help-desk/webapp/model/access-policy.json');
 const schema=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'',removeNSPrefix:true}).parse(fs.readFileSync('mock/metadata.xml','utf8')).Edmx.DataServices.Schema;
 expect(Object.keys(policy.entities).sort()).toEqual(schema.EntityContainer.EntitySet.map(s=>s.Name).sort());
 expect(Object.keys(policy.operations).filter(n=>n!=='CreateTicket').sort()).toEqual(schema.Action.map(a=>a.Name).sort());
 const roles=policy.roles.map(r=>r.code);expect(new Set(roles).size).toBe(7);
 for(const operation of Object.values(policy.operations)){expect(operation.roles.length).toBeGreaterThan(0);for(const r of operation.roles)expect(roles).toContain(r);}
 expect(policy.operations.IssueReservation.roles).toEqual(['STORE_OFFICER']);expect(policy.operations.Close.roles).toEqual(['EMPLOYEE']);expect(policy.operations.SaveSLAPolicies.roles).toEqual(['SYSTEM_ADMIN']);
 expect(policy.operations.AdjustStock.roles).not.toContain('SYSTEM_ADMIN');
 const targets=require('../apps/help-desk/webapp/manifest.json')['sap.ui5'].routing.targets;
 expect(Object.keys(policy.targets).sort()).toEqual(Object.keys(targets).sort());
 for(const p of policy.pages)expect(targets[p.route]).toBeTruthy();
});

test('live SLA filters and projections operate on calculated status',async({request})=>{
 const a=api(request),ticket=await create(a);
 const result=await json(await a.get("Tickets?$filter=SLAStatus%20eq%20'WITHIN_SLA'&$select=TicketUUID,SLAStatus&$count=true"));
 expect(result.value.some(r=>r.TicketUUID===ticket.TicketUUID)).toBe(true);
 expect(result.value.every(r=>r.SLAStatus==='WITHIN_SLA')).toBe(true);
 expect(result['@odata.count']).toBe(result.value.length);
});

function faultStore(){
 const names=['Tickets','TicketHistory','SLAPolicies','ConfigurationHistory'];
 const data=Object.fromEntries(names.map(name=>[name,structuredClone(require('../mock/data/'+name+'.json'))]));
 const match=(row,keys)=>Object.entries(keys).every(([k,v])=>row[k]===v);
 const entity=name=>({fetchEntries:async keys=>data[name].filter(r=>match(r,keys)),
  addEntry:async row=>{data[name].push(structuredClone(row));throw Error('Audit storage failed after insertion');},
  updateEntry:async(keys,row)=>Object.assign(data[name].find(r=>match(r,keys)),structuredClone(row)),
  removeEntry:async keys=>{data[name]=data[name].filter(r=>!match(r,keys));}});
 const context=name=>({base:{...entity(name),getEntityInterface:async set=>entity(set)},throwError(message){throw Error(message);}});
 return {data,context};
}
test('failed configuration audit restores both the policy revision and inserted event',async()=>{
 const {data,context}=faultStore(),before=structuredClone(data),ctx=context('SLAPolicies');
 const contributor=require('../mock/data/_configuration').contributor('SLAPolicies');
 await expect(contributor.executeAction.call(ctx,{name:'SaveSLAPolicies'},{ResponseMinutes:20,ResolutionMinutes:120,WarningPercent:75,Revision:1,Reason:'Fault injection'},{SLAPolicyUUID:id(13,1)},{})).rejects.toThrow('Audit storage failed');
 expect(data).toEqual(before);
});
test('failed priority audit restores the original ticket and removes the inserted event',async()=>{
 const {data,context}=faultStore(),before=structuredClone(data);
 await expect(require('../mock/data/_sla').execute(context('Tickets'),'ChangePriority',{Priority:'LOW',Reason:'Fault injection'},{TicketUUID:id(3,2)},{})).rejects.toThrow('Audit storage failed');
 expect(data).toEqual(before);
});
