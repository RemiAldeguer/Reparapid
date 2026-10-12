import test from 'node:test';
import assert from 'node:assert/strict';
import invoice from './.compiled/invoice-domain.cjs';
import domain from './.compiled/domain.cjs';

const seller={name:'Atelier Démonstration',address:'12 rue du Jeu\n75001 Paris',registration:'Identifiant synthétique',email:'seller@example.invalid',phone:'0100000000',vatNumber:''};
function fixture() {
  const store=domain.emptyStore(),client=domain.createClient(store,{name:'Camille Facture',address:'4 rue Console\n69001 Lyon',email:'invoice@example.invalid',phone:'0200000000',notes:'NOTE CLIENT PRIVÉE'});
  const repairs=domain.createClientRepairs(store,client.id,[
    {brand:'Nintendo',model:'DS Lite',serial:'DEMO-DSL',accessories:'',title:'Réparation écran',symptoms:' Écran supérieur cassé ',priority:'normale',dueDate:''},
    {brand:'Nintendo',model:'Game Boy Color',serial:'DEMO-GBC',accessories:'',title:'Boutons défectueux',symptoms:'',priority:'normale',dueDate:''},
  ]);
  store.consoles.find(item=>item.id===repairs[0].consoleId).variant='Blanc';
  for(const repair of repairs){domain.setRepairInterventionCost(store,repair.id,35);repair.diagnosis='DIAGNOSTIC PRIVÉ';repair.tests[0].label='TEST PRIVÉ';}
  const input={repairIds:repairs.map(item=>item.id),number:'DEMO-2026-001',issueDate:'2026-10-11',dueDate:'2026-10-31',seller:{...seller},taxMode:'none',taxRate:0,taxNote:'Mention fiscale saisie par le vendeur.',notes:'Merci pour votre confiance.'};
  return {store,client,repairs,input};
}
function frozen(value) {
  if(value&&typeof value==='object'){Object.freeze(value);for(const item of Object.values(value))frozen(item);}return value;
}
function unchangedFailure(store,input,pattern) {
  const before=JSON.stringify({store,input});assert.throws(()=>invoice.buildInvoice(store,input),pattern);assert.equal(JSON.stringify({store,input}),before);
}

test('A multi-console invoice copies current identity, public faults and repair totals into a bounded snapshot',()=>{
  const {store,client,repairs,input}=fixture(),before=JSON.stringify({store,input});
  const result=invoice.buildInvoice(store,input);
  assert.deepEqual(Object.keys(result).sort(),['customer','dueDate','format','issueDate','lines','notes','number','seller','subtotal','tax','taxMode','taxNote','taxRate','total']);
  assert.equal(result.format,'complete');
  assert.equal(result.number,'DEMO-2026-001');assert.deepEqual(result.customer,{id:client.id,name:client.name,address:client.address,email:client.email,phone:client.phone});
  assert.deepEqual(result.seller,seller);assert.equal(result.total,70);assert.equal(result.subtotal,70);assert.equal(result.tax,0);
  assert.deepEqual(result.lines.map(item=>item.repairId),repairs.map(item=>item.id));assert.equal(result.lines[0].consoleName,'Nintendo DS Lite');assert.equal(result.lines[0].variant,'Blanc');assert.equal(result.lines[0].serial,'DEMO-DSL');
  assert.equal(result.lines[0].fault,'Écran supérieur cassé');assert.equal(result.lines[1].fault,'Boutons défectueux');assert.equal(result.lines[0].serviceDate,'');
  assert.deepEqual(Object.keys(result.lines[0]).sort(),['amount','consoleName','fault','repairCode','repairId','serial','serviceDate','title','variant']);
  assert.doesNotMatch(JSON.stringify(result),/DIAGNOSTIC PRIVÉ|NOTE CLIENT PRIVÉE|TEST PRIVÉ/);assert.equal(JSON.stringify({store,input}),before);
});

test('A snapshot is deeply frozen, detached from workshop edits and safe to build from frozen inputs',()=>{
  const {store,input}=fixture(),result=invoice.buildInvoice(frozen(store),frozen(input));
  assert.ok(Object.isFrozen(result));assert.ok(Object.isFrozen(result.seller));assert.ok(Object.isFrozen(result.customer));assert.ok(Object.isFrozen(result.lines));assert.ok(result.lines.every(Object.isFrozen));
  assert.throws(()=>{result.total=1;},TypeError);assert.throws(()=>{result.lines[0].fault='changed';},TypeError);assert.throws(()=>{result.customer.name='changed';},TypeError);
  const changed=structuredClone(store);changed.clients[0].name='Client modifié';changed.consoles[0].model='Console modifiée';changed.repairs[0].interventionCost=999;
  assert.equal(result.customer.name,'Camille Facture');assert.equal(result.lines[0].consoleName,'Nintendo DS Lite');assert.equal(result.total,70);
});

test('Editable billing coordinates override only contact fields while ownership stays determined by repairs',()=>{
  const {store,client,input}=fixture();input.customer={name:' Société du client ',address:' Adresse de facturation\nParis ',email:' BILLING@EXAMPLE.INVALID ',phone:' 0300000000 '};
  const result=invoice.buildInvoice(store,input);
  assert.deepEqual(result.customer,{id:client.id,name:'Société du client',address:'Adresse de facturation\nParis',email:'billing@example.invalid',phone:'0300000000'});assert.notEqual(result.customer,input.customer);
  unchangedFailure(store,{...input,customer:{...input.customer,id:'other-client'}},/coordonnées|client|invalide/);
  unchangedFailure(store,{...input,clientId:'other-client'},/invalide/);unchangedFailure(store,{...input,customer:null},/invalide/);
});

test('Canonical prices include consumed parts once, retain free interventions and ignore historical receipts and a running timer',()=>{
  const {store,repairs,input}=fixture(),repair=repairs[0];input.repairIds=[repair.id];
  store.settings.hourlyRate=50;const part={id:domain.uid(),reference:'INVOICE-PART',name:'Pièce facturée',category:'',compatibility:'',quantity:10,threshold:0,unitCost:2.5,location:'',supplier:''};
  store.parts.push(part);domain.usePart(store,repair.id,part.id,3);repair.interventionCost=null;repair.worklogs.push({id:domain.uid(),minutes:30,note:'TEMPS PRIVÉ',createdAt:domain.now()});repair.timerStartedAt='2000-01-01T00:00:00.000Z';repair.payment={amount:999.99,paidAt:domain.now()};
  assert.equal(invoice.buildInvoice(store,input).total,32.5);repair.interventionCost=0;assert.equal(invoice.buildInvoice(store,input).total,7.5);
  repair.parts=[];assert.equal(invoice.buildInvoice(store,input).total,0);assert.equal(invoice.buildInvoice(store,input).lines[0].amount,0);
  repair.interventionCost=1.005;assert.equal(invoice.buildInvoice(store,input).total,1.01);
});

test('Included VAT is extracted globally in cents without increasing the total price',()=>{
  const {store,repairs,input}=fixture();input.taxMode='included';input.taxRate=20;input.seller.vatNumber='TVA-SYNTHETIQUE';
  for(const repair of repairs)repair.interventionCost=0.03;
  const result=invoice.buildInvoice(store,input);assert.equal(result.total,0.06);assert.equal(result.subtotal,0.05);assert.equal(result.tax,0.01);assert.equal(result.taxRate,20);
  assert.equal(result.lines.reduce((sum,line)=>sum+Math.round(line.amount*100),0),Math.round(result.total*100));assert.equal(Math.round(result.subtotal*100)+Math.round(result.tax*100),Math.round(result.total*100));
  repairs[0].interventionCost=60;repairs[1].interventionCost=60;assert.equal(invoice.buildInvoice(store,input).total,120);
  const whole=invoice.buildInvoice(store,input);assert.equal(whole.subtotal,100);assert.equal(whole.tax,20);
  input.taxRate=100;const maximum=invoice.buildInvoice(store,input);assert.equal(maximum.subtotal,60);assert.equal(maximum.tax,60);
});

test('No-VAT mode adds no legal exemption and a zero included rate needs no VAT identity',()=>{
  const {store,input}=fixture();input.taxRate=20;input.taxNote='';const noVAT=invoice.buildInvoice(store,input);
  assert.equal(noVAT.taxRate,0);assert.equal(noVAT.tax,0);assert.equal(noVAT.taxNote,'');assert.equal(noVAT.subtotal,noVAT.total);
  input.taxMode='included';input.taxRate=0;assert.equal(invoice.buildInvoice(store,input).tax,0);
  input.taxRate=20;unchangedFailure(store,input,/numéro de TVA.*obligatoire/);
});

test('Repair selection rejects duplicates, unknown records, personal collection consoles and mixed clients',()=>{
  const {store,client,repairs,input}=fixture();
  for(const repairIds of [[],[repairs[0].id,repairs[0].id],['unknown'],['bad id'],[null]])unchangedFailure(store,{...input,repairIds});
  const consoleItem=store.consoles.find(item=>item.id===repairs[0].consoleId);
  for(const owner of ['',undefined,'missing-client']){const candidate=structuredClone(store);candidate.consoles.find(item=>item.id===consoleItem.id).clientId=owner;unchangedFailure(candidate,input,/client existant/);}
  const other=domain.createClient(store,{name:'Autre client',address:'Autre adresse',email:'another@example.invalid',phone:'',notes:''});store.consoles.find(item=>item.id===repairs[1].consoleId).clientId=other.id;
  unchangedFailure(store,input,/même client/);assert.equal(client.id,store.consoles.find(item=>item.id===repairs[0].consoleId).clientId);
  const missingConsole=structuredClone(store);missingConsole.consoles=missingConsole.consoles.filter(item=>item.id!==consoleItem.id);unchangedFailure(missingConsole,input,/client existant/);
});

test('The generator accepts exactly 100 repairs, preserves selection order and rejects larger requests',()=>{
  const {store,repairs,input}=fixture(),base=repairs[0];
  store.repairs=Array.from({length:101},(_,index)=>({...structuredClone(base),id:`invoice-repair-${index}`,code:`RP-${index}`}));
  input.repairIds=store.repairs.slice(0,100).reverse().map(item=>item.id);
  const result=invoice.buildInvoice(store,input);assert.equal(result.lines.length,100);assert.equal(result.total,3500);assert.deepEqual(result.lines.map(item=>item.repairId),input.repairIds);
  unchangedFailure(store,{...input,repairIds:store.repairs.map(item=>item.id)},/1 à 100/);
});

test('Required seller and customer identities, addresses, registration and manual number are validated without mutations',()=>{
  const {store,input}=fixture();
  for(const value of ['', '   ',null,42])unchangedFailure(store,{...input,number:value});
  for(const key of ['name','address','registration'])for(const value of ['', ' ',null])unchangedFailure(store,{...input,seller:{...input.seller,[key]:value}});
  for(const key of ['name','address'])for(const value of ['', ' ',null]){const candidate=structuredClone(store);candidate.clients[0][key]=value;unchangedFailure(candidate,input);}
  const emptyAddress=structuredClone(store);emptyAddress.clients[0].address='';
  const result=invoice.buildInvoice(emptyAddress,{...input,customer:{name:'Client',address:'Adresse manuelle',email:'',phone:''}});assert.equal(result.customer.address,'Adresse manuelle');
});

test('Strict bounded text accepts multiline addresses and notes but refuses control characters and unknown fields',()=>{
  const {store,input}=fixture();
  const invalid=[{...input,number:'x'.repeat(81)},{...input,number:'DEMO\nInjected'},{...input,notes:'x'.repeat(3001)},{...input,taxNote:'x'.repeat(1001)},{...input,notes:'Note\u0000'},
    {...input,seller:{...seller,name:'x'.repeat(201)}},{...input,seller:{...seller,address:'x'.repeat(1001)}},{...input,seller:{...seller,registration:'x'.repeat(121)}},
    {...input,seller:{...seller,email:'x'.repeat(255)}},{...input,seller:{...seller,email:'invalid'}},{...input,seller:{...seller,phone:'x'.repeat(81)}},
    {...input,seller:{...seller,vatNumber:'x'.repeat(81)}},{...input,seller:{...seller,phone:'123\n456'}},{...input,seller:{...seller,extra:'ignored'}},
    {...input,customer:[]},{...input,notes:null},{...input,number:undefined},null,[], 'text'];
  for(const candidate of invalid)unchangedFailure(store,candidate);
  const boundaries={...input,number:'x'.repeat(80),seller:{...seller,name:'n'.repeat(200),address:'a'.repeat(1000),registration:'r'.repeat(120),phone:'p'.repeat(80),vatNumber:'v'.repeat(80)},notes:'n'.repeat(3000),taxNote:'t'.repeat(1000)};
  assert.equal(invoice.buildInvoice(store,boundaries).number.length,80);
});

test('Tax rates and modes reject unsupported, nonfinite and out-of-range values in either mode',()=>{
  const {store,input}=fixture();
  for(const taxRate of [-1,100.01,NaN,Infinity,'20',null,undefined])for(const taxMode of ['none','included'])unchangedFailure(store,{...input,taxMode,taxRate},/taux de TVA/);
  for(const taxMode of ['other',null,undefined,{},['none']])unchangedFailure(store,{...input,taxMode},/mode de TVA/);
  const rate=invoice.buildInvoice(store,{...input,taxMode:'included',taxRate:5.5,seller:{...seller,vatNumber:'TVA-SYNTHETIQUE'}});assert.equal(rate.taxRate,5.5);assert.equal(rate.total,70);
});

test('Real issue and due calendar dates enforce chronological order across leap dates and year boundaries',()=>{
  const {store,input}=fixture();
  for(const value of ['2026-02-29','2026-02-31','2026-13-01','2026-00-01','2026-10-00','0000-01-01','2026-1-01','2026-10-11T00:00:00Z','',null]){
    unchangedFailure(store,{...input,issueDate:value});unchangedFailure(store,{...input,dueDate:value});
  }
  unchangedFailure(store,{...input,dueDate:'2026-10-10'},/égale ou postérieure/);
  assert.equal(invoice.buildInvoice(store,{...input,issueDate:'2024-02-29',dueDate:'2024-02-29'}).issueDate,'2024-02-29');
  assert.equal(invoice.buildInvoice(store,{...input,issueDate:'0099-12-31',dueDate:'0100-01-01'}).issueDate,'0099-12-31');
  assert.equal(invoice.buildInvoice(store,{...input,issueDate:'9999-12-31',dueDate:'9999-12-31'}).dueDate,'9999-12-31');
});

test('Paris dates respect midnight and daylight-saving changes, with completion dates distinct from issuance',()=>{
  assert.equal(invoice.invoiceToday(new Date('2026-07-10T22:30:00Z')),'2026-07-11');assert.equal(invoice.invoiceToday(new Date('2026-01-10T22:30:00Z')),'2026-01-10');
  assert.equal(invoice.invoiceToday(new Date('2026-03-29T00:30:00Z')),'2026-03-29');assert.equal(invoice.invoiceToday(new Date('2026-03-29T01:30:00Z')),'2026-03-29');
  assert.equal(invoice.invoiceToday(new Date('2026-10-25T00:30:00Z')),'2026-10-25');assert.equal(invoice.invoiceToday(new Date('2026-10-25T01:30:00Z')),'2026-10-25');
  for(const date of [new Date('invalid'),'2026-10-11',null,new Date('0000-01-01T00:00:00Z')])assert.throws(()=>invoice.invoiceToday(date));
  const {store,repairs,input}=fixture();repairs[0].completedAt='2026-07-10T22:30:00.000Z';
  const result=invoice.buildInvoice(store,input);assert.equal(result.lines[0].serviceDate,'2026-07-11');assert.equal(result.lines[1].serviceDate,'');assert.equal(result.issueDate,'2026-10-11');
  repairs[0].completedAt='invalid';unchangedFailure(store,input,/date.*invalide/);
});

test('Invalid or unsafe repair prices never produce a snapshot or change the current workshop',()=>{
  const {store,repairs,input}=fixture();
  for(const amount of [-1,Infinity,NaN,1e14]){const candidate=structuredClone(store);candidate.repairs.find(item=>item.id===repairs[0].id).interventionCost=amount;unchangedFailure(candidate,input,/montant.*invalide|trop élevé/);}
  const broken=structuredClone(store);broken.settings.hourlyRate=Infinity;delete broken.repairs.find(item=>item.id===repairs[0].id).interventionCost;unchangedFailure(broken,input,/montant.*invalide|trop élevé/);
});

test('Valid stored fault descriptions remain supported up to the domain limit of 30000 characters',()=>{
  const {store,repairs,input}=fixture();input.repairIds=[repairs[0].id];
  for(const length of [6001,30000]){
    repairs[0].symptoms='p'.repeat(length);domain.validateStore(store);
    assert.equal(invoice.buildInvoice(store,input).lines[0].fault.length,length);
  }
  repairs[0].symptoms='p'.repeat(30001);unchangedFailure(store,input,/panne.*maximum 30000/);
});

test('Simple invoices need only repair selection and issuance date, without legal contacts, address or manual number',()=>{
  const {store,client,repairs}=fixture();client.address='';client.email='';client.phone='';store.settings.workshop='Atelier Simple';
  const input={format:'simple',repairIds:repairs.map(item=>item.id),issueDate:'2026-10-11'},before=JSON.stringify({store,input});
  const result=invoice.buildInvoice(store,input);
  assert.equal(result.format,'simple');assert.equal(result.number,'');assert.equal(result.notes,'');assert.equal(result.issueDate,'2026-10-11');assert.equal(result.dueDate,'');
  assert.deepEqual(result.seller,{name:'Atelier Simple',address:'',registration:'',email:'',phone:'',vatNumber:''});
  assert.deepEqual(result.customer,{id:client.id,name:client.name,address:'',email:'',phone:''});
  assert.equal(result.total,70);assert.equal(result.subtotal,70);assert.equal(result.tax,0);assert.equal(result.taxMode,'none');assert.equal(result.taxRate,0);assert.equal(result.taxNote,'');
  assert.equal(result.lines[0].consoleName,'Nintendo DS Lite');assert.equal(result.lines[0].fault,'Écran supérieur cassé');assert.equal(result.lines[1].fault,'Boutons défectueux');
  assert.equal(JSON.stringify({store,input}),before);assert.ok(Object.isFrozen(result));assert.ok(Object.isFrozen(result.seller));assert.ok(Object.isFrozen(result.customer));assert.ok(Object.isFrozen(result.lines));
});

test('Simple snapshots use selected identities and never copy legal or contact data from hidden complete drafts or the store',()=>{
  const {store,client,input}=fixture();store.settings.workshop='Atelier Public';
  client.address='ADRESSE PRIVÉE CLIENT';client.email='private-client@example.invalid';client.phone='PHONE PRIVÉ CLIENT';
  const draft={...input,format:'simple',seller:{name:'NOM VENDEUR PRIVÉ',address:'ADRESSE VENDEUR PRIVÉE',registration:'REGISTRATION PRIVÉE',email:'private-seller@example.invalid',phone:'PHONE PRIVÉ VENDEUR',vatNumber:'TVA PRIVÉE'},
    customer:{name:'NOM CONTACT PRIVÉ',address:'ADRESSE CONTACT PRIVÉE',email:'private-billing@example.invalid',phone:'PHONE CONTACT PRIVÉ'},taxMode:'included',taxRate:20,taxNote:'MENTION FISCALE PRIVÉE',dueDate:'not-a-date'};
  const result=invoice.buildInvoice(store,draft);
  assert.equal(result.seller.name,'Atelier Public');assert.equal(result.customer.id,client.id);assert.equal(result.customer.name,'Camille Facture');
  assert.doesNotMatch(JSON.stringify(result),/PRIVÉ|private-|MENTION FISCALE|not-a-date/);assert.equal(result.taxMode,'none');assert.equal(result.tax,0);assert.equal(result.dueDate,'');
  assert.equal(result.number,input.number);assert.equal(result.notes,input.notes);assert.notEqual(result.seller,draft.seller);assert.notEqual(result.customer,draft.customer);
});

test('Simple totals use current canonical repair costs once and preserve zero totals and Paris completion dates',()=>{
  const {store,repairs}=fixture(),repair=repairs[0],input={format:'simple',repairIds:[repair.id],issueDate:'2026-10-11',number:'  SIMPLE-1  ',notes:'  Note libre\nMerci.  '};
  const part={id:domain.uid(),reference:'SIMPLE-PART',name:'Pièce de facture',category:'',compatibility:'',quantity:3,threshold:0,unitCost:2.5,location:'',supplier:''};
  store.parts.push(part);domain.usePart(store,repair.id,part.id,2);repair.interventionCost=10;repair.completedAt='2026-07-10T22:30:00.000Z';
  const result=invoice.buildInvoice(store,input);assert.equal(result.total,15);assert.equal(result.lines[0].amount,15);assert.equal(result.lines[0].serviceDate,'2026-07-11');assert.equal(result.number,'SIMPLE-1');assert.equal(result.notes,'Note libre\nMerci.');
  repair.parts=[];repair.interventionCost=0;const free=invoice.buildInvoice(store,input);assert.equal(free.total,0);assert.equal(free.subtotal,0);assert.equal(free.tax,0);
});

test('Simple mode keeps ownership, one-customer selection, real dates, money safety and bounded public text validation',()=>{
  const {store,repairs}=fixture(),input={format:'simple',repairIds:repairs.map(item=>item.id),issueDate:'2026-10-11'};
  for(const overrides of [{repairIds:[]},{repairIds:[repairs[0].id,repairs[0].id]},{repairIds:['unknown']},{repairIds:Array.from({length:101},(_,i)=>`repair-${i}`)},
    {issueDate:'2026-02-29'},{issueDate:''},{number:'x'.repeat(81)},{number:null},{number:'SIMPLE\nINVALID'},{notes:'x'.repeat(3001)},{notes:null},{notes:'Note\u0000'},{clientId:'foreign'}])unchangedFailure(store,{...input,...overrides});
  const personal=structuredClone(store);personal.consoles.find(item=>item.id===repairs[0].consoleId).clientId='';unchangedFailure(personal,input,/client existant/);
  const mixed=structuredClone(store),other=domain.createClient(mixed,{name:'Autre client simple',address:'',email:'',phone:'',notes:''});
  mixed.consoles.find(item=>item.id===repairs[1].consoleId).clientId=other.id;unchangedFailure(mixed,input,/même client/);
  const unsafe=structuredClone(store);unsafe.repairs.find(item=>item.id===repairs[0].id).interventionCost=Infinity;unchangedFailure(unsafe,input,/montant/);
  const unnamed=structuredClone(store);unnamed.settings.workshop='';unchangedFailure(unnamed,input,/nom de l’atelier.*obligatoire/);
  const nameless=structuredClone(store);nameless.clients[0].name='';unchangedFailure(nameless,input,/nom du client.*obligatoire/);
});

test('Complete remains the default and validates its legal fields when changing back from a simple draft',()=>{
  const {store,input}=fixture();assert.deepEqual(invoice.buildInvoice(store,input),invoice.buildInvoice(store,{...input,format:'complete'}));
  const minimal={format:'simple',repairIds:input.repairIds,issueDate:input.issueDate};assert.equal(invoice.buildInvoice(store,minimal).format,'simple');
  unchangedFailure(store,{...minimal,format:'complete'},/numéro.*invalide|obligatoire/);
  unchangedFailure(store,{...input,format:'complete',seller:{...seller,registration:''}},/immatriculation.*obligatoire/);
  for(const format of ['other',null,[],{},'constructor'])unchangedFailure(store,{...input,format},/simple ou complète/);
});
