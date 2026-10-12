/** Domain rules are independent from the UI and the storage mechanism. */
export const SCHEMA = 1;
export const STORAGE_KEY = 'la-clinique-retro:v1';
export const STATES = {
  'a-tester': 'À tester', 'en-panne': 'En panne', 'en-reparation': 'En réparation',
  'fonctionnelle': 'Fonctionnelle', 'pour-pieces': 'Pour pièces',
} as const;
export type ConsoleState = keyof typeof STATES;
export const STAGES = [
  { id: 'attente-envoi', label: 'En attente d’envoi', short: 'Attente envoi', color: 'slate', icon: 'package' },
  { id: 'reception', label: 'Réception', short: 'Réception', color: 'slate', icon: 'inbox' },
  { id: 'diagnostic', label: 'Diagnostic', short: 'Diagnostic', color: 'purple', icon: 'stethoscope' },
  { id: 'attente-pieces', label: 'En attente de pièces', short: 'Attente pièces', color: 'amber', icon: 'package' },
  { id: 'reparation', label: 'Réparation en cours', short: 'Réparation', color: 'blue', icon: 'wrench' },
  { id: 'tests', label: 'Tests de validation', short: 'Tests', color: 'teal', icon: 'checklist' },
  { id: 'terminee', label: 'Terminée', short: 'Terminée', color: 'green', icon: 'check' },
  { id: 'irreparable', label: 'Irréparable', short: 'Irréparable', color: 'red', icon: 'alert' },
  { id: 'abandonnee', label: 'Abandonnée', short: 'Abandonnée', color: 'slate', icon: 'archive' },
] as const;
export type Stage = typeof STAGES[number]['id'];
export const PRIORITIES = { urgente: 'Urgente', haute: 'Haute', normale: 'Normale', basse: 'Basse' } as const;
export type Priority = keyof typeof PRIORITIES;
export type Illustration = 'gameboy' | 'snes' | 'playstation' | 'megadrive' | 'dreamcast' | 'switch' | 'gamegear';
export type TestResult = 'pending' | 'pass' | 'fail' | 'na';
export const CLIENT_PART_STATUSES = {'en-attente':'En attente de la pièce',disponible:'Disponible',livree:'Livrée',installee:'Installée'} as const;
export type ClientPartStatus = keyof typeof CLIENT_PART_STATUSES;
export interface ClientPartRequest { id: string; name: string; quantity: number; note: string; status: ClientPartStatus; createdAt: string; updatedAt: string; }
export type ClientPartRequestInput = Pick<ClientPartRequest,'name'|'quantity'> & {note?: string};
export interface Photo { id: string; data: string; caption: string; createdAt: string; }
export interface Client {
  id: string; code: string; name: string; email: string; phone: string;
  address: string; notes: string; createdAt: string;
}
export interface ConsoleItem {
  id: string; code: string; brand: string; model: string; variant: string; serial: string;
  clientId?: string;
  state: ConsoleState; condition: string; acquiredAt: string; purchasePrice: number; estimatedValue: number;
  source: string; location: string; accessories: string; notes: string; illustration: Illustration;
  photos: Photo[]; archived: boolean; createdAt: string;
}
export interface Part {
  id: string; reference: string; name: string; category: string; compatibility: string;
  quantity: number; threshold: number; unitCost: number; location: string; supplier: string;
}
export interface PartUsage { id: string; partId: string; name: string; quantity: number; unitCost: number; usedAt: string; }
export interface Worklog { id: string; minutes: number; note: string; createdAt: string; }
export interface RepairTest { id: string; label: string; result: TestResult; }
export interface RepairPayment { amount: number; paidAt: string; }
export interface Repair {
  id: string; code: string; consoleId: string; title: string; symptoms: string; diagnosis: string;
  stage: Stage; priority: Priority; dueDate: string; createdAt: string; updatedAt: string; completedAt: string;
  parts: PartUsage[]; worklogs: Worklog[]; tests: RepairTest[]; timerStartedAt: string; photos: Photo[];
  interventionCost?: number | null;
  payment?: RepairPayment | null;
  clientParts?: ClientPartRequest[];
  publicRequestId?: string;
}
export interface Activity {
  id: string; kind: 'created' | 'stage' | 'note' | 'part' | 'time' | 'test' | 'edit' | 'system' | 'photo';
  text: string; createdAt: string; consoleId?: string; repairId?: string; clientId?: string;
}
export interface PublicIntakeSettings {
  shopName: string; address: string; postalCode: string; city: string; phone: string; email: string;
  addressConfirmed: boolean;
}
export interface Store {
  schemaVersion: number; revision: number;
  settings: { workshop: string; owner: string; hourlyRate: number; demo: boolean; lastExportAt: string; publicIntake?: PublicIntakeSettings; };
  clients: Client[]; consoles: ConsoleItem[]; repairs: Repair[]; parts: Part[]; events: Activity[];
}
export const uid = () => globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const now = () => new Date().toISOString();
export const today = () => localDate(new Date());
export const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const active = (r: Repair) => !['terminee','irreparable','abandonnee'].includes(r.stage);
export const stageInfo = (s: Stage) => STAGES.find(x => x.id === s)!;
/** Collapse the retired ordering step in legacy data without changing its history or metadata. */
export function normalizeRepairStages<T>(raw: T): T {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return raw;
  const repairs=(raw as {repairs?: unknown}).repairs;
  if(!Array.isArray(repairs)||!repairs.some(r=>r&&typeof r==='object'&&!Array.isArray(r)&&r.stage==='a-commander'))return raw;
  return {...raw,repairs:repairs.map(r=>r&&typeof r==='object'&&!Array.isArray(r)&&r.stage==='a-commander'?{...r,stage:'attente-pieces'}:r)} as T;
}
export const money = (v: number) => new Intl.NumberFormat('fr-FR',{ style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v);
export const compactMoney = (v: number) => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v);
export const dateFmt = (s: string, full = false) => !s ? 'Non renseignée' : new Intl.DateTimeFormat('fr-FR', full ? {dateStyle:'long'} : {day:'2-digit',month:'short',year:'numeric'}).format(new Date(s.length===10 ? s+'T12:00:00' : s));
export const timeFmt = (s: string) => new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date(s));
export const minutesFmt = (n: number) => n < 60 ? `${n} min` : `${Math.floor(n/60)} h${n%60 ? ` ${String(n%60).padStart(2,'0')}` : ''}`;
export const totalMinutes = (r: Repair) => r.worklogs.reduce((a,w)=>a+w.minutes,0);
export const partsCost = (r: Repair) => cents(r.parts.reduce((a,p)=>a+p.quantity*p.unitCost,0));
export const cents = (n: number) => Math.round((n + Number.EPSILON)*100)/100;
/** A manual intervention price overrides the hourly estimate, including a free intervention. */
export const repairInterventionCost = (s: Store,r: Repair) => r.interventionCost ?? cents(totalMinutes(r)*s.settings.hourlyRate/60);
export const repairTotalCost = (s: Store,r: Repair) => cents(partsCost(r)+repairInterventionCost(s,r));
/** Current costs of every customer repair, regardless of stage or recorded receipt. */
export function theoreticalRepairRevenue(s: Store): {total: number; count: number} {
  const clientIds=new Set(s.clients.map(client=>client.id));
  const clientConsoleIds=new Set(s.consoles.filter(item=>item.clientId&&clientIds.has(item.clientId)).map(item=>item.id));
  let totalCents=0,count=0;
  for(const repair of s.repairs) {
    if(!clientConsoleIds.has(repair.consoleId))continue;
    totalCents+=Math.round(repairTotalCost(s,repair)*100);count++;
  }
  return {total:totalCents/100,count};
}
/** Completed customer repairs, including archived consoles; amounts include parts. */
export function completedRepairRevenue(s: Store): {total: number; count: number} {
  const clientIds=new Set(s.clients.map(client=>client.id));
  const clientConsoleIds=new Set(s.consoles.filter(item=>item.clientId&&clientIds.has(item.clientId)).map(item=>item.id));
  let totalCents=0,count=0;
  for(const repair of s.repairs) {
    if(repair.stage!=='terminee'||!clientConsoleIds.has(repair.consoleId))continue;
    totalCents+=Math.round(repairTotalCost(s,repair)*100);count++;
  }
  return {total:totalCents/100,count};
}
/** Recorded receipts keep the amount collected even if the estimate later changes. */
export const repairPaidAmount = (r: Repair): number => r.payment?.amount ?? 0;
/** All recorded customer payments, including reopened dossiers and archived consoles. */
export function paidRepairRevenue(s: Store): {total: number; count: number} {
  const clientIds=new Set(s.clients.map(client=>client.id));
  const clientConsoleIds=new Set(s.consoles.filter(item=>item.clientId&&clientIds.has(item.clientId)).map(item=>item.id));
  let totalCents=0,count=0;
  for(const repair of s.repairs) {
    if(!repair.payment||!clientConsoleIds.has(repair.consoleId))continue;
    totalCents+=Math.round(repairPaidAmount(repair)*100);count++;
  }
  return {total:totalCents/100,count};
}
function validInterventionCost(value: unknown): value is number | null {
  return value===null || (typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1e6&&cents(value)===value);
}
function validPaymentAmount(value: unknown): value is number {
  return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1e9&&cents(value)===value;
}
function validPaymentTimestamp(value: unknown): value is string {
  return typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
}
export const consoleInvestment = (s: Store,c: ConsoleItem) => cents(c.purchasePrice+s.repairs.filter(r=>r.consoleId===c.id).reduce((a,r)=>a+partsCost(r),0));
export const overdue = (r: Repair) => active(r) && !!r.dueDate && r.dueDate < today();
export const nextCode = (arr: {code:string}[],prefix:string) => prefix + String(Math.max(0,...arr.map(x=>Number(x.code.match(/\d+$/)?.[0])||0))+1).padStart(3,'0');
const deletedRepairCode = (event: Activity) => event.kind==='system'?event.text.match(/^Dossier (REP-\d+) supprimé :/)?.[1]:undefined;
/** Deletion traces reserve console numbers across exports and future admissions. */
export function nextConsoleCode(s: Store): string {
  let highest=s.consoles.reduce((max,c)=>Math.max(max,Number(c.code.match(/\d+$/)?.[0])||0),0);
  for(const event of s.events) {
    if(event.kind!=='system')continue;
    const code=event.text.match(/^Console (CRT-\d+) supprimée :/)?.[1];
    if(code)highest=Math.max(highest,Number(code.match(/\d+$/)?.[0])||0);
  }
  return 'CRT-'+String(highest+1).padStart(3,'0');
}
/** Deletion traces reserve repair numbers across exports and future admissions. */
function nextRepairCode(s: Store): string {
  let highest=s.repairs.reduce((max,r)=>Math.max(max,Number(r.code.match(/\d+$/)?.[0])||0),0);
  for(const event of s.events) {
    const code=deletedRepairCode(event);
    if(code)highest=Math.max(highest,Number(code.match(/\d+$/)?.[0])||0);
  }
  return 'REP-'+String(highest+1).padStart(3,'0');
}
export const defaultTests = (): RepairTest[] => [
  'Démarrage et alimentation','Image et affichage','Son et sortie audio','Commandes et connectiques','Stabilité : 30 min minimum'
].map(label=>({id:uid(),label,result:'pending'}));
export function addEvent(s: Store,text: string,kind: Activity['kind']='edit',refs: Pick<Activity,'consoleId'|'repairId'|'clientId'>={}) {
  const c=refs.consoleId?s.consoles.find(x=>x.id===refs.consoleId):undefined;
  const r=refs.repairId?s.repairs.find(x=>x.id===refs.repairId):undefined;
  if(refs.consoleId&&!c)throw Error('Console de journal introuvable.');
  if(refs.repairId&&!r)throw Error('Réparation de journal introuvable.');
  if(refs.clientId&&!s.clients.some(x=>x.id===refs.clientId))throw Error('Client de journal introuvable.');
  if(r&&c&&r.consoleId!==c.id)throw Error('Journal lié à une autre console.');
  if(refs.clientId&&(c||r)&&s.consoles.find(x=>x.id===(c?.id??r?.consoleId))?.clientId!==refs.clientId)throw Error('Journal lié à un autre client.');
  s.events.unshift({id:uid(),text,kind,createdAt:now(),...refs});
}
export function stopTimer(s: Store,r: Repair) {
  if(!r.timerStartedAt) return;
  const minutes=Math.max(1,Math.ceil((Date.now()-Date.parse(r.timerStartedAt))/60000));
  r.worklogs.push({id:uid(),minutes,note:'Session chronométrée',createdAt:now()}); r.timerStartedAt='';
  addEvent(s,`${minutesFmt(minutes)} d’intervention enregistrées.`, 'time',{consoleId:r.consoleId,repairId:r.id});
}
export function setRepairInterventionCost(s: Store,repairId: string,cost: number | null) {
  const r=s.repairs.find(x=>x.id===repairId);if(!r)throw Error('Dossier introuvable.');
  if(!validInterventionCost(cost))throw Error('Le coût de l’intervention doit être compris entre 0 et 1 000 000 €, avec deux décimales maximum.');
  if((r.interventionCost??null)===cost)return;
  r.interventionCost=cost;r.updatedAt=now();
  addEvent(s,cost===null?'Coût de l’intervention recalculé à partir du temps enregistré.':`Coût de l’intervention fixé à ${money(cost)} (hors pièces).`,'edit',{consoleId:r.consoleId,repairId:r.id});
}
/** Editing an all-inclusive quote preserves consumed parts and any recorded payment. */
export function setRepairTotalCost(s: Store,repairId: string,total: number): void {
  const r=s.repairs.find(x=>x.id===repairId);if(!r)throw Error('Dossier introuvable.');
  if(typeof total!=='number'||!Number.isFinite(total)||total<0||cents(total)!==total)throw Error('Le montant total doit être un nombre positif ou nul, avec deux décimales maximum.');
  const consumed=partsCost(r);
  if(total<consumed)throw Error(`Le montant total ne peut pas être inférieur au coût des pièces déjà utilisées (${money(consumed)}).`);
  const intervention=cents(total-consumed);
  if(!validInterventionCost(intervention)||total>cents(consumed+1e6))throw Error(`Le montant total ne peut pas dépasser ${money(cents(consumed+1e6))} (pièces + 1 000 000 € d’intervention).`);
  validateStore(s);
  const draft=structuredClone(s),next=draft.repairs.find(x=>x.id===repairId)!;
  setRepairInterventionCost(draft,repairId,intervention);validateStore(draft);
  r.interventionCost=next.interventionCost;r.updatedAt=next.updatedAt;s.events=draft.events;
}
/** Record or cancel a full payment atomically; a repeated action preserves its receipt. */
export function setRepairPayment(s: Store,repairId: string,paid: boolean): void {
  if(typeof paid!=='boolean')throw Error('Le statut de paiement doit être un booléen.');
  const r=s.repairs.find(x=>x.id===repairId);if(!r)throw Error('Dossier introuvable.');
  const c=s.consoles.find(x=>x.id===r.consoleId);if(!c)throw Error('Console introuvable.');
  const client=c.clientId?s.clients.find(x=>x.id===c.clientId):undefined;
  if(paid&&!client)throw Error('Associez la console à un client avant d’enregistrer son paiement.');
  validateStore(s);
  if(Boolean(r.payment)===paid)return;
  const amount=paid?repairTotalCost(s,r):0;
  if(paid&&!validPaymentAmount(amount))throw Error('Le montant payé doit être compris entre 0 et 1 000 000 000 €, avec deux décimales maximum.');
  const draft=structuredClone(s),next=draft.repairs.find(x=>x.id===repairId)!;
  const recordedAt=now();next.payment=paid?{amount,paidAt:recordedAt}:null;next.updatedAt=recordedAt;
  addEvent(draft,paid?`Paiement enregistré : ${money(amount)} reçus du client.`:'Paiement annulé : le dossier est marqué non payé.','edit',{consoleId:c.id,repairId:r.id,...(client?{clientId:client.id}:{})});
  validateStore(draft);
  r.payment=next.payment;r.updatedAt=next.updatedAt;s.events=draft.events;
}
export function moveRepair(s: Store,id: string,stage: Stage) {
  const r=s.repairs.find(x=>x.id===id); if(!r) throw Error('Dossier introuvable.');
  if(!STAGES.some(x=>x.id===stage)) throw Error('Étape inconnue.');
  if(r.stage===stage) return;
  const c=s.consoles.find(x=>x.id===r.consoleId)!;
  if(!['terminee','abandonnee','irreparable'].includes(stage)) {
    if(c.archived) throw Error('Restaurez d’abord cette console dans l’inventaire.');
    if(s.repairs.some(x=>x.id!==id&&x.consoleId===c.id&&active(x))) throw Error('Cette console possède déjà une réparation ouverte.');
  }
  const previous=stageInfo(r.stage).label;
  if(r.stage==='attente-envoi'&&stage==='reception'&&c.location==='En attente d’envoi')c.location='À l’atelier';
  const targetOpen=!['terminee','irreparable','abandonnee'].includes(stage);
  const mustRetest=targetOpen&&(!active(r)||(r.stage==='tests'&&stage!=='tests'));
  if(mustRetest)r.tests.forEach(t=>t.result='pending');
  if(stage==='terminee') {
    if(!r.tests.length)r.tests=defaultTests();
    r.tests.forEach(t=>t.result='pass');
    addEvent(s,'Tests marqués OK lors de la clôture directe.','test',{consoleId:c.id,repairId:r.id});
  }
  r.stage=stage; r.updatedAt=now(); r.completedAt=active(r)?'':now();
  if(!active(r)) stopTimer(s,r);
  const anotherOpen=s.repairs.find(x=>x.id!==r.id&&x.consoleId===c.id&&active(x));
  c.state=anotherOpen?(anotherOpen.stage==='attente-envoi'?'en-panne':'en-reparation'):stage==='terminee'?'fonctionnelle':stage==='irreparable'?'pour-pieces':stage==='abandonnee'||stage==='attente-envoi'?'en-panne':'en-reparation';
  addEvent(s,`${previous} → ${stageInfo(stage).label}`, 'stage',{consoleId:c.id,repairId:r.id});
}
function repairDeletionText(r: Repair): string {
  const consumed=r.parts.length?` Pièces déjà utilisées : ${r.parts.reduce((quantity,p)=>quantity+p.quantity,0)} unité(s), ${money(partsCost(r))}. Le stock reste déduit.`:'';
  return `Dossier ${r.code} supprimé : ${r.title}.${consumed}`;
}
/** Remove a dossier atomically while preserving its equipment, owner and consumed stock. */
export function deleteRepair(s: Store,id: string): void {
  const draft=structuredClone(s),r=draft.repairs.find(x=>x.id===id);
  if(!r)throw Error('Dossier introuvable.');
  const c=draft.consoles.find(x=>x.id===r.consoleId);
  if(!c)throw Error('Console introuvable.');
  draft.repairs=draft.repairs.filter(x=>x.id!==id);
  draft.events=draft.events.filter(e=>e.repairId!==id);
  if(active(r)&&c.state==='en-reparation'&&!draft.repairs.some(x=>x.consoleId===c.id&&active(x)))c.state='en-panne';
  addEvent(draft,repairDeletionText(r),'system',{consoleId:c.id,...(c.clientId?{clientId:c.clientId}:{})});
  validateStore(draft);
  s.consoles=draft.consoles;s.repairs=draft.repairs;s.events=draft.events;
}
/** Remove equipment and its dossiers atomically; owners and consumed stock remain intact. */
export function deleteConsole(s: Store,id: string): void {
  const draft=structuredClone(s),c=draft.consoles.find(x=>x.id===id);
  if(!c)throw Error('Console introuvable.');
  const removed=draft.repairs.filter(r=>r.consoleId===id),repairIds=new Set(removed.map(r=>r.id));
  draft.consoles=draft.consoles.filter(x=>x.id!==id);
  draft.repairs=draft.repairs.filter(r=>r.consoleId!==id);
  draft.events=draft.events.flatMap(event=>{
    if(event.repairId&&repairIds.has(event.repairId))return [];
    if(event.consoleId!==id)return [event];
    // Previous deletion traces keep their reserved number, with no deleted equipment reference.
    if(deletedRepairCode(event)&&!event.repairId){const {consoleId,...trace}=event;return [trace];}
    return [];
  });
  const refs=c.clientId?{clientId:c.clientId}:{};
  for(const repair of removed)addEvent(draft,repairDeletionText(repair),'system',refs);
  addEvent(draft,`Console ${c.code} supprimée : ${c.brand} ${c.model}. ${removed.length} dossier(s) de réparation supprimé(s). Les pièces utilisées restent déduites du stock.`,'system',refs);
  validateStore(draft);
  s.consoles=draft.consoles;s.repairs=draft.repairs;s.events=draft.events;
}
export function usePart(s: Store,repairId: string,partId: string,quantity: number) {
  const r=s.repairs.find(x=>x.id===repairId), p=s.parts.find(x=>x.id===partId);
  if(!r||!p) throw Error('Pièce ou réparation introuvable.');
  if(!active(r)) throw Error('Rouvrez le dossier avant de modifier les pièces.');
  if(!Number.isSafeInteger(quantity)||quantity<1) throw Error('La quantité doit être un entier positif.');
  if(quantity>p.quantity) throw Error(`Stock insuffisant : ${p.quantity} unité(s) disponible(s).`);
  r.tests.forEach(t=>t.result='pending');
  p.quantity-=quantity; r.parts.push({id:uid(),partId:p.id,name:p.name,quantity,unitCost:p.unitCost,usedAt:now()}); r.updatedAt=now();
  addEvent(s,`${quantity} × ${p.name} utilisées (${money(quantity*p.unitCost)}).`, 'part',{consoleId:r.consoleId,repairId:r.id});
}
export function returnPart(s: Store,repairId: string,usageId: string) {
  const r=s.repairs.find(x=>x.id===repairId)!;
  if(!r || !active(r)) throw Error('Rouvrez le dossier avant de modifier les pièces.');
  const u=r.parts.find(x=>x.id===usageId); if(!u) throw Error('Utilisation introuvable.');
  const p=s.parts.find(x=>x.id===u.partId); if(!p) throw Error('Référence introuvable dans le stock.');
  r.tests.forEach(t=>t.result='pending');
  p.quantity+=u.quantity; r.parts=r.parts.filter(x=>x.id!==usageId);r.updatedAt=now();
  addEvent(s,`${u.quantity} × ${u.name} remises en stock.`, 'part',{consoleId:r.consoleId,repairId:r.id});
}
function clientPartRepair(s: Store,repairId: string,requireOpen=false): Repair {
  const r=s.repairs.find(x=>x.id===repairId);if(!r)throw Error('Dossier introuvable.');
  const c=s.consoles.find(x=>x.id===r.consoleId);if(!c)throw Error('Console introuvable.');
  if(!c.clientId||!s.clients.some(client=>client.id===c.clientId))throw Error('Les pièces demandées au client sont réservées aux consoles rattachées à un client.');
  if(requireOpen&&!active(r))throw Error('Rouvrez le dossier avant d’ajouter ou de modifier une pièce demandée au client.');
  validateStore(s);return r;
}
function clientPartInput(input: ClientPartRequestInput): Pick<ClientPartRequest,'name'|'quantity'|'note'> {
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Renseignez la pièce demandée au client.');
  const name=inputText(input.name,'Le nom de la pièce',200,true),note=input.note===undefined?'':inputText(input.note,'La note de la pièce',1000);
  if(!Number.isSafeInteger(input.quantity)||input.quantity<1||input.quantity>1000)throw Error('La quantité de pièce client doit être un entier compris entre 1 et 1 000.');
  return {name,quantity:input.quantity,note};
}
function clientPartItem(r: Repair,id: string): ClientPartRequest {
  const item=r.clientParts?.find(request=>request.id===id);if(!item)throw Error('Pièce client introuvable dans ce dossier.');return item;
}
function commitClientParts(s: Store,r: Repair,draft: Store,text: string) {
  const next=draft.repairs.find(repair=>repair.id===r.id)!,c=draft.consoles.find(item=>item.id===r.consoleId)!;
  next.updatedAt=now();addEvent(draft,text,'part',{consoleId:c.id,repairId:r.id,clientId:c.clientId!});
  validateStore(draft);
  const existing=new Map((r.clientParts??[]).map(item=>[item.id,item]));
  r.clientParts=(next.clientParts??[]).map(item=>{const original=existing.get(item.id);return original?Object.assign(original,item):item;});
  r.updatedAt=next.updatedAt;s.events=draft.events;
}
/** A client's supplied piece is tracked separately from purchased stock and billed parts. */
export function addClientPartRequest(s: Store,repairId: string,input: ClientPartRequestInput): ClientPartRequest {
  const r=clientPartRepair(s,repairId,true),details=clientPartInput(input);
  if((r.clientParts?.length??0)>=100)throw Error('Un dossier peut contenir au maximum 100 pièces demandées au client.');
  const draft=structuredClone(s),next=draft.repairs.find(repair=>repair.id===repairId)!,stamp=now();
  const item:ClientPartRequest={...details,id:uid(),status:'en-attente',createdAt:stamp,updatedAt:stamp};
  (next.clientParts??=[]).push(item);commitClientParts(s,r,draft,`Pièce demandée au client : ${item.quantity} × ${item.name}.`);
  return clientPartItem(r,item.id);
}
export function updateClientPartRequest(s: Store,repairId: string,id: string,input: ClientPartRequestInput): ClientPartRequest {
  const r=clientPartRepair(s,repairId,true),item=clientPartItem(r,id),details=clientPartInput(input);
  if(item.name===details.name&&item.quantity===details.quantity&&item.note===details.note)return item;
  const draft=structuredClone(s),next=draft.repairs.find(repair=>repair.id===repairId)!;
  Object.assign(clientPartItem(next,id),details,{updatedAt:now()});
  commitClientParts(s,r,draft,`Demande de pièce au client modifiée : ${details.quantity} × ${details.name}.`);return clientPartItem(r,id);
}
/** Status corrections remain possible after closure, without reopening or advancing the repair. */
export function setClientPartRequestStatus(s: Store,repairId: string,id: string,status: ClientPartStatus): void {
  const r=clientPartRepair(s,repairId),item=clientPartItem(r,id);
  if(typeof status!=='string'||!Object.hasOwn(CLIENT_PART_STATUSES,status))throw Error('Statut de pièce client inconnu.');
  if(item.status===status)return;
  const draft=structuredClone(s),next=draft.repairs.find(repair=>repair.id===repairId)!;
  Object.assign(clientPartItem(next,id),{status,updatedAt:now()});
  commitClientParts(s,r,draft,`Pièce client « ${item.name} » : ${CLIENT_PART_STATUSES[item.status]} → ${CLIENT_PART_STATUSES[status]}.`);
}
/** Clients may signal availability only for their own waiting pieces, including closed dossiers. */
export function markClientPartAvailable(s: Store,clientId: string,repairId: string,id: string): boolean {
  const r=s.repairs.find(repair=>repair.id===repairId),c=r&&s.consoles.find(item=>item.id===r.consoleId);
  const client=s.clients.find(item=>item.id===clientId),item=r?.clientParts?.find(request=>request.id===id);
  if(!client||!r||!c||c.clientId!==clientId||!item)throw Error('Pièce client introuvable dans ce dossier.');
  validateStore(s);
  if(item.status==='disponible')return false;
  if(item.status!=='en-attente')throw Error('Cette pièce a déjà été livrée ou installée.');
  const draft=structuredClone(s),next=draft.repairs.find(repair=>repair.id===repairId)!;
  Object.assign(clientPartItem(next,id),{status:'disponible',updatedAt:now()});
  commitClientParts(s,r,draft,`Le client ${client.name} a signalé la pièce « ${item.name} » disponible (${item.quantity} unité(s)).`);
  return true;
}
export function removeClientPartRequest(s: Store,repairId: string,id: string): void {
  const r=clientPartRepair(s,repairId),item=clientPartItem(r,id),draft=structuredClone(s),next=draft.repairs.find(repair=>repair.id===repairId)!;
  next.clientParts=next.clientParts!.filter(request=>request.id!==id);
  commitClientParts(s,r,draft,`Demande de pièce au client supprimée : ${item.quantity} × ${item.name}.`);
}
export function createRepair(s: Store,input: Pick<Repair,'consoleId'|'title'|'symptoms'|'priority'|'dueDate'>) {
  const c=s.consoles.find(x=>x.id===input.consoleId); if(!c||c.archived) throw Error('Choisissez une console non archivée.');
  if(s.repairs.some(x=>x.consoleId===c.id&&active(x))) throw Error('Cette console possède déjà un dossier en cours.');
  if(!input.title.trim()) throw Error('Le titre du dossier est obligatoire.');
  const r: Repair={...input,id:uid(),code:nextRepairCode(s),stage:'reception',diagnosis:'',createdAt:now(),updatedAt:now(),completedAt:'',timerStartedAt:'',interventionCost:null,payment:null,clientParts:[],photos:[],parts:[],worklogs:[],tests:defaultTests()};
  s.repairs.unshift(r);c.state='en-reparation';addEvent(s,`Dossier ${r.code} ouvert : ${r.title}.`,'created',{consoleId:c.id,repairId:r.id});return r;
}
type ClientDetails = Pick<Client,'name'|'email'|'phone'|'address'|'notes'>;
function inputText(value: unknown,label: string,max: number,required=false): string {
  if(typeof value!=='string'||value.length>max)throw Error(`${label} : texte manquant ou trop long (${max} caractères maximum).`);
  const text=value.trim();if(required&&!text)throw Error(`${label} est obligatoire.`);return text;
}
function clientDetails(input: ClientDetails): ClientDetails {
  if(!input||typeof input!=='object')throw Error('Renseignez les coordonnées du client.');
  const details={name:inputText(input.name,'Le nom du client',200,true),email:inputText(input.email,'L’adresse e-mail',254),phone:inputText(input.phone,'Le téléphone',80),address:inputText(input.address,'L’adresse',1000),notes:inputText(input.notes,'Les notes',30000)};
  if(details.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email))throw Error('L’adresse e-mail est invalide.');
  return details;
}
export function createClient(s: Store,input: ClientDetails): Client {
  const details=clientDetails(input);
  const client:Client={...details,id:uid(),code:nextCode(s.clients,'CLT-'),createdAt:now()};
  s.clients.unshift(client);addEvent(s,`Client ${client.code} créé : ${client.name}.`,'created',{clientId:client.id});return client;
}
export function updateClient(s: Store,id: string,input: ClientDetails): Client {
  const client=s.clients.find(x=>x.id===id);if(!client)throw Error('Client introuvable.');
  const details=clientDetails(input);Object.assign(client,details);
  addEvent(s,`Coordonnées de ${client.name} mises à jour.`,'edit',{clientId:client.id});return client;
}
export interface ClientRepairInput {
  consoleId?: string; brand: string; model: string; variant?: string; serial: string; accessories: string;
  title: string; symptoms: string; priority: Priority; dueDate: string;
}
function repairRequest(input: ClientRepairInput) {
  if(!input||typeof input!=='object')throw Error('Demande de réparation invalide.');
  const consoleId=input.consoleId===undefined?'':inputText(input.consoleId,'La console',120);
  const title=inputText(input.title,'Le titre du dossier',200,true),symptoms=inputText(input.symptoms,'Les symptômes',30000);
  const brand=inputText(input.brand,'La marque',80,!consoleId),model=inputText(input.model,'Le modèle',120,!consoleId);
  const variant=input.variant===undefined?'':inputText(input.variant,'La variante / couleur',150);
  const serial=inputText(input.serial,'Le numéro de série',100),accessories=inputText(input.accessories,'Les accessoires',30000);
  if(!Object.hasOwn(PRIORITIES,input.priority))throw Error('Priorité inconnue.');
  const dueDate=inputText(input.dueDate,'La date souhaitée',10);
  if(dueDate&&(!/^\d{4}-\d\d-\d\d$/.test(dueDate)||!Number.isFinite(Date.parse(dueDate))||new Date(dueDate+'T12:00:00Z').toISOString().slice(0,10)!==dueDate))throw Error('La date souhaitée est invalide.');
  return {consoleId,brand,model,variant,serial,accessories,title,symptoms,priority:input.priority,dueDate};
}
function illustrationForModel(model: string): Illustration {
  const value=model.toLowerCase();
  if(/game\s*gear/.test(value))return 'gamegear';
  if(/dreamcast/.test(value))return 'dreamcast';
  if(/mega\s*drive|genesis/.test(value))return 'megadrive';
  if(/playstation|\bps[1-5p]?\b/.test(value))return 'playstation';
  if(/switch/.test(value))return 'switch';
  if(/super\s*nintendo|snes|\bnes\b/.test(value))return 'snes';
  return 'gameboy';
}
function newAdmissionConsole(s: Store,input: ReturnType<typeof repairRequest>,clientId=''): ConsoleItem {
  if(input.serial&&s.consoles.some(x=>x.serial.trim().toLowerCase()===input.serial.toLowerCase()))throw Error('Ce numéro de série est déjà référencé. Sélectionnez la console existante.');
  const consoleItem:ConsoleItem={id:uid(),code:nextConsoleCode(s),clientId,brand:input.brand,model:input.model,variant:input.variant,serial:input.serial,state:'en-panne',condition:'',acquiredAt:today(),purchasePrice:0,estimatedValue:0,source:clientId?'Dépôt client':'Admission atelier',location:'',accessories:input.accessories,notes:'',illustration:illustrationForModel(input.model),photos:[],archived:false,createdAt:now()};
  s.consoles.unshift(consoleItem);
  addEvent(s,clientId?`Console ${consoleItem.code} déposée par ${s.clients.find(x=>x.id===clientId)!.name}.`:`Équipement ${consoleItem.code} ajouté à l’atelier : ${consoleItem.model}.`,'created',{...(clientId?{clientId}:{}),consoleId:consoleItem.id});
  return consoleItem;
}
/** Admit any new console or controller together with its repair; failed validation leaves no equipment behind. */
export function createRepairAdmission(s: Store,input: Omit<ClientRepairInput,'consoleId'> & {clientId?: string}): Repair {
  if(!input||typeof input!=='object')throw Error('Demande de réparation invalide.');
  const clientId=input.clientId===undefined?'':inputText(input.clientId,'Le client',120);
  if(clientId&&!s.clients.some(x=>x.id===clientId))throw Error('Client introuvable.');
  const request=repairRequest({...input,consoleId:undefined}),draft=structuredClone(s);
  const consoleItem=newAdmissionConsole(draft,request,clientId);
  const repair=createRepair(draft,{consoleId:consoleItem.id,title:request.title,symptoms:request.symptoms,priority:request.priority,dueDate:request.dueDate});
  validateStore(draft);
  s.consoles=draft.consoles;s.repairs=draft.repairs;s.events=draft.events;return repair;
}
/** Create an entire customer deposit together; an invalid row cannot leave a partial deposit. */
export function createClientRepairs(s: Store,clientId: string,inputs: ClientRepairInput[]): Repair[] {
  if(!s.clients.some(x=>x.id===clientId))throw Error('Client introuvable.');
  if(!Array.isArray(inputs)||inputs.length<1||inputs.length>20)throw Error('Ajoutez entre 1 et 20 demandes de réparation.');
  const draft=structuredClone(s),created:Repair[]=[];
  for(const input of inputs) {
    const request=repairRequest(input),{consoleId,title,symptoms,dueDate}=request;
    let consoleItem:ConsoleItem|undefined;
    if(consoleId) {
      consoleItem=draft.consoles.find(x=>x.id===consoleId);
      if(!consoleItem||consoleItem.clientId!==clientId)throw Error('Choisissez une console appartenant à ce client.');
    } else {
      consoleItem=newAdmissionConsole(draft,request,clientId);
    }
    created.push(createRepair(draft,{consoleId:consoleItem.id,title,symptoms,priority:request.priority,dueDate}));
  }
  validateStore(draft);
  s.consoles=draft.consoles;s.repairs=draft.repairs;s.events=draft.events;return created;
}
export function emptyStore(): Store {
  return {schemaVersion:SCHEMA,revision:0,settings:{workshop:'La Clinique Rétro',owner:'Rémi',hourlyRate:35,demo:false,lastExportAt:''},clients:[],consoles:[],repairs:[],parts:[],events:[]};
}
/** Public shipping details must be supplied explicitly before a customer can send equipment. */
export function validatePublicIntakeSettings(raw: unknown): PublicIntakeSettings {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Coordonnées d’envoi invalides.');
  const value=raw as Record<string,unknown>;
  const text=(name: string,max: number):string=>{
    const field=value[name];
    if(typeof field!=='string'||field.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(field))throw Error('Coordonnées d’envoi : texte manquant ou trop long.');
    return field.trim();
  };
  if(typeof value.addressConfirmed!=='boolean')throw Error('Confirmation de l’adresse d’envoi invalide.');
  const settings:PublicIntakeSettings={shopName:text('shopName',120),address:text('address',1000),postalCode:text('postalCode',5),city:text('city',120),phone:text('phone',80),email:text('email',254),addressConfirmed:value.addressConfirmed};
  if(!settings.shopName)throw Error('Le nom de l’atelier d’envoi est obligatoire.');
  if(settings.postalCode&&!/^\d{5}$/.test(settings.postalCode))throw Error('Le code postal d’envoi doit comporter cinq chiffres.');
  if(settings.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email))throw Error('L’adresse e-mail de l’atelier est invalide.');
  if(settings.addressConfirmed&&(!settings.address||!settings.postalCode||!settings.city))throw Error('Renseignez l’adresse complète de l’atelier avant de confirmer l’envoi.');
  return settings;
}
/** Strict import validation: known fields only, bounds, foreign keys and lifecycle invariants. */
export function validateStore(raw: unknown): Store {
  const fail=(label:string):never=>{throw Error(`Sauvegarde invalide : ${label}.`)};
  const rec=(x:unknown):Record<string,unknown>=>x&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:fail('objet attendu');
  const str=(x:unknown,max=30000):string=>typeof x==='string'&&x.length<=max?x:fail('texte manquant ou trop long');
  const num=(x:unknown,integer=false):number=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1e9&&(!integer||Number.isSafeInteger(x))?x:fail('nombre hors limites');
  const required=(x:unknown,max=30000):string=>{const v=str(x,max);return v.trim()?v:fail('champ obligatoire vide')};
  const flag=(x:unknown):boolean=>typeof x==='boolean'?x:fail('booléen attendu');
  const one=<T extends string>(x:unknown,values:readonly T[]):T=>values.includes(x as T)?x as T:fail('valeur non autorisée');
  const arr=(x:unknown,max=50000):unknown[]=>Array.isArray(x)&&x.length<=max?x:fail('liste manquante ou trop longue');
  const timestamp=(x:unknown,optional=false):string=>{const v=str(x,40);return (optional&&!v)||(/^\d{4}-\d\d-\d\dT/.test(v)&&Number.isFinite(Date.parse(v)))?v:fail('horodatage invalide')};
  const day=(x:unknown):string=>{const v=str(x,10);if(!v)return '';if(!/^\d{4}-\d\d-\d\d$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v)return fail('date invalide');return v;};
  const id=(x:unknown)=>{const v=str(x,120);return /^[A-Za-z0-9_-]+$/.test(v)?v:fail('identifiant invalide')};
  const optionalId=(x:unknown)=>x===undefined?'':x===''?'':id(x);
  const publicRequestId=(x:unknown)=>{const value=str(x,36);return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)?value.toLowerCase():fail('identifiant de demande publique invalide');};
  const email=(x:unknown)=>{const v=str(x,254);return !v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?v:fail('adresse e-mail invalide');};
  const photos=(x:unknown):Photo[]=>arr(x,8).map(y=>{const p=rec(y);const data=str(p.data,650000);if(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(data))fail('image invalide');return{id:id(p.id),data,caption:str(p.caption,300),createdAt:timestamp(p.createdAt)};});
  const interventionCost=(x:unknown):number|null=>validInterventionCost(x)?x:fail('coût de l’intervention hors limites ou supérieur à deux décimales');
  const payment=(x:unknown):RepairPayment|null=>{
    if(x===null)return null;
    const p=rec(x);
    if(!validPaymentAmount(p.amount))return fail('montant payé hors limites ou supérieur à deux décimales');
    if(!validPaymentTimestamp(p.paidAt))return fail('horodatage de paiement invalide');
    return {amount:p.amount,paidAt:p.paidAt};
  };
  const clientParts=(x:unknown):ClientPartRequest[]=>arr(x,100).map(value=>{
    const p=rec(value),quantity=num(p.quantity,true);
    if(quantity<1||quantity>1000)return fail('quantité de pièce client hors limites');
    if(!validPaymentTimestamp(p.createdAt)||!validPaymentTimestamp(p.updatedAt))return fail('horodatage de pièce client invalide');
    return {id:id(p.id),name:required(p.name,200),quantity,note:str(p.note,1000),status:one(p.status,Object.keys(CLIENT_PART_STATUSES) as ClientPartStatus[]),createdAt:p.createdAt,updatedAt:p.updatedAt};
  });
  const v=rec(normalizeRepairStages(raw)); if(v.schemaVersion!==SCHEMA)fail('version non prise en charge');
  const settings=rec(v.settings);
  const s:Store={schemaVersion:SCHEMA,revision:num(v.revision,true),settings:{workshop:required(settings.workshop,120),owner:str(settings.owner,80),hourlyRate:num(settings.hourlyRate),demo:flag(settings.demo),lastExportAt:timestamp(settings.lastExportAt,true)},clients:[],consoles:[],repairs:[],parts:[],events:[]};
  if(settings.publicIntake!==undefined){try{s.settings.publicIntake=validatePublicIntakeSettings(settings.publicIntake);}catch(error){fail(error instanceof Error?error.message:'coordonnées d’envoi invalides');}}
  s.clients=(v.clients===undefined?[]:arr(v.clients)).map(y=>{const c=rec(y);return{id:id(c.id),code:required(c.code,40),name:required(c.name,200),email:email(c.email),phone:str(c.phone,80),address:str(c.address,1000),notes:str(c.notes),createdAt:timestamp(c.createdAt)};});
  s.consoles=arr(v.consoles).map(y=>{const c=rec(y);return{id:id(c.id),code:required(c.code,40),clientId:optionalId(c.clientId),brand:required(c.brand,80),model:required(c.model,120),variant:str(c.variant,150),serial:str(c.serial,100),state:one(c.state,Object.keys(STATES) as ConsoleState[]),condition:str(c.condition,80),acquiredAt:day(c.acquiredAt),purchasePrice:num(c.purchasePrice),estimatedValue:num(c.estimatedValue),source:str(c.source,200),location:str(c.location,200),accessories:str(c.accessories),notes:str(c.notes),illustration:one(c.illustration,['gameboy','snes','playstation','megadrive','dreamcast','switch','gamegear'] as const),photos:photos(c.photos),archived:flag(c.archived),createdAt:timestamp(c.createdAt)};});
  s.parts=arr(v.parts).map(y=>{const p=rec(y);return{id:id(p.id),reference:required(p.reference,80),name:required(p.name,200),category:str(p.category,80),compatibility:str(p.compatibility,500),quantity:num(p.quantity,true),threshold:num(p.threshold,true),unitCost:num(p.unitCost),location:str(p.location,200),supplier:str(p.supplier,200)};});
  s.repairs=arr(v.repairs).map(y=>{const r=rec(y);return{id:id(r.id),code:required(r.code,40),consoleId:id(r.consoleId),title:required(r.title,200),symptoms:str(r.symptoms),diagnosis:str(r.diagnosis),stage:one(r.stage,STAGES.map(x=>x.id)),priority:one(r.priority,Object.keys(PRIORITIES) as Priority[]),dueDate:day(r.dueDate),createdAt:timestamp(r.createdAt),updatedAt:timestamp(r.updatedAt),completedAt:timestamp(r.completedAt,true),timerStartedAt:timestamp(r.timerStartedAt,true),...(r.interventionCost===undefined?{}:{interventionCost:interventionCost(r.interventionCost)}),...(r.payment===undefined?{}:{payment:payment(r.payment)}),...(r.clientParts===undefined?{}:{clientParts:clientParts(r.clientParts)}),...(r.publicRequestId===undefined?{}:{publicRequestId:publicRequestId(r.publicRequestId)}),photos:photos(r.photos),parts:arr(r.parts).map(y=>{const p=rec(y);const q=num(p.quantity,true);if(q<1)fail('quantité utilisée nulle');return{id:id(p.id),partId:id(p.partId),name:required(p.name,200),quantity:q,unitCost:num(p.unitCost),usedAt:timestamp(p.usedAt)};}),worklogs:arr(r.worklogs).map(y=>{const w=rec(y);return{id:id(w.id),minutes:num(w.minutes,true),note:str(w.note,1000),createdAt:timestamp(w.createdAt)};}),tests:arr(r.tests,100).map(y=>{const t=rec(y);return{id:id(t.id),label:required(t.label,300),result:one(t.result,['pending','pass','fail','na'] as const)};})};});
  s.events=arr(v.events,100000).map(y=>{const e=rec(y);return{id:id(e.id),kind:one(e.kind,['created','stage','note','part','time','test','edit','system','photo'] as const),text:str(e.text),createdAt:timestamp(e.createdAt),...(e.consoleId?{consoleId:id(e.consoleId)}:{}),...(e.repairId?{repairId:id(e.repairId)}:{}),...(e.clientId===undefined||e.clientId===''?{}:{clientId:id(e.clientId)})};});
  function unique(items:{id:string}[]) {const ids=new Set(items.map(x=>x.id));if(ids.size!==items.length)fail('identifiants dupliqués');return ids;}
  const clients=unique(s.clients),consoles=unique(s.consoles),parts=unique(s.parts),repairs=unique(s.repairs);unique(s.events);
  const clientPartIds=new Set<string>();
  for(const repair of s.repairs)for(const request of repair.clientParts??[]){if(clientPartIds.has(request.id))fail('identifiants de pièces client dupliqués');clientPartIds.add(request.id);}
  const publicRequests=new Set<string>();
  for(const repair of s.repairs)if(repair.publicRequestId){const owner=s.consoles.find(console=>console.id===repair.consoleId)?.clientId;if(!owner)fail('demande publique sans client');const key=owner+':'+repair.publicRequestId;if(publicRequests.has(key))fail('identifiants de demandes publiques dupliqués pour un client');publicRequests.add(key);}
  if(new Set(s.clients.map(c=>c.code)).size!==s.clients.length||new Set(s.consoles.map(c=>c.code)).size!==s.consoles.length||new Set(s.repairs.map(r=>r.code)).size!==s.repairs.length)fail('numéros de dossier dupliqués');
  if(new Set(s.parts.map(p=>p.reference.toLowerCase())).size!==s.parts.length)fail('références de pièces dupliquées');
  const open=new Set<string>(),waitingShipment=new Set<string>();let timers=0;
  for(const r of s.repairs){if(active(r)&&r.completedAt)fail('date de clôture sur un dossier ouvert');if(!active(r)&&!r.completedAt)fail('date de clôture manquante');if(!consoles.has(r.consoleId))fail('console de réparation introuvable');unique(r.parts);unique(r.tests);unique(r.worklogs);unique(r.photos);for(const p of r.parts){if(!parts.has(p.partId))fail('référence de pièce introuvable');}if(active(r)){if(open.has(r.consoleId))fail('plusieurs réparations ouvertes pour une même console');open.add(r.consoleId);if(r.stage==='attente-envoi')waitingShipment.add(r.consoleId);}if(r.timerStartedAt){timers++;if(!active(r))fail('chronomètre sur un dossier fermé');}if(r.stage==='terminee'&&(!r.tests.some(t=>t.result==='pass')||r.tests.some(t=>t.result==='fail'||t.result==='pending')))fail('dossier terminé sans tests validés');}
  if(timers>1)fail('plusieurs chronomètres actifs');
  for(const c of s.consoles){unique(c.photos);if(c.clientId&&!clients.has(c.clientId))fail('client de console introuvable');if(open.has(c.id)&&(c.archived||c.state!==(waitingShipment.has(c.id)?'en-panne':'en-reparation')))fail('état de console incohérent avec une réparation ouverte');}
  for(const e of s.events){if(e.consoleId&&!consoles.has(e.consoleId))fail('console de journal introuvable');if(e.repairId&&!repairs.has(e.repairId))fail('réparation de journal introuvable');if(e.clientId&&!clients.has(e.clientId))fail('client de journal introuvable');if(e.repairId&&e.consoleId&&s.repairs.find(r=>r.id===e.repairId)?.consoleId!==e.consoleId)fail('journal lié à une autre console');if(e.clientId&&(e.consoleId||e.repairId)&&s.consoles.find(c=>c.id===(e.consoleId??s.repairs.find(r=>r.id===e.repairId)?.consoleId))?.clientId!==e.clientId)fail('journal lié à un autre client');}
  return s;
}
export function csvCell(value: unknown) {
  let s=String(value??'');if(/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
}
