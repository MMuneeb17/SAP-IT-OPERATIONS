const { randomUUID } = require('node:crypto');
const { INTERNAL, serialize, fail, text, reference, timestamp } = require('./_workflow');
const { allowed, decorateAsset } = require('./_asset-workflow');
const actorUUID = '00000001-0000-4000-8000-000000000006';
module.exports = {
  ...require('./_readonly')(),
  executeAction(definition, parameters, keys, request) {
    return serialize(async () => {
      const action = definition.name.split('.').at(-1);
      const stored = (await this.base.fetchEntries(keys, request))[0];
      if (!stored) fail(this, 'Asset not found.', 404);
      const current = structuredClone(stored);
      if (!allowed[action]?.includes(current.Status)) fail(this, `${action} is not allowed while the asset is ${current.Status}. Refresh the asset.`, 409);
      const input = parameters || {};
      const now = timestamp();
      const reason = text(this, action === 'SendForRepair' ? input.Diagnosis : action === 'CompleteRepair' ? input.RepairDescription : input.Reason,
        action === 'SendForRepair' ? 'Diagnosis' : action === 'CompleteRepair' ? 'RepairDescription' : 'Reason', 4000);
      const next = { ...current, LastChangedAt: now, LastChangedBy: 'EMP-0006' };
      const assignments = await this.base.getEntityInterface('AssetAssignments');
      const repairs = await this.base.getEntityInterface('AssetRepairs');
      const events = await this.base.getEntityInterface('AssetHistory');
      const openAssignments = (await assignments.fetchEntries({ AssetUUID: current.AssetUUID }, request)).filter(row => row.EndAt === null);
      const openRepairs = (await repairs.fetchEntries({ AssetUUID: current.AssetUUID }, request)).filter(row => row.Status === 'OPEN');
      if (openAssignments.length !== (current.CurrentEmployeeUUID ? 1 : 0) ||
          (openAssignments.length && openAssignments[0].EmployeeUUID !== current.CurrentEmployeeUUID)) fail(this, 'Assignment history is inconsistent with the current custodian.', 409);
      if (openRepairs.length !== (current.Status === 'IN_REPAIR' ? 1 : 0)) fail(this, 'Repair history is inconsistent with the asset status.', 409);
      const operations = [];
      const insert = (entity, key, row) => operations.push({ entity, key, row });
      const update = (entity, key, old, patch) => operations.push({ entity, key, old: structuredClone(old), row: { ...old, ...patch } });
      if (['AssignAsset', 'TransferAsset'].includes(action)) {
        const employee = await reference(this, 'Employees', 'EmployeeUUID', input.EmployeeUUID, request);
        if (employee.EmployeeUUID === current.CurrentEmployeeUUID) fail(this, 'Choose a different employee for a transfer.', 400, 'EmployeeUUID');
        if (action === 'TransferAsset') update(assignments, 'AssetAssignmentUUID', openAssignments[0], { EndAt: now, EndReason: reason, ClosedBy: 'EMP-0006' });
        insert(assignments, 'AssetAssignmentUUID', { AssetAssignmentUUID: randomUUID(), AssetUUID: current.AssetUUID,
          EmployeeUUID: employee.EmployeeUUID, StartAt: now, EndAt: null, Reason: reason, EndReason: null, CreatedBy: 'EMP-0006', ClosedBy: null });
        next.Status = 'ASSIGNED'; next.CurrentEmployeeUUID = employee.EmployeeUUID; next.Location = employee.Location;
      } else if (action === 'ReturnAsset') {
        update(assignments, 'AssetAssignmentUUID', openAssignments[0], { EndAt: now, EndReason: reason, ClosedBy: 'EMP-0006' });
        next.CurrentEmployeeUUID = null; next.Status = 'AVAILABLE';
      } else if (action === 'SendForRepair') {
        const technician = await reference(this, 'Employees', 'EmployeeUUID', input.TechnicianUUID, request);
        if (technician.Department !== 'IT Support') fail(this, 'Choose an IT Support technician.', 400, 'TechnicianUUID');
        const ticketUUID = input.TicketUUID || null;
        if (ticketUUID) {
          const tickets = await this.base.getEntityInterface('Tickets');
          const ticket = (await tickets.fetchEntries({ TicketUUID: ticketUUID }, request))[0];
          if (!ticket || ticket.AssetUUID !== current.AssetUUID) fail(this, 'Choose a ticket for this asset, or leave the ticket empty.', 400, 'TicketUUID');
        }
        insert(repairs, 'AssetRepairUUID', { AssetRepairUUID: randomUUID(), AssetUUID: current.AssetUUID,
          TicketUUID: ticketUUID, TechnicianUUID: technician.EmployeeUUID, Status: 'OPEN', Diagnosis: reason,
          RepairDescription: null, StartedAt: now, RepairedAt: null, CreatedBy: 'EMP-0006', CompletedBy: null });
        next.Status = 'IN_REPAIR';
      } else if (action === 'CompleteRepair') {
        update(repairs, 'AssetRepairUUID', openRepairs[0], { Status: 'COMPLETED', RepairDescription: reason, RepairedAt: now, CompletedBy: 'EMP-0006' });
        next.Status = current.CurrentEmployeeUUID ? 'ASSIGNED' : 'AVAILABLE';
      } else next.Status = { MakeAvailable: 'AVAILABLE', RetireAsset: 'RETIRED', DisposeAsset: 'DISPOSED' }[action];
      decorateAsset(next);
      insert(events, 'AssetHistoryUUID', { AssetHistoryUUID: randomUUID(), AssetUUID: current.AssetUUID, ActorUUID: actorUUID,
        Action: action, OldStatus: current.Status, NewStatus: next.Status,
        OldEmployeeUUID: current.CurrentEmployeeUUID, NewEmployeeUUID: next.CurrentEmployeeUUID, Reason: reason, CreatedAt: now });
      const internal = { [INTERNAL]: true };
      const applied = [];
      try {
        for (const op of operations) {
          // Track before attempting the write so rollback covers a partially failed insert.
          applied.push(op);
          if (op.old) await op.entity.updateEntry({ [op.key]: op.row[op.key] }, op.row, op.row, internal);
          else await op.entity.addEntry(op.row, internal);
        }
        await this.base.updateEntry(keys, next, request);
      } catch (error) {
        await this.base.updateEntry(keys, current, request);
        for (const op of applied.reverse()) {
          if (op.old) await op.entity.updateEntry({ [op.key]: op.row[op.key] }, op.old, op.old, internal);
          else await op.entity.removeEntry({ [op.key]: op.row[op.key] }, internal);
        }
        throw error;
      }
      return next;
    });
  }
};
