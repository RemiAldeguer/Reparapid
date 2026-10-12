const test=require('node:test');const assert=require('node:assert/strict');
const d=require('./.compiled/domain.cjs'),{demoStore}=require('./.compiled/seed.cjs');
const seed=()=>demoStore();const job=s=>s.repairs[0];
test('Demo and empty stores validate',()=>{assert.equal(d.validateStore(seed()).consoles.length,12);assert.equal(d.validateStore(d.emptyStore()).consoles.length,0)});
test('Creating a repair creates tests and synchronizes console state',()=>{const s=seed();const r=d.createRepair(s,{consoleId:'console-10',title:'Test réparation',symptoms:'Test',priority:'normale',dueDate:''});assert.equal(r.stage,'reception');assert.equal(r.tests.length,5);assert.equal(s.consoles[9].state,'en-reparation');d.validateStore(s)});
test('Only one open repair per console',()=>{const s=seed();const before=JSON.stringify(s);assert.throws(()=>d.createRepair(s,{consoleId:'console-1',title:'Duplicate',symptoms:'',priority:'normale',dueDate:''}),/déjà/);assert.equal(JSON.stringify(s),before)});
test('A console in the archives cannot enter the workshop',()=>{const s=seed();s.consoles[9].archived=true;assert.throws(()=>d.createRepair(s,{consoleId:'console-10',title:'Test',symptoms:'',priority:'normale',dueDate:''}),/non archivée/)});
test('Direct completion from every open stage marks all checks OK and records how they were set',()=>{
  for(const stage of ['reception','diagnostic','attente-pieces','reparation','tests']){
    const s=seed(),r=job(s);r.stage=stage;
    r.tests.forEach((t,i)=>t.result=['pending','fail','na','pass'][i%4]);
    r.tests.push({id:'custom-control',label:'Contrôle spécifique',result:'fail'});
    const labels=r.tests.map(t=>[t.id,t.label]);
    d.moveRepair(s,r.id,'terminee');
    assert.equal(r.stage,'terminee');assert.ok(r.tests.every(t=>t.result==='pass'));
    assert.deepEqual(r.tests.map(t=>[t.id,t.label]),labels);
    const event=s.events.find(e=>e.text==='Tests marqués OK lors de la clôture directe.');
    assert.equal(event.kind,'test');assert.equal(event.repairId,r.id);assert.equal(event.consoleId,r.consoleId);
    assert.equal(s.consoles[0].state,'fonctionnelle');assert.ok(r.completedAt);d.validateStore(s);
  }
});
test('Direct completion creates default checks when a dossier has no checks',()=>{
  const s=seed(),r=job(s);r.tests=[];d.moveRepair(s,r.id,'terminee');
  assert.equal(r.tests.length,5);assert.ok(r.tests.every(t=>t.result==='pass'));d.validateStore(s);
});
test('Repeating completion preserves the closure date and does not duplicate the journal',()=>{
  const s=seed(),r=job(s);d.moveRepair(s,r.id,'terminee');const before=JSON.stringify(s);
  d.moveRepair(s,r.id,'terminee');assert.equal(JSON.stringify(s),before);
});
test('Closing a historical dossier leaves another open repair and its console in repair',()=>{
  const s=seed(),r=job(s);d.moveRepair(s,r.id,'abandonnee');
  const current=d.createRepair(s,{consoleId:r.consoleId,title:'Nouvelle intervention',symptoms:'',priority:'normale',dueDate:''});
  d.moveRepair(s,r.id,'terminee');assert.equal(s.consoles[0].state,'en-reparation');
  assert.equal(current.stage,'reception');assert.ok(current.tests.every(t=>t.result==='pending'));d.validateStore(s);
});
test('Direct completion stops the timer and retains rounded intervention time',()=>{
  const s=seed(),r=job(s);r.timerStartedAt=new Date(Date.now()-61000).toISOString();
  d.moveRepair(s,r.id,'terminee');assert.equal(r.timerStartedAt,'');assert.equal(r.worklogs.at(-1).minutes,2);d.validateStore(s);
});
test('Parts consume stock and capture the current unit cost',()=>{const s=seed(),p=s.parts[1],r=job(s),qty=p.quantity,price=p.unitCost;d.usePart(s,r.id,p.id,2);assert.equal(p.quantity,qty-2);const u=r.parts.at(-1);assert.equal(u.unitCost,price);p.unitCost=99;assert.equal(u.unitCost,price);d.validateStore(s)});
test('Part consumption invalidates earlier test results',()=>{const s=seed(),r=job(s);r.tests.forEach(t=>t.result='pass');d.usePart(s,r.id,s.parts[1].id,1);assert.ok(r.tests.every(t=>t.result==='pending'))});
test('Insufficient stock is rejected without a partial decrement',()=>{const s=seed(),p=s.parts[1],before=JSON.stringify(s);assert.throws(()=>d.usePart(s,job(s).id,p.id,p.quantity+1),/insuffisant/);assert.equal(JSON.stringify(s),before)});
test('Negative and fractional consumption are rejected',()=>{for(const q of [-1,0,1.5,NaN,Infinity]){const s=seed();assert.throws(()=>d.usePart(s,job(s).id,s.parts[1].id,q),/entier/);}});
test('Returning a part credits stock and removes its repair cost',()=>{const s=seed(),r=job(s),p=s.parts[1],q=p.quantity,cost=d.partsCost(r);d.usePart(s,r.id,p.id,2);d.returnPart(s,r.id,r.parts.at(-1).id);assert.equal(p.quantity,q);assert.equal(d.partsCost(r),cost);d.validateStore(s)});
test('Closed repair parts cannot be edited',()=>{const s=seed(),r=s.repairs[8];assert.throws(()=>d.usePart(s,r.id,s.parts[0].id,1),/Rouvrez/);assert.throws(()=>d.returnPart(s,r.id,r.parts[0].id),/Rouvrez/)});
test('Irreparable and abandoned outcomes synchronize console state',()=>{for(const [stage,state] of [['irreparable','pour-pieces'],['abandonnee','en-panne']]){const s=seed();d.moveRepair(s,job(s).id,stage);assert.equal(s.consoles[0].state,state);d.validateStore(s);}});
test('Reopening in any active step invalidates prior tests',()=>{for(const stage of ['diagnostic','tests','reparation']){const s=seed(),r=s.repairs[6];d.moveRepair(s,r.id,stage);assert.ok(r.tests.every(t=>t.result==='pending'));assert.equal(r.completedAt,'');assert.equal(s.consoles[6].state,'en-reparation');d.validateStore(s);}});
test('Backtracking from tests to repair invalidates tests',()=>{const s=seed(),r=s.repairs[2];d.moveRepair(s,r.id,'reparation');assert.ok(r.tests.every(t=>t.result==='pending'))});
test('Closing stops a running timer and logs rounded-up minutes',()=>{const s=seed(),r=job(s);r.timerStartedAt=new Date(Date.now()-61000).toISOString();d.moveRepair(s,r.id,'abandonnee');assert.equal(r.timerStartedAt,'');assert.equal(r.worklogs.at(-1).minutes,2);d.validateStore(s)});
test('Stopping a very short session records one minute',()=>{const s=seed(),r=job(s);r.timerStartedAt=new Date().toISOString();d.stopTimer(s,r);assert.equal(r.worklogs.at(-1).minutes,1)});
test('Import rejects duplicate IDs',()=>{const s=seed();s.consoles.push(structuredClone(s.consoles[0]));assert.throws(()=>d.validateStore(s),/dupliqués/)});
test('Import rejects missing part references',()=>{const s=seed();s.parts=s.parts.filter(p=>p.id!=='part-1');assert.throws(()=>d.validateStore(s),/référence de pièce/)});
test('Import rejects invalid dates, negative quantities and invalid enums',()=>{const s=seed();s.consoles[0].acquiredAt='2026-02-31';assert.throws(()=>d.validateStore(s),/date invalide/);const t=seed();t.parts[0].quantity=-1;assert.throws(()=>d.validateStore(t),/nombre/);const u=seed();u.repairs[0].stage='other';assert.throws(()=>d.validateStore(u),/valeur non autorisée/)});
test('Import rejects active repairs on archived consoles',()=>{const s=seed();s.consoles[0].archived=true;assert.throws(()=>d.validateStore(s),/incohérent/)});
test('Import rejects SVG and external image payloads',()=>{for(const data of ['data:image/svg+xml;base64,AAAA','https://example.com/photo.jpg']){const s=seed();s.consoles[0].photos=[{id:'photo',data,caption:'test',createdAt:d.now()}];assert.throws(()=>d.validateStore(s),/image invalide/);}});
test('Import rejects several running timers',()=>{const s=seed();s.repairs[0].timerStartedAt=d.now();s.repairs[1].timerStartedAt=d.now();assert.throws(()=>d.validateStore(s),/plusieurs chronomètres/)});
test('Import rejects an impossible completed dossier',()=>{const s=seed();s.repairs[6].tests[0].result='fail';assert.throws(()=>d.validateStore(s),/tests validés/)});
test('Import rejects missing names and duplicate stock references',()=>{const s=seed();s.settings.workshop=' ';assert.throws(()=>d.validateStore(s),/obligatoire/);const t=seed();t.parts[1].reference=t.parts[0].reference.toLowerCase();assert.throws(()=>d.validateStore(t),/références de pièces/)});
test('CSV export neutralizes spreadsheet formulas and quotes',()=>{assert.equal(d.csvCell('=1+1'),'"\'=1+1"');assert.equal(d.csvCell(' +cmd'),'"\' +cmd"');assert.equal(d.csvCell('A "B"'),'"A ""B"""');assert.equal(d.csvCell('Game Boy'),'"Game Boy"')});
test('Expense calculation excludes labor and rounds cents',()=>{const s=seed();assert.equal(d.partsCost(job(s)),.9);assert.equal(d.consoleInvestment(s,s.consoles[0]),25.9);assert.equal(d.cents(.1+.2),.3)});
test('Legacy repairs use hourly estimates and manual prices override time without duplicating parts',()=>{
  const s=seed(),r=job(s);assert.equal(r.interventionCost,undefined);
  assert.equal(d.repairInterventionCost(s,r),26.25);assert.equal(d.repairTotalCost(s,r),27.15);
  d.setRepairInterventionCost(s,r.id,29.99);
  assert.equal(d.repairInterventionCost(s,r),29.99);assert.equal(d.repairTotalCost(s,r),30.89);
  s.settings.hourlyRate=99;r.worklogs.push({id:d.uid(),minutes:60,note:'Temps conservé',createdAt:d.now()});
  assert.equal(d.repairInterventionCost(s,r),29.99);assert.equal(d.repairTotalCost(s,r),30.89);
  assert.equal(s.events.find(e=>e.repairId===r.id).kind,'edit');assert.match(s.events[0].text,/hors pièces/);d.validateStore(s);
});
test('A free intervention stays free and clearing the manual price restores hourly calculation',()=>{
  const s=seed(),r=job(s);d.setRepairInterventionCost(s,r.id,0);
  assert.equal(d.repairInterventionCost(s,r),0);assert.equal(d.repairTotalCost(s,r),.9);
  d.setRepairInterventionCost(s,r.id,null);assert.equal(r.interventionCost,null);
  assert.equal(d.repairInterventionCost(s,r),26.25);assert.equal(d.repairTotalCost(s,r),27.15);
  assert.match(s.events[0].text,/temps enregistré/);const before=JSON.stringify(s);
  d.setRepairInterventionCost(s,r.id,null);assert.equal(JSON.stringify(s),before);
});
test('Manual intervention prices can be corrected on closed dossiers without changing their closure or tests',()=>{
  for(const stage of ['terminee','irreparable','abandonnee']){
    const s=seed(),r=job(s);d.moveRepair(s,r.id,stage);const tests=structuredClone(r.tests),completedAt=r.completedAt;
    r.updatedAt='2000-01-01T00:00:00.000Z';d.setRepairInterventionCost(s,r.id,45.5);
    assert.equal(r.stage,stage);assert.equal(r.completedAt,completedAt);assert.deepEqual(r.tests,tests);
    assert.notEqual(r.updatedAt,'2000-01-01T00:00:00.000Z');assert.equal(r.interventionCost,45.5);d.validateStore(s);
  }
});
test('Invalid intervention prices do not partially alter a dossier or its journal',()=>{
  for(const cost of [-1,1.001,1e6+.01,NaN,Infinity,'12.50',{},undefined]){
    const s=seed(),before=JSON.stringify(s);assert.throws(()=>d.setRepairInterventionCost(s,job(s).id,cost),/coût/);
    assert.equal(JSON.stringify(s),before);
  }
  const s=seed();assert.throws(()=>d.setRepairInterventionCost(s,'missing',25),/introuvable/);
});
test('Intervention prices survive JSON backups while legacy repairs retain automatic mode',()=>{
  const s=seed();d.setRepairInterventionCost(s,s.repairs[0].id,0);d.setRepairInterventionCost(s,s.repairs[1].id,1e6);
  s.repairs[2].interventionCost=null;
  const restored=d.validateStore(JSON.parse(JSON.stringify(s)));
  assert.equal(restored.repairs[0].interventionCost,0);assert.equal(restored.repairs[1].interventionCost,1e6);
  assert.equal(restored.repairs[2].interventionCost,null);assert.equal(restored.repairs[3].interventionCost,undefined);
  const created=d.createRepair(s,{consoleId:'console-10',title:'Test coût',symptoms:'',priority:'normale',dueDate:''});
  assert.equal(created.interventionCost,null);assert.equal(d.repairInterventionCost(s,created),0);
});
test('Import rejects malformed direct prices rather than coercing or silently rounding them',()=>{
  for(const cost of [-1,.001,1e6+.01,NaN,Infinity,'12.50',false,{}]){
    const s=seed();job(s).interventionCost=cost;assert.throws(()=>d.validateStore(s),/coût de l’intervention/);
  }
});
test('Editing a repair total creates a manual intervention price without changing consumed parts or recorded work',()=>{
  const s=seed(),r=job(s),parts=structuredClone(r.parts),worklogs=structuredClone(r.worklogs),tests=structuredClone(r.tests),stock=structuredClone(s.parts),stage=r.stage;
  assert.equal(r.interventionCost,undefined);assert.equal(d.repairTotalCost(s,r),27.15);
  d.setRepairTotalCost(s,r.id,50.99);assert.equal(r.interventionCost,50.09);assert.equal(d.repairTotalCost(s,r),50.99);
  assert.deepEqual(r.parts,parts);assert.deepEqual(r.worklogs,worklogs);assert.deepEqual(r.tests,tests);assert.deepEqual(s.parts,stock);assert.equal(r.stage,stage);
  assert.match(s.events[0].text,/hors pièces/);s.settings.hourlyRate=99;assert.equal(d.repairTotalCost(s,r),50.99);d.validateStore(s);
});
test('Repair total editing calculates exact cents, permits free labour and respects the intervention ceiling',()=>{
  for(const [total,intervention] of [[.9,0],[1,.1],[9.99,9.09],[1e6+.9,1e6]]){
    const s=seed(),r=job(s);d.setRepairTotalCost(s,r.id,total);
    assert.equal(r.interventionCost,intervention);assert.equal(d.partsCost(r),.9);assert.equal(d.repairTotalCost(s,r),total);d.validateStore(s);
    const before=JSON.stringify(s);d.setRepairTotalCost(s,r.id,total);assert.equal(JSON.stringify(s),before);
  }
  const s=seed(),r=s.repairs[1];assert.equal(d.partsCost(r),0);
  d.setRepairTotalCost(s,r.id,0);assert.equal(r.interventionCost,0);assert.equal(d.repairTotalCost(s,r),0);
  d.setRepairTotalCost(s,r.id,1e6);assert.equal(r.interventionCost,1e6);d.validateStore(s);
});
test('Invalid repair totals and totals below consumed parts leave the complete store untouched',()=>{
  for(const total of [-1,.001,NaN,Infinity,'12.50',null,{},undefined,1e6+.91]){
    const s=seed(),before=JSON.stringify(s);assert.throws(()=>d.setRepairTotalCost(s,job(s).id,total),/montant total/);assert.equal(JSON.stringify(s),before);
  }
  for(const total of [0,.8]){
    const s=seed(),before=JSON.stringify(s);assert.throws(()=>d.setRepairTotalCost(s,job(s).id,total),/pièces déjà utilisées/);assert.equal(JSON.stringify(s),before);
  }
  const s=seed(),before=JSON.stringify(s);assert.throws(()=>d.setRepairTotalCost(s,'missing',12),/introuvable/);assert.equal(JSON.stringify(s),before);
  const invalid=seed();invalid.events.push({id:d.uid(),kind:'edit',text:'Référence absente',createdAt:d.now(),consoleId:'missing'});
  const original=JSON.stringify(invalid);assert.throws(()=>d.setRepairTotalCost(invalid,job(invalid).id,20),/journal/);assert.equal(JSON.stringify(invalid),original);
});
test('Unknown top-level fields are not retained',()=>{const s=seed();s.extra='ignored';assert.equal(d.validateStore(s).extra,undefined)});
test('Code generation remains unique even when there are gaps',()=>{assert.equal(d.nextCode([{code:'CRT-001'},{code:'CRT-015'}],'CRT-'),'CRT-016')});

const clientInput=(overrides={})=>({name:'Camille Martin',email:'camille@example.test',phone:'06 12 34 56 78',address:'12 rue des Jeux',notes:'Prévenir par e-mail',...overrides});
const requestInput=(overrides={})=>({brand:'Nintendo',model:'Game Boy',serial:'',accessories:'Console seule',title:'Réparer l’écran',symptoms:'Lignes verticales sur l’écran',priority:'normale',dueDate:'',...overrides});
test('New and legacy repairs remain unpaid until a receipt is explicitly recorded',()=>{
  const s=seed(),legacy=job(s);assert.equal(legacy.payment,undefined);assert.equal(d.repairPaidAmount(legacy),0);
  const created=d.createRepair(s,{consoleId:'console-10',title:'Dossier sans paiement',symptoms:'',priority:'normale',dueDate:''});
  assert.equal(created.payment,null);assert.equal(d.repairPaidAmount(created),0);
  const before=JSON.stringify(s);d.setRepairPayment(s,legacy.id,false);d.setRepairPayment(s,created.id,false);
  assert.equal(JSON.stringify(s),before);assert.deepEqual(d.paidRepairRevenue(s),{total:0,count:0});
});
test('Recording a customer payment captures manual intervention and parts once with customer journal references',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput()),[r]=d.createClientRepairs(s,client.id,[requestInput()]);
  const part={id:d.uid(),reference:'PAID-PART',name:'Écran',category:'',compatibility:'',quantity:2,threshold:0,unitCost:.9,location:'',supplier:''};
  s.parts.push(part);d.usePart(s,r.id,part.id,1);d.setRepairInterventionCost(s,r.id,29.99);
  r.updatedAt='2000-01-01T00:00:00.000Z';d.setRepairPayment(s,r.id,true);
  assert.equal(r.payment.amount,30.89);assert.equal(d.repairPaidAmount(r),30.89);
  assert.equal(r.updatedAt,r.payment.paidAt);assert.equal(new Date(r.payment.paidAt).toISOString(),r.payment.paidAt);
  assert.deepEqual(d.paidRepairRevenue(s),{total:30.89,count:1});
  assert.equal(s.events[0].kind,'edit');assert.equal(s.events[0].repairId,r.id);assert.equal(s.events[0].consoleId,r.consoleId);assert.equal(s.events[0].clientId,client.id);
  assert.match(s.events[0].text,/Paiement enregistré/);assert.equal(part.quantity,1);d.validateStore(s);
});
test('Hourly payment receipts and free interventions keep their exact amount, including a zero total',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput()),[hourly,free]=d.createClientRepairs(s,client.id,[requestInput(),requestInput()]);
  hourly.worklogs.push({id:d.uid(),minutes:45,note:'Réparation',createdAt:d.now()});
  d.setRepairInterventionCost(s,free.id,0);d.setRepairPayment(s,hourly.id,true);d.setRepairPayment(s,free.id,true);
  assert.equal(hourly.payment.amount,26.25);assert.equal(free.payment.amount,0);
  assert.ok(free.payment);assert.deepEqual(d.paidRepairRevenue(s),{total:26.25,count:2});d.validateStore(s);
});
test('A payment receipt survives price, hourly rate, work time, parts and repair status changes',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput()),[r]=d.createClientRepairs(s,client.id,[requestInput()]);
  r.worklogs.push({id:d.uid(),minutes:45,note:'Intervention',createdAt:d.now()});d.setRepairPayment(s,r.id,true);
  const receipt=structuredClone(r.payment);s.settings.hourlyRate=75;
  r.worklogs.push({id:d.uid(),minutes:120,note:'Intervention complémentaire',createdAt:d.now()});
  const part={id:d.uid(),reference:'RECEIPT-STABLE',name:'Pièce',category:'',compatibility:'',quantity:1,threshold:0,unitCost:3.25,location:'',supplier:''};
  s.parts.push(part);d.usePart(s,r.id,part.id,1);d.setRepairInterventionCost(s,r.id,99.99);d.moveRepair(s,r.id,'terminee');
  assert.equal(d.repairTotalCost(s,r),103.24);assert.deepEqual(r.payment,receipt);
  assert.deepEqual(d.completedRepairRevenue(s),{total:103.24,count:1});assert.deepEqual(d.paidRepairRevenue(s),{total:26.25,count:1});
  d.moveRepair(s,r.id,'diagnostic');assert.deepEqual(r.payment,receipt);
  assert.deepEqual(d.completedRepairRevenue(s),{total:0,count:0});assert.deepEqual(d.paidRepairRevenue(s),{total:26.25,count:1});d.validateStore(s);
});
test('Repeated paid actions preserve the amount, receipt date, updated date and journal',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput()),[r]=d.createClientRepairs(s,client.id,[requestInput()]);
  d.setRepairInterventionCost(s,r.id,12.5);d.setRepairPayment(s,r.id,true);d.setRepairInterventionCost(s,r.id,19.99);
  const before=JSON.stringify(s);d.setRepairPayment(s,r.id,true);
  assert.equal(JSON.stringify(s),before);assert.equal(r.payment.amount,12.5);
});
test('Editing the total of a paid closed customer repair preserves its receipt, closure and tests',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput()),[r]=d.createClientRepairs(s,client.id,[requestInput()]);
  const part={id:d.uid(),reference:'PAID-TOTAL',name:'Pièce',category:'',compatibility:'',quantity:2,threshold:0,unitCost:4,location:'',supplier:''};
  s.parts.push(part);d.usePart(s,r.id,part.id,2);d.setRepairInterventionCost(s,r.id,10);d.setRepairPayment(s,r.id,true);d.moveRepair(s,r.id,'terminee');
  const receipt=structuredClone(r.payment),closedAt=r.completedAt,tests=structuredClone(r.tests),parts=structuredClone(r.parts);
  d.setRepairTotalCost(s,r.id,28);assert.equal(r.interventionCost,20);assert.equal(d.repairTotalCost(s,r),28);
  assert.deepEqual(r.payment,receipt);assert.equal(r.payment.amount,18);assert.equal(r.completedAt,closedAt);assert.equal(r.stage,'terminee');
  assert.deepEqual(r.tests,tests);assert.deepEqual(r.parts,parts);assert.equal(part.quantity,0);
  assert.deepEqual(d.paidRepairRevenue(s),{total:18,count:1});assert.deepEqual(d.completedRepairRevenue(s),{total:28,count:1});d.validateStore(s);
});
test('Cancelling a payment removes the receipt once and a later payment captures the corrected cost',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput()),[r]=d.createClientRepairs(s,client.id,[requestInput()]);
  d.setRepairInterventionCost(s,r.id,42.5);d.setRepairPayment(s,r.id,true);d.setRepairPayment(s,r.id,false);
  assert.equal(r.payment,null);assert.deepEqual(d.paidRepairRevenue(s),{total:0,count:0});assert.match(s.events[0].text,/Paiement annulé/);
  assert.equal(s.events[0].clientId,client.id);const before=JSON.stringify(s);d.setRepairPayment(s,r.id,false);assert.equal(JSON.stringify(s),before);
  d.setRepairInterventionCost(s,r.id,45);d.setRepairPayment(s,r.id,true);assert.equal(r.payment.amount,45);d.validateStore(s);
});
test('Missing dossiers, non-boolean statuses and equipment without a real customer cannot record a payment',()=>{
  for(const flag of [undefined,null,0,1,'true','false',{},[]]){
    const s=seed(),before=JSON.stringify(s);assert.throws(()=>d.setRepairPayment(s,job(s).id,flag),/booléen/);assert.equal(JSON.stringify(s),before);
  }
  for(const clientId of [undefined,'','missing-client']){
    const s=seed();s.consoles[0].clientId=clientId;const before=JSON.stringify(s);
    assert.throws(()=>d.setRepairPayment(s,job(s).id,true),/client/);assert.equal(JSON.stringify(s),before);
  }
  const s=seed(),before=JSON.stringify(s);assert.throws(()=>d.setRepairPayment(s,'missing',true),/introuvable/);assert.equal(JSON.stringify(s),before);
});
test('Invalid computed receipt amounts or invalid existing data never partially record or cancel a payment',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput()),[r]=d.createClientRepairs(s,client.id,[requestInput()]);
  s.settings.hourlyRate=1e9;r.worklogs.push({id:d.uid(),minutes:1e9,note:'Montant hors limite',createdAt:d.now()});
  const before=JSON.stringify(s);assert.throws(()=>d.setRepairPayment(s,r.id,true),/montant payé/);assert.equal(JSON.stringify(s),before);
  for(const payment of [{amount:NaN,paidAt:d.now()},{amount:1.001,paidAt:d.now()},{amount:10,paidAt:'2026-02-31T12:00:00.000Z'}]){
    const t=d.emptyStore(),customer=d.createClient(t,clientInput()),[repair]=d.createClientRepairs(t,customer.id,[requestInput()]);repair.payment=payment;
    const original=structuredClone(t);assert.throws(()=>d.setRepairPayment(t,repair.id,false));assert.deepEqual(t,original);
  }
  const t=d.emptyStore(),customer=d.createClient(t,clientInput()),[repair]=d.createClientRepairs(t,customer.id,[requestInput()]);
  t.events.push({id:d.uid(),kind:'edit',text:'Journal invalide',createdAt:d.now(),repairId:'missing'});
  const original=JSON.stringify(t);assert.throws(()=>d.setRepairPayment(t,repair.id,true),/journal/);assert.equal(JSON.stringify(t),original);
});
test('Payment imports preserve absent, null and zero receipts and reject malformed amounts and timestamps',()=>{
  const s=seed();job(s).payment={amount:0,paidAt:d.now()};s.repairs[1].payment={amount:1e9,paidAt:d.now()};s.repairs[2].payment=null;
  const restored=d.validateStore(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(restored.repairs[0].payment,job(s).payment);assert.deepEqual(restored.repairs[1].payment,s.repairs[1].payment);
  assert.equal(restored.repairs[2].payment,null);assert.equal(restored.repairs[3].payment,undefined);assert.equal('payment' in restored.repairs[3],false);
  for(const amount of [-1,.001,1e9+.01,NaN,Infinity,'12.50',false,{},null,undefined]){
    const t=seed();job(t).payment={amount,paidAt:d.now()};assert.throws(()=>d.validateStore(t),/montant payé/);
  }
  for(const paidAt of ['',null,undefined,'2026-10-09','2026-02-31T12:00:00.000Z','2026-10-09T12:00:00.000+02:00','not-a-date']){
    const t=seed();job(t).payment={amount:1,paidAt};assert.throws(()=>d.validateStore(t),/horodatage de paiement/);
  }
  for(const payment of [true,false,0,'paid',[],{}]){
    const t=seed();job(t).payment=payment;assert.throws(()=>d.validateStore(t));
  }
});
test('Collected revenue includes every paid customer stage and archives while excluding unpaid or ownerless repairs',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput()),repairs=d.createClientRepairs(s,client.id,d.STAGES.map(stage=>requestInput({title:stage.label})));
  for(const [i,r] of repairs.entries()){
    d.setRepairInterventionCost(s,r.id,10+i);d.setRepairPayment(s,r.id,true);d.moveRepair(s,r.id,d.STAGES[i].id);
    if(!d.active(r))s.consoles.find(c=>c.id===r.consoleId).archived=true;
  }
  const total=repairs.reduce((sum,r)=>sum+r.payment.amount,0);
  assert.deepEqual(d.paidRepairRevenue(s),{total,count:repairs.length});d.setRepairPayment(s,repairs[0].id,false);
  assert.deepEqual(d.paidRepairRevenue(s),{total:total-10,count:repairs.length-1});d.validateStore(s);
  const personal=seed();job(personal).payment={amount:999,paidAt:d.now()};
  assert.deepEqual(d.paidRepairRevenue(personal),{total:0,count:0});personal.consoles[0].clientId='missing-client';
  assert.deepEqual(d.paidRepairRevenue(personal),{total:0,count:0});assert.deepEqual(d.paidRepairRevenue(d.emptyStore()),{total:0,count:0});
});
test('Collected revenue sums each receipt once in integer cents without changing the store',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput()),[r]=d.createClientRepairs(s,client.id,[requestInput()]);
  d.setRepairInterventionCost(s,r.id,.01);d.setRepairPayment(s,r.id,true);d.moveRepair(s,r.id,'terminee');
  s.repairs=Array.from({length:1001},(_,i)=>({...structuredClone(r),id:`paid-${i}`,code:`REP-${i+1}`}));s.events=[];
  const before=JSON.stringify(s);assert.deepEqual(d.paidRepairRevenue(s),{total:10.01,count:1001});assert.equal(JSON.stringify(s),before);d.validateStore(s);
});
test('Deleting paid dossiers or their consoles preserves other receipts and exports',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput()),[first,second,third]=d.createClientRepairs(s,client.id,[requestInput(),requestInput(),requestInput()]);
  for(const [r,cost] of [[first,12.5],[second,30],[third,42.75]]){d.setRepairInterventionCost(s,r.id,cost);d.setRepairPayment(s,r.id,true);}
  d.deleteRepair(s,first.id);assert.deepEqual(d.paidRepairRevenue(s),{total:72.75,count:2});assert.ok(s.consoles.some(c=>c.id===first.consoleId));
  d.deleteConsole(s,second.consoleId);assert.deepEqual(d.paidRepairRevenue(s),{total:42.75,count:1});assert.equal(s.clients[0].id,client.id);
  const restored=d.validateStore(JSON.parse(JSON.stringify(s)));assert.deepEqual(d.paidRepairRevenue(restored),{total:42.75,count:1});
  assert.deepEqual(restored.repairs[0].payment,third.payment);d.validateStore(s);
});
test('Canonical repair stages omit the retired ordering step and never accept it as a new target',()=>{
  assert.deepEqual(d.STAGES.map(stage=>stage.id),['attente-envoi','reception','diagnostic','attente-pieces','reparation','tests','terminee','irreparable','abandonnee']);
  for(const stage of d.STAGES)assert.equal(d.stageInfo(stage.id),stage);
  for(const previous of ['diagnostic','a-commander']){
    const s=seed(),r=job(s);r.stage=previous;const before=JSON.stringify(s);
    assert.throws(()=>d.moveRepair(s,r.id,'a-commander'),/Étape inconnue/);assert.equal(JSON.stringify(s),before);
  }
});
test('Legacy ordering normalization is pure, exact and changes only affected stage fields',()=>{
  const canonical=seed();assert.equal(d.normalizeRepairStages(canonical),canonical);
  const raw={revision:73,extra:'préservé par le normaliseur',repairs:[null,'incorrect',{id:'legacy',stage:'a-commander',payment:{amount:0,paidAt:d.now()}},{id:'canonical',stage:'attente-pieces'},{id:'unrecognized',stage:'a-commander '}],events:[{kind:'stage',text:'a-commander'}]};
  const before=structuredClone(raw),normalized=d.normalizeRepairStages(raw);
  assert.deepEqual(raw,before);assert.notEqual(normalized,raw);assert.notEqual(normalized.repairs,raw.repairs);
  assert.equal(normalized.repairs[2].stage,'attente-pieces');assert.notEqual(normalized.repairs[2],raw.repairs[2]);
  assert.equal(normalized.repairs[2].payment,raw.repairs[2].payment);assert.equal(normalized.repairs[3],raw.repairs[3]);
  assert.equal(normalized.repairs[4].stage,'a-commander ');assert.equal(normalized.events,raw.events);
  assert.equal(normalized.revision,73);assert.equal(normalized.extra,raw.extra);assert.equal(d.normalizeRepairStages(normalized),normalized);
  for(const value of [null,undefined,'invalid',[],{repairs:null},{repairs:[]}])assert.equal(d.normalizeRepairStages(value),value);
});
test('Legacy repair imports retain prices, receipts, tests, timer, photos and journal across canonical exports and stage cycles',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput()),[r]=d.createClientRepairs(s,client.id,[requestInput()]);
  const part={id:d.uid(),reference:'LEGACY-STAGE',name:'Condensateur',category:'',compatibility:'',quantity:2,threshold:0,unitCost:.9,location:'',supplier:''};
  s.parts.push(part);d.usePart(s,r.id,part.id,1);d.setRepairInterventionCost(s,r.id,42.5);d.setRepairPayment(s,r.id,true);
  r.stage='a-commander';r.diagnosis='Condensateur à remplacer';r.tests[0].result='fail';
  r.timerStartedAt=new Date(Date.now()-61000).toISOString();r.photos=[{id:d.uid(),data:'data:image/png;base64,AAAA',caption:'Avant intervention',createdAt:d.now()}];
  s.revision=73;s.settings.lastExportAt='2026-10-09T12:00:00.000Z';
  d.addEvent(s,'Diagnostic → Pièces à commander','stage',{consoleId:r.consoleId,repairId:r.id,clientId:client.id});
  const before=structuredClone(s),expected=structuredClone(s);expected.repairs[0].stage='attente-pieces';
  const imported=d.validateStore(s);assert.deepEqual(s,before);assert.deepEqual(imported,expected);
  const restored=d.validateStore(JSON.parse(JSON.stringify(imported)));
  assert.deepEqual(restored,expected);assert.equal(restored.schemaVersion,1);assert.equal(restored.revision,73);
  const migrated=restored.repairs[0],receipt=structuredClone(migrated.payment),stock=restored.parts[0].quantity;
  assert.equal(d.stageInfo(migrated.stage).label,'En attente de pièces');assert.deepEqual(d.paidRepairRevenue(restored),{total:43.4,count:1});
  const noChange=JSON.stringify(restored);d.moveRepair(restored,migrated.id,'attente-pieces');assert.equal(JSON.stringify(restored),noChange);
  d.moveRepair(restored,migrated.id,'reparation');d.moveRepair(restored,migrated.id,'terminee');
  assert.equal(migrated.timerStartedAt,'');assert.ok(migrated.tests.every(test=>test.result==='pass'));assert.deepEqual(migrated.payment,receipt);
  d.moveRepair(restored,migrated.id,'diagnostic');assert.ok(migrated.tests.every(test=>test.result==='pending'));
  assert.deepEqual(migrated.payment,receipt);assert.equal(restored.parts[0].quantity,stock);
  assert.ok(restored.events.some(event=>event.text==='Diagnostic → Pièces à commander'));d.validateStore(restored);
});
test('Legacy stage migration preserves absent or null payment and hourly prices without accepting unknown stages',()=>{
  const s=seed();job(s).stage='a-commander';s.repairs[1].stage='a-commander';s.repairs[1].payment=null;
  const before=JSON.stringify(s),restored=d.validateStore(JSON.parse(before));
  assert.equal(restored.repairs[0].stage,'attente-pieces');assert.equal('payment' in restored.repairs[0],false);assert.equal('interventionCost' in restored.repairs[0],false);
  assert.equal(restored.repairs[1].payment,null);assert.equal(restored.repairs[1].stage,'attente-pieces');assert.equal(JSON.stringify(s),before);
  assert.equal(d.repairTotalCost(restored,restored.repairs[0]),d.repairTotalCost(s,job(s)));
  for(const stage of ['a-commander ','à-commander','unknown']){
    const invalid=seed();job(invalid).stage=stage;const original=JSON.stringify(invalid);
    assert.throws(()=>d.validateStore(invalid),/valeur non autorisée/);assert.equal(JSON.stringify(invalid),original);
  }
});
test('Repair revenue is zero without completed customer repairs and excludes workshop inventory',()=>{
  assert.deepEqual(d.completedRepairRevenue(d.emptyStore()),{total:0,count:0});
  const s=seed();assert.ok(s.repairs.some(r=>r.stage==='terminee'));
  assert.deepEqual(d.completedRepairRevenue(s),{total:0,count:0});
  const c=s.consoles.find(c=>s.repairs.some(r=>r.consoleId===c.id&&r.stage==='terminee'));
  c.clientId='missing-client';assert.deepEqual(d.completedRepairRevenue(s),{total:0,count:0});
});
test('Customer revenue uses direct or hourly prices and includes parts exactly once, including free labour',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput());s.settings.hourlyRate=35;
  const [manual,free,hourly]=d.createClientRepairs(s,client.id,[requestInput(),requestInput(),requestInput()]);
  for(const [r,partCost,minutes] of [[manual,.9,60],[free,1.25,120],[hourly,2.1,45]]){
    const partId=d.uid();
    s.parts.push({id:partId,reference:`TEST-${s.parts.length+1}`,name:'Pièce',category:'',compatibility:'',quantity:0,threshold:0,unitCost:partCost,location:'',supplier:''});
    r.parts.push({id:d.uid(),partId,name:'Pièce',quantity:1,unitCost:partCost,usedAt:d.now()});
    r.worklogs.push({id:d.uid(),minutes,note:'Intervention',createdAt:d.now()});
    d.moveRepair(s,r.id,'terminee');
  }
  d.setRepairInterventionCost(s,manual.id,29.99);d.setRepairInterventionCost(s,free.id,0);
  assert.equal(d.repairTotalCost(s,manual),30.89);assert.equal(d.repairTotalCost(s,free),1.25);
  assert.equal(d.repairTotalCost(s,hourly),28.35);
  assert.deepEqual(d.completedRepairRevenue(s),{total:60.49,count:3});
  s.settings.hourlyRate=40;
  assert.deepEqual(d.completedRepairRevenue(s),{total:64.24,count:3});d.validateStore(s);
});
test('Revenue includes archived completed consoles and excludes every other repair stage',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput());
  const repairs=d.createClientRepairs(s,client.id,d.STAGES.map(stage=>requestInput({title:stage.label})));
  for(const [i,r] of repairs.entries()){
    d.setRepairInterventionCost(s,r.id,10+i);d.moveRepair(s,r.id,d.STAGES[i].id);
  }
  const completed=repairs.find(r=>r.stage==='terminee');
  s.consoles.find(c=>c.id===completed.consoleId).archived=true;
  assert.deepEqual(d.completedRepairRevenue(s),{total:10+d.STAGES.findIndex(stage=>stage.id==='terminee'),count:1});d.validateStore(s);
});
test('Each completed repair contributes once across customer consoles and several historical repairs',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput());
  const [first,otherConsole]=d.createClientRepairs(s,client.id,[requestInput(),requestInput()]);
  d.setRepairInterventionCost(s,first.id,12);d.moveRepair(s,first.id,'terminee');
  const [second]=d.createClientRepairs(s,client.id,[requestInput({consoleId:first.consoleId})]);
  d.setRepairInterventionCost(s,second.id,18);d.moveRepair(s,second.id,'terminee');
  d.setRepairInterventionCost(s,otherConsole.id,25);d.moveRepair(s,otherConsole.id,'terminee');
  const otherClient=d.createClient(s,clientInput({name:'Alex'}));
  const [otherCustomer]=d.createClientRepairs(s,otherClient.id,[requestInput()]);
  d.setRepairInterventionCost(s,otherCustomer.id,30);d.moveRepair(s,otherCustomer.id,'terminee');
  assert.deepEqual(d.completedRepairRevenue(s),{total:85,count:4});d.validateStore(s);
});
test('Reopening removes a repair from revenue and reclosing or correcting its price recalculates it',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput());
  const [r]=d.createClientRepairs(s,client.id,[requestInput()]);
  d.setRepairInterventionCost(s,r.id,35.5);d.moveRepair(s,r.id,'terminee');
  assert.deepEqual(d.completedRepairRevenue(s),{total:35.5,count:1});
  d.moveRepair(s,r.id,'diagnostic');assert.deepEqual(d.completedRepairRevenue(s),{total:0,count:0});
  d.moveRepair(s,r.id,'terminee');assert.deepEqual(d.completedRepairRevenue(s),{total:35.5,count:1});
  d.setRepairInterventionCost(s,r.id,39.99);assert.deepEqual(d.completedRepairRevenue(s),{total:39.99,count:1});
  d.moveRepair(s,r.id,'abandonnee');assert.deepEqual(d.completedRepairRevenue(s),{total:0,count:0});
});
test('Repair revenue accumulates integer cents without floating-point drift',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput());
  const [first]=d.createClientRepairs(s,client.id,[requestInput()]);
  d.setRepairInterventionCost(s,first.id,.01);d.moveRepair(s,first.id,'terminee');
  s.repairs=Array.from({length:1001},(_,i)=>({...structuredClone(first),id:`revenue-${i}`,code:`REP-${i+1}`}));s.events=[];
  const before=JSON.stringify(s);
  assert.deepEqual(d.completedRepairRevenue(s),{total:10.01,count:1001});
  assert.equal(JSON.stringify(s),before);d.validateStore(s);
});
test('Theoretical revenue includes all customer stages and archived consoles, while excluding personal and missing owners',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput());
  const repairs=d.createClientRepairs(s,client.id,d.STAGES.map(stage=>requestInput({title:stage.label})));
  for(const [i,r] of repairs.entries()){d.setRepairInterventionCost(s,r.id,10+i+.01);d.moveRepair(s,r.id,d.STAGES[i].id);}
  const closed=repairs.find(r=>r.stage==='terminee');s.consoles.find(c=>c.id===closed.consoleId).archived=true;
  const personal=d.createRepairAdmission(s,{...requestInput(),clientId:''});d.setRepairInterventionCost(s,personal.id,999);
  const before=JSON.stringify(s);
  assert.deepEqual(d.theoreticalRepairRevenue(s),{total:126.09,count:9});
  assert.deepEqual(d.completedRepairRevenue(s),{total:16.01,count:1});
  assert.equal(JSON.stringify(s),before);d.validateStore(s);
  const orphan=structuredClone(s);orphan.consoles.filter(c=>c.clientId).forEach(c=>{c.clientId='missing-client';});
  assert.deepEqual(d.theoreticalRepairRevenue(orphan),{total:0,count:0});
  assert.deepEqual(d.theoreticalRepairRevenue(d.emptyStore()),{total:0,count:0});
});
test('Theoretical revenue uses current manual and hourly costs with parts once, independently of recorded payments',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput());s.settings.hourlyRate=40;
  const [manual,hourly,free]=d.createClientRepairs(s,client.id,[requestInput(),requestInput(),requestInput()]);
  d.setRepairInterventionCost(s,manual.id,20);d.setRepairInterventionCost(s,free.id,0);
  hourly.worklogs.push({id:d.uid(),minutes:30,note:'Intervention',createdAt:d.now()});
  const partId=d.uid();s.parts.push({id:partId,reference:'THEORETICAL-PART',name:'Pièce',category:'',compatibility:'',quantity:2,threshold:0,unitCost:2.5,location:'',supplier:''});
  d.usePart(s,manual.id,partId,2);d.setRepairPayment(s,manual.id,true);
  assert.deepEqual(d.theoreticalRepairRevenue(s),{total:45,count:3});
  d.setRepairInterventionCost(s,manual.id,30);s.settings.hourlyRate=60;
  assert.deepEqual(d.theoreticalRepairRevenue(s),{total:65,count:3});
  assert.deepEqual(d.paidRepairRevenue(s),{total:25,count:1});
  d.moveRepair(s,manual.id,'terminee');d.moveRepair(s,manual.id,'diagnostic');
  assert.deepEqual(d.theoreticalRepairRevenue(s),{total:65,count:3});d.validateStore(s);
});
test('Theoretical revenue sums integer cents across historical repairs and follows retained records without mutating them',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput()),[first]=d.createClientRepairs(s,client.id,[requestInput()]);
  d.setRepairInterventionCost(s,first.id,.01);d.moveRepair(s,first.id,'terminee');
  s.repairs=Array.from({length:1001},(_,i)=>({...structuredClone(first),id:'theoretical-'+i,code:'REP-'+(i+1)}));s.events=[];
  const before=JSON.stringify(s);assert.deepEqual(d.theoreticalRepairRevenue(s),{total:10.01,count:1001});assert.equal(JSON.stringify(s),before);d.validateStore(s);
  d.deleteRepair(s,s.repairs[0].id);assert.deepEqual(d.theoreticalRepairRevenue(s),{total:10,count:1000});
  d.deleteConsole(s,first.consoleId);assert.deepEqual(d.theoreticalRepairRevenue(s),{total:0,count:0});
});
test('Schema 1 backups without customer fields retain all workshop data',()=>{
  const original=seed(),legacy=structuredClone(original);delete legacy.clients;legacy.consoles.forEach(c=>delete c.clientId);
  const migrated=d.validateStore(legacy);assert.deepEqual(migrated,d.validateStore(original));assert.deepEqual(migrated.clients,[]);
  assert.ok(migrated.consoles.every(c=>c.clientId===''));assert.equal(migrated.schemaVersion,1);assert.equal(d.STORAGE_KEY,'la-clinique-retro:v1');
});
test('Customer creation and update preserve identity and related consoles',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput({name:'  Camille Martin  '}));
  assert.equal(client.name,'Camille Martin');assert.equal(client.code,'CLT-001');
  const [repair]=d.createClientRepairs(s,client.id,[requestInput()]);const identity={id:client.id,code:client.code,createdAt:client.createdAt};
  d.updateClient(s,client.id,clientInput({name:'Camille Dupont',phone:'07 11 22 33 44'}));
  assert.equal(client.name,'Camille Dupont');assert.deepEqual({id:client.id,code:client.code,createdAt:client.createdAt},identity);
  assert.equal(s.consoles.find(c=>c.id===repair.consoleId).clientId,client.id);assert.ok(s.events.some(e=>e.clientId===client.id));d.validateStore(s);
});
test('Invalid customer details never create or partially update a customer',()=>{
  for(const overrides of [{name:' '},{email:'not-an-email'},{email:'a@b'},{phone:null},{address:'a'.repeat(1001)},{notes:'x'.repeat(30001)}]){
    const s=d.emptyStore(),before=JSON.stringify(s);assert.throws(()=>d.createClient(s,clientInput(overrides)));assert.equal(JSON.stringify(s),before);
  }
  const s=d.emptyStore(),c=d.createClient(s,clientInput()),before=JSON.stringify(s);
  assert.throws(()=>d.updateClient(s,c.id,clientInput({name:'Changed',email:'invalid'})),/e-mail/);assert.equal(JSON.stringify(s),before);
  assert.throws(()=>d.updateClient(s,'missing',clientInput()),/introuvable/);
});
test('A customer can deposit several consoles with independent repair dossiers',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput());
  const repairs=d.createClientRepairs(s,client.id,[requestInput({serial:'DMG-001'}),requestInput({brand:'Sony',model:'PlayStation 2',serial:'PS2-001',title:'Lecture disque'})]);
  assert.equal(repairs.length,2);assert.equal(s.consoles.length,2);assert.equal(s.repairs.length,2);
  assert.equal(new Set(repairs.map(r=>r.consoleId)).size,2);assert.deepEqual(repairs.map(r=>r.code),['REP-001','REP-002']);
  assert.ok(s.consoles.every(c=>c.clientId===client.id&&c.state==='en-reparation'&&c.purchasePrice===0));
  assert.ok(repairs.every(r=>r.tests.length===5&&r.stage==='reception'));d.validateStore(s);
});
test('Customer deposits preserve a trimmed colour or edition and support legacy rows',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput());
  const repairs=d.createClientRepairs(s,client.id,[requestInput({variant:'  Bleu cobalt · Édition spéciale  '}),requestInput({model:'Nintendo DS Lite'})]);
  assert.equal(s.consoles.find(c=>c.id===repairs[0].consoleId).variant,'Bleu cobalt · Édition spéciale');
  assert.equal(s.consoles.find(c=>c.id===repairs[1].consoleId).variant,'');
  assert.equal(d.validateStore(s).consoles.find(c=>c.id===repairs[0].consoleId).variant,'Bleu cobalt · Édition spéciale');
});
test('Repair requests for an existing console retain its original colour and identity',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput());
  const [first]=d.createClientRepairs(s,client.id,[requestInput({variant:'Rose',serial:'ROSE-001'})]);
  d.moveRepair(s,first.id,'abandonnee');const consoleId=first.consoleId;
  d.createClientRepairs(s,client.id,[requestInput({consoleId,variant:'Noir',serial:'OTHER',model:'Autre modèle'})]);
  const saved=s.consoles.find(c=>c.id===consoleId);
  assert.equal(saved.variant,'Rose');assert.equal(saved.serial,'ROSE-001');assert.equal(saved.model,'Game Boy');assert.equal(s.consoles.length,1);
});
test('Invalid colour values roll back every row of a customer deposit',()=>{
  for(const variant of [null,42,{},'x'.repeat(151)]){
    const s=d.emptyStore(),client=d.createClient(s,clientInput()),before=JSON.stringify(s);
    assert.throws(()=>d.createClientRepairs(s,client.id,[requestInput({variant:'Rouge'}),requestInput({variant})]),/variante \/ couleur/);
    assert.equal(JSON.stringify(s),before);
  }
});
test('A known customer console can receive another repair after its earlier dossier closes',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput()),[first]=d.createClientRepairs(s,client.id,[requestInput({serial:'DMG-002'})]);
  d.moveRepair(s,first.id,'abandonnee');const c=s.consoles[0];
  const [second]=d.createClientRepairs(s,client.id,[requestInput({consoleId:c.id,brand:'',model:'',serial:'',title:'Nouvelle demande'})]);
  assert.equal(s.consoles.length,1);assert.equal(second.consoleId,c.id);assert.notEqual(first.id,second.id);assert.equal(c.serial,'DMG-002');d.validateStore(s);
});
test('Foreign, archived and already busy consoles reject a customer deposit',()=>{
  const s=d.emptyStore(),a=d.createClient(s,clientInput()),b=d.createClient(s,clientInput({name:'Alex'}));
  const [first]=d.createClientRepairs(s,a.id,[requestInput()]);const c=s.consoles[0];let before=JSON.stringify(s);
  assert.throws(()=>d.createClientRepairs(s,b.id,[requestInput({consoleId:c.id})]),/appartenant/);assert.equal(JSON.stringify(s),before);
  assert.throws(()=>d.createClientRepairs(s,a.id,[requestInput({consoleId:c.id})]),/déjà/);assert.equal(JSON.stringify(s),before);
  d.moveRepair(s,first.id,'abandonnee');s.consoles[0].archived=true;before=JSON.stringify(s);
  assert.throws(()=>d.createClientRepairs(s,a.id,[requestInput({consoleId:c.id})]),/non archivée/);assert.equal(JSON.stringify(s),before);
});
test('Invalid later rows roll back an entire customer deposit',()=>{
  for(const invalid of [{title:' '},{brand:''},{model:''},{symptoms:42},{serial:'x'.repeat(101)},{priority:'unknown'},{dueDate:'2026-02-31'},{consoleId:'missing'}]){
    const s=d.emptyStore(),client=d.createClient(s,clientInput()),before=JSON.stringify(s);
    assert.throws(()=>d.createClientRepairs(s,client.id,[requestInput({serial:'FIRST'}),requestInput(invalid)]));assert.equal(JSON.stringify(s),before);
  }
});
test('Duplicate serials are rejected within a deposit and against known consoles',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput()),before=JSON.stringify(s);
  assert.throws(()=>d.createClientRepairs(s,client.id,[requestInput({serial:'Serial-1'}),requestInput({serial:'  serial-1  '})]),/série.*déjà/);assert.equal(JSON.stringify(s),before);
  d.createClientRepairs(s,client.id,[requestInput({serial:'Serial-1'})]);const saved=JSON.stringify(s);
  assert.throws(()=>d.createClientRepairs(s,client.id,[requestInput({serial:'serial-1'})]),/série.*déjà/);assert.equal(JSON.stringify(s),saved);
});
test('Deposits require a known customer and between one and twenty repair requests',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput()),before=JSON.stringify(s);
  assert.throws(()=>d.createClientRepairs(s,'missing',[requestInput()]),/Client introuvable/);
  for(const inputs of [[],Array.from({length:21},()=>requestInput()),null])assert.throws(()=>d.createClientRepairs(s,client.id,inputs),/1 et 20/);
  assert.equal(JSON.stringify(s),before);
});
test('A repair admission creates any console model without an existing collection entry',()=>{
  const s=d.emptyStore(),r=d.createRepairAdmission(s,requestInput({brand:'  Sony  ',model:'  PlayStation 5 Pro  ',variant:'  Blanc  ',serial:'  PS5-NEW  ',accessories:'  Câble HDMI  ',title:'  Port HDMI  ',symptoms:'  Aucune image  ',priority:'haute',dueDate:'2026-12-01'}));
  const c=s.consoles.find(c=>c.id===r.consoleId);
  assert.equal(c.brand,'Sony');assert.equal(c.model,'PlayStation 5 Pro');assert.equal(c.variant,'Blanc');assert.equal(c.serial,'PS5-NEW');assert.equal(c.accessories,'Câble HDMI');
  assert.equal(c.clientId,'');assert.equal(c.source,'Admission atelier');assert.equal(c.purchasePrice,0);assert.equal(c.estimatedValue,0);assert.equal(c.archived,false);assert.deepEqual(c.photos,[]);
  assert.equal(c.state,'en-reparation');assert.equal(r.stage,'reception');assert.equal(r.title,'Port HDMI');assert.equal(r.symptoms,'Aucune image');assert.equal(r.priority,'haute');assert.equal(r.dueDate,'2026-12-01');
  assert.equal(r.tests.length,5);assert.ok(r.tests.every(t=>t.result==='pending'));assert.equal(s.repairs[0],r);assert.equal(s.events.length,2);d.validateStore(s);
});
test('A repair admission preserves customer ownership for a Nintendo controller',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput());
  const r=d.createRepairAdmission(s,requestInput({clientId:client.id,brand:'Nintendo',model:'Manette GameCube',variant:'Violet',serial:'GC-NEW',title:'Stick analogique'}));
  const c=s.consoles.find(c=>c.id===r.consoleId);
  assert.equal(c.clientId,client.id);assert.equal(c.model,'Manette GameCube');assert.equal(c.variant,'Violet');assert.equal(c.source,'Dépôt client');
  assert.ok(s.events.some(e=>e.clientId===client.id&&e.consoleId===c.id));assert.equal(s.clients.length,1);d.validateStore(s);
});
test('Missing or empty admission owners keep new equipment in the workshop collection',()=>{
  for(const clientId of [undefined,'','   ']){
    const s=d.emptyStore(),r=d.createRepairAdmission(s,requestInput({clientId})),c=s.consoles.find(c=>c.id===r.consoleId);
    assert.equal(c.clientId,'');assert.equal(c.source,'Admission atelier');assert.ok(s.events.every(e=>!e.clientId));d.validateStore(s);
  }
});
test('Invalid admission details never leave an orphan console or partial repair',()=>{
  for(const invalid of [{clientId:'missing'},{clientId:42},{brand:''},{brand:'x'.repeat(81)},{model:''},{model:'x'.repeat(121)},{variant:null},{variant:'x'.repeat(151)},{serial:'x'.repeat(101)},{accessories:42},{title:' '},{title:'x'.repeat(201)},{symptoms:'x'.repeat(30001)},{priority:'unknown'},{dueDate:'2026-02-31'}]){
    const s=d.emptyStore(),before=JSON.stringify(s);
    assert.throws(()=>d.createRepairAdmission(s,requestInput(invalid)));assert.equal(JSON.stringify(s),before);
  }
  const s=d.emptyStore(),before=JSON.stringify(s);
  for(const input of [null,undefined]){assert.throws(()=>d.createRepairAdmission(s,input),/invalide/);assert.equal(JSON.stringify(s),before);}
});
test('Admission rejects duplicate serials across customer and workshop equipment atomically',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput());
  d.createRepairAdmission(s,requestInput({serial:'SERIAL-NEW'}));const before=JSON.stringify(s);
  assert.throws(()=>d.createRepairAdmission(s,requestInput({clientId:client.id,serial:'  serial-new  '})),/série.*déjà/);assert.equal(JSON.stringify(s),before);
  d.createClientRepairs(s,client.id,[requestInput({serial:'CLIENT-SERIAL'})]);const saved=JSON.stringify(s);
  assert.throws(()=>d.createRepairAdmission(s,requestInput({serial:'client-serial'})),/série.*déjà/);assert.equal(JSON.stringify(s),saved);
});
test('Admission commits only after validating the entire store and persists in a backup',()=>{
  const invalid=d.emptyStore();invalid.settings.hourlyRate=-1;const before=JSON.stringify(invalid);
  assert.throws(()=>d.createRepairAdmission(invalid,requestInput()),/Sauvegarde invalide/);assert.equal(JSON.stringify(invalid),before);
  const s=d.emptyStore(),client=d.createClient(s,clientInput());
  d.createRepairAdmission(s,requestInput({clientId:client.id,model:'Manette Nintendo Switch Pro',variant:'Noir translucide',serial:'PRO-001'}));
  d.createRepairAdmission(s,requestInput({brand:'Microsoft',model:'Xbox Series X',serial:'XSX-001'}));
  assert.deepEqual(d.validateStore(JSON.parse(JSON.stringify(s))),s);
});
test('Import validates customer records, unique customer numbers and references',()=>{
  const base=d.emptyStore(),client=d.createClient(base,clientInput());d.createClientRepairs(base,client.id,[requestInput()]);
  for(const change of [s=>s.clients.push(structuredClone(s.clients[0])),s=>s.clients.push({...s.clients[0],id:'other'}),s=>s.clients[0].email='invalid',s=>s.clients[0].name='',s=>s.consoles[0].clientId='missing',s=>s.consoles[0].clientId=123,s=>s.clients=null]){
    const s=structuredClone(base);change(s);assert.throws(()=>d.validateStore(s));
  }
});
test('Customer activity cannot reference a different customer’s console or repair',()=>{
  const s=d.emptyStore(),a=d.createClient(s,clientInput()),b=d.createClient(s,clientInput({name:'Alex'}));
  const [repair]=d.createClientRepairs(s,a.id,[requestInput()]);const refs={consoleId:repair.consoleId,repairId:repair.id,clientId:b.id},before=JSON.stringify(s);
  assert.throws(()=>d.addEvent(s,'Wrong customer','note',refs),/autre client/);assert.equal(JSON.stringify(s),before);
  s.events.push({id:'bad-event',kind:'note',text:'Wrong customer',createdAt:d.now(),...refs});assert.throws(()=>d.validateStore(s),/autre client/);
  s.events.at(-1).clientId='missing';assert.throws(()=>d.validateStore(s),/client de journal/);
});
test('Deleting an active dossier preserves its client and console, clears its timer and removes every repair journal reference',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput()),[repair]=d.createClientRepairs(s,client.id,[requestInput()]);
  repair.timerStartedAt=d.now();
  d.addEvent(s,'Note uniquement liée au dossier','note',{repairId:repair.id});
  d.addEvent(s,'Note client liée au dossier','note',{clientId:client.id,repairId:repair.id});
  d.addEvent(s,'Note de console conservée','note',{consoleId:repair.consoleId,clientId:client.id});
  const clients=structuredClone(s.clients),consoleItem=structuredClone(s.consoles[0]),unrelated=s.events.filter(e=>e.repairId!==repair.id),linkedIds=s.events.filter(e=>e.repairId===repair.id).map(e=>e.id);
  d.deleteRepair(s,repair.id);
  assert.equal(s.repairs.length,0);assert.deepEqual(s.clients,clients);
  assert.deepEqual(s.consoles[0],{...consoleItem,state:'en-panne'});
  assert.ok(linkedIds.every(id=>!s.events.some(e=>e.id===id)));
  assert.deepEqual(s.events.slice(1),unrelated);assert.ok(s.events.every(e=>!e.repairId));
  const trace=s.events[0];assert.equal(trace.kind,'system');assert.equal(trace.consoleId,repair.consoleId);assert.equal(trace.clientId,client.id);
  assert.match(trace.text,new RegExp(`Dossier ${repair.code} supprimé :`));assert.ok(trace.text.includes(repair.title));
  assert.ok(!s.events.some(e=>e.kind==='time'));d.validateStore(s);
});
test('Deleting a dossier keeps already consumed parts out of stock and records their consumed amount',()=>{
  const s=seed(),repair=job(s),part=s.parts[1],quantity=part.quantity;
  d.usePart(s,repair.id,part.id,2);
  const parts=structuredClone(s.parts),usedQuantity=repair.parts.reduce((sum,p)=>sum+p.quantity,0),cost=d.partsCost(repair);
  d.deleteRepair(s,repair.id);
  assert.deepEqual(s.parts,parts);assert.equal(s.parts.find(p=>p.id===part.id).quantity,quantity-2);
  assert.ok(s.events[0].text.includes(`Pièces déjà utilisées : ${usedQuantity} unité(s), ${d.money(cost)}`));
  assert.match(s.events[0].text,/stock reste déduit/);d.validateStore(s);
});
test('Deleting closed dossiers preserves the actual console state and archive flag',()=>{
  for(const stage of ['terminee','irreparable','abandonnee']){
    for(const override of [undefined,'a-tester']){
      const s=seed(),repair=job(s);d.moveRepair(s,repair.id,stage);
      const c=s.consoles.find(c=>c.id===repair.consoleId);if(override)c.state=override;c.archived=true;
      const consoleItem=structuredClone(c);d.deleteRepair(s,repair.id);
      assert.deepEqual(s.consoles.find(c=>c.id===consoleItem.id),consoleItem);d.validateStore(s);
    }
  }
});
test('Deleting a historical dossier preserves another active repair and its console in repair',()=>{
  const s=seed(),historical=job(s);d.moveRepair(s,historical.id,'terminee');
  const current=d.createRepair(s,{consoleId:historical.consoleId,title:'Intervention actuelle',symptoms:'',priority:'normale',dueDate:''});
  current.timerStartedAt=d.now();const kept=structuredClone(current);
  d.deleteRepair(s,historical.id);
  assert.deepEqual(s.repairs.find(r=>r.id===current.id),kept);
  assert.equal(s.consoles.find(c=>c.id===current.consoleId).state,'en-reparation');d.validateStore(s);
});
test('Deleting one obsolete active dossier keeps a remaining active dossier in repair',()=>{
  const s=d.emptyStore(),first=d.createRepairAdmission(s,requestInput()),remaining={...structuredClone(first),id:d.uid(),code:'REP-002',title:'Dossier restant'};
  s.repairs.push(remaining);
  assert.throws(()=>d.validateStore(s),/plusieurs réparations ouvertes/);
  d.deleteRepair(s,first.id);
  assert.equal(s.repairs.length,1);assert.deepEqual(s.repairs[0],remaining);
  assert.equal(s.consoles[0].state,'en-reparation');d.validateStore(s);
});
test('Deleting a completed customer repair removes its revenue while keeping the customer equipment in valid backups',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput()),repair=d.createRepairAdmission(s,requestInput({clientId:client.id}));
  d.setRepairInterventionCost(s,repair.id,49.99);d.moveRepair(s,repair.id,'terminee');
  assert.deepEqual(d.completedRepairRevenue(s),{total:49.99,count:1});d.deleteRepair(s,repair.id);
  assert.deepEqual(d.completedRepairRevenue(s),{total:0,count:0});assert.equal(s.consoles[0].clientId,client.id);
  assert.equal(s.consoles[0].archived,false);assert.equal(s.consoles[0].state,'fonctionnelle');
  assert.deepEqual(d.validateStore(JSON.parse(JSON.stringify(s))),s);
});
test('Missing dossiers and invalid stores roll deletion back without partially modifying data',()=>{
  const missing=seed(),beforeMissing=JSON.stringify(missing);
  assert.throws(()=>d.deleteRepair(missing,'missing'),/Dossier introuvable/);assert.equal(JSON.stringify(missing),beforeMissing);
  for(const change of [s=>s.settings.hourlyRate=-1,s=>s.consoles[0].clientId='missing',s=>s.consoles=s.consoles.filter(c=>c.id!==job(s).consoleId)]){
    const s=seed(),repairId=job(s).id;change(s);const before=JSON.stringify(s);
    assert.throws(()=>d.deleteRepair(s,repairId));assert.equal(JSON.stringify(s),before);
  }
});
test('Deleted repair numbers remain reserved across successive deletions and JSON restoration',()=>{
  const s=d.emptyStore(),first=d.createRepairAdmission(s,requestInput());assert.equal(first.code,'REP-001');
  d.deleteRepair(s,first.id);
  const second=d.createRepair(s,{consoleId:first.consoleId,title:'Deuxième dossier',symptoms:'',priority:'normale',dueDate:''});assert.equal(second.code,'REP-002');
  d.deleteRepair(s,second.id);
  const restored=d.validateStore(JSON.parse(JSON.stringify(s))),third=d.createRepairAdmission(restored,requestInput());
  assert.equal(third.code,'REP-003');assert.equal(restored.events.filter(e=>e.kind==='system'&&/supprimé/.test(e.text)).length,2);d.validateStore(restored);
});
test('Deleting equipment without dossiers keeps customers, other equipment and unrelated activity',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput()),first=d.createRepairAdmission(s,requestInput({clientId:client.id}));
  d.deleteRepair(s,first.id);
  const c=s.consoles.find(c=>c.id===first.consoleId),previousTrace=s.events.find(e=>e.kind==='system'&&e.text.startsWith(`Dossier ${first.code} supprimé :`));
  const other=d.createRepairAdmission(s,requestInput({brand:'Sony',model:'PlayStation',serial:'OTHER'}));
  d.addEvent(s,'Note de console à supprimer','note',{consoleId:c.id,clientId:client.id});
  d.addEvent(s,'Coordonnées client conservées','note',{clientId:client.id});
  const customers=structuredClone(s.clients),otherEquipment=structuredClone(s.consoles.filter(x=>x.id!==c.id)),otherRepairs=structuredClone(s.repairs);
  const unrelated=s.events.filter(e=>e.consoleId!==c.id);
  d.deleteConsole(s,c.id);
  assert.deepEqual(s.clients,customers);assert.deepEqual(s.consoles,otherEquipment);assert.deepEqual(s.repairs,otherRepairs);
  assert.equal(s.repairs[0].id,other.id);assert.ok(s.events.every(e=>e.consoleId!==c.id));
  assert.deepEqual(s.events.filter(e=>unrelated.some(other=>other.id===e.id)),unrelated);
  const detached=s.events.find(e=>e.id===previousTrace.id);
  assert.deepEqual(detached,{id:previousTrace.id,kind:previousTrace.kind,text:previousTrace.text,createdAt:previousTrace.createdAt,clientId:client.id});
  assert.equal(s.events[0].kind,'system');assert.equal(s.events[0].clientId,client.id);assert.equal(s.events[0].consoleId,undefined);assert.equal(s.events[0].repairId,undefined);
  assert.match(s.events[0].text,new RegExp(`^Console ${c.code} supprimée :`));assert.match(s.events[0].text,/0 dossier\(s\)/);d.validateStore(s);
});
test('Deleting equipment removes its paid closed and active dossiers, timers and journal references without refunding parts',()=>{
  const s=d.emptyStore(),client=d.createClient(s,clientInput()),otherClient=d.createClient(s,clientInput({name:'Alex'}));
  s.parts=structuredClone(seed().parts);
  const [closed]=d.createClientRepairs(s,client.id,[requestInput({serial:'TO-DELETE'})]);
  d.setRepairInterventionCost(s,closed.id,41.75);d.usePart(s,closed.id,s.parts[1].id,2);d.moveRepair(s,closed.id,'terminee');
  const [open]=d.createClientRepairs(s,client.id,[requestInput({consoleId:closed.consoleId,title:'Réparation actuelle'})]);
  d.setRepairInterventionCost(s,open.id,0);open.timerStartedAt=d.now();
  const other=d.createRepairAdmission(s,requestInput({clientId:otherClient.id,model:'Nintendo DS Lite',serial:'KEEP'}));
  d.setRepairInterventionCost(s,other.id,63.25);d.moveRepair(s,other.id,'terminee');
  const removedIds=new Set([closed.id,open.id]);
  d.addEvent(s,'Note uniquement liée au dossier clôturé','note',{repairId:closed.id});
  d.addEvent(s,'Note client uniquement liée au dossier courant','note',{clientId:client.id,repairId:open.id});
  d.addEvent(s,'Note uniquement liée à la console','note',{clientId:client.id,consoleId:closed.consoleId});
  const parts=structuredClone(s.parts),clients=structuredClone(s.clients),consoles=structuredClone(s.consoles.filter(c=>c.id!==closed.consoleId)),repairs=structuredClone(s.repairs.filter(r=>!removedIds.has(r.id)));
  const removedEventIds=s.events.filter(e=>e.consoleId===closed.consoleId||removedIds.has(e.repairId)).map(e=>e.id),unrelated=s.events.filter(e=>e.consoleId!==closed.consoleId&&!removedIds.has(e.repairId));
  d.deleteConsole(s,closed.consoleId);
  assert.deepEqual(s.clients,clients);assert.deepEqual(s.parts,parts);assert.deepEqual(s.consoles,consoles);assert.deepEqual(s.repairs,repairs);
  assert.ok(s.repairs.every(r=>!r.timerStartedAt));assert.deepEqual(d.completedRepairRevenue(s),{total:63.25,count:1});
  assert.ok(removedEventIds.every(id=>!s.events.some(e=>e.id===id)));assert.deepEqual(s.events.slice(3),unrelated);
  const traces=s.events.slice(0,3);assert.ok(traces.every(e=>e.kind==='system'&&e.clientId===client.id&&!e.consoleId&&!e.repairId));
  for(const repair of [closed,open])assert.ok(traces.some(e=>e.text.startsWith(`Dossier ${repair.code} supprimé :`)));
  assert.ok(traces.some(e=>e.text.includes(`Pièces déjà utilisées : 2 unité(s), ${d.money(d.partsCost(closed))}`)));
  assert.deepEqual(d.validateStore(JSON.parse(JSON.stringify(s))),s);
});
test('An archived console and its closed dossiers can be deleted without affecting the inventory',()=>{
  for(const stage of ['terminee','irreparable','abandonnee']){
    const s=d.emptyStore(),r=d.createRepairAdmission(s,requestInput());d.moveRepair(s,r.id,stage);s.consoles[0].archived=true;
    d.deleteConsole(s,r.consoleId);
    assert.deepEqual(s.consoles,[]);assert.deepEqual(s.repairs,[]);assert.ok(s.events.every(e=>!e.consoleId&&!e.repairId));d.validateStore(s);
  }
});
test('Console and repair numbers stay reserved when equipment deletion follows an earlier dossier deletion, including JSON backups',()=>{
  const s=d.emptyStore(),first=d.createRepairAdmission(s,requestInput()),second=d.createRepairAdmission(s,requestInput());
  assert.equal(d.nextConsoleCode(s),'CRT-003');assert.equal(second.code,'REP-002');
  d.deleteRepair(s,second.id);
  const oldTrace=structuredClone(s.events.find(e=>e.text.startsWith(`Dossier ${second.code} supprimé :`)));
  const latest=d.createRepair(s,{consoleId:second.consoleId,title:'Nouvelle intervention',symptoms:'',priority:'normale',dueDate:''});assert.equal(latest.code,'REP-003');
  d.deleteConsole(s,second.consoleId);
  const detached=s.events.find(e=>e.id===oldTrace.id);assert.equal(detached.text,oldTrace.text);assert.equal(detached.consoleId,undefined);
  let restored=d.validateStore(JSON.parse(JSON.stringify(s)));
  const third=d.createRepairAdmission(restored,requestInput());assert.equal(third.code,'REP-004');assert.equal(restored.consoles.find(c=>c.id===third.consoleId).code,'CRT-003');
  d.deleteConsole(restored,first.consoleId);d.deleteConsole(restored,third.consoleId);
  restored=d.validateStore(JSON.parse(JSON.stringify(restored)));
  assert.equal(d.nextConsoleCode(restored),'CRT-004');
  const fourth=d.createRepairAdmission(restored,requestInput());assert.equal(fourth.code,'REP-005');assert.equal(restored.consoles[0].code,'CRT-004');d.validateStore(restored);
});
test('Code reservations recognize only precise system deletion prefixes',()=>{
  const s=d.emptyStore();
  d.addEvent(s,'Console CRT-900 supprimée : titre utilisateur','note');
  d.addEvent(s,'Dossier REP-900 supprimé : titre utilisateur','note');
  d.addEvent(s,'Note : Console CRT-901 supprimée : ancienne référence','system');
  d.addEvent(s,'Note : Dossier REP-901 supprimé : ancienne référence','system');
  assert.equal(d.nextConsoleCode(s),'CRT-001');
  const r=d.createRepairAdmission(s,requestInput());assert.equal(r.code,'REP-001');assert.equal(s.consoles[0].code,'CRT-001');d.validateStore(s);
});
test('Missing consoles and invalid remaining data roll deletion back atomically',()=>{
  const missing=seed(),missingBefore=JSON.stringify(missing);
  assert.throws(()=>d.deleteConsole(missing,'missing'),/Console introuvable/);assert.equal(JSON.stringify(missing),missingBefore);
  for(const change of [s=>s.settings.hourlyRate=-1,s=>s.parts[0].quantity=-1,s=>s.consoles[1].clientId='missing']){
    const s=seed();change(s);const before=JSON.stringify(s);
    assert.throws(()=>d.deleteConsole(s,s.consoles[0].id));assert.equal(JSON.stringify(s),before);
  }
  const s=d.emptyStore(),client=d.createClient(s,clientInput()),r=d.createRepairAdmission(s,requestInput({clientId:client.id}));
  s.clients=[];const before=JSON.stringify(s);assert.throws(()=>d.deleteConsole(s,r.consoleId),/Client de journal introuvable/);assert.equal(JSON.stringify(s),before);
});
