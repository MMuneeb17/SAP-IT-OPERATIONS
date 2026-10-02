const { randomUUID } = require('node:crypto');
const nullable = require('./_nullable-filter');
const { INTERNAL, decorate, transitions, serialize, fail, text, reference, history, timestamp } = require('./_workflow');
const categories = ['Hardware', 'Software', 'Network', 'SAP', 'Email', 'Printer', 'Access', 'Other'];
module.exports = {
  ...nullable(),
  addEntry(data, request) {
    return serialize(async () => {
      const requester = await reference(this, 'Employees', 'EmployeeUUID', data.RequesterUUID, request);
      const subject = text(this, data.Subject, 'Subject', 200);
      const description = text(this, data.Description, 'Description', 4000);
      if (!categories.includes(data.Category)) fail(this, 'Choose a valid category.', 400, 'Category');
      const priority = data.Priority || 'MEDIUM';
      if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority)) fail(this, 'Choose a valid priority.', 400, 'Priority');
      const assetUUID = data.AssetUUID || null;
      if (assetUUID) {
        const asset = await reference(this, 'Assets', 'AssetUUID', assetUUID, request);
        if (asset.CurrentEmployeeUUID !== requester.EmployeeUUID || !['ASSIGNED', 'IN_REPAIR'].includes(asset.Status)) {
          fail(this, 'Choose an asset currently assigned to the requester, or no specific asset.', 400, 'AssetUUID');
        }
      }
      const records = await this.base.getAllEntries(request);
      const nextNumber = Math.max(10451, ...records.map(row => Number(row.TicketNumber.replace('IT-', '')) || 0)) + 1;
      const now = timestamp();
      const ticket = decorate({ TicketUUID: randomUUID(), TicketNumber: `IT-${nextNumber}`, Subject: subject,
        Description: description, Status: 'NEW', Priority: priority, Category: data.Category,
        RequesterUUID: requester.EmployeeUUID, TechnicianUUID: null, AssetUUID: assetUUID,
        Resolution: null, WaitingReason: null, ResolvedAt: null, ClosedAt: null,
        CreatedAt: now, CreatedBy: requester.EmployeeNumber, LastChangedAt: now, LastChangedBy: requester.EmployeeNumber });
      const events = await this.base.getEntityInterface('TicketHistory');
      // Replace client-supplied status, identifiers and audit values with service-owned values.
      for (const key of Object.keys(data)) delete data[key];
      Object.assign(data, ticket);
      await this.base.addEntry(data);
      try { await events.addEntry(history(ticket, requester, 'Create', null, null, now), { [INTERNAL]: true }); }
      catch (error) { await this.base.removeEntry({ TicketUUID: ticket.TicketUUID }, request); throw error; }
    });
  },
  onBeforeUpdateEntry() { this.throwError('Ticket fields and status cannot be patched directly. Use a workflow action.', 405); },
  removeEntry() { this.throwError('Tickets with audit history cannot be deleted.', 405); },
  executeAction(definition, parameters, keys, request) {
    return serialize(async () => {
      const action = definition.name.split('.').at(-1);
      const transition = transitions[action];
      if (!transition) fail(this, 'Unknown ticket action.', 400);
      const stored = (await this.base.fetchEntries(keys, request))[0];
      if (!stored) fail(this, 'Ticket not found.', 404);
      // The middleware's update helper merges into its stored object. Preserve the
      // original values for the audit event and for rollback before invoking it.
      const current = structuredClone(stored);
      if (current.Status !== transition[0]) fail(this, `${action} is not allowed while the ticket is ${current.Status}. Refresh the ticket.`, 409);
      const next = { ...current, Status: transition[1] };
      const input = parameters || {};
      let actorUUID = current.RequesterUUID;
      let reason = null;
      if (action === 'AssignTechnician') {
        const technician = await reference(this, 'Employees', 'EmployeeUUID', input.TechnicianUUID, request);
        if (technician.Department !== 'IT Support') fail(this, 'Choose an IT Support technician.', 400, 'TechnicianUUID');
        next.TechnicianUUID = technician.EmployeeUUID;
        // Explicit demo supervisor; real identity/authorization comes from RAP in later phases.
        actorUUID = '00000001-0000-4000-8000-000000000006';
      } else if (['StartWork', 'PutOnHold', 'Resume', 'Resolve'].includes(action)) {
        actorUUID = current.TechnicianUUID;
        if (!actorUUID) fail(this, 'Assign a technician before starting work.', 409);
      }
      if (action === 'Resolve') {
        reason = text(this, input.Resolution, 'Resolution', 4000);
        next.Resolution = reason;
      }
      if (['PutOnHold', 'Reopen'].includes(action)) reason = text(this, input.Reason, 'Reason', 500);
      if (action === 'PutOnHold') next.WaitingReason = reason;
      if (['Resume', 'Resolve', 'Reopen'].includes(action)) next.WaitingReason = null;
      if (action === 'Reopen') { next.Resolution = null; next.ResolvedAt = null; next.ClosedAt = null; }
      const actor = await reference(this, 'Employees', 'EmployeeUUID', actorUUID, request);
      const now = timestamp();
      if (action === 'Resolve') next.ResolvedAt = now;
      if (action === 'Close') next.ClosedAt = now;
      next.LastChangedAt = now; next.LastChangedBy = actor.EmployeeNumber;
      decorate(next);
      const events = await this.base.getEntityInterface('TicketHistory');
      await this.base.updateEntry(keys, next, request);
      try { await events.addEntry(history(next, actor, action, current.Status, reason, now), { [INTERNAL]: true }); }
      catch (error) { await this.base.updateEntry(keys, current, request); throw error; }
      return next;
    });
  }
};
