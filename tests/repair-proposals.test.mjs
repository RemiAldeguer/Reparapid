import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url),d=require('./.compiled/domain.cjs'),invoice=require('./.compiled/invoice-domain.cjs'),finance=require('./.compiled/finance-domain.cjs');
const terms=(overrides={})=>({kind:'repair',description:'Remplacement du connecteur de test, pièce et intervention incluses.',repairAmount:89.9,buybackAmount:null,returnFee:12.5,bankInstructions:'Coordonnées bancaires fictives à communiquer au client du dossier.',...overrides});
function fixture({website=false}={}){
  const s=d.emptyStore(),client=d.createClient(s,{name:'Client fictif',email:'client@example.invalid',phone:'',address:'Adresse fictive',notes:'Note interne à préserver'});
  const r=d.createRepairAdmission(s,{clientId:client.id,brand:'Nintendo',model:'Switch',serial:'TEST-ONLY',accessories:'Console seule',title:'Demande fictive',symptoms:'Ne charge plus',priority:'normale',dueDate:''});
  d.moveRepair(s,r.id,'diagnostic');r.diagnosis='Diagnostic strictement interne';
  if(website)r.publicRequestId=d.uid();
  const c=s.consoles.find(item=>item.id===r.consoleId);
  return {s,r,c,client};
}
function publish(f,input=terms()){
  assert.equal(d.publishRepairProposal(f.s,f.r.id,input),true);
  return f.r.proposal;
}
function unchanged(s,action,pattern){
  const before=JSON.stringify(s);assert.throws(action,pattern);assert.equal(JSON.stringify(s),before);
}

test('Diagnostic publication keeps public terms, private diagnosis and internal costs separate',()=>{
  const f=fixture();d.setRepairTotalCost(f.s,f.r.id,34.5);const cost=d.repairTotalCost(f.s,f.r),stock=structuredClone(f.s.parts);
  const p=publish(f,terms({description:'  Intervention publique  ',bankInstructions:'  Instructions fictives  '}));
  assert.equal(p.description,'Intervention publique');assert.equal(p.bankInstructions,'Instructions fictives');
  assert.equal(p.decision,'pending');assert.equal(p.decidedAt,'');assert.equal(p.returnPaidAt,'');assert.equal(p.returnedAt,'');assert.equal(p.tracking,'');
  assert.equal(f.r.diagnosis,'Diagnostic strictement interne');assert.equal(d.repairTotalCost(f.s,f.r),cost);
  assert.equal(d.repairChargeAmount(f.s,f.r),0);assert.equal(f.r.payment,null);assert.deepEqual(f.s.parts,stock);
  assert.equal(f.s.repairs[0],f.r);assert.equal(f.s.consoles[0],f.c);assert.ok(p.id);assert.ok(p.publishedAt);d.validateStore(f.s);
});

test('Zero-valued repair, buyback and return terms remain explicit through backups',()=>{
  for(const input of [terms({repairAmount:0,returnFee:0,bankInstructions:''}),terms({kind:'unrepairable',repairAmount:null,buybackAmount:0,returnFee:0,bankInstructions:''}),terms({kind:'unrepairable',repairAmount:null,buybackAmount:null})]){
    const f=fixture(),p=publish(f,input),restored=d.validateStore(JSON.parse(JSON.stringify(f.s)));
    assert.deepEqual(restored.repairs[0].proposal,p);assert.equal(restored.repairs[0].proposal.buybackAmount,input.buybackAmount);
  }
});

test('Only customer-owned diagnostic dossiers can publish, with no partial writes on failure',()=>{
  const f=fixture();d.moveRepair(f.s,f.r.id,'reception');unchanged(f.s,()=>d.publishRepairProposal(f.s,f.r.id,terms()),/diagnostic/);
  d.moveRepair(f.s,f.r.id,'diagnostic');f.c.clientId='';unchanged(f.s,()=>d.publishRepairProposal(f.s,f.r.id,terms()),/client/);
  const paid=fixture();d.setRepairPayment(paid.s,paid.r.id,true);unchanged(paid.s,()=>d.publishRepairProposal(paid.s,paid.r.id,terms()),/règlement/);
});

test('Malformed terms, missing fees and fabricated fields are rejected atomically',()=>{
  const invalid=[null,[],terms({kind:'unknown'}),terms({description:''}),terms({description:'x'.repeat(5001)}),terms({description:'Test\0texte'}),terms({bankInstructions:'x'.repeat(3001)}),terms({returnFee:undefined}),terms({returnFee:12.501}),terms({returnFee:-1}),terms({returnFee:100000.01}),terms({returnFee:'12.50'}),terms({bankInstructions:' '}),terms({repairAmount:null}),terms({repairAmount:NaN}),terms({repairAmount:Infinity}),terms({repairAmount:12.001}),terms({repairAmount:'89.90'}),terms({buybackAmount:10}),terms({kind:'unrepairable'}),terms({kind:'unrepairable',repairAmount:null,buybackAmount:-1}),{...terms(),decision:'repair'}];
  for(const input of invalid){const f=fixture();unchanged(f.s,()=>d.publishRepairProposal(f.s,f.r.id,input));}
});

test('Republishing unchanged terms is idempotent and changed terms invalidate stale answers',()=>{
  const f=fixture(),p=publish(f),before=JSON.stringify(f.s);
  assert.equal(d.publishRepairProposal(f.s,f.r.id,terms()),false);assert.equal(JSON.stringify(f.s),before);
  assert.equal(d.publishRepairProposal(f.s,f.r.id,terms({repairAmount:95})),true);assert.notEqual(f.r.proposal.id,p.id);
  unchanged(f.s,()=>d.decideRepairProposal(f.s,f.r.id,p.id,'repair'),/changé/);
  assert.equal(d.decideRepairProposal(f.s,f.r.id,f.r.proposal.id,'repair'),true);assert.equal(f.r.proposal.repairAmount,95);
});

test('Pending proposals hold the diagnostic and cannot be closed or bypassed',()=>{
  const f=fixture();publish(f);
  for(const stage of d.STAGES.map(item=>item.id).filter(stage=>stage!=='diagnostic'))unchanged(f.s,()=>d.moveRepair(f.s,f.r.id,stage),/réponse|accord/i);
  d.moveRepair(f.s,f.r.id,'diagnostic');assert.equal(f.r.stage,'diagnostic');
});

test('Website dossiers entering post-diagnostic work require explicit customer agreement',()=>{
  for(const current of ['attente-envoi','reception','diagnostic'])for(const target of ['attente-pieces','reparation','tests','terminee']){
    const f=fixture({website:true});d.moveRepair(f.s,f.r.id,current);
    unchanged(f.s,()=>d.moveRepair(f.s,f.r.id,target),/accord/);
  }
  const f=fixture({website:true});for(const stage of ['irreparable','abandonnee'])unchanged(f.s,()=>d.moveRepair(f.s,f.r.id,stage),/diagnostic/);
  d.moveRepair(f.s,f.r.id,'reception');d.moveRepair(f.s,f.r.id,'abandonnee');d.validateStore(f.s);
});

test('Historical dossiers already in work and ordinary repairs retain their legacy transitions',()=>{
  const historical=fixture({website:true});historical.r.stage='reparation';d.validateStore(historical.s);d.moveRepair(historical.s,historical.r.id,'terminee');d.validateStore(historical.s);
  const ordinary=fixture();d.moveRepair(ordinary.s,ordinary.r.id,'terminee');d.validateStore(ordinary.s);
});

test('Website requests cannot receive a repair payment before the first diagnostic agreement',()=>{
  for(const stage of ['attente-envoi','reception','diagnostic']){
    const f=fixture({website:true});d.moveRepair(f.s,f.r.id,stage);assert.equal(d.repairRequiresCustomerAgreement(f.r),true);
    unchanged(f.s,()=>d.setRepairPayment(f.s,f.r.id,true),/accepter/);
  }
  const f=fixture({website:true}),p=publish(f);d.decideRepairProposal(f.s,f.r.id,p.id,'repair');assert.equal(d.repairRequiresCustomerAgreement(f.r),false);d.setRepairPayment(f.s,f.r.id,true);assert.equal(f.r.payment.amount,89.9);
  const historical=fixture({website:true});historical.r.stage='reparation';assert.equal(d.repairRequiresCustomerAgreement(historical.r),false);d.setRepairPayment(historical.s,historical.r.id,true);d.validateStore(historical.s);
});

test('Historical website receipts without a proposal remain readable and cancellable before diagnosis agreement',()=>{
  for(const stage of ['attente-envoi','reception','diagnostic'])for(const amount of [0,45.5]){
    const f=fixture({website:true});d.moveRepair(f.s,f.r.id,stage);f.r.payment={amount,paidAt:d.now()};
    const restored=d.validateStore(JSON.parse(JSON.stringify(f.s)));
    assert.deepEqual(restored.repairs[0].payment,f.r.payment);assert.equal(restored.repairs[0].proposal,undefined);
    d.setRepairPayment(f.s,f.r.id,false);assert.equal(f.r.payment,null);
    unchanged(f.s,()=>d.setRepairPayment(f.s,f.r.id,true),/accepter/);d.validateStore(f.s);
  }
});

test('Acceptance is idempotent, immutable, versioned and permits the repair workflow',()=>{
  const f=fixture({website:true}),p=publish(f);assert.equal(d.decideRepairProposal(f.s,f.r.id,p.id,'repair'),true);
  assert.equal(f.r.stage,'diagnostic');assert.ok(f.r.proposal.decidedAt);const before=JSON.stringify(f.s);
  assert.equal(d.decideRepairProposal(f.s,f.r.id,p.id,'repair'),false);assert.equal(JSON.stringify(f.s),before);
  for(const decision of ['return','buyback'])unchanged(f.s,()=>d.decideRepairProposal(f.s,f.r.id,p.id,decision),/définitive/);
  unchanged(f.s,()=>d.publishRepairProposal(f.s,f.r.id,terms({repairAmount:1})),/déjà répondu/);
  d.moveRepair(f.s,f.r.id,'reparation');d.moveRepair(f.s,f.r.id,'tests');d.moveRepair(f.s,f.r.id,'terminee');d.validateStore(f.s);
});

test('The accepted amount remains the customer charge and repair receipt despite changing workshop costs',()=>{
  const f=fixture(),p=publish(f);assert.deepEqual(d.theoreticalRepairRevenue(f.s),{total:0,count:1});
  unchanged(f.s,()=>d.setRepairPayment(f.s,f.r.id,true),/accepter/);
  d.decideRepairProposal(f.s,f.r.id,p.id,'repair');d.setRepairTotalCost(f.s,f.r.id,37.45);
  assert.equal(d.repairTotalCost(f.s,f.r),37.45);assert.equal(d.repairChargeAmount(f.s,f.r),89.9);
  assert.deepEqual(d.theoreticalRepairRevenue(f.s),{total:89.9,count:1});
  d.setRepairPayment(f.s,f.r.id,true);assert.equal(f.r.payment.amount,89.9);const paidAt=f.r.payment.paidAt;
  d.setRepairTotalCost(f.s,f.r.id,99);d.setRepairPayment(f.s,f.r.id,true);assert.equal(f.r.payment.paidAt,paidAt);assert.equal(f.r.payment.amount,89.9);
  d.moveRepair(f.s,f.r.id,'terminee');assert.deepEqual(d.completedRepairRevenue(f.s),{total:89.9,count:1});assert.deepEqual(d.paidRepairRevenue(f.s),{total:89.9,count:1});d.validateStore(f.s);
});

test('Invoices bill the accepted quote and reject pending or refused proposals without changing data',()=>{
  const f=fixture(),p=publish(f),input={format:'simple',repairIds:[f.r.id],issueDate:'2026-10-21'};
  unchanged(f.s,()=>invoice.buildInvoice(f.s,input),/accepter/);
  d.decideRepairProposal(f.s,f.r.id,p.id,'repair');d.setRepairTotalCost(f.s,f.r.id,12.5);
  const before=JSON.stringify(f.s),snapshot=invoice.buildInvoice(f.s,input);
  assert.equal(snapshot.total,89.9);assert.equal(snapshot.lines[0].amount,89.9);assert.equal(JSON.stringify(f.s),before);
  assert.equal(d.repairTotalCost(f.s,f.r),12.5);assert.doesNotMatch(JSON.stringify(snapshot),/Diagnostic strictement interne|Instructions fictives/);
  const refused=fixture(),other=publish(refused);d.decideRepairProposal(refused.s,refused.r.id,other.id,'return');
  unchanged(refused.s,()=>invoice.buildInvoice(refused.s,{...input,repairIds:[refused.r.id]}),/accepter/);
});

test('Finance uses the accepted repair amount and excludes return fees and buyback operations from repair receipts',()=>{
  const f=fixture(),p=publish(f);d.decideRepairProposal(f.s,f.r.id,p.id,'repair');d.setRepairTotalCost(f.s,f.r.id,12.5);d.moveRepair(f.s,f.r.id,'terminee');
  const options={granularity:'month',anchor:finance.financeToday(),count:1};
  const unpaid=finance.buildFinanceReport(f.s,options);assert.equal(unpaid.totals.completedValue,89.9);assert.equal(unpaid.totals.outstanding,89.9);assert.equal(unpaid.totals.received,0);
  d.setRepairPayment(f.s,f.r.id,true);const paid=finance.buildFinanceReport(f.s,options);assert.equal(paid.totals.received,89.9);assert.equal(paid.totals.completedValue,89.9);assert.equal(paid.totals.outstanding,0);
  const returned=fixture(),r=publish(returned);d.decideRepairProposal(returned.s,returned.r.id,r.id,'return');d.confirmRepairReturnPayment(returned.s,returned.r.id,r.id);
  assert.equal(finance.buildFinanceReport(returned.s,options).totals.received,0);
  const bought=fixture(),b=publish(bought,terms({kind:'unrepairable',repairAmount:null,buybackAmount:30}));d.decideRepairProposal(bought.s,bought.r.id,b.id,'buyback');d.completeRepairBuyback(bought.s,bought.r.id,b.id);
  assert.equal(finance.buildFinanceReport(bought.s,options).totals.received,0);
});

test('Refusing a repair closes it for return and cannot reopen or change the definitive choice',()=>{
  const f=fixture(),p=publish(f);assert.equal(d.decideRepairProposal(f.s,f.r.id,p.id,'return'),true);
  assert.equal(f.r.stage,'abandonnee');assert.equal(f.c.state,'en-panne');assert.ok(f.r.completedAt);assert.equal(f.r.payment,null);
  assert.equal(d.repairChargeAmount(f.s,f.r),0);unchanged(f.s,()=>d.setRepairPayment(f.s,f.r.id,true),/accepter/);
  for(const stage of ['diagnostic','reception','reparation','irreparable','terminee'])unchanged(f.s,()=>d.moveRepair(f.s,f.r.id,stage),/rouvrir|accepter/);
  assert.equal(d.decideRepairProposal(f.s,f.r.id,p.id,'return'),false);d.validateStore(f.s);
});

test('A client transfer declaration never authorizes dispatch until the shop confirms receipt',()=>{
  const f=fixture(),p=publish(f);d.decideRepairProposal(f.s,f.r.id,p.id,'return');
  unchanged(f.s,()=>d.dispatchRepairReturn(f.s,f.r.id,p.id,'SUIVI-TEST'),/réception du virement/);
  assert.equal(d.declareRepairReturnTransfer(f.s,f.r.id,p.id),true);assert.ok(f.r.proposal.transferDeclaredAt);assert.equal(f.r.proposal.returnPaidAt,'');
  const declared=JSON.stringify(f.s);assert.equal(d.declareRepairReturnTransfer(f.s,f.r.id,p.id),false);assert.equal(JSON.stringify(f.s),declared);
  unchanged(f.s,()=>d.dispatchRepairReturn(f.s,f.r.id,p.id,'SUIVI-TEST'),/réception du virement/);
  assert.equal(d.confirmRepairReturnPayment(f.s,f.r.id,p.id),true);assert.ok(f.r.proposal.returnPaidAt);assert.equal(f.r.payment,null);
  assert.equal(d.confirmRepairReturnPayment(f.s,f.r.id,p.id),false);assert.equal(d.dispatchRepairReturn(f.s,f.r.id,p.id,'  SUIVI-TEST  '),true);
  assert.equal(f.r.proposal.tracking,'SUIVI-TEST');assert.ok(f.r.proposal.returnedAt);const sent=JSON.stringify(f.s);
  assert.equal(d.dispatchRepairReturn(f.s,f.r.id,p.id,'SUIVI-TEST'),false);assert.equal(JSON.stringify(f.s),sent);
  unchanged(f.s,()=>d.dispatchRepairReturn(f.s,f.r.id,p.id,'CHANGED'),/déjà/);d.validateStore(f.s);
});

test('The shop may confirm a real return receipt before the customer declares it',()=>{
  const f=fixture(),p=publish(f);d.decideRepairProposal(f.s,f.r.id,p.id,'return');d.confirmRepairReturnPayment(f.s,f.r.id,p.id);
  assert.equal(d.declareRepairReturnTransfer(f.s,f.r.id,p.id),false);assert.equal(f.r.proposal.transferDeclaredAt,'');d.dispatchRepairReturn(f.s,f.r.id,p.id,'SUIVI-TEST');d.validateStore(f.s);
});

test('A free return needs no invented banking instructions or receipt',()=>{
  const f=fixture(),p=publish(f,terms({returnFee:0,bankInstructions:''}));d.decideRepairProposal(f.s,f.r.id,p.id,'return');
  unchanged(f.s,()=>d.declareRepairReturnTransfer(f.s,f.r.id,p.id),/gratuit/);unchanged(f.s,()=>d.confirmRepairReturnPayment(f.s,f.r.id,p.id),/gratuit/);
  unchanged(f.s,()=>d.dispatchRepairReturn(f.s,f.r.id,p.id,''),/texte/);
  assert.equal(d.dispatchRepairReturn(f.s,f.r.id,p.id,'GRATUIT-TEST'),true);assert.equal(f.r.proposal.returnPaidAt,'');d.validateStore(f.s);
});

test('An irreparable device can be returned with or without an optional buyback offer',()=>{
  for(const buybackAmount of [null,0,30]){
    const f=fixture(),p=publish(f,terms({kind:'unrepairable',repairAmount:null,buybackAmount}));
    unchanged(f.s,()=>d.decideRepairProposal(f.s,f.r.id,p.id,'repair'),/irréparable/);
    d.decideRepairProposal(f.s,f.r.id,p.id,'return');assert.equal(f.r.stage,'irreparable');assert.equal(f.c.state,'pour-pieces');
    assert.equal(f.c.clientId,f.client.id);d.validateStore(f.s);
  }
});

test('Accepting and completing a buyback records consent without inventing payments, ownership or stock',()=>{
  const f=fixture(),p=publish(f,terms({kind:'unrepairable',repairAmount:null,buybackAmount:25})),stock=structuredClone(f.s.parts),purchasePrice=f.c.purchasePrice;
  unchanged(f.s,()=>d.completeRepairBuyback(f.s,f.r.id,p.id),/accepter/);
  d.decideRepairProposal(f.s,f.r.id,p.id,'buyback');assert.equal(f.r.stage,'irreparable');assert.equal(f.c.state,'pour-pieces');
  assert.equal(d.completeRepairBuyback(f.s,f.r.id,p.id),true);assert.ok(f.r.proposal.buybackCompletedAt);
  const completed=JSON.stringify(f.s);assert.equal(d.completeRepairBuyback(f.s,f.r.id,p.id),false);assert.equal(JSON.stringify(f.s),completed);
  assert.equal(f.r.payment,null);assert.equal(f.c.clientId,f.client.id);assert.equal(f.c.purchasePrice,purchasePrice);assert.deepEqual(f.s.parts,stock);
  unchanged(f.s,()=>d.moveRepair(f.s,f.r.id,'diagnostic'),/rouvrir/);d.validateStore(f.s);
});

test('An unavailable buyback and operations belonging to another decision are rejected atomically',()=>{
  for(const input of [terms(),terms({kind:'unrepairable',repairAmount:null,buybackAmount:null})]){
    const f=fixture(),p=publish(f,input);unchanged(f.s,()=>d.decideRepairProposal(f.s,f.r.id,p.id,'buyback'),/rachat/);
    unchanged(f.s,()=>d.declareRepairReturnTransfer(f.s,f.r.id,p.id),/retour/);unchanged(f.s,()=>d.confirmRepairReturnPayment(f.s,f.r.id,p.id),/retour/);
    unchanged(f.s,()=>d.dispatchRepairReturn(f.s,f.r.id,p.id,'SUIVI-TEST'),/retour/);unchanged(f.s,()=>d.completeRepairBuyback(f.s,f.r.id,p.id),/accepter/);
  }
});

test('Every operation rejects a stale proposal version without modifying the dossier',()=>{
  const f=fixture();publish(f);
  for(const action of [()=>d.decideRepairProposal(f.s,f.r.id,'stale','repair'),()=>d.declareRepairReturnTransfer(f.s,f.r.id,'stale'),()=>d.confirmRepairReturnPayment(f.s,f.r.id,'stale'),()=>d.dispatchRepairReturn(f.s,f.r.id,'stale','SUIVI-TEST'),()=>d.completeRepairBuyback(f.s,f.r.id,'stale')])unchanged(f.s,action,/changé/);
});

test('Import rejects malformed proposal terms, forged completion and inconsistent customer decisions',()=>{
  const f=fixture();publish(f);
  const mutations=[p=>p.id='',p=>p.publishedAt='yesterday',p=>p.decidedAt=p.publishedAt,p=>p.returnFee=undefined,p=>p.description='',p=>p.buybackAmount=1,p=>p.decision='unknown',p=>p.transferDeclaredAt=p.publishedAt,p=>p.returnPaidAt=p.publishedAt,p=>p.returnedAt=p.publishedAt,p=>p.tracking='FAKE',p=>p.buybackCompletedAt=p.publishedAt];
  for(const mutate of mutations){const raw=structuredClone(f.s);mutate(raw.repairs[0].proposal);assert.throws(()=>d.validateStore(raw),/proposition|retour|rachat|réponse/i);}
  const wrongStage=structuredClone(f.s);wrongStage.repairs[0].stage='reparation';assert.throws(()=>d.validateStore(wrongStage),/hors diagnostic/);
  const ownerless=structuredClone(f.s);ownerless.consoles[0].clientId='';assert.throws(()=>d.validateStore(ownerless),/sans client/);
  const paid=structuredClone(f.s);paid.repairs[0].payment={amount:89.9,paidAt:d.now()};assert.throws(()=>d.validateStore(paid),/règlement/);
});

test('Import rejects shipping before receipt, tracking without dispatch and closing against the chosen disposition',()=>{
  const f=fixture(),p=publish(f);d.decideRepairProposal(f.s,f.r.id,p.id,'return');
  const unpaid=structuredClone(f.s);unpaid.repairs[0].proposal.returnedAt=d.now();unpaid.repairs[0].proposal.tracking='SUIVI-TEST';assert.throws(()=>d.validateStore(unpaid),/règlement/);
  const tracking=structuredClone(f.s);tracking.repairs[0].proposal.tracking='SUIVI-TEST';assert.throws(()=>d.validateStore(tracking),/suivi/);
  const stage=structuredClone(f.s);stage.repairs[0].stage='irreparable';assert.throws(()=>d.validateStore(stage),/étape incohérente/);
  const chronology=structuredClone(f.s);chronology.repairs[0].proposal.decidedAt='2000-01-01T00:00:00.000Z';assert.throws(()=>d.validateStore(chronology),/précède/);
});

test('Corrupt preexisting store validation cannot leave a partially published or answered proposal',()=>{
  const f=fixture();f.s.events.push({id:d.uid(),kind:'edit',text:'Référence fictive absente',createdAt:d.now(),consoleId:'missing'});
  unchanged(f.s,()=>d.publishRepairProposal(f.s,f.r.id,terms()),/journal/);
  const other=fixture(),p=publish(other);other.s.events.push({id:d.uid(),kind:'edit',text:'Référence fictive absente',createdAt:d.now(),consoleId:'missing'});
  unchanged(other.s,()=>d.decideRepairProposal(other.s,other.r.id,p.id,'repair'),/journal/);
});
