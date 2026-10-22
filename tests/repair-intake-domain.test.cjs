const test=require('node:test');
const assert=require('node:assert/strict');
const d=require('./.compiled/domain.cjs');
const intake=require('./.compiled/repair-intake-domain.cjs');
const catalogue=require('./.compiled/repair-intake-catalog.cjs');

const input=(overrides={})=>({requestId:'e2d4e5bc-a5df-40dd-9245-8f2872ac0d30',modelId:'ps5',customModel:'',selectedFaults:[intake.faultSuggestions('ps5')[0]],description:'',serial:'',accessories:'',...overrides});
const repairPackage=(overrides={})=>({id:'synthetic-package',modelId:'ps5',fault:intake.faultSuggestions('ps5')[0],label:'Intervention fictive',amount:27.15,priceMode:'fixed',includes:'Pièces et intervention fictives, sous réserve du diagnostic.',published:true,...overrides});
function customerStore(){const store=d.emptyStore();const client=d.createClient(store,{name:'Client fictif',email:'client@example.invalid',phone:'',address:'Adresse fictive',notes:'Note privée'});return {store,client};}

test('General console choices cover every supported model once without mixing hardware generations',()=>{
  const groups=catalogue.INTAKE_MODEL_GROUPS;
  const covered=groups.flatMap(group=>group.modelIds);
  assert.equal(new Set(covered).size,covered.length);
  assert.deepEqual([...covered].sort(),catalogue.INTAKE_MODELS.map(model=>model.id).sort());
  for(const id of ['ps5-digital','ps5-slim','ps5-pro','ps4-slim','switch-oled','switch-lite','xbox-one-x','xbox-series-s','3ds-xl'])assert.ok(!groups.some(group=>group.id===id));
  for(const [modelId,general] of [['ps5-pro','ps5'],['switch-lite','switch'],['switch-2','switch-2'],['wii-u','wii-u'],['xbox-series-s','xbox-series'],['3ds-xl','3ds']])assert.equal(catalogue.intakeModelGroup(modelId).id,general);
  assert.equal(catalogue.intakeModelGroup('missing'),undefined);
  assert.ok(groups.every(group=>!/[\/]|Slim|Digital|OLED|\bXL\b/.test(group.model)));
});

test('An unspecified console version is accepted without inventing an exact Xbox Series or accessories',()=>{
  const {store,client}=customerStore();
  const request=input({modelId:'xbox-series',selectedFaults:[intake.faultSuggestions('xbox-series')[0]]});
  delete request.accessories;
  const result=intake.createPublicRepair(store,client.id,request);
  assert.equal(result.console.model,'Xbox Series');assert.equal(result.console.variant,'');assert.equal(result.console.accessories,'');
  assert.equal(result.repair.stage,'attente-envoi');assert.equal(result.repair.interventionCost,null);
  assert.equal(d.validateStore(store).consoles[0].model,'Xbox Series');
});

test('Refining a general console into a version keeps only that hardware’s valid faults',()=>{
  for(const [general,exact,removed] of [['ps5','ps5-digital','Les disques ne sont plus lus'],['switch','switch-lite','Aucune image sur le téléviseur / problème de dock'],['xbox-series','xbox-series-s','Les disques ne sont plus lus']]){
    const symptoms=intake.faultSuggestions(general);
    assert.ok(symptoms.includes(removed));
    const selected=symptoms.filter(fault=>intake.faultSuggestions(exact).includes(fault));
    assert.ok(!selected.includes(removed));assert.ok(selected.includes(intake.faultSuggestions(exact)[0]));
    assert.equal(intake.validateIntakeInput(input({modelId:exact,selectedFaults:selected})).modelId,exact);
    assert.throws(()=>intake.validateIntakeInput(input({modelId:exact,selectedFaults:[removed]})));
  }
});

test('Intake models have stable unique ids and fault suggestions fit handheld/digital equipment',()=>{
  assert.equal(new Set(intake.INTAKE_MODELS.map(model=>model.id)).size,intake.INTAKE_MODELS.length);
  assert.ok(intake.INTAKE_MODELS.some(model=>model.id==='other'));
  assert.ok(intake.INTAKE_MODELS.every(model=>model.brand&&model.model&&model.family&&intake.faultSuggestions(model.id).length));
  assert.ok(intake.faultSuggestions('ps5').some(fault=>/HDMI/.test(fault)));
  assert.ok(intake.faultSuggestions('switch').some(fault=>/drift/.test(fault)));
  assert.ok(!intake.faultSuggestions('switch-lite').some(fault=>/dock/.test(fault)));
  assert.ok(!intake.faultSuggestions('xbox-series-s').some(fault=>/disques/.test(fault)));
  assert.deepEqual(intake.faultSuggestions('missing'),[]);
  const suggestions=intake.faultSuggestions('ps5');suggestions.push('Injected');
  assert.ok(!intake.faultSuggestions('ps5').includes('Injected'));
});

test('Intake validation canonicalizes text and repeated suggestions without inventing missing details',()=>{
  const suggestion=intake.faultSuggestions('ps5')[0];
  const valid=intake.validateIntakeInput({requestId:input().requestId.toUpperCase(),modelId:' ps5 ',selectedFaults:[' '+suggestion+' ',suggestion],description:'  Problème intermittent.  ',serial:'  TEST-SERIAL  '});
  assert.deepEqual(valid,{...input(),selectedFaults:[suggestion],description:'Problème intermittent.',serial:'TEST-SERIAL'});
  assert.equal(intake.validateIntakeInput(input({selectedFaults:[],description:'Le problème est décrit ici.'})).description,'Le problème est décrit ici.');
});

test('Intake rejects forged ownership, prices, lifecycle and unknown fields',()=>{
  for(const [key,value] of Object.entries({clientId:'another-client',consoleId:'another-console',price:1,amount:0,serviceId:'synthetic-package',repairPackage:repairPackage(),interventionCost:0,payment:{amount:0},stage:'terminee',priority:'urgente',diagnosis:'Réparation garantie',addressConfirmed:true})){
    assert.throws(()=>intake.validateIntakeInput({...input(),[key]:value}),/champ non autorisé/);
  }
});

test('Intake rejects malformed identifiers, empty faults, impossible selections and oversized text',()=>{
  for(const request of [null,[],input({requestId:'not-a-uuid'}),input({requestId:'00000000-0000-0000-0000-000000000000'}),input({modelId:'unknown'}),input({selectedFaults:[]}),input({selectedFaults:['Le prix est 10 €']}),input({selectedFaults:'Aucune image'}),input({selectedFaults:new Array(11).fill(intake.faultSuggestions('ps5')[0])}),input({description:'x'.repeat(3001)}),input({serial:'x'.repeat(101)}),input({accessories:'x'.repeat(2001)}),input({description:'Test\u0000texte'}),input({customModel:'Une console imposée'})]){
    assert.throws(()=>intake.validateIntakeInput(request));
  }
  assert.throws(()=>intake.validateIntakeInput(input({modelId:'other',customModel:'',selectedFaults:[],description:'Panne'})),/modèle/);
});

test('A public request atomically creates equipment and an unpriced unpaid dossier waiting for shipment',()=>{
  const {store,client}=customerStore(),revision=store.revision;
  store.settings.publicRepairPackages=[repairPackage()];
  const created=intake.createPublicRepair(store,client.id,input({description:'Précisions du client',serial:'TEST-ONLY',accessories:'Manette de test'}));
  assert.equal(created.console.clientId,client.id);assert.equal(created.console.model,'PlayStation 5');
  assert.equal(created.console.state,'en-panne');assert.equal(created.console.location,'En attente d’envoi');
  assert.equal(created.console.acquiredAt,'');assert.equal(created.console.purchasePrice,0);assert.equal(created.console.archived,false);
  assert.equal(created.repair.publicRequestId,input().requestId);assert.equal(created.repair.stage,'attente-envoi');
  assert.equal(d.stageInfo(created.repair.stage).label,'En attente d’envoi');
  assert.equal(created.repair.interventionCost,null);assert.equal(created.repair.payment,null);
  assert.equal(created.repair.diagnosis,'');assert.equal(Object.hasOwn(created.repair,'repairPackage'),false);
  assert.equal(created.repair.priority,'normale');assert.equal(created.repair.dueDate,'');assert.equal(created.repair.completedAt,'');
  assert.equal(created.repair.timerStartedAt,'');assert.equal(created.repair.parts.length,0);assert.equal(created.repair.worklogs.length,0);
  assert.equal(created.repair.tests.length,5);assert.ok(created.repair.tests.every(check=>check.result==='pending'));
  assert.equal(created.repair.symptoms,intake.faultSuggestions('ps5')[0]+'\nPrécisions du client');
  assert.equal(store.revision,revision);assert.equal(store.consoles[0],created.console);assert.equal(store.repairs[0],created.repair);
  assert.equal(store.events[0].clientId,client.id);assert.equal(store.events[0].repairId,created.repair.id);assert.match(store.events[0].text,/attente d’envoi/);
  assert.equal(store.events[1].consoleId,created.console.id);assert.equal(store.events[1].clientId,client.id);
  assert.deepEqual(store.settings.publicRepairPackages,[repairPackage()]);
  d.validateStore(store);
});

test('Public retries preserve the original console, dossier, price, revision and event history',()=>{
  const {store,client}=customerStore(),first=intake.createPublicRepair(store,client.id,input());
  d.moveRepair(store,first.repair.id,'reception');d.setRepairInterventionCost(store,first.repair.id,39.9);
  const before=JSON.stringify(store),retry=intake.createPublicRepair(store,client.id,input({modelId:'switch',selectedFaults:[intake.faultSuggestions('switch')[0]],description:'Nouvelle description'}));
  assert.equal(retry.repair,first.repair);assert.equal(retry.console,first.console);assert.equal(JSON.stringify(store),before);
  assert.equal(retry.repair.stage,'reception');assert.equal(retry.repair.interventionCost,39.9);
});

test('Idempotency is scoped to the authenticated client and never returns another client’s dossier',()=>{
  const {store,client}=customerStore(),first=intake.createPublicRepair(store,client.id,input());
  const other=d.createClient(store,{name:'Autre client fictif',email:'other@example.invalid',phone:'',address:'',notes:''});
  const second=intake.createPublicRepair(store,other.id,input());
  assert.notEqual(first.repair.id,second.repair.id);assert.notEqual(first.console.id,second.console.id);
  assert.equal(second.console.clientId,other.id);assert.equal(store.repairs.length,2);d.validateStore(store);
});

test('Invalid public requests and missing clients leave no partially admitted console or dossier',()=>{
  for(const missingClient of [false,true]){
    const {store,client}=customerStore(),before=JSON.stringify(store);
    assert.throws(()=>intake.createPublicRepair(store,missingClient?'missing':client.id,missingClient?input():input({stage:'terminee'})));
    assert.equal(JSON.stringify(store),before);
  }
});

test('Other consoles retain the customer’s model and remain ordinary owned workshop dossiers',()=>{
  const {store,client}=customerStore();
  const {repair,console}=intake.createPublicRepair(store,client.id,input({modelId:'other',customModel:'Console de test personnalisée',selectedFaults:[],description:'Écran en panne'}));
  assert.equal(console.model,'Console de test personnalisée');assert.equal(console.brand,'Autre');assert.equal(repair.title,'Réparation Console de test personnalisée');
  d.moveRepair(store,repair.id,'reception');assert.equal(repair.stage,'reception');assert.equal(console.state,'en-reparation');d.validateStore(store);
  d.moveRepair(store,repair.id,'attente-envoi');assert.equal(console.state,'en-panne');d.validateStore(store);
});

test('Closing a historical repair preserves a newer dossier still waiting for shipment',()=>{
  const {store,client}=customerStore(),first=intake.createPublicRepair(store,client.id,input());
  d.moveRepair(store,first.repair.id,'diagnostic');
  d.publishRepairProposal(store,first.repair.id,{kind:'repair',description:'Intervention fictive acceptée pour cette recette.',repairAmount:0,buybackAmount:null,returnFee:0,bankInstructions:''});
  d.decideRepairProposal(store,first.repair.id,first.repair.proposal.id,'repair');
  d.moveRepair(store,first.repair.id,'terminee');
  const next=d.createRepair(store,{consoleId:first.console.id,title:'Nouvelle demande fictive',symptoms:'Panne différente',priority:'normale',dueDate:''});
  d.moveRepair(store,next.id,'attente-envoi');
  d.moveRepair(store,first.repair.id,'irreparable');
  assert.equal(next.stage,'attente-envoi');assert.equal(first.console.state,'en-panne');d.validateStore(store);
});

test('Receiving a public console replaces only its generated waiting-shipment location',()=>{
  const {store,client}=customerStore(),created=intake.createPublicRepair(store,client.id,input({modelId:'3ds',selectedFaults:[intake.faultSuggestions('3ds')[0]]}));
  assert.equal(created.repair.title,'Réparation Nintendo 3DS / New 3DS');
  assert.equal(created.console.location,'En attente d’envoi');
  d.moveRepair(store,created.repair.id,'reception');
  assert.equal(created.console.location,'À l’atelier');assert.equal(created.console.state,'en-reparation');d.validateStore(store);
});

test('Reception preserves an admin location and cancellation never implies physical arrival',()=>{
  for(const customLocation of ['', 'Étagère client A']){
    const {store,client}=customerStore(),created=intake.createPublicRepair(store,client.id,input());
    created.console.location=customLocation;d.moveRepair(store,created.repair.id,'reception');
    assert.equal(created.console.location,customLocation);d.validateStore(store);
  }
  const {store,client}=customerStore(),cancelled=intake.createPublicRepair(store,client.id,input());
  d.moveRepair(store,cancelled.repair.id,'abandonnee');assert.equal(cancelled.console.location,'En attente d’envoi');d.validateStore(store);
});

test('Public admissions reserve numbers from deleted consoles and dossiers',()=>{
  const {store,client}=customerStore(),first=intake.createPublicRepair(store,client.id,input());
  d.deleteConsole(store,first.console.id);
  const next=intake.createPublicRepair(store,client.id,input({requestId:'f89e8e20-7909-41dc-8a31-2a21999466c4'}));
  assert.equal(next.console.code,'CRT-002');assert.equal(next.repair.code,'REP-002');d.validateStore(store);
});

test('Shipping defaults expose the verified public shop coordinates without private workshop fields',()=>{
  const store=d.emptyStore(),before=JSON.stringify(store),settings=intake.publicIntakeSettings(store);
  assert.deepEqual(settings,{shopName:'RépaRapid · Maxxi Games',address:'30 bis, avenue de Fontainebleau',postalCode:'94270',city:'Le Kremlin-Bicêtre',phone:'01 58 46 82 51',email:'contact@reparapid.fr',addressConfirmed:true});
  assert.equal(Object.hasOwn(settings,'owner'),false);assert.equal(Object.hasOwn(settings,'hourlyRate'),false);assert.equal(JSON.stringify(store),before);
  settings.address='Changed locally';assert.notEqual(intake.publicIntakeSettings(store).address,settings.address);
});

test('Public packages default to an empty independent list and expose only published reference prices',()=>{
  const store=d.emptyStore(),before=JSON.stringify(store);
  const empty=intake.publicRepairPackages(store);assert.deepEqual(empty,[]);
  empty.push(repairPackage());assert.deepEqual(intake.publicRepairPackages(store),[]);assert.equal(JSON.stringify(store),before);
  store.settings.owner='PRIVATE_OWNER';store.settings.hourlyRate=999;
  store.settings.publicRepairPackages=[repairPackage({id:'free-package',amount:0}),repairPackage({id:'from-package',amount:45.5,priceMode:'from'}),repairPackage({id:'hidden-package',label:'PRIVATE_DRAFT_PACKAGE',published:false})];
  const configured=JSON.stringify(store),published=intake.publicRepairPackages(store);
  assert.equal(published.length,2);assert.equal(published[0].amount,0);assert.equal(published[1].priceMode,'from');
  assert.deepEqual(Object.keys(published[0]).sort(),['amount','fault','id','includes','label','modelId','priceMode']);
  assert.ok(!JSON.stringify(published).includes('PRIVATE'));assert.ok(!JSON.stringify(published).includes('published'));
  assert.notEqual(published[0],store.settings.publicRepairPackages[0]);assert.equal(JSON.stringify(store),configured);
  published[0].label='Changed locally';assert.equal(intake.publicRepairPackages(store)[0].label,'Intervention fictive');
});

test('Package validation preserves stable ids, canonical text, zero and the maximum cent price',()=>{
  const raw=[repairPackage({id:'  synthetic-package  ',modelId:' ps5 ',fault:' '+intake.faultSuggestions('ps5')[0]+' ',label:' Intervention fictive ',includes:' Inclus fictif ',amount:0}),repairPackage({id:'maximum',amount:100000,priceMode:'from',published:false}),repairPackage({id:'cent-price',amount:0.29}),repairPackage({id:'usual-price',amount:79.99})],before=structuredClone(raw);
  const valid=d.validatePublicRepairPackages(raw);
  assert.deepEqual(valid[0],repairPackage({amount:0,includes:'Inclus fictif'}));assert.equal(valid[1].amount,100000);assert.equal(valid[2].amount,0.29);assert.equal(valid[3].amount,79.99);
  assert.deepEqual(raw,before);assert.notEqual(valid[0],raw[0]);
  const store=d.emptyStore();store.settings.publicRepairPackages=raw;
  assert.deepEqual(d.validateStore(store).settings.publicRepairPackages,valid);
});

test('Packages reject malformed grids, unknown fields, mismatched equipment, invalid precision and useless descriptions',()=>{
  for(const raw of [null,{},'packages',[null],[[]],new Array(1),new Array(201).fill(repairPackage())])assert.throws(()=>d.validatePublicRepairPackages(raw));
  const invalid=[{id:''},{id:'invalid id'},{id:'x'.repeat(121)},{modelId:'other'},{modelId:'missing'},
    {modelId:'ps5-digital',fault:'Les disques ne sont plus lus'},{fault:intake.faultSuggestions('switch')[1]},
    {amount:-1},{amount:100000.01},{amount:1.001},{amount:1.005},{amount:NaN},{amount:Infinity},{amount:'27.15'},
    {priceMode:'estimated'},{published:'true'},{published:undefined},{label:' '},{label:'x'.repeat(161)},
    {includes:''},{includes:'x'.repeat(1001)},{label:'Text\u0000invalid'},{includes:'Text\u0007invalid'},
    {privateNotes:'Must not enter a public package'}];
  for(const override of invalid){
    const raw=[repairPackage(override)];assert.throws(()=>d.validatePublicRepairPackages(raw));
    const store=d.emptyStore();store.settings.publicRepairPackages=raw;assert.throws(()=>d.validateStore(store),/Sauvegarde invalide/);
  }
  assert.throws(()=>d.validatePublicRepairPackages([repairPackage(),repairPackage({id:' synthetic-package '})]),/uniques/);
});

test('Backups retain configured packages and accept absent legacy or explicitly empty catalogues',()=>{
  const store=d.emptyStore();store.settings.publicRepairPackages=[repairPackage(),repairPackage({id:'draft',published:false})];
  const restored=d.validateStore(JSON.parse(JSON.stringify(store)));
  assert.deepEqual(restored.settings.publicRepairPackages,store.settings.publicRepairPackages);
  assert.notEqual(restored.settings.publicRepairPackages[0],store.settings.publicRepairPackages[0]);
  delete store.settings.publicRepairPackages;
  assert.equal(Object.hasOwn(d.validateStore(store).settings,'publicRepairPackages'),false);
  store.settings.publicRepairPackages=[];assert.deepEqual(d.validateStore(store).settings.publicRepairPackages,[]);
});

test('Saved shipping coordinates can disable shipment and must be complete before confirmation',()=>{
  const store=d.emptyStore();
  store.settings.publicIntake={shopName:'Atelier fictif',address:'',postalCode:'94270',city:'Le Kremlin-Bicêtre',phone:'',email:'',addressConfirmed:false};
  assert.equal(intake.publicIntakeSettings(store).addressConfirmed,false);assert.equal(d.validateStore(store).settings.publicIntake.address,'');
  for(const override of [{addressConfirmed:true},{postalCode:'abcde'},{email:'invalid'},{addressConfirmed:'true'},{shopName:' '}]){
    assert.throws(()=>d.validateStore({...store,settings:{...store.settings,publicIntake:{...store.settings.publicIntake,...override}}}));
  }
  const confirmed={...store.settings.publicIntake,address:'Adresse de test',addressConfirmed:true};
  store.settings.publicIntake=confirmed;
  const projected=intake.publicIntakeSettings(store);assert.deepEqual(projected,confirmed);assert.notEqual(projected,confirmed);
});

test('Backups preserve public settings and idempotency while legacy backups need no new fields',()=>{
  const {store,client}=customerStore();store.settings.publicIntake=intake.publicIntakeSettings(store);
  const created=intake.createPublicRepair(store,client.id,input());
  const restored=d.validateStore(JSON.parse(JSON.stringify(store)));
  assert.deepEqual(restored.settings.publicIntake,store.settings.publicIntake);assert.equal(restored.repairs[0].publicRequestId,created.repair.publicRequestId);
  assert.equal(restored.repairs[0].stage,'attente-envoi');
  const before=JSON.stringify(restored);intake.createPublicRepair(restored,client.id,input());assert.equal(JSON.stringify(restored),before);
  const legacy=d.validateStore(d.emptyStore());assert.equal(Object.hasOwn(legacy.settings,'publicIntake'),false);
});

test('Backups reject malformed and duplicate request identifiers and public requests without a client',()=>{
  for(const requestId of ['',false,123,'invalid','00000000-0000-0000-0000-000000000000']){
    const {store,client}=customerStore(),created=intake.createPublicRepair(store,client.id,input());created.repair.publicRequestId=requestId;
    assert.throws(()=>d.validateStore(store),/demande publique|texte/);
  }
  const {store,client}=customerStore(),first=intake.createPublicRepair(store,client.id,input());
  const second=intake.createPublicRepair(store,client.id,input({requestId:'f89e8e20-7909-41dc-8a31-2a21999466c4'}));
  second.repair.publicRequestId=first.repair.publicRequestId;
  assert.throws(()=>d.validateStore(store),/demandes publiques dupliqués/);
  second.repair.publicRequestId='f89e8e20-7909-41dc-8a31-2a21999466c4';
  delete store.consoles.find(console=>console.id===first.console.id).clientId;assert.throws(()=>d.validateStore(store),/demande publique sans client/);
});
