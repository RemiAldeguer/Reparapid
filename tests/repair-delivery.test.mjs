import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),d=require('./.compiled/domain.cjs');
const shipping={method:'shipping',recipient:'Camille Exemple',address:'Adresse de recette fictive\n94270 Ville exemple',phone:''};
const pickup={method:'pickup',recipient:'',address:'',phone:''};
function fixture(){
  const s=d.emptyStore(),client=d.createClient(s,{name:'Client fictif',email:'client@example.invalid',phone:'',address:'',notes:''});
  const r=d.createRepairAdmission(s,{clientId:client.id,brand:'Nintendo',model:'Switch',serial:'',accessories:'',title:'Recette récupération',symptoms:'Panne fictive',priority:'normale',dueDate:''});
  d.moveRepair(s,r.id,'terminee');return {s,client,r};
}
function unchanged(f,run){const before=JSON.stringify(f.s);assert.throws(run);assert.equal(JSON.stringify(f.s),before);}

test('A client chooses free pickup or shipping only for their completed repair',()=>{
  for(const input of [pickup,shipping]){
    const f=fixture(),before=structuredClone(f.s);
    assert.equal(d.chooseRepairDelivery(f.s,f.client.id,f.r.id,input),true);
    assert.equal(f.r.delivery.method,input.method);assert.ok(f.r.delivery.id);assert.ok(f.r.delivery.requestedAt);assert.equal(f.r.delivery.completedAt,'');
    assert.equal(f.r.stage,'terminee');assert.deepEqual(f.s.consoles,before.consoles);assert.deepEqual(f.s.parts,before.parts);assert.deepEqual(f.r.payment,before.repairs[0].payment);
    assert.deepEqual(d.validateStore(f.s).repairs[0].delivery,f.r.delivery);
  }
});
test('Delivery retries are idempotent and cannot silently replace the confirmed choice or address',()=>{
  const f=fixture();d.chooseRepairDelivery(f.s,f.client.id,f.r.id,shipping);const before=JSON.stringify(f.s);
  assert.equal(d.chooseRepairDelivery(f.s,f.client.id,f.r.id,shipping),false);assert.equal(JSON.stringify(f.s),before);
  unchanged(f,()=>d.chooseRepairDelivery(f.s,f.client.id,f.r.id,pickup));
  unchanged(f,()=>d.chooseRepairDelivery(f.s,f.client.id,f.r.id,{...shipping,address:'Autre adresse'}));
});
test('Premature, foreign and malformed delivery choices leave all workshop data intact',()=>{
  const f=fixture();
  unchanged(f,()=>d.chooseRepairDelivery(f.s,'foreign-client',f.r.id,shipping));
  for(const input of [null,[],{...shipping,method:'drone'},{...shipping,address:''},{...shipping,recipient:''},{...shipping,address:'x'.repeat(1001)},{...shipping,phone:'Test\0'},{...pickup,address:'Adresse ignorée'},{...shipping,completedAt:d.now()}])unchanged(f,()=>d.chooseRepairDelivery(f.s,f.client.id,f.r.id,input));
  d.moveRepair(f.s,f.r.id,'diagnostic');unchanged(f,()=>d.chooseRepairDelivery(f.s,f.client.id,f.r.id,shipping));
});
test('Only the current choice can be handed over and shipping requires a tracking reference',()=>{
  for(const input of [pickup,shipping]){
    const f=fixture();d.chooseRepairDelivery(f.s,f.client.id,f.r.id,input);const id=f.r.delivery.id;
    unchanged(f,()=>d.completeRepairDelivery(f.s,f.r.id,'stale','EXEMPLE-SUIVI'));
    if(input.method==='shipping')unchanged(f,()=>d.completeRepairDelivery(f.s,f.r.id,id,''));
    else unchanged(f,()=>d.completeRepairDelivery(f.s,f.r.id,id,'Suivi indu'));
    const tracking=input.method==='shipping'?'EXEMPLE-SUIVI':'';
    assert.equal(d.completeRepairDelivery(f.s,f.r.id,id,tracking),true);assert.ok(f.r.delivery.completedAt);assert.equal(f.r.delivery.tracking,tracking);
    const before=JSON.stringify(f.s);assert.equal(d.completeRepairDelivery(f.s,f.r.id,id,tracking),false);assert.equal(JSON.stringify(f.s),before);
    unchanged(f,()=>d.moveRepair(f.s,f.r.id,'diagnostic'));d.validateStore(f.s);
  }
});
test('Backups reject inconsistent handover records without removing valid historical evidence',()=>{
  const f=fixture();d.chooseRepairDelivery(f.s,f.client.id,f.r.id,shipping);
  for(const change of [x=>x.method='unknown',x=>x.id='',x=>x.address='',x=>x.requestedAt='today',x=>x.completedAt='2000-01-01T00:00:00.000Z',x=>x.tracking='Sans expédition',x=>x.extra='forged']){
    const data=structuredClone(f.s);change(data.repairs[0].delivery);assert.throws(()=>d.validateStore(data));
  }
});
