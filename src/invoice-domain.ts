import {type Store, repairTotalCost} from './domain';

export type InvoiceTaxMode = 'none' | 'included';
export type InvoiceFormat = 'simple' | 'complete';
export interface InvoiceSeller {name: string; address: string; registration: string; email: string; phone: string; vatNumber: string;}
export interface InvoiceCustomerInput {name: string; address: string; email: string; phone: string;}
export interface InvoiceCustomer extends InvoiceCustomerInput {id: string;}
export interface InvoiceInput {
  repairIds: string[]; issueDate: string; format?: InvoiceFormat; number?: string; dueDate?: string; seller?: InvoiceSeller;
  customer?: InvoiceCustomerInput; taxMode?: InvoiceTaxMode; taxRate?: number; taxNote?: string; notes?: string;
}
export interface InvoiceLine {
  repairId: string; repairCode: string; consoleName: string; variant: string; serial: string;
  title: string; fault: string; serviceDate: string; amount: number;
}
export interface InvoiceSnapshot {
  format: InvoiceFormat; number: string; issueDate: string; dueDate: string; seller: InvoiceSeller; customer: InvoiceCustomer;
  taxMode: InvoiceTaxMode; taxRate: number; taxNote: string; notes: string;
  lines: InvoiceLine[]; total: number; subtotal: number; tax: number;
}

const parisDate = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Paris', era:'short', year:'numeric', month:'2-digit', day:'2-digit'});
function calendarDate(value: unknown,label: string): string {
  if(typeof value!=='string'||!/^(?!0000)\d{4}-\d\d-\d\d$/.test(value))throw Error(`${label} doit être au format AAAA-MM-JJ.`);
  const date=new Date(`${value}T12:00:00.000Z`);
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw Error(`${label} est invalide.`);
  return value;
}
export function invoiceToday(date = new Date()): string {
  if(!(date instanceof Date)||!Number.isFinite(date.getTime()))throw Error('La date de référence est invalide.');
  const parts=Object.fromEntries(parisDate.formatToParts(date).map(part=>[part.type,part.value]));
  if(parts.era!=='AD')throw Error('La date de référence doit être comprise entre les années 0001 et 9999.');
  return calendarDate(`${parts.year.padStart(4,'0')}-${parts.month}-${parts.day}`,'La date de référence');
}

function record(value: unknown,keys: string[],label: string): Record<string,unknown> {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key)))throw Error(`${label} est invalide.`);
  return value as Record<string,unknown>;
}
function text(value: unknown,label: string,max: number,required=false,multiline=false): string {
  if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
    ||(!multiline&&/[\t\r\n]/.test(value)))throw Error(`${label} est invalide (maximum ${max} caractères).`);
  const result=value.trim();if(required&&!result)throw Error(`${label} est obligatoire.`);return result;
}
function email(value: unknown,label: string): string {
  const result=text(value,label,254).toLowerCase();
  if(result&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))throw Error(`${label} est invalide.`);
  return result;
}
function coordinates(value: unknown,label: string): InvoiceCustomerInput {
  const item=record(value,['name','address','email','phone'],label);
  return {name:text(item.name,`Le nom ${label}`,200,true),address:text(item.address,`L’adresse ${label}`,1000,true,true),
    email:email(item.email,`L’e-mail ${label}`),phone:text(item.phone,`Le téléphone ${label}`,80)};
}
function sellerCoordinates(value: unknown): InvoiceSeller {
  const item=record(value,['name','address','registration','email','phone','vatNumber'],'Les coordonnées du vendeur');
  return {name:text(item.name,'Le nom du vendeur',200,true),address:text(item.address,'L’adresse du vendeur',1000,true,true),
    registration:text(item.registration,'L’immatriculation du vendeur',120,true),email:email(item.email,'L’e-mail du vendeur'),
    phone:text(item.phone,'Le téléphone du vendeur',80),vatNumber:text(item.vatNumber,'Le numéro de TVA du vendeur',80)};
}
function id(value: unknown): string {
  if(typeof value!=='string'||!/^[A-Za-z0-9_-]{1,120}$/.test(value))throw Error('Identifiant de réparation invalide.');return value;
}

/** An immutable preview of current repair prices; building it never issues a number or changes workshop data. */
export function buildInvoice(store: Store,input: InvoiceInput): InvoiceSnapshot {
  const fields=record(input,['repairIds','number','issueDate','dueDate','seller','customer','taxMode','taxRate','taxNote','notes','format'],'La facture');
  const format=fields.format===undefined?'complete':fields.format;
  if(format!=='simple'&&format!=='complete')throw Error('Choisissez une facture simple ou complète.');
  const simple=format==='simple';
  if(!Array.isArray(fields.repairIds)||fields.repairIds.length<1||fields.repairIds.length>100)throw Error('Sélectionnez de 1 à 100 réparations.');
  const repairIds=fields.repairIds.map(id);
  if(new Set(repairIds).size!==repairIds.length)throw Error('Une réparation ne peut apparaître qu’une fois dans la facture.');
  const number=text(simple&&fields.number===undefined?'':fields.number,'Le numéro de facture',80,!simple),issueDate=calendarDate(fields.issueDate,'La date de facture');
  const notes=text(simple&&fields.notes===undefined?'':fields.notes,'Les notes de facture',3000,false,true);
  if(!store||!Array.isArray(store.repairs)||!Array.isArray(store.consoles)||!Array.isArray(store.clients))throw Error('Les données de l’atelier sont invalides.');
  let seller: InvoiceSeller,dueDate='',taxMode: InvoiceTaxMode='none',taxRate=0,taxNote='';
  if(simple){
    seller={name:text(store.settings?.workshop,'Le nom de l’atelier',120,true),address:'',registration:'',email:'',phone:'',vatNumber:''};
  }else{
    dueDate=calendarDate(fields.dueDate,'La date d’échéance');
    if(dueDate<issueDate)throw Error('La date d’échéance doit être égale ou postérieure à la date de facture.');
    seller=sellerCoordinates(fields.seller);
    if(fields.taxMode!=='none'&&fields.taxMode!=='included')throw Error('Choisissez un mode de TVA.');
    if(typeof fields.taxRate!=='number'||!Number.isFinite(fields.taxRate)||fields.taxRate<0||fields.taxRate>100)throw Error('Le taux de TVA doit être compris entre 0 et 100 %.');
    taxMode=fields.taxMode;taxRate=taxMode==='included'?fields.taxRate:0;
    if(taxRate>0&&!seller.vatNumber)throw Error('Le numéro de TVA du vendeur est obligatoire lorsque la TVA est comprise.');
    taxNote=text(fields.taxNote,'La mention fiscale',1000,false,true);
  }
  let customer: InvoiceCustomer|undefined,totalCents=0;
  const lines=repairIds.map(repairId=>{
    const repair=store.repairs.find(item=>item.id===repairId),consoleItem=repair&&store.consoles.find(item=>item.id===repair.consoleId);
    const client=consoleItem&&store.clients.find(item=>item.id===consoleItem.clientId);
    if(!repair||!consoleItem||!client)throw Error('Chaque réparation doit appartenir à une console rattachée à un client existant.');
    if(customer&&customer.id!==client.id)throw Error('Toutes les réparations d’une facture doivent appartenir au même client.');
    if(!customer)customer=simple?{id:client.id,name:text(client.name,'Le nom du client',200,true),address:'',email:'',phone:''}
      :{id:client.id,...coordinates(fields.customer===undefined?{name:client.name,address:client.address,email:client.email,phone:client.phone}:fields.customer,'du client')};
    const amount=repairTotalCost(store,repair),amountCents=Math.round(amount*100);
    if(!Number.isFinite(amount)||amount<0||!Number.isSafeInteger(amountCents)||!Number.isSafeInteger(totalCents+amountCents))throw Error('Le montant d’une réparation est invalide ou trop élevé.');
    totalCents+=amountCents;
    const line: InvoiceLine={repairId,repairCode:text(repair.code,'La référence de réparation',40,true),
      consoleName:`${text(consoleItem.brand,'La marque de console',80,true)} ${text(consoleItem.model,'Le modèle de console',120,true)}`,
      variant:text(consoleItem.variant,'La couleur de console',150),serial:text(consoleItem.serial,'Le numéro de série',100),
      title:text(repair.title,'Le titre de réparation',200,true),fault:text(repair.symptoms,'La panne',30000,false,true)||repair.title.trim(),
      serviceDate:repair.completedAt?invoiceToday(new Date(repair.completedAt)):'',amount:amountCents/100};
    return Object.freeze(line);
  });
  const subtotalCents=taxMode==='included'?Math.round(totalCents/(1+taxRate/100)):totalCents;
  Object.freeze(seller);Object.freeze(customer);Object.freeze(lines);
  return Object.freeze({format,number,issueDate,dueDate,seller,customer:customer!,taxMode,taxRate,taxNote,notes,lines,
    total:totalCents/100,subtotal:subtotalCents/100,tax:(totalCents-subtotalCents)/100});
}
