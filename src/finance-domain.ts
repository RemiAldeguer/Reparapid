import {type Store, cents, money, partsCost, repairTotalCost} from './domain';

export type FinanceGranularity = 'week' | 'month';
export interface FinanceOptions { granularity: FinanceGranularity; anchor: string; count?: number; }
export interface FinanceMetrics {
  received: number; parts: number; estimatedGain: number; completedValue: number; outstanding: number;
  paidCount: number; completedCount: number; unpaidCompletedCount: number;
}
export interface FinanceBucket extends FinanceMetrics { id: string; start: string; end: string; label: string; }
export interface FinancePayment {
  repairId: string; repairCode: string; repairTitle: string;
  consoleId: string; consoleCode: string; consoleName: string;
  clientId: string; clientName: string; paidAt: string; paymentDate: string; bucketId: string;
  amount: number; parts: number; estimatedGain: number;
}
export interface FinanceReport {
  granularity: FinanceGranularity; anchor: string; start: string; end: string;
  buckets: FinanceBucket[]; totals: FinanceMetrics; payments: FinancePayment[];
}

const parisDate = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Paris', era:'short', year:'numeric', month:'2-digit', day:'2-digit'});
const periodDayLabel = new Intl.DateTimeFormat('fr-FR', {timeZone:'UTC', day:'numeric', month:'short', year:'numeric'});
const monthLabel = new Intl.DateTimeFormat('fr-FR', {timeZone:'UTC', month:'long', year:'numeric'});

/** Calendar dates are always interpreted in Paris, independent of the host timezone. */
export function financeToday(date = new Date()): string {
  if(!(date instanceof Date)||!Number.isFinite(date.getTime()))throw Error('La date de référence est invalide.');
  const values = Object.fromEntries(parisDate.formatToParts(date).map(part=>[part.type,part.value]));
  if(values.era!=='AD')throw Error('La date de référence doit être comprise entre les années 0001 et 9999.');
  const result = `${values.year.padStart(4,'0')}-${values.month}-${values.day}`;
  calendarDate(result);return result;
}

function calendarDate(value: string): Date {
  if(typeof value!=='string'||!/^(?!0000)\d{4}-\d\d-\d\d$/.test(value))throw Error('La date de référence doit être au format AAAA-MM-JJ, entre les années 0001 et 9999.');
  const date = new Date(`${value}T12:00:00.000Z`);
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw Error('La date de référence est invalide.');
  return date;
}

function dateId(date: Date): string {
  if(!Number.isFinite(date.getTime()))throw Error('La période demandée dépasse les dates prises en charge.');
  const result = date.toISOString().slice(0,10);
  if(!/^(?!0000)\d{4}-\d\d-\d\d$/.test(result))throw Error('La période demandée dépasse les dates prises en charge.');
  return result;
}

function canonicalGranularity(value: FinanceGranularity): FinanceGranularity {
  if(value!=='week'&&value!=='month')throw Error('Choisissez une période par semaine ou par mois.');
  return value;
}

function periodStart(anchor: string, granularity: FinanceGranularity): Date {
  const date = calendarDate(anchor);
  if(granularity==='week')date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);
  else date.setUTCDate(1);
  return date;
}

function advancePeriod(start: Date, granularity: FinanceGranularity, steps: number): Date {
  const date = new Date(start);
  if(granularity==='week')date.setUTCDate(date.getUTCDate()+7*steps);
  else date.setUTCMonth(date.getUTCMonth()+steps);
  return date;
}

/** Normalize first, so navigation from 31 January lands in February rather than March. */
export function shiftFinanceAnchor(anchor: string, granularity: FinanceGranularity, steps: number): string {
  canonicalGranularity(granularity);
  if(!Number.isSafeInteger(steps))throw Error('Le déplacement de période doit être un nombre entier.');
  return dateId(advancePeriod(periodStart(anchor,granularity),granularity,steps));
}

function emptyMetrics(): FinanceMetrics {
  return {received:0,parts:0,estimatedGain:0,completedValue:0,outstanding:0,paidCount:0,completedCount:0,unpaidCompletedCount:0};
}

function integerCents(value: number): number {
  const result = Math.round(cents(value)*100);
  if(!Number.isFinite(value)||!Number.isSafeInteger(result))throw Error(`La valeur ${money(value)} dépasse la précision du suivi financier.`);
  return result;
}

function amountMetrics(metrics: FinanceMetrics): FinanceMetrics {
  return {...metrics,received:metrics.received/100,parts:metrics.parts/100,estimatedGain:metrics.estimatedGain/100,completedValue:metrics.completedValue/100,outstanding:metrics.outstanding/100};
}

function timestampDate(value: string): string | null {
  // A legacy timestamp without a zone is ambiguous; never invent its accounting date.
  if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT/.test(value)||!/(?:Z|[+-]\d\d:?\d\d)$/i.test(value))return null;
  try {
    calendarDate(value.slice(0,10));
    const timestamp = new Date(value);
    return Number.isFinite(timestamp.getTime())?financeToday(timestamp):null;
  } catch { return null; }
}

/** Receipts use immutable payment snapshots; parts remain the dossier's recorded consumed costs. */
export function buildFinanceReport(store: Store, options: FinanceOptions): FinanceReport {
  const granularity = canonicalGranularity(options.granularity), anchor = dateId(calendarDate(options.anchor));
  const count = options.count===undefined?(granularity==='week'?12:6):options.count;
  if(!Number.isSafeInteger(count)||count<1||count>120)throw Error('Le nombre de périodes doit être compris entre 1 et 120.');
  const anchorStart = periodStart(anchor,granularity);
  const buckets: FinanceBucket[] = Array.from({length:count},(_,index)=>{
    const startDate = advancePeriod(anchorStart,granularity,index-count+1);
    const endDate = advancePeriod(startDate,granularity,1);endDate.setUTCDate(endDate.getUTCDate()-1);
    const start = dateId(startDate),end = dateId(endDate);
    return {id:`${granularity}-${start}`,start,end,label:granularity==='week'?`${periodDayLabel.format(startDate)} – ${periodDayLabel.format(endDate)}`:monthLabel.format(startDate),...emptyMetrics()};
  });
  const start = buckets[0].start,end = buckets[buckets.length-1].end;
  const bucketByStart = new Map(buckets.map(bucket=>[bucket.start,bucket]));
  function datedBucket(timestamp: string): {bucket: FinanceBucket; date: string} | null {
    const date = timestampDate(timestamp);if(!date||date<start||date>end)return null;
    const bucket = bucketByStart.get(dateId(periodStart(date,granularity)));
    return bucket?{bucket,date}:null;
  }
  const clients = new Map(store.clients.map(client=>[client.id,client]));
  const consoles = new Map(store.consoles.map(item=>[item.id,item]));
  const payments: FinancePayment[] = [];
  for(const repair of store.repairs) {
    const item = consoles.get(repair.consoleId),client = item?.clientId?clients.get(item.clientId):undefined;
    if(!item||!client)continue;
    const payment = repair.payment;
    if(payment&&typeof payment.amount==='number'&&Number.isFinite(payment.amount)&&payment.amount>=0) {
      const period = datedBucket(payment.paidAt);
      if(period) {
        const received = integerCents(payment.amount),parts = integerCents(partsCost(repair)),gain = received-parts;
        period.bucket.received+=received;period.bucket.parts+=parts;period.bucket.estimatedGain+=gain;period.bucket.paidCount++;
        payments.push({repairId:repair.id,repairCode:repair.code,repairTitle:repair.title,consoleId:item.id,consoleCode:item.code,consoleName:`${item.brand} ${item.model}`.trim(),clientId:client.id,clientName:client.name,paidAt:payment.paidAt,paymentDate:period.date,bucketId:period.bucket.id,amount:received/100,parts:parts/100,estimatedGain:gain/100});
      }
    }
    if(repair.stage==='terminee') {
      const period = datedBucket(repair.completedAt);
      if(period) {
        const value = integerCents(repairTotalCost(store,repair));
        period.bucket.completedValue+=value;period.bucket.completedCount++;
        if(repair.payment==null){period.bucket.outstanding+=value;period.bucket.unpaidCompletedCount++;}
      }
    }
  }
  const totals = emptyMetrics();
  for(const bucket of buckets)for(const key of Object.keys(totals) as (keyof FinanceMetrics)[]) {
    totals[key]+=bucket[key];
    if(!Number.isSafeInteger(totals[key]))throw Error('Les montants cumulés dépassent la précision du suivi financier.');
  }
  payments.sort((a,b)=>Date.parse(b.paidAt)-Date.parse(a.paidAt)||a.repairCode.localeCompare(b.repairCode));
  return {granularity,anchor,start,end,buckets:buckets.map(bucket=>({...bucket,...amountMetrics(bucket)})),totals:amountMetrics(totals),payments};
}
