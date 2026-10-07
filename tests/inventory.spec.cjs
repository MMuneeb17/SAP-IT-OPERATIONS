const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const id=(g,n)=>`${String(g).padStart(8,'0')}-0000-4000-8000-${String(n).padStart(12,'0')}`;
function client(request){
 const tenant='inventory-'+randomUUID();
 const url=path=>'/odata/v4/it-operations/'+path+(path.includes('?')?'&':'?')+'sap-client='+tenant;
 return {get:path=>request.get(url(path)),post:(path,data)=>request.post(url(path),{data}),patch:(path,data)=>request.patch(url(path),{data}),delete:path=>request.delete(url(path))};
}
async function json(response,status=200){expect(response.status(),await response.text()).toBe(status);return response.json();}
const action=(api,set,key,name,data={})=>api.post(`${set}(${key})/ITOperations.${name}`,{Reason:'Inventory acceptance',...data}).then(json);
const read=(api,set,key)=>api.get(key?`${set}(${key})`:set).then(json);
async function reconcile(api){
 const {loadContract,validateInventory}=await import('../scripts/validate-contract.mjs');
 const contract=loadContract();
 for(const name of Object.keys(contract.sets))contract.sets[name].rows=(await read(api,name)).value;
 validateInventory(contract);
}
test('stock receive, transfer, reserve, partial issue, return and adjustment reconcile to ledger',async({request})=>{
 const api=client(request), key=id(10,1);
 await action(api,'Stocks',key,'ReceiveStock',{Quantity:'2'});
 await action(api,'Stocks',key,'TransferStock',{Quantity:'3',TargetStockUUID:id(10,2)});
 await action(api,'Stocks',key,'ReserveStock',{Quantity:'4'});
 const reservation=(await read(api,'Reservations')).value.find(r=>r.StockUUID===key);
 await action(api,'Reservations',reservation.ReservationUUID,'IssueReservation',{Quantity:'1'});
 expect((await read(api,'Reservations',reservation.ReservationUUID)).Status).toBe('PARTIAL');
 await action(api,'Reservations',reservation.ReservationUUID,'IssueReservation',{Quantity:'3'});
 expect((await read(api,'Reservations',reservation.ReservationUUID)).Status).toBe('FULFILLED');
 const issue=(await read(api,'StockTransactions')).value.find(t=>t.ReservationUUID===reservation.ReservationUUID&&t.MovementType==='ISSUE');
 await action(api,'Stocks',key,'ReturnStock',{Quantity:'1',IssueTransactionUUID:issue.StockTransactionUUID});
 expect((await api.post(`Stocks(${key})/ITOperations.ReturnStock`,{Quantity:'1',IssueTransactionUUID:issue.StockTransactionUUID,Reason:'Duplicate return'})).status()).toBe(409);
 await action(api,'Stocks',key,'AdjustStock',{Quantity:'-1'});
 const stock=await read(api,'Stocks',key);
 expect(Number(stock.PhysicalQuantity)).toBe(5);expect(Number(stock.ReservedQuantity)).toBe(0);
 await reconcile(api);
});
test('decimal quantities stay exact and cancellation releases only the unissued balance',async({request})=>{
 const api=client(request),key=id(10,4);
 await action(api,'Stocks',key,'ReceiveStock',{Quantity:'0.125'});
 await action(api,'Reservations',id(11,2),'IssueReservation',{Quantity:'0.125'});
 await action(api,'Reservations',id(11,2),'CancelReservation');
 const reservation=await read(api,'Reservations',id(11,2));
 expect(reservation.Status).toBe('CANCELLED');expect(Number(reservation.IssuedQuantity)).toBe(.125);expect(Number(reservation.OutstandingQuantity)).toBe(0);
 expect(Number((await read(api,'Stocks',key)).PhysicalQuantity)).toBe(20);
 await reconcile(api);
});
test('inventory rejects overselling, bad precision, wrong units and conflicting references without mutation',async({request})=>{
 const api=client(request),key=id(10,1),before=await read(api,'Stocks',key);
 for(const [name,data,status] of [
  ['ReserveStock',{Quantity:'11'},409],['ReceiveStock',{Quantity:'0'},400],['ReceiveStock',{Quantity:'-1'},400],
  ['ReceiveStock',{Quantity:'0.1'},400],['ReceiveStock',{Quantity:'1.0001'},400],['ReceiveStock',{Quantity:true},400],
  ['ReceiveStock',{Quantity:'999999999999'},400],['AdjustStock',{Quantity:'-11'},409],
  ['TransferStock',{Quantity:'1',TargetStockUUID:id(10,3)},400],['TransferStock',{Quantity:'1',TargetStockUUID:key},400],
  ['ReserveStock',{Quantity:'1',TicketUUID:id(3,1),AssetUUID:id(2,2)},400],
  ['ReserveStock',{Quantity:'1',TicketUUID:id(3,1),AssetUUID:id(2,1),AssetRepairUUID:id(7,2)},409]
 ])expect((await api.post(`Stocks(${key})/ITOperations.${name}`,{Reason:'Invalid input',...data})).status()).toBe(status);
 expect(await read(api,'Stocks',key)).toEqual(before);await reconcile(api);
});
test('concurrent reservations cannot oversubscribe stock and low stock is derived',async({request})=>{
 const api=client(request),key=id(10,2);
 const responses=await Promise.all([1,2].map(()=>api.post(`Stocks(${key})/ITOperations.ReserveStock`,{Quantity:'2',Reason:'Concurrent request'})));
 expect(responses.map(r=>r.status()).sort()).toEqual([200,409]);
 const stock=await read(api,'Stocks',key);expect(Number(stock.AvailableQuantity)).toBe(1);expect(stock.LowStock).toBe(true);
 expect((await api.post(`Stocks(${key})/ITOperations.AdjustStock`,{Quantity:'-2',Reason:'Reserved stock'})).status()).toBe(409);
 await reconcile(api);
});
test('all inventory sets reject direct mutations',async({request})=>{
 const api=client(request);
 for(const [set,key] of [['Materials','MaterialUUID'],['Stocks','StockUUID'],['Reservations','ReservationUUID'],['StockTransactions','StockTransactionUUID']]){
  const row=(await read(api,set)).value[0];
  expect((await api.post(set,row)).status()).toBe(405);
  expect((await api.patch(`${set}(${row[key]})`,row)).status()).toBe(405);
  expect((await api.delete(`${set}(${row[key]})`)).status()).toBe(405);
 }
});
test('ticket-linked SSD request, issue, repair and closure preserve all cross-module references',async({request})=>{
 const api=client(request);
 const ticket=await json(await api.post('Tickets',{Subject:'SSD replacement workflow',Description:'Disk diagnostic failed',Category:'Hardware',RequesterUUID:id(1,2),AssetUUID:id(2,2)}),201);
 const tk=ticket.TicketUUID;
 await action(api,'Tickets',tk,'Submit');await action(api,'Tickets',tk,'AssignTechnician',{TechnicianUUID:id(1,4)});await action(api,'Tickets',tk,'StartWork');
 expect((await api.post(`Tickets(${tk})/ITOperations.RequestPart`,{StockUUID:id(10,1),Quantity:'1',Reason:'SSD'})).status()).toBe(409);
 await action(api,'Assets',id(2,2),'SendForRepair',{TechnicianUUID:id(1,4),TicketUUID:tk,Diagnosis:'SSD diagnostics failed'});
 await action(api,'Tickets',tk,'RequestPart',{StockUUID:id(10,1),Quantity:'1'});
 const reservation=(await read(api,'Reservations')).value.find(r=>r.TicketUUID===tk);
 expect(reservation.AssetUUID).toBe(id(2,2));expect(reservation.AssetRepairUUID).toBeTruthy();
 expect((await api.post(`Assets(${id(2,2)})/ITOperations.CompleteRepair`,{RepairDescription:'Too soon'})).status()).toBe(409);
 expect((await api.post(`Tickets(${tk})/ITOperations.Resolve`,{Resolution:'Too soon'})).status()).toBe(409);
 await action(api,'Reservations',reservation.ReservationUUID,'IssueReservation',{Quantity:'1'});
 const issue=(await read(api,'StockTransactions')).value.find(t=>t.TicketUUID===tk&&t.MovementType==='ISSUE');
 expect(issue).toMatchObject({AssetUUID:id(2,2),AssetRepairUUID:reservation.AssetRepairUUID,ReservationUUID:reservation.ReservationUUID});
 await action(api,'Assets',id(2,2),'CompleteRepair',{RepairDescription:'Replaced SSD and verified boot'});
 await action(api,'Tickets',tk,'Resolve',{Resolution:'Boot verified with employee'});await action(api,'Tickets',tk,'Close');
 expect((await read(api,'Tickets',tk)).Status).toBe('CLOSED');
 const events=(await api.get(`Tickets(${tk})/History`).then(json)).value;
 expect(events.map(e=>e.Action)).toEqual(['Create','Submit','AssignTechnician','StartWork','PartRequested','PartIssued','Resolve','Close']);
 await reconcile(api);
});
test('fixture validation rejects ledger drift and mismatched repair references',async()=>{
 const {loadContract,validateInventory}=await import('../scripts/validate-contract.mjs');
 for(const [mutate,message] of [
  [c=>c.sets.Stocks.rows[0].AvailableQuantity='11.000',/Available stock/],
  [c=>c.sets.StockTransactions.rows[0].PhysicalDelta='11.000',/movement ledger/],
  [c=>c.sets.Reservations.rows[0].AssetUUID=id(2,1),/asset mismatch/]
 ]){const c=loadContract();mutate(c);expect(()=>validateInventory(c)).toThrow(message);}
});
test('a failed paired transfer journal write restores both stock locations and movements',async()=>{
 const {loadContract}=await import('../scripts/validate-contract.mjs');
 const {execute}=require('../mock/data/_inventory');
 const data=Object.fromEntries(Object.entries(loadContract().sets).map(([name,set])=>[name,structuredClone(set.rows)]));
 const before=structuredClone(data);let writes=0;
 const match=(row,keys)=>Object.entries(keys).every(([k,v])=>row[k]===v);
 const entity=name=>({fetchEntries:async keys=>data[name].filter(r=>match(r,keys)),
  addEntry:async row=>{data[name].push(structuredClone(row));if(name==='StockTransactions'&&++writes===2)throw Error('Storage failure after insert');},
  updateEntry:async(keys,row)=>Object.assign(data[name].find(r=>match(r,keys)),structuredClone(row)),
  removeEntry:async keys=>{data[name]=data[name].filter(r=>!match(r,keys));}});
 const ctx={base:{getEntityInterface:async name=>entity(name)},throwError(message){throw Error(message);}};
 await expect(execute(ctx,'Stocks','TransferStock',{TargetStockUUID:id(10,2),Quantity:'1',Reason:'Fault injection'},{StockUUID:id(10,1)},{})).rejects.toThrow('Storage failure');
 expect(data).toEqual(before);
});
