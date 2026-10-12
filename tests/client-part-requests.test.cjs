const test=require('node:test');
const assert=require('node:assert/strict');
const d=require('./.compiled/domain.cjs');

const input=(overrides={})=>({name:'Écran compatible',quantity:1,note:'Fournir la bonne référence',...overrides});
function fixture() {
  const store=d.emptyStore(),client=d.createClient(store,{name:'Client pièces',email:'parts@example.invalid',phone:'',address:'',notes:''});
  const [repair,otherRepair]=d.createClientRepairs(store,client.id,[
    {brand:'Nintendo',model:'Game Boy',serial:'CLIENT-PART-A',accessories:'',title:'Écran',symptoms:'Affichage absent',priority:'normale',dueDate:''},
    {brand:'Nintendo',model:'DS Lite',serial:'CLIENT-PART-B',accessories:'',title:'Charnière',symptoms:'Charnière cassée',priority:'normale',dueDate:''},
  ]);
  return {store,client,repair,otherRepair};
}
function operationalSnapshot(store,repair) {
  return structuredClone({inventory:store.parts,usedParts:repair.parts,worklogs:repair.worklogs,tests:repair.tests,timer:repair.timerStartedAt,stage:repair.stage,completedAt:repair.completedAt,consoles:store.consoles,payment:repair.payment,interventionCost:repair.interventionCost,total:d.repairTotalCost(store,repair),parts:d.partsCost(repair),paidRevenue:d.paidRepairRevenue(store),completedRevenue:d.completedRepairRevenue(store)});
}

test('New customer dossiers start without requested parts and additions capture normalized input and customer journal references',()=>{
  const {store,client,repair}=fixture();assert.deepEqual(repair.clientParts,[]);
  repair.updatedAt='2000-01-01T00:00:00.000Z';
  const item=d.addClientPartRequest(store,repair.id,input({name:'  Écran compatible  ',quantity:2,note:'  Fournir la bonne référence  '}));
  assert.deepEqual(Object.keys(item).sort(),['createdAt','id','name','note','quantity','status','updatedAt']);
  assert.equal(item.name,'Écran compatible');assert.equal(item.note,'Fournir la bonne référence');assert.equal(item.quantity,2);assert.equal(item.status,'en-attente');
  assert.equal(new Date(item.createdAt).toISOString(),item.createdAt);assert.equal(item.updatedAt,item.createdAt);assert.notEqual(repair.updatedAt,'2000-01-01T00:00:00.000Z');
  assert.equal(repair.clientParts[0],item);assert.equal(store.events[0].kind,'part');assert.equal(store.events[0].repairId,repair.id);assert.equal(store.events[0].consoleId,repair.consoleId);assert.equal(store.events[0].clientId,client.id);
  assert.match(store.events[0].text,/Pièce demandée au client/);d.validateStore(store);
});

test('Requested client parts can be edited and corrected directly through all four availability and delivery statuses',()=>{
  const {store,repair}=fixture(),item=d.addClientPartRequest(store,repair.id,input());
  const createdAt=item.createdAt;item.updatedAt='2000-01-01T00:00:00.000Z';
  const edited=d.updateClientPartRequest(store,repair.id,item.id,input({name:'Lot de boutons',quantity:3,note:undefined}));
  assert.equal(edited,item);assert.equal(item.name,'Lot de boutons');assert.equal(item.quantity,3);assert.equal(item.note,'');assert.equal(item.createdAt,createdAt);assert.notEqual(item.updatedAt,'2000-01-01T00:00:00.000Z');
  assert.deepEqual(d.CLIENT_PART_STATUSES,{'en-attente':'En attente de la pièce',disponible:'Disponible',livree:'Livrée',installee:'Installée'});
  for(const status of ['installee','en-attente','disponible','livree','installee']) {
    const stage=repair.stage;d.setClientPartRequestStatus(store,repair.id,item.id,status);assert.equal(item.status,status);assert.equal(repair.stage,stage);assert.equal(item.createdAt,createdAt);
  }
  const before=JSON.stringify(store);assert.equal(d.updateClientPartRequest(store,repair.id,item.id,input({name:'  Lot de boutons  ',quantity:3,note:''})),item);d.setClientPartRequestStatus(store,repair.id,item.id,'installee');
  assert.equal(JSON.stringify(store),before);d.removeClientPartRequest(store,repair.id,item.id);assert.deepEqual(repair.clientParts,[]);assert.match(store.events[0].text,/supprimée/);d.validateStore(store);
});

test('Client-supplied pieces never change stock, billed parts, work time, test outcomes or recorded receipts',()=>{
  const {store,repair}=fixture();
  const part={id:d.uid(),reference:'STOCK-PIECE',name:'Pièce achetée',category:'',compatibility:'',quantity:3,threshold:0,unitCost:12.5,location:'',supplier:''};
  store.parts.push(part);d.usePart(store,repair.id,part.id,1);d.setRepairInterventionCost(store,repair.id,42.5);d.setRepairPayment(store,repair.id,true);
  repair.tests.forEach((item,index)=>item.result=index?'pass':'fail');repair.worklogs.push({id:d.uid(),minutes:30,note:'Intervention conservée',createdAt:d.now()});repair.timerStartedAt=d.now();
  const before=operationalSnapshot(store,repair);
  const item=d.addClientPartRequest(store,repair.id,input({quantity:1000}));assert.deepEqual(operationalSnapshot(store,repair),before);
  d.updateClientPartRequest(store,repair.id,item.id,input({name:'Pièce plus adaptée',quantity:4}));assert.deepEqual(operationalSnapshot(store,repair),before);
  d.setClientPartRequestStatus(store,repair.id,item.id,'installee');assert.deepEqual(operationalSnapshot(store,repair),before);
  d.removeClientPartRequest(store,repair.id,item.id);assert.deepEqual(operationalSnapshot(store,repair),before);d.validateStore(store);
});

test('Direct repair completion marks tests OK without claiming requested client parts were delivered or installed',()=>{
  const {store,repair}=fixture();
  const pending=d.addClientPartRequest(store,repair.id,input()),delivered=d.addClientPartRequest(store,repair.id,input({name:'Coque',quantity:1})),installed=d.addClientPartRequest(store,repair.id,input({name:'Boutons',quantity:2}));
  d.setClientPartRequestStatus(store,repair.id,delivered.id,'livree');d.setClientPartRequestStatus(store,repair.id,installed.id,'installee');
  const requests=structuredClone(repair.clientParts);repair.tests[0].result='fail';d.moveRepair(store,repair.id,'terminee');
  assert.ok(repair.tests.every(item=>item.result==='pass'));assert.deepEqual(repair.clientParts,requests);assert.equal(pending.status,'en-attente');d.validateStore(store);
});

test('Closed customer dossiers allow status and deletion corrections but reject new requests and description edits',()=>{
  for(const stage of ['terminee','irreparable','abandonnee']) {
    const {store,repair}=fixture(),item=d.addClientPartRequest(store,repair.id,input());d.moveRepair(store,repair.id,stage);
    const before=JSON.stringify(store);assert.throws(()=>d.addClientPartRequest(store,repair.id,input()),/Rouvrez le dossier/);assert.equal(JSON.stringify(store),before);
    assert.throws(()=>d.updateClientPartRequest(store,repair.id,item.id,input({quantity:2})),/Rouvrez le dossier/);assert.equal(JSON.stringify(store),before);
    const fixed=operationalSnapshot(store,repair);d.setClientPartRequestStatus(store,repair.id,item.id,'installee');assert.equal(item.status,'installee');assert.deepEqual(operationalSnapshot(store,repair),fixed);
    d.removeClientPartRequest(store,repair.id,item.id);assert.deepEqual(repair.clientParts,[]);assert.deepEqual(operationalSnapshot(store,repair),fixed);d.validateStore(store);
  }
});

test('Every client-parts operation refuses personal inventory, unknown customers and missing dossiers without mutations',()=>{
  for(const owner of ['',undefined,'missing-client']) {
    const {store,repair}=fixture(),item=d.addClientPartRequest(store,repair.id,input());store.consoles.find(console=>console.id===repair.consoleId).clientId=owner;
    for(const operation of [()=>d.addClientPartRequest(store,repair.id,input()),()=>d.updateClientPartRequest(store,repair.id,item.id,input()),()=>d.setClientPartRequestStatus(store,repair.id,item.id,'livree'),()=>d.removeClientPartRequest(store,repair.id,item.id)]) {
      const before=JSON.stringify(store);assert.throws(operation,/réservées aux consoles rattachées à un client/);assert.equal(JSON.stringify(store),before);
    }
  }
  const {store}=fixture();for(const operation of [()=>d.addClientPartRequest(store,'missing',input()),()=>d.updateClientPartRequest(store,'missing','unknown',input()),()=>d.setClientPartRequestStatus(store,'missing','unknown','livree'),()=>d.removeClientPartRequest(store,'missing','unknown')]) {
    const before=JSON.stringify(store);assert.throws(operation,/Dossier introuvable/);assert.equal(JSON.stringify(store),before);
  }
});

test('Client part IDs are scoped to their dossier for edits, status changes and deletion',()=>{
  const {store,repair,otherRepair}=fixture(),foreign=d.addClientPartRequest(store,otherRepair.id,input());
  for(const id of [foreign.id,'missing'])for(const operation of [()=>d.updateClientPartRequest(store,repair.id,id,input()),()=>d.setClientPartRequestStatus(store,repair.id,id,'livree'),()=>d.removeClientPartRequest(store,repair.id,id)]) {
    const before=JSON.stringify(store);assert.throws(operation,/Pièce client introuvable dans ce dossier/);assert.equal(JSON.stringify(store),before);
  }
  assert.equal(otherRepair.clientParts[0],foreign);assert.equal(foreign.status,'en-attente');
});

test('Malformed inputs, unsupported statuses and invalid existing data roll client part changes back atomically',()=>{
  for(const overrides of [{name:''},{name:' '},{name:'x'.repeat(201)},{name:null},{quantity:0},{quantity:-1},{quantity:1.5},{quantity:1001},{quantity:NaN},{quantity:Infinity},{quantity:'1'},{note:null},{note:'x'.repeat(1001)}]) {
    const {store,repair}=fixture(),item=d.addClientPartRequest(store,repair.id,input());
    for(const operation of [()=>d.addClientPartRequest(store,repair.id,input(overrides)),()=>d.updateClientPartRequest(store,repair.id,item.id,input(overrides))]) {
      const before=JSON.stringify(store);assert.throws(operation);assert.equal(JSON.stringify(store),before);
    }
  }
  for(const status of ['arrivee','constructor','__proto__',null,undefined,{},['livree'],0]) {
    const {store,repair}=fixture(),item=d.addClientPartRequest(store,repair.id,input()),before=JSON.stringify(store);
    assert.throws(()=>d.setClientPartRequestStatus(store,repair.id,item.id,status),/Statut de pièce client inconnu/);assert.equal(JSON.stringify(store),before);
  }
  const {store,repair}=fixture(),item=d.addClientPartRequest(store,repair.id,input());store.events.push({id:d.uid(),kind:'note',text:'Référence incorrecte',createdAt:d.now(),repairId:'missing'});
  for(const operation of [()=>d.addClientPartRequest(store,repair.id,input()),()=>d.updateClientPartRequest(store,repair.id,item.id,input({quantity:2})),()=>d.setClientPartRequestStatus(store,repair.id,item.id,'livree'),()=>d.removeClientPartRequest(store,repair.id,item.id)]) {
    const before=JSON.stringify(store);assert.throws(operation,/journal introuvable/);assert.equal(JSON.stringify(store),before);
  }
});

test('Legacy backups preserve missing client-parts lists and new requests survive JSON exports without retaining unknown fields',()=>{
  const {store,repair,otherRepair}=fixture();delete repair.clientParts;delete otherRepair.clientParts;
  const before=JSON.stringify(store),legacy=d.validateStore(JSON.parse(before));assert.equal('clientParts' in legacy.repairs[0],false);assert.equal('clientParts' in legacy.repairs[1],false);assert.equal(JSON.stringify(store),before);
  const item=d.addClientPartRequest(store,repair.id,input({note:undefined}));assert.equal(item.note,'');d.setClientPartRequestStatus(store,repair.id,item.id,'livree');item.extra='private unknown field';
  const restored=d.validateStore(JSON.parse(JSON.stringify(store))),saved=restored.repairs.find(entry=>entry.id===repair.id).clientParts[0];
  assert.deepEqual(saved,{id:item.id,name:item.name,quantity:item.quantity,note:item.note,status:'livree',createdAt:item.createdAt,updatedAt:item.updatedAt});assert.equal(saved.extra,undefined);
  assert.equal('clientParts' in restored.repairs.find(entry=>entry.id===otherRepair.id),false);assert.equal(restored.schemaVersion,1);
});

test('Client part imports reject malformed arrays, fields, IDs, delivery statuses and noncanonical dates without mutating their source',()=>{
  const {store,repair}=fixture(),item=d.addClientPartRequest(store,repair.id,input());
  for(const list of [null,{},'invalid',Array.from({length:101},(_,index)=>({...item,id:`many-${index}`}))]) {
    const raw=structuredClone(store);raw.repairs.find(entry=>entry.id===repair.id).clientParts=list;const before=JSON.stringify(raw);assert.throws(()=>d.validateStore(raw));assert.equal(JSON.stringify(raw),before);
  }
  for(const changes of [{id:'bad id'},{name:' '},{name:'x'.repeat(201)},{quantity:0},{quantity:1001},{quantity:1.2},{quantity:'2'},{note:null},{note:'x'.repeat(1001)},{status:'arrivee'},{createdAt:'2026-02-31T12:00:00.000Z'},{updatedAt:'2026-10-11T12:00:00.000'},{createdAt:'2026-10-11T12:00:00.000+02:00'}]) {
    const raw=structuredClone(store);Object.assign(raw.repairs.find(entry=>entry.id===repair.id).clientParts[0],changes);const before=JSON.stringify(raw);assert.throws(()=>d.validateStore(raw));assert.equal(JSON.stringify(raw),before);
  }
});

test('Client part IDs remain unique across all repair dossiers, including repeated entries in one dossier',()=>{
  const {store,repair,otherRepair}=fixture(),item=d.addClientPartRequest(store,repair.id,input());
  for(const duplicateInOther of [false,true]) {
    const raw=structuredClone(store),target=raw.repairs.find(entry=>entry.id===(duplicateInOther?otherRepair.id:repair.id));target.clientParts.push(structuredClone(item));
    const before=JSON.stringify(raw);assert.throws(()=>d.validateStore(raw),/identifiants de pièces client dupliqués/);assert.equal(JSON.stringify(raw),before);
  }
});

test('Client request limits permit exactly 100 entries and the documented maximum name, note and quantity',()=>{
  const {store,repair}=fixture(),item=d.addClientPartRequest(store,repair.id,input({name:'x'.repeat(200),note:'n'.repeat(1000),quantity:1000}));
  repair.clientParts=Array.from({length:100},(_,index)=>({...structuredClone(item),id:`capacity-${index}`}));d.validateStore(store);
  const before=JSON.stringify(store);assert.throws(()=>d.addClientPartRequest(store,repair.id,input()),/maximum 100/);assert.equal(JSON.stringify(store),before);
  d.removeClientPartRequest(store,repair.id,'capacity-0');d.addClientPartRequest(store,repair.id,input());assert.equal(repair.clientParts.length,100);d.validateStore(store);
});

test('Detached consoles and removed customers retain historical client requests in valid backups',()=>{
  const {store,repair,client}=fixture(),item=d.addClientPartRequest(store,repair.id,input());d.setClientPartRequestStatus(store,repair.id,item.id,'livree');
  const requests=structuredClone(repair.clientParts);store.consoles.find(console=>console.id===repair.consoleId).clientId='';
  store.events=store.events.map(event=>{
    if(event.consoleId===repair.consoleId||event.repairId===repair.id) {const {clientId,...rest}=event;return rest;}
    return event;
  });
  const detached=d.validateStore(JSON.parse(JSON.stringify(store)));assert.deepEqual(detached.repairs.find(entry=>entry.id===repair.id).clientParts,requests);
  for(const operation of [()=>d.addClientPartRequest(store,repair.id,input()),()=>d.updateClientPartRequest(store,repair.id,item.id,input()),()=>d.setClientPartRequestStatus(store,repair.id,item.id,'installee'),()=>d.removeClientPartRequest(store,repair.id,item.id)]) {
    const before=JSON.stringify(store);assert.throws(operation,/réservées aux consoles rattachées à un client/);assert.equal(JSON.stringify(store),before);
  }
  const withoutCustomer=structuredClone(store);withoutCustomer.consoles.forEach(console=>{if(console.clientId===client.id)console.clientId='';});withoutCustomer.clients=withoutCustomer.clients.filter(entry=>entry.id!==client.id);
  withoutCustomer.events=withoutCustomer.events.flatMap(event=>{
    if(event.clientId!==client.id)return [event];
    if(!event.consoleId&&!event.repairId)return [];
    const {clientId,...rest}=event;return [rest];
  });
  const restored=d.validateStore(JSON.parse(JSON.stringify(withoutCustomer)));assert.deepEqual(restored.repairs.find(entry=>entry.id===repair.id).clientParts,requests);
});

test('A client can signal a waiting piece available once, preserving all operational fields and its journal attribution',()=>{
  const {store,client,repair,otherRepair}=fixture(),item=d.addClientPartRequest(store,repair.id,input({quantity:3}));
  const unrelated=d.addClientPartRequest(store,otherRepair.id,input({name:'Pièce autre dossier'}));
  const stock={id:d.uid(),reference:'AVAILABLE-TEST',name:'Pièce du stock',category:'',compatibility:'',quantity:3,threshold:0,unitCost:9.5,location:'',supplier:''};
  store.parts.push(stock);d.usePart(store,repair.id,stock.id,1);d.setRepairInterventionCost(store,repair.id,38);d.setRepairPayment(store,repair.id,true);
  repair.worklogs.push({id:d.uid(),minutes:45,note:'Travail déjà facturé',createdAt:d.now()});repair.timerStartedAt=d.now();
  repair.tests.forEach((entry,index)=>entry.result=index?'pass':'fail');
  const createdAt=item.createdAt;item.updatedAt='2000-01-01T00:00:00.000Z';repair.updatedAt='2000-01-01T00:00:00.000Z';
  const before=operationalSnapshot(store,repair),otherBefore=structuredClone(otherRepair),eventsBefore=store.events.length;
  assert.equal(d.markClientPartAvailable(store,client.id,repair.id,item.id),true);
  assert.equal(item.status,'disponible');assert.equal(item.createdAt,createdAt);assert.notEqual(item.updatedAt,'2000-01-01T00:00:00.000Z');assert.notEqual(repair.updatedAt,'2000-01-01T00:00:00.000Z');
  assert.equal(new Date(item.updatedAt).toISOString(),item.updatedAt);assert.deepEqual(operationalSnapshot(store,repair),before);assert.deepEqual(otherRepair,otherBefore);assert.equal(unrelated.status,'en-attente');
  assert.equal(store.events.length,eventsBefore+1);assert.equal(store.events[0].kind,'part');assert.equal(store.events[0].clientId,client.id);assert.equal(store.events[0].repairId,repair.id);assert.equal(store.events[0].consoleId,repair.consoleId);
  assert.match(store.events[0].text,/Le client Client pièces a signalé la pièce « Écran compatible » disponible \(3 unité\(s\)\)/);
  const saved=JSON.stringify(store);assert.equal(d.markClientPartAvailable(store,client.id,repair.id,item.id),false);assert.equal(JSON.stringify(store),saved);
  item.extra='unknown private field';const restored=d.validateStore(JSON.parse(JSON.stringify(store))),restoredItem=restored.repairs.find(entry=>entry.id===repair.id).clientParts[0];
  assert.equal(restoredItem.status,'disponible');assert.equal(restoredItem.updatedAt,item.updatedAt);assert.equal('extra' in restoredItem,false);assert.equal(restored.schemaVersion,1);
});

test('Client availability rejects unknown or other clients, consoles, dossiers and mismatched part IDs with one indistinguishable error',()=>{
  const {store,client,repair,otherRepair}=fixture(),item=d.addClientPartRequest(store,repair.id,input()),foreignPiece=d.addClientPartRequest(store,otherRepair.id,input());
  const otherClient=d.createClient(store,{name:'Autre client',email:'another-parts@example.invalid',phone:'',address:'',notes:''});
  store.consoles.find(entry=>entry.id===otherRepair.consoleId).clientId=otherClient.id;
  const attempts=[
    [otherClient.id,repair.id,item.id],[client.id,otherRepair.id,foreignPiece.id],
    ['missing-client',repair.id,item.id],['',repair.id,item.id],[client.id,'missing-repair',item.id],
    [client.id,repair.id,'missing-piece'],[client.id,repair.id,foreignPiece.id],
  ];
  for(const args of attempts){const before=JSON.stringify(store);assert.throws(()=>d.markClientPartAvailable(store,...args),{message:'Pièce client introuvable dans ce dossier.'});assert.equal(JSON.stringify(store),before);}
  for(const owner of ['',undefined,'missing-client']) {
    const candidate=structuredClone(store);candidate.consoles.find(entry=>entry.id===repair.consoleId).clientId=owner;
    const before=JSON.stringify(candidate);assert.throws(()=>d.markClientPartAvailable(candidate,owner||client.id,repair.id,item.id),{message:'Pièce client introuvable dans ce dossier.'});assert.equal(JSON.stringify(candidate),before);
  }
  const missingConsole=structuredClone(store);missingConsole.consoles=missingConsole.consoles.filter(entry=>entry.id!==repair.consoleId);
  const before=JSON.stringify(missingConsole);assert.throws(()=>d.markClientPartAvailable(missingConsole,client.id,repair.id,item.id),{message:'Pièce client introuvable dans ce dossier.'});assert.equal(JSON.stringify(missingConsole),before);
});

test('Client availability cannot reverse reception or installation, and valid closed dossiers remain eligible',()=>{
  for(const status of ['livree','installee']) {
    const {store,client,repair}=fixture(),item=d.addClientPartRequest(store,repair.id,input());d.setClientPartRequestStatus(store,repair.id,item.id,status);
    const before=JSON.stringify(store);assert.throws(()=>d.markClientPartAvailable(store,client.id,repair.id,item.id),{message:'Cette pièce a déjà été livrée ou installée.'});assert.equal(JSON.stringify(store),before);
  }
  for(const stage of ['terminee','irreparable','abandonnee']) {
    const {store,client,repair}=fixture(),item=d.addClientPartRequest(store,repair.id,input());d.moveRepair(store,repair.id,stage);
    const before=operationalSnapshot(store,repair);assert.equal(d.markClientPartAvailable(store,client.id,repair.id,item.id),true);
    assert.equal(item.status,'disponible');assert.deepEqual(operationalSnapshot(store,repair),before);d.validateStore(store);
    const saved=JSON.stringify(store);assert.equal(d.markClientPartAvailable(store,client.id,repair.id,item.id),false);assert.equal(JSON.stringify(store),saved);
  }
});

test('Client availability rolls invalid existing data back before creating a status change or journal entry',()=>{
  for(const status of ['en-attente','disponible']) {
    const {store,client,repair}=fixture(),item=d.addClientPartRequest(store,repair.id,input());if(status==='disponible')d.markClientPartAvailable(store,client.id,repair.id,item.id);
    store.events.push({id:d.uid(),kind:'note',text:'Référence erronée',createdAt:d.now(),repairId:'missing'});
    const before=JSON.stringify(store);assert.throws(()=>d.markClientPartAvailable(store,client.id,repair.id,item.id),/journal introuvable/);assert.equal(JSON.stringify(store),before);
  }
});
