const { randomUUID } = require('node:crypto');
const INTERNAL = Symbol('itoms-internal-write');
// The frozen EDMX DateTimeOffset fields use the default precision of zero.
const timestamp = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
let pending = Promise.resolve();
const serialize = work => {
  const result = pending.then(work);
  pending = result.catch(() => {});
  return result;
};
const statuses = { NEW: 0, SUBMITTED: 2, ASSIGNED: 5, IN_PROGRESS: 5, WAITING: 2, RESOLVED: 3, CLOSED: 3 };
const priorities = { LOW: 0, MEDIUM: 5, HIGH: 2, CRITICAL: 1 };
const transitions = {
  Submit: ['NEW', 'SUBMITTED'], AssignTechnician: ['SUBMITTED', 'ASSIGNED'],
  StartWork: ['ASSIGNED', 'IN_PROGRESS'], PutOnHold: ['IN_PROGRESS', 'WAITING'],
  Resume: ['WAITING', 'IN_PROGRESS'], Resolve: ['IN_PROGRESS', 'RESOLVED'],
  Close: ['RESOLVED', 'CLOSED'], Reopen: ['RESOLVED', 'IN_PROGRESS']
};
function decorate(ticket) {
  ticket.StatusCriticality = statuses[ticket.Status];
  ticket.PriorityCriticality = priorities[ticket.Priority];
  for (const [action, [from]] of Object.entries(transitions)) ticket[`Can${action}`] = ticket.Status === from;
  return ticket;
}
function fail(ctx, message, status = 400, target) {
  ctx.throwError(message, status, { error: { code: String(status), message, ...(target ? { target } : {}) } });
}
function text(ctx, value, name, max) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(ctx, `${name} is required and must be at most ${max} characters.`, 400, name);
  return value.trim();
}
async function reference(ctx, set, key, value, request) {
  const entity = await ctx.base.getEntityInterface(set);
  const record = (await entity.fetchEntries({ [key]: value }, request))[0];
  if (!record) fail(ctx, `Choose a valid ${set === 'Employees' ? 'employee' : 'asset'}.`, 400, key);
  return record;
}
function history(ticket, actor, action, oldValue, reason, now) {
  return { TicketHistoryUUID: randomUUID(), TicketUUID: ticket.TicketUUID, ActorUUID: actor.EmployeeUUID,
    Action: action, OldValue: oldValue, NewValue: ticket.Status, Reason: reason || null,
    CreatedAt: now, CreatedBy: actor.EmployeeNumber };
}
module.exports = { INTERNAL, decorate, transitions, serialize, fail, text, reference, history, timestamp };
