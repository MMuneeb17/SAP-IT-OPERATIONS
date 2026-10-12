const { INTERNAL, serialize, fail, text, history, timestamp } = require('./_workflow');
const minute = 60000;
const actor = { EmployeeUUID: '00000001-0000-4000-8000-000000000006', EmployeeNumber: 'EMP-0006' };
const computed = ['ResponseDueAt','ResolutionDueAt','ResponseSLAStatus','ResolutionSLAStatus','SLAStatus','SLACriticality','SLAEvaluatedAt'];
function assess(ticket, at = timestamp()) {
  const row = { ...ticket }, now = Date.parse(at), created = Date.parse(row.CreatedAt);
  if (!Number.isFinite(now) || now < created) throw Error('Evaluation time cannot precede ticket creation.');
  const paused = row.SLAPauseStartedAt ? Math.max(0, now - Date.parse(row.SLAPauseStartedAt)) : 0;
  const start = Date.parse(row.ResolutionStartedAt);
  const responseDue = created + row.ResponseMinutes * minute;
  const resolutionDue = start + row.ResolutionMinutes * minute + row.SLAPausedSeconds * 1000 + paused;
  const state = (deadline, duration, finished, isPaused) => {
    // A historical preview must not use an event that had not happened yet.
    const end = finished && Date.parse(finished) <= now ? Date.parse(finished) : null;
    if (end !== null) return end > deadline ? 'BREACHED' : 'MET';
    if (now >= deadline) return 'BREACHED';
    if (isPaused) return 'PAUSED';
    return now >= deadline - duration * (1 - row.WarningPercent / 100) ? 'AT_RISK' : 'WITHIN_SLA';
  };
  row.ResponseDueAt = new Date(responseDue).toISOString().replace('.000Z','Z');
  row.ResolutionDueAt = new Date(resolutionDue).toISOString().replace('.000Z','Z');
  row.ResponseSLAStatus = state(responseDue, row.ResponseMinutes * minute, row.FirstResponseAt, false);
  row.ResolutionSLAStatus = state(resolutionDue, row.ResolutionMinutes * minute, row.ResolvedAt, !!row.SLAPauseStartedAt);
  const states = [row.ResponseSLAStatus,row.ResolutionSLAStatus];
  row.SLAStatus = ['BREACHED','AT_RISK','PAUSED','WITHIN_SLA','MET'].find(s=>states.includes(s));
  row.SLACriticality = { BREACHED:1, AT_RISK:2, PAUSED:5, WITHIN_SLA:3, MET:3 }[row.SLAStatus];
  row.SLAEvaluatedAt = new Date(now).toISOString().replace(/\.\d{3}Z$/,'Z');
  return row;
}
async function policy(ctx, priority, request) {
  const entity = await ctx.base.getEntityInterface('SLAPolicies');
  const row = (await entity.fetchEntries({ Priority:priority }, request))[0];
  if (!row) fail(ctx,'No SLA policy is configured for this priority.',409);
  return { ResponseMinutes:row.ResponseMinutes, ResolutionMinutes:row.ResolutionMinutes, WarningPercent:row.WarningPercent, SLAPolicyRevision:row.Revision };
}
async function initialize(ctx, ticket, request) {
  return assess({ ...ticket, ...await policy(ctx,ticket.Priority,request), FirstResponseAt:null,
    ResolutionStartedAt:ticket.CreatedAt, SLAPausedSeconds:0, SLAPauseStartedAt:null,
    WaitingReasonCode:null, EscalationLevel:0, EscalationTarget:null, LastEscalatedAt:null, SLALastCheckedAt:null });
}
async function transition(ctx, current, next, action, input, now, request) {
  if (action === 'AssignTechnician' && !current.FirstResponseAt) next.FirstResponseAt = now;
  if (action === 'PutOnHold') {
    const code = input.WaitingReasonCode || 'OTHER';
    const reasons = await ctx.base.getEntityInterface('WaitingReasons');
    const reason = (await reasons.fetchEntries({Code:code},request))[0];
    if (!reason?.Active) fail(ctx,'Choose an active waiting reason.',400,'WaitingReasonCode');
    next.WaitingReasonCode = code;
    next.SLAPauseStartedAt = reason.PauseResolution ? now : null;
  }
  if (action === 'Resume') {
    if (current.SLAPauseStartedAt) next.SLAPausedSeconds += Math.max(0, Math.floor((Date.parse(now)-Date.parse(current.SLAPauseStartedAt))/1000));
    next.SLAPauseStartedAt = null; next.WaitingReasonCode = null;
  }
  if (action === 'Reopen') {
    next.ResolutionStartedAt = now; next.SLAPausedSeconds = 0; next.SLAPauseStartedAt = null;
    next.EscalationLevel = 0; next.EscalationTarget = null; next.LastEscalatedAt = null;
  }
  return Object.assign(next, assess(next,now));
}
function execute(ctx, action, input, keys, request) {
  return serialize(async()=>{
    const stored = (await ctx.base.fetchEntries(keys,request))[0];
    if (!stored) fail(ctx,'Ticket not found.',404);
    const before = structuredClone(stored), now = timestamp();
    if (action === 'PreviewSLA') {
      // Preview projects the current snapshot forward; it does not reconstruct past transitions.
      const at = input.AsOf;
      if (typeof at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(at) || !Number.isFinite(Date.parse(at)) || Date.parse(at)<Date.parse(before.LastChangedAt) || Date.parse(at)>Date.parse('2100-01-01T00:00:00Z')) fail(ctx,'Choose a timestamp at or after the latest ticket change and before 2100.',400,'AsOf');
      return assess(before,at);
    }
    let next = { ...before }, event = null;
    if (action === 'ChangePriority') {
      if (['RESOLVED','CLOSED'].includes(before.Status)) fail(ctx,'Priority cannot change on a resolved or closed ticket.',409);
      if (!['LOW','MEDIUM','HIGH','CRITICAL'].includes(input.Priority)) fail(ctx,'Choose a valid priority.',400,'Priority');
      if (input.Priority === before.Priority) fail(ctx,'Choose a different priority.',409);
      const reason = text(ctx,input.Reason,'Reason',500);
      Object.assign(next,await policy(ctx,input.Priority,request),{Priority:input.Priority});
      next.LastChangedAt=now;next.LastChangedBy=actor.EmployeeNumber;
      require('./_workflow').decorate(next);
      event=history(next,actor,'ChangePriority',before.Priority,reason,now);event.NewValue=next.Priority;
    } else if (action === 'CheckSLA') {
      next.SLALastCheckedAt=now;
      const status=assess(next,now).SLAStatus;
      const rules=await ctx.base.getEntityInterface('EscalationRules');
      const rule=(await rules.fetchEntries({TriggerStatus:status},request))[0];
      if (!['RESOLVED','CLOSED'].includes(next.Status) && rule?.Active && rule.Level>next.EscalationLevel) {
        next.EscalationLevel=rule.Level;next.EscalationTarget=rule.TargetRole;next.LastEscalatedAt=now;
        event=history(next,actor,'EscalateSLA',before.Status,`${status}: level ${rule.Level} to ${rule.TargetRole}`,now);
      }
    } else fail(ctx,'Unknown SLA action.',400);
    next=assess(next,now);
    await ctx.base.updateEntry(keys,next,request);
    if(event){const events=await ctx.base.getEntityInterface('TicketHistory');try{await events.addEntry(event,{[INTERNAL]:true});}catch(error){await ctx.base.updateEntry(keys,before,request);await events.removeEntry({TicketHistoryUUID:event.TicketHistoryUUID},{[INTERNAL]:true});throw error;}}
    return next;
  });
}
module.exports={assess,computed,initialize,transition,execute};
