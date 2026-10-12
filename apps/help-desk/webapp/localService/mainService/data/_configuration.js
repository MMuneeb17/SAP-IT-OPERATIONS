const {randomUUID}=require('node:crypto');
const {serialize,fail,text,timestamp}=require('./_workflow');
const {commit}=require('./_inventory');
const definitions={
  SLAPolicies:{key:'SLAPolicyUUID',fields:['ResponseMinutes','ResolutionMinutes','WarningPercent']},
  Categories:{key:'CategoryUUID',fields:['DefaultPriority','TeamUUID','Active']},
  Subcategories:{key:'SubcategoryUUID',fields:['Name','Active']},
  Teams:{key:'TeamUUID',fields:['Name','LocationUUID','LeadUUID','Active']},
  Locations:{key:'LocationUUID',fields:['Name','Active']},
  WaitingReasons:{key:'WaitingReasonUUID',fields:['Name','PauseResolution','Active']},
  EscalationRules:{key:'EscalationRuleUUID',fields:['TargetRole','Active']}
};
async function validate(ctx,set,row,request){
  const positive=(value,max)=>Number.isInteger(value)&&value>0&&value<=max;
  if(set==='SLAPolicies'&&(!positive(row.ResponseMinutes,10080)||!positive(row.ResolutionMinutes,525600)||row.ResolutionMinutes<row.ResponseMinutes||!positive(row.WarningPercent,99)))fail(ctx,'Use whole minutes, resolution at least response, and warning between 1 and 99 percent.',400);
  if(set==='Categories'&&!['LOW','MEDIUM','HIGH','CRITICAL'].includes(row.DefaultPriority))fail(ctx,'Choose a valid default priority.',400);
  if(set==='EscalationRules'&&!['SUPERVISOR','IT_MANAGER'].includes(row.TargetRole))fail(ctx,'Escalations must target Supervisor or IT Manager.',400);
  if(set==='WaitingReasons'&&row.Code==='OTHER'&&!row.Active)fail(ctx,'The fallback OTHER waiting reason must stay active.',409);
  for(const field of definitions[set].fields){
    if(['Active','PauseResolution'].includes(field)&&typeof row[field]!=='boolean')fail(ctx,`${field} must be a boolean.`,400,field);
    if(field==='Name')row.Name=text(ctx,row.Name,'Name',100);
    const target={TeamUUID:['Teams','TeamUUID'],LocationUUID:['Locations','LocationUUID'],LeadUUID:['Employees','EmployeeUUID']}[field];
    if(target){const entity=await ctx.base.getEntityInterface(target[0]);const ref=(await entity.fetchEntries({[target[1]]:row[field]},request))[0];if(!ref||ref.Active===false||(field==='LeadUUID'&&ref.Department!=='IT Support'))fail(ctx,`Choose a valid active ${target[0]} reference.`,400,field);}
  }
}
module.exports={definitions,contributor(set){return{
  ...require('./_asset-child')(),
  executeAction(definition,input,keys,request){return serialize(async()=>{
    if(definition.name.split('.').at(-1)!=='Save'+set)fail(this,'Unknown configuration action.',400);
    const spec=definitions[set],stored=(await this.base.fetchEntries(keys,request))[0];
    if(!stored)fail(this,'Configuration record not found.',404);
    if(input.Revision!==stored.Revision)fail(this,'Configuration changed. Refresh before saving.',409,'Revision');
    const before=structuredClone(stored),next={...before};
    for(const field of spec.fields){if(!Object.hasOwn(input,field))fail(this,`${field} is required.`,400,field);next[field]=input[field];}
    const reason=text(this,input.Reason,'Reason',500);
    await validate(this,set,next,request);next.Revision++;next.LastChangedAt=timestamp();
    const audit=await this.base.getEntityInterface('ConfigurationHistory');
    const entity=await this.base.getEntityInterface(set);
    const event={ConfigurationHistoryUUID:randomUUID(),EntitySet:set,RecordUUID:next[spec.key],Revision:next.Revision,Reason:reason,Before:JSON.stringify(before),After:JSON.stringify(next),CreatedAt:next.LastChangedAt,CreatedBy:'EMP-0006'};
    await commit([{entity,keys,before,after:next},{entity:audit,keys:{ConfigurationHistoryUUID:event.ConfigurationHistoryUUID},after:event}]);
    return next;
  });}
};}};
