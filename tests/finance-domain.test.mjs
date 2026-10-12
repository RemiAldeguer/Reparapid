import test from 'node:test';
import assert from 'node:assert/strict';
import finance from './.compiled/finance-domain.cjs';
import domain from './.compiled/domain.cjs';

function fixture() {
  const store=domain.emptyStore();
  const client=domain.createClient(store,{name:'Camille Finance',email:'finance@example.invalid',phone:'',address:'',notes:''});
  function repair(options={}) {
    const index=store.consoles.length+1;
    const item={id:`finance-console-${index}`,code:`CRT-${index}`,clientId:options.owner==='personal'?'':options.owner==='missing'?'missing-client':client.id,brand:'Nintendo',model:`Console ${index}`,variant:'',serial:'',state:'a-tester',condition:'',acquiredAt:'',purchasePrice:0,estimatedValue:0,source:'',location:'',accessories:'',notes:'',illustration:'gameboy',photos:[],archived:false,createdAt:domain.now()};
    store.consoles.push(item);
    const result=domain.createRepair(store,{consoleId:item.id,title:`Intervention ${index}`,symptoms:'',priority:'normale',dueDate:''});
    domain.setRepairInterventionCost(store,result.id,options.cost??0);
    if(options.parts) {
      const part={id:`finance-part-${index}`,reference:`FIN-${index}`,name:'Pièce conservée',category:'',compatibility:'',quantity:1,threshold:0,unitCost:options.parts,location:'',supplier:''};
      store.parts.push(part);domain.usePart(store,result.id,part.id,1);
    }
    if(options.stage&&options.stage!=='reception')domain.moveRepair(store,result.id,options.stage);
    if(options.completedAt!==undefined)result.completedAt=options.completedAt;
    if(options.paidAt!==undefined)result.payment={amount:options.amount??domain.repairTotalCost(store,result),paidAt:options.paidAt};
    if(options.archived)item.archived=true;
    return result;
  }
  return {store,client,repair};
}

function deepFreeze(value) {
  if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))deepFreeze(child);}
  return value;
}

test('Default Finance windows contain chronological empty calendar periods and include the full anchor period',()=>{
  const empty=domain.emptyStore();
  const weeks=finance.buildFinanceReport(empty,{granularity:'week',anchor:'2026-01-01'});
  assert.equal(weeks.buckets.length,12);assert.equal(weeks.start,'2025-10-13');assert.equal(weeks.end,'2026-01-04');
  assert.equal(weeks.buckets.at(-1).start,'2025-12-29');assert.equal(weeks.buckets.at(-1).end,'2026-01-04');
  assert.match(weeks.buckets.at(-1).label,/2025.*2026/);
  const months=finance.buildFinanceReport(empty,{granularity:'month',anchor:'2026-01-31'});
  assert.equal(months.buckets.length,6);assert.equal(months.start,'2025-08-01');assert.equal(months.end,'2026-01-31');
  assert.equal(months.buckets.at(-1).label,'janvier 2026');assert.deepEqual(months.payments,[]);
  assert.deepEqual(months.totals,{received:0,parts:0,estimatedGain:0,completedValue:0,outstanding:0,paidCount:0,completedCount:0,unpaidCompletedCount:0});
  assert.ok(months.buckets.every(bucket=>bucket.received===0&&bucket.paidCount===0));
});

test('Period navigation normalizes month ends, leap dates, Mondays and year transitions',()=>{
  assert.equal(finance.shiftFinanceAnchor('2026-01-31','month',1),'2026-02-01');
  assert.equal(finance.shiftFinanceAnchor('2026-01-31','month',-1),'2025-12-01');
  assert.equal(finance.shiftFinanceAnchor('2024-02-29','month',1),'2024-03-01');
  assert.equal(finance.shiftFinanceAnchor('2026-01-04','week',0),'2025-12-29');
  assert.equal(finance.shiftFinanceAnchor('2026-01-04','week',1),'2026-01-05');
  assert.equal(finance.shiftFinanceAnchor('2026-01-05','week',-1),'2025-12-29');
  assert.equal(finance.shiftFinanceAnchor('0099-01-31','month',1),'0099-02-01');
  const leap=finance.buildFinanceReport(domain.emptyStore(),{granularity:'month',anchor:'2024-02-29',count:1});
  assert.equal(leap.start,'2024-02-01');assert.equal(leap.end,'2024-02-29');
  const early=finance.buildFinanceReport(domain.emptyStore(),{granularity:'month',anchor:'0099-01-31',count:1});
  assert.equal(early.start,'0099-01-01');assert.equal(early.end,'0099-01-31');
});

test('Paris calendar dates handle midnight and both daylight-saving transitions independently of host timezone',()=>{
  for(const [timestamp,date] of [
    ['2026-09-30T22:30:00.000Z','2026-10-01'],
    ['2026-10-04T22:30:00.000Z','2026-10-05'],
    ['2026-01-31T23:30:00.000Z','2026-02-01'],
    ['2026-03-29T00:30:00.000Z','2026-03-29'],
    ['2026-03-29T22:30:00.000Z','2026-03-30'],
    ['2026-10-25T22:30:00.000Z','2026-10-25'],
    ['2026-10-25T23:30:00.000Z','2026-10-26'],
  ])assert.equal(finance.financeToday(new Date(timestamp)),date);
  assert.throws(()=>finance.financeToday(new Date('invalid')),/date de référence/);
});

test('Receipts near month boundaries belong to their Paris payment date and rows retain payment and owner references',()=>{
  const {store,client,repair}=fixture();
  const september=repair({paidAt:'2026-09-30T21:30:00.000Z',amount:12.5,cost:99});
  const october=repair({paidAt:'2026-09-30T22:30:00.000Z',amount:20,parts:3,cost:80});
  repair({paidAt:'2026-10-31T23:30:00.000Z',amount:100,cost:100});
  const report=finance.buildFinanceReport(store,{granularity:'month',anchor:'2026-10-01',count:2});
  assert.deepEqual(report.buckets.map(bucket=>[bucket.start,bucket.received,bucket.parts,bucket.estimatedGain,bucket.paidCount]),[['2026-09-01',12.5,0,12.5,1],['2026-10-01',20,3,17,1]]);
  assert.equal(report.totals.received,32.5);assert.equal(report.payments.length,2);
  const row=report.payments[0];assert.equal(row.repairId,october.id);assert.equal(row.repairCode,october.code);assert.equal(row.repairTitle,october.title);
  assert.equal(row.clientId,client.id);assert.equal(row.clientName,client.name);assert.equal(row.consoleId,october.consoleId);
  assert.equal(row.consoleName,'Nintendo Console 2');assert.equal(row.consoleCode,'CRT-2');assert.equal(row.paymentDate,'2026-10-01');assert.equal(row.bucketId,'month-2026-10-01');
  assert.equal(row.paidAt,'2026-09-30T22:30:00.000Z');assert.equal(row.amount,20);assert.equal(report.payments[1].repairId,september.id);
});

test('Monday to Sunday weeks cross ISO years and shift at Paris midnight across DST',()=>{
  const winter=fixture();winter.repair({paidAt:'2025-12-28T23:30:00.000Z',amount:2});winter.repair({paidAt:'2026-01-04T22:30:00.000Z',amount:3});winter.repair({paidAt:'2026-01-04T23:30:00.000Z',amount:4});
  const year=finance.buildFinanceReport(winter.store,{granularity:'week',anchor:'2026-01-02',count:1});
  assert.equal(year.start,'2025-12-29');assert.equal(year.end,'2026-01-04');assert.equal(year.totals.received,5);assert.equal(year.totals.paidCount,2);
  const spring=fixture();spring.repair({paidAt:'2026-03-29T21:30:00.000Z',amount:5});spring.repair({paidAt:'2026-03-29T22:30:00.000Z',amount:6});
  const dst=finance.buildFinanceReport(spring.store,{granularity:'week',anchor:'2026-04-02',count:2});
  assert.deepEqual(dst.buckets.map(bucket=>[bucket.start,bucket.end,bucket.received]),[['2026-03-23','2026-03-29',5],['2026-03-30','2026-04-05',6]]);
  const autumn=fixture();autumn.repair({paidAt:'2026-10-25T22:30:00.000Z',amount:7});autumn.repair({paidAt:'2026-10-25T23:30:00.000Z',amount:8});
  const fall=finance.buildFinanceReport(autumn.store,{granularity:'week',anchor:'2026-10-28',count:2});
  assert.deepEqual(fall.buckets.map(bucket=>[bucket.start,bucket.received]),[['2026-10-19',7],['2026-10-26',8]]);
});

test('Collected Finance amounts use payment snapshots across every stage, including archived and reopened customer repairs',()=>{
  const {store,repair}=fixture();
  for(const stage of domain.STAGES)repair({stage:stage.id,completedAt:['terminee','abandonnee','irreparable'].includes(stage.id)?'2026-10-02T10:00:00.000Z':'',paidAt:'2026-10-02T12:00:00.000Z',amount:40,cost:80,parts:5,archived:['terminee','abandonnee','irreparable'].includes(stage.id)});
  const report=finance.buildFinanceReport(store,{granularity:'month',anchor:'2026-10-10',count:1});
  assert.equal(report.totals.received,40*domain.STAGES.length);assert.equal(report.totals.parts,5*domain.STAGES.length);assert.equal(report.totals.estimatedGain,35*domain.STAGES.length);
  assert.equal(report.totals.paidCount,domain.STAGES.length);assert.equal(report.totals.completedValue,85);assert.equal(report.totals.outstanding,0);
  assert.equal(report.payments.length,domain.STAGES.length);domain.validateStore(store);
});

test('Workshop inventory and orphan customer or console references never contribute to Finance',()=>{
  const {store,repair}=fixture();
  repair({owner:'personal',stage:'terminee',completedAt:'2026-10-02T10:00:00.000Z',paidAt:'2026-10-02T12:00:00.000Z',amount:99,cost:99});
  repair({owner:'missing',stage:'terminee',completedAt:'2026-10-02T10:00:00.000Z',paidAt:'2026-10-02T12:00:00.000Z',amount:88,cost:88});
  const orphan=repair({stage:'terminee',completedAt:'2026-10-02T10:00:00.000Z',paidAt:'2026-10-02T12:00:00.000Z',amount:77,cost:77});orphan.consoleId='missing-console';
  const valid=repair({paidAt:'2026-10-02T12:00:00.000Z',amount:10,cost:10});
  const report=finance.buildFinanceReport(store,{granularity:'month',anchor:'2026-10-10',count:1});
  assert.equal(report.totals.received,10);assert.equal(report.totals.completedValue,0);assert.equal(report.totals.outstanding,0);assert.deepEqual(report.payments.map(row=>row.repairId),[valid.id]);
});

test('Completed values use completedAt while outstanding excludes any paid dossier regardless of receipt period',()=>{
  const {store,repair}=fixture();
  const unpaid=repair({stage:'terminee',completedAt:'2026-09-30T22:30:00.000Z',cost:10,parts:2});delete unpaid.payment;
  repair({stage:'terminee',completedAt:'2026-10-15T12:00:00.000Z',paidAt:'2026-09-01T12:00:00.000Z',amount:15,cost:20});
  repair({stage:'terminee',completedAt:'',cost:100});
  repair({stage:'terminee',completedAt:'2026-09-30T21:30:00.000Z',cost:200});
  repair({stage:'diagnostic',completedAt:'',paidAt:'2026-10-16T12:00:00.000Z',amount:35,cost:50});
  const report=finance.buildFinanceReport(store,{granularity:'month',anchor:'2026-10-10',count:1});
  assert.equal(report.totals.completedValue,32);assert.equal(report.totals.completedCount,2);assert.equal(report.totals.outstanding,12);assert.equal(report.totals.unpaidCompletedCount,1);
  assert.equal(report.totals.received,35);assert.equal(report.totals.paidCount,1);assert.equal(report.payments.length,1);
});

test('Zero receipts count as paid and recorded parts can produce a negative estimated gain',()=>{
  const {store,repair}=fixture();
  repair({paidAt:'2026-10-02T12:00:00.000Z',amount:0,cost:10,parts:5});
  const report=finance.buildFinanceReport(store,{granularity:'month',anchor:'2026-10-10',count:1});
  assert.equal(report.totals.received,0);assert.equal(report.totals.paidCount,1);assert.equal(report.totals.parts,5);assert.equal(report.totals.estimatedGain,-5);
  assert.deepEqual([report.payments[0].amount,report.payments[0].parts,report.payments[0].estimatedGain],[0,5,-5]);
});

test('Finance aggregation sums integer cents exactly and never mutates even deeply frozen stores',()=>{
  const {store,repair}=fixture();const first=repair({stage:'terminee',completedAt:'2026-10-02T10:00:00.000Z',paidAt:'2026-10-02T12:00:00.000Z',amount:.01,cost:.01,parts:.02});
  store.repairs=Array.from({length:1001},(_,index)=>({...structuredClone(first),id:`finance-cent-${index}`,code:`REP-${index+1}`}));store.events=[];
  const before=JSON.stringify(store);deepFreeze(store);
  const report=finance.buildFinanceReport(store,{granularity:'month',anchor:'2026-10-10',count:1});
  assert.deepEqual(report.totals,{received:10.01,parts:20.02,estimatedGain:-10.01,completedValue:30.03,outstanding:0,paidCount:1001,completedCount:1001,unpaidCompletedCount:0});
  assert.equal(report.payments.length,1001);assert.equal(JSON.stringify(store),before);
});

test('Finance receipt and used-part snapshots survive later hourly rates and stock price changes',()=>{
  const {store,repair}=fixture();const result=repair({stage:'terminee',completedAt:'2026-10-02T10:00:00.000Z',paidAt:'2026-10-02T12:00:00.000Z',amount:25,parts:5});
  delete result.interventionCost;result.worklogs.push({id:domain.uid(),minutes:45,note:'Temps conservé',createdAt:domain.now()});
  const before=finance.buildFinanceReport(store,{granularity:'month',anchor:'2026-10-10',count:1});
  store.settings.hourlyRate=70;store.parts[0].unitCost=999;
  const after=finance.buildFinanceReport(store,{granularity:'month',anchor:'2026-10-10',count:1});
  assert.equal(before.totals.completedValue,31.25);assert.equal(after.totals.completedValue,57.5);
  assert.equal(after.totals.received,25);assert.equal(after.totals.parts,5);assert.equal(after.totals.estimatedGain,20);assert.equal(after.payments[0].amount,25);
});

test('Missing or invalid event dates are excluded rather than assigned an invented Finance period',()=>{
  const {store,repair}=fixture();
  for(const paidAt of ['', 'invalid', '2026-02-31T12:00:00.000Z', '2026-03-01T12:00:00.000'])repair({paidAt,amount:50});
  for(const completedAt of ['', 'invalid', '2026-02-31T12:00:00.000Z', '2026-03-01T12:00:00.000'])repair({stage:'terminee',completedAt,cost:60});
  const report=finance.buildFinanceReport(store,{granularity:'month',anchor:'2026-03-10',count:2});
  assert.equal(report.totals.received,0);assert.equal(report.totals.completedValue,0);assert.equal(report.totals.outstanding,0);assert.equal(report.payments.length,0);
});

test('Finance periods reject invalid dates, granularities, counts and navigation outside years 0001 through 9999',()=>{
  const store=domain.emptyStore();
  for(const anchor of ['2026-2-01','2026-02-29','2026-04-31','0000-01-01','10000-01-01','invalid'])assert.throws(()=>finance.buildFinanceReport(store,{granularity:'month',anchor,count:1}),/date/);
  for(const count of [0,-1,121,.5,null,'2',NaN,Infinity])assert.throws(()=>finance.buildFinanceReport(store,{granularity:'month',anchor:'2026-10-10',count}),/nombre de périodes/);
  assert.equal(finance.buildFinanceReport(store,{granularity:'month',anchor:'2026-10-10',count:120}).buckets.length,120);
  assert.throws(()=>finance.buildFinanceReport(store,{granularity:'day',anchor:'2026-10-10'}),/semaine ou par mois/);
  for(const steps of [.5,NaN,Infinity])assert.throws(()=>finance.shiftFinanceAnchor('2026-10-10','month',steps),/nombre entier/);
  assert.throws(()=>finance.shiftFinanceAnchor('0001-01-01','month',-1),/dates prises en charge/);
  assert.throws(()=>finance.shiftFinanceAnchor('9999-12-01','month',1),/dates prises en charge/);
  assert.throws(()=>finance.buildFinanceReport(store,{granularity:'month',anchor:'0001-01-01',count:2}),/dates prises en charge/);
  const last=finance.buildFinanceReport(store,{granularity:'month',anchor:'9999-12-31',count:1});assert.equal(last.start,'9999-12-01');assert.equal(last.end,'9999-12-31');
});
