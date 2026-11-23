import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {clientProposalRequest,applyClientProposal,assertProposalEditPreserved,publicRepairProposal} from '../server/repair-proposals.mjs';
import {LEGAL_VERSION} from '../src/legal-content.mjs';

const require=createRequire(import.meta.url),d=require('./.compiled/domain.cjs');
const legal=(overrides={})=>({version:'2026-11-22',document:'Conditions générales fictives\nTexte intégral de test.\n',earlyStartRequested:false,earlyStartAcknowledged:false,...overrides});
function fixture(){
  const s=d.emptyStore(),client=d.createClient(s,{name:'Client fictif',email:'client@example.invalid',phone:'',address:'Adresse fictive',notes:'Note interne'});
  const r=d.createRepairAdmission(s,{clientId:client.id,brand:'Nintendo',model:'Switch',serial:'TEST-LEGAL',accessories:'',title:'Réparation fictive',symptoms:'Panne fictive',priority:'normale',dueDate:''});
  d.moveRepair(s,r.id,'diagnostic');
  d.publishRepairProposal(s,r.id,{kind:'repair',description:'Réparation de test.',repairAmount:50,buybackAmount:null,returnFee:0,bankInstructions:''});
  return {s,r,client,p:r.proposal};
}
function unchanged(s,action,pattern){const before=JSON.stringify(s);assert.throws(action,pattern);assert.equal(JSON.stringify(s),before);}

test('Repair consent freezes the complete document and optional early-start declarations at the decision time',()=>{
  for(const early of [false,true]){
    const f=fixture(),input=legal({earlyStartRequested:early,earlyStartAcknowledged:early}),before=structuredClone(f.s);
    assert.equal(d.decideRepairProposal(f.s,f.r.id,f.p.id,'repair',input),true);
    assert.deepEqual(f.r.proposal.legal,{...input,acceptedAt:f.r.proposal.decidedAt,customerName:f.client.name,customerEmail:f.client.email});
    input.document='Changed after acceptance';
    assert.notEqual(f.r.proposal.legal.document,input.document);
    assert.equal(f.r.stage,before.repairs[0].stage);assert.deepEqual(f.s.parts,before.parts);assert.deepEqual(f.r.payment,before.repairs[0].payment);
    assert.deepEqual(d.validateStore(JSON.parse(JSON.stringify(f.s))).repairs[0].proposal.legal,f.r.proposal.legal);
  }
});

test('Repeated acceptance preserves the original document and historical accepted proposals remain supported',()=>{
  for(const recorded of [false,true]){
    const f=fixture();d.decideRepairProposal(f.s,f.r.id,f.p.id,'repair',recorded?legal():undefined);
    const before=JSON.stringify(f.s);
    assert.equal(d.decideRepairProposal(f.s,f.r.id,f.p.id,'repair',legal({version:'later',document:'New document'})),false);
    assert.equal(JSON.stringify(f.s),before);assert.equal(Boolean(f.r.proposal.legal),recorded);d.validateStore(f.s);
  }
});

test('Invalid legal records cannot partially accept a proposal',()=>{
  for(const value of [null,[],legal({version:''}),legal({version:'x'.repeat(101)}),legal({document:''}),legal({document:'x'.repeat(100001)}),legal({document:'Forbidden\0control'}),legal({earlyStartRequested:'true'}),legal({earlyStartAcknowledged:undefined}),legal({earlyStartRequested:true}),legal({earlyStartAcknowledged:true}),{...legal(),acceptedAt:d.now()},{...legal(),extra:true}]){
    const f=fixture();unchanged(f.s,()=>d.decideRepairProposal(f.s,f.r.id,f.p.id,'repair',value),/conditions|consentement|anticip|proposition/i);
  }
  const f=fixture();unchanged(f.s,()=>d.decideRepairProposal(f.s,f.r.id,f.p.id,'return',legal()),/conditions|consentement|réparation/i);
});

test('Withdrawal is an owned, idempotent notification and never changes repair, stock, prices or receipts',()=>{
  const f=fixture();d.decideRepairProposal(f.s,f.r.id,f.p.id,'repair',legal({earlyStartRequested:true,earlyStartAcknowledged:true}));
  d.setRepairPayment(f.s,f.r.id,true);d.moveRepair(f.s,f.r.id,'terminee');
  const before=structuredClone(f.s),cost=d.repairTotalCost(f.s,f.r),charge=d.repairChargeAmount(f.s,f.r);
  assert.equal(d.requestRepairWithdrawal(f.s,f.client.id,f.r.id,f.p.id),true);
  const record=f.r.proposal.withdrawal;
  assert.ok(record.id);assert.ok(record.requestedAt>=f.r.proposal.decidedAt);assert.equal(record.customerName,f.client.name);assert.equal(record.customerEmail,f.client.email);
  assert.match(record.statement,/rétractation/i);assert.match(record.statement,new RegExp(f.r.code));
  assert.equal(f.r.stage,'terminee');assert.equal(d.repairTotalCost(f.s,f.r),cost);assert.equal(d.repairChargeAmount(f.s,f.r),charge);
  assert.deepEqual(f.r.payment,before.repairs[0].payment);assert.deepEqual(f.s.parts,before.parts);assert.deepEqual(f.s.consoles,before.consoles);
  assert.equal(f.s.events.length,before.events.length+1);assert.ok(f.s.events[0].text.includes('rétractation'));assert.equal(f.s.events[0].clientId,f.client.id);
  f.client.name='New fictitious name';f.client.email='changed@example.invalid';
  const notified=JSON.stringify(f.s);assert.equal(d.requestRepairWithdrawal(f.s,f.client.id,f.r.id,f.p.id),false);assert.equal(JSON.stringify(f.s),notified);
  assert.equal(record.customerName,'Client fictif');assert.equal(record.customerEmail,'client@example.invalid');
  assert.deepEqual(d.validateStore(JSON.parse(JSON.stringify(f.s))).repairs[0].proposal.withdrawal,record);
});

test('Legacy accepted repairs can notify withdrawal without an automatic calendar or completion cutoff',()=>{
  const f=fixture();d.decideRepairProposal(f.s,f.r.id,f.p.id,'repair');
  f.r.proposal.publishedAt='2020-01-01T00:00:00.000Z';f.r.proposal.decidedAt='2020-01-02T00:00:00.000Z';
  assert.equal(d.requestRepairWithdrawal(f.s,f.client.id,f.r.id,f.p.id),true);assert.equal(f.r.proposal.legal,undefined);d.validateStore(f.s);
});

test('Withdrawal rejects missing, stale, foreign and unaccepted proposals atomically',()=>{
  const f=fixture(),other=d.createClient(f.s,{name:'Autre client fictif',email:'other@example.invalid',phone:'',address:'',notes:''});
  unchanged(f.s,()=>d.requestRepairWithdrawal(f.s,other.id,f.r.id,f.p.id),/introuvable/);
  unchanged(f.s,()=>d.requestRepairWithdrawal(f.s,'missing',f.r.id,f.p.id),/introuvable/);
  unchanged(f.s,()=>d.requestRepairWithdrawal(f.s,f.client.id,'missing',f.p.id),/introuvable/);
  unchanged(f.s,()=>d.requestRepairWithdrawal(f.s,f.client.id,f.r.id,'stale'),/changé/);
  unchanged(f.s,()=>d.requestRepairWithdrawal(f.s,f.client.id,f.r.id,f.p.id),/accept/);
  d.decideRepairProposal(f.s,f.r.id,f.p.id,'return');unchanged(f.s,()=>d.requestRepairWithdrawal(f.s,f.client.id,f.r.id,f.p.id),/accept/);
});

test('Backup validation rejects forged legal and withdrawal metadata without discarding valid snapshots',()=>{
  const f=fixture();d.decideRepairProposal(f.s,f.r.id,f.p.id,'repair',legal());d.requestRepairWithdrawal(f.s,f.client.id,f.r.id,f.p.id);
  const mutations=[p=>p.legal.acceptedAt='2000-01-01T00:00:00.000Z',p=>p.legal.acceptedAt='yesterday',p=>p.legal.version='',p=>p.legal.document='x'.repeat(100001),p=>p.legal.document='bad\0control',p=>p.legal.earlyStartRequested=true,p=>p.legal.earlyStartAcknowledged=true,p=>p.legal.customerName='',p=>p.legal.customerEmail='not-an-email',p=>p.legal.extra='fake',p=>p.withdrawal.id='',p=>p.withdrawal.requestedAt='2000-01-01T00:00:00.000Z',p=>p.withdrawal.requestedAt='yesterday',p=>p.withdrawal.customerName='',p=>p.withdrawal.customerEmail='not-an-email',p=>p.withdrawal.statement='',p=>p.withdrawal.extra='fake'];
  for(const mutate of mutations){const raw=structuredClone(f.s);mutate(raw.repairs[0].proposal);assert.throws(()=>d.validateStore(raw),/conditions|consentement|anticip|rétractation|proposition/i);}
  const pending=fixture();pending.p.legal=structuredClone(f.r.proposal.legal);assert.throws(()=>d.validateStore(pending.s),/réparation|conditions|accept/i);
  delete pending.p.legal;pending.p.withdrawal=structuredClone(f.r.proposal.withdrawal);assert.throws(()=>d.validateStore(pending.s),/réparation|rétractation|accept/i);
});

const clientConsent=(overrides={})=>({version:LEGAL_VERSION,accepted:true,earlyStartRequested:false,earlyStartAcknowledged:false,...overrides});
const errorStatus=status=>error=>error.status===status;
function request(f,action='repair',extra={},options){return clientProposalRequest({proposalId:f.p.id,action,...extra},options);}
function apply(f,value,options){return applyClientProposal(f.s,f.client.id,f.r.id,value,d,options);}

test('The root HTTP boundary freezes server-owned legal text and repeated acceptance cannot rewrite consent',async()=>{
  const f=fixture(),parsed=request(f,'repair',{legal:clientConsent({earlyStartRequested:true,earlyStartAcknowledged:true})});
  assert.equal(apply(f,parsed),true);
  const {LEGAL_VERSION,LEGAL_CGV_TEXT}=await import('../src/legal-content.mjs');
  assert.equal(f.r.proposal.legal.version,LEGAL_VERSION);assert.equal(f.r.proposal.legal.document,LEGAL_CGV_TEXT);
  assert.equal(f.r.proposal.legal.acceptedAt,f.r.proposal.decidedAt);assert.equal(f.r.proposal.legal.earlyStartRequested,true);
  assert.equal(f.r.proposal.legal.customerName,f.client.name);assert.equal(f.r.proposal.legal.customerEmail,f.client.email);
  const before=JSON.stringify(f.s);
  assert.equal(apply(f,request(f)),false);assert.equal(JSON.stringify(f.s),before);
  assert.equal(apply(f,request(f,'repair',{legal:clientConsent({version:'obsolete'})})),false);assert.equal(JSON.stringify(f.s),before);
  const legacy=fixture();d.decideRepairProposal(legacy.s,legacy.r.id,legacy.p.id,'repair');const historical=JSON.stringify(legacy.s);
  assert.equal(apply(legacy,request(legacy)),false);assert.equal(JSON.stringify(legacy.s),historical);assert.equal(legacy.r.proposal.legal,undefined);
});

test('New root acceptance rejects missing or obsolete conditions and strictly validates every declaration',()=>{
  const f=fixture();
  unchanged(f.s,()=>apply(f,request(f)),errorStatus(409));
  unchanged(f.s,()=>apply(f,request(f,'repair',{legal:clientConsent({version:'obsolete'})})),errorStatus(409));
  for(const value of [null,[],{},clientConsent({accepted:false}),clientConsent({accepted:'true'}),clientConsent({earlyStartRequested:1}),clientConsent({earlyStartAcknowledged:undefined}),clientConsent({earlyStartRequested:true}),clientConsent({earlyStartAcknowledged:true}),clientConsent({version:''}),clientConsent({version:'x'.repeat(101)}),{...clientConsent(),document:'Forged'}, {...clientConsent(),customerName:'Forged'}, {...clientConsent(),acceptedAt:d.now()}]){
    assert.throws(()=>request(f,'repair',{legal:value}),errorStatus(400));
  }
  for(const action of ['return','buyback','declare-transfer','withdraw'])assert.throws(()=>request(f,action,{legal:clientConsent()}),errorStatus(400));
  assert.throws(()=>request(f,'withdraw',{statement:'Forged'}),errorStatus(400));
});

test('Other workshops retain their own contracts and cannot use VESTY GAMES 3 declarations',()=>{
  const f=fixture(),options={requireLegal:false};
  assert.throws(()=>request(f,'repair',{legal:clientConsent()},options),errorStatus(400));
  assert.throws(()=>request(f,'withdraw',{},options),errorStatus(400));
  assert.equal(apply(f,request(f,'repair',{},options),options),true);assert.equal(f.r.proposal.legal,undefined);
  unchanged(f.s,()=>apply(f,{proposalId:f.p.id,action:'withdraw'},options),errorStatus(400));
  unchanged(f.s,()=>apply(f,{proposalId:f.p.id,action:'repair',legal:clientConsent()},options),errorStatus(400));
});

test('Archived withdrawal projection exposes only the frozen customer receipt and preserves banking privacy',()=>{
  const f=fixture();d.decideRepairProposal(f.s,f.r.id,f.p.id,'repair',legal());
  d.requestRepairWithdrawal(f.s,f.client.id,f.r.id,f.p.id);
  const raw=structuredClone(f.r.proposal);raw.legal.internal='PRIVATE_INTERNAL';raw.withdrawal.internal='PRIVATE_INTERNAL';raw.internal='PRIVATE_INTERNAL';raw.bankInstructions='PRIVATE_BANK';
  const projected=publicRepairProposal(raw);
  assert.deepEqual(projected.legal,f.r.proposal.legal);assert.deepEqual(projected.withdrawal,f.r.proposal.withdrawal);
  assert.doesNotMatch(JSON.stringify(projected),/PRIVATE_/);
  projected.legal.document='Changed projection';projected.withdrawal.statement='Changed projection';
  assert.notEqual(projected.legal.document,raw.legal.document);assert.notEqual(projected.withdrawal.statement,raw.withdrawal.statement);
  assert.throws(()=>applyClientProposal(f.s,'foreign',f.r.id,{proposalId:f.p.id,action:'repair'},d),errorStatus(404));
});

test('Retired withdrawal actions are rejected without changing any current or archived record',()=>{
  for(const archived of [false,true])for(const requireLegal of [false,true]){
    const f=fixture();d.decideRepairProposal(f.s,f.r.id,f.p.id,'repair',legal());
    if(archived)d.requestRepairWithdrawal(f.s,f.client.id,f.r.id,f.p.id);
    const options={requireLegal};
    unchanged(f.s,()=>request(f,'withdraw',{},options),errorStatus(400));
    unchanged(f.s,()=>apply(f,{proposalId:f.p.id,action:'withdraw'},options),errorStatus(400));
    d.validateStore(f.s);
  }
});

test('Ordinary Store edits cannot create, erase or rewrite legal consent or withdrawal receipts',()=>{
  const f=fixture();d.decideRepairProposal(f.s,f.r.id,f.p.id,'repair',legal());
  for(const mutate of [p=>delete p.legal,p=>p.legal.document='Changed conditions',p=>p.legal.customerName='Changed name',p=>p.legal.earlyStartRequested=true,p=>p.withdrawal={id:'forged'}]){
    const edited=structuredClone(f.s);mutate(edited.repairs[0].proposal);assert.throws(()=>assertProposalEditPreserved(f.s,edited,'edit'),errorStatus(409));
  }
  d.requestRepairWithdrawal(f.s,f.client.id,f.r.id,f.p.id);
  for(const mutate of [p=>delete p.withdrawal,p=>p.withdrawal.statement='Changed notification']){
    const edited=structuredClone(f.s);mutate(edited.repairs[0].proposal);assert.throws(()=>assertProposalEditPreserved(f.s,edited,'edit'),errorStatus(409));
  }
  const ordinary=structuredClone(f.s);ordinary.repairs[0].diagnosis='Autre note privée';assert.doesNotThrow(()=>assertProposalEditPreserved(f.s,ordinary,'edit'));
});

test('Canonical acceptance and withdrawal use the authenticated account email when the legacy client contact is empty',()=>{
  const f=fixture();f.client.email='';
  assert.equal(d.decideRepairProposal(f.s,f.r.id,f.p.id,'repair',legal(),'account@example.invalid'),true);
  assert.equal(f.r.proposal.legal.customerEmail,'account@example.invalid');
  const consent=JSON.stringify(f.r.proposal.legal);
  assert.equal(d.decideRepairProposal(f.s,f.r.id,f.p.id,'repair',legal(),'changed-account@example.invalid'),false);
  assert.equal(JSON.stringify(f.r.proposal.legal),consent);
  assert.equal(d.requestRepairWithdrawal(f.s,f.client.id,f.r.id,f.p.id,'account@example.invalid'),true);
  assert.equal(f.r.proposal.withdrawal.customerEmail,'account@example.invalid');
  const notified=JSON.stringify(f.s);
  assert.equal(d.requestRepairWithdrawal(f.s,f.client.id,f.r.id,f.p.id,'changed-account@example.invalid'),false);
  assert.equal(JSON.stringify(f.s),notified);d.validateStore(f.s);
  const historical=fixture();d.decideRepairProposal(historical.s,historical.r.id,historical.p.id,'repair');historical.client.email='';
  assert.equal(d.requestRepairWithdrawal(historical.s,historical.client.id,historical.r.id,historical.p.id,'legacy-account@example.invalid'),true);
  assert.equal(historical.r.proposal.withdrawal.customerEmail,'legacy-account@example.invalid');
  const invalid=fixture();invalid.client.email='';
  unchanged(invalid.s,()=>d.decideRepairProposal(invalid.s,invalid.r.id,invalid.p.id,'repair',legal(),'not-an-email'),/proposition/i);
});

test('The HTTP boundary supplies only its trusted session email fallback and refuses email fields from the request body',()=>{
  const f=fixture();f.client.email='';const options={accountEmail:'session@example.invalid'};
  assert.equal(apply(f,request(f,'repair',{legal:clientConsent()}),options),true);
  assert.equal(f.r.proposal.legal.customerEmail,options.accountEmail);
  unchanged(f.s,()=>apply(f,{proposalId:f.p.id,action:'withdraw'},options),errorStatus(400));
  for(const action of ['repair','withdraw'])for(const key of ['accountEmail','customerEmail']){
    assert.throws(()=>request(f,action,{[key]:'forged@example.invalid'}),errorStatus(400));
  }
  const preferred=fixture();assert.equal(apply(preferred,request(preferred,'repair',{legal:clientConsent()}),options),true);
  assert.equal(preferred.r.proposal.legal.customerEmail,preferred.client.email);
});
