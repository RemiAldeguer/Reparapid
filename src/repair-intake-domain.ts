import {addEvent, createRepair, nextConsoleCode, now, uid, validatePublicIntakeSettings, validatePublicRepairPackages, validateStore} from './domain.ts';
import type {ConsoleItem, PublicIntakeSettings, PublishedRepairPackage, Repair, Store} from './domain.ts';

import {INTAKE_MODELS, faultSuggestions} from './repair-intake-catalog.ts';
export {INTAKE_MODELS, faultSuggestions} from './repair-intake-catalog.ts';
export type {IntakeModel} from './repair-intake-catalog.ts';

export interface IntakeInput {
  requestId: string; modelId: string; customModel: string; selectedFaults: string[];
  description: string; serial: string; accessories: string;
}
const INTAKE_FIELDS=new Set(['requestId','modelId','customModel','selectedFaults','description','serial','accessories']);
const REQUEST_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Canonical, bounded, explicit public input. Ownership, price and lifecycle come from the server. */
export function validateIntakeInput(raw: unknown): IntakeInput {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Demande de réparation invalide.');
  const value=raw as Record<string,unknown>;
  if(Object.keys(value).some(key=>!INTAKE_FIELDS.has(key)))throw Error('La demande contient un champ non autorisé.');
  const text=(field: string,label: string,max: number,optional=true):string=>{
    if(optional&&value[field]===undefined)return '';
    const rawText=value[field];
    if(typeof rawText!=='string'||rawText.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(rawText))throw Error(`${label} : texte invalide ou trop long (${max} caractères maximum).`);
    return rawText.trim();
  };
  const requestId=text('requestId','L’identifiant de la demande',36,false).toLowerCase();
  if(!REQUEST_UUID.test(requestId))throw Error('L’identifiant de la demande est invalide.');
  const modelId=text('modelId','Le modèle',80,false);
  if(!INTAKE_MODELS.some(model=>model.id===modelId))throw Error('Choisissez un modèle de console.');
  const customModel=text('customModel','Le modèle de console',120);
  if(modelId==='other'&&!customModel)throw Error('Précisez le modèle de votre console.');
  if(modelId!=='other'&&customModel)throw Error('Le modèle personnalisé est réservé au choix « Autre console ».');
  if(!Array.isArray(value.selectedFaults)||value.selectedFaults.length>10)throw Error('La liste des pannes signalées est invalide.');
  const suggestions=faultSuggestions(modelId);
  const selectedFaults=[...new Set(value.selectedFaults.map(fault=>{
    if(typeof fault!=='string'||!suggestions.includes(fault.trim()))throw Error('Une panne signalée ne correspond pas au modèle choisi.');
    return fault.trim();
  }))];
  const description=text('description','La description de la panne',3000);
  if(!selectedFaults.length&&!description)throw Error('Choisissez une panne ou décrivez le problème rencontré.');
  return {requestId,modelId,customModel,selectedFaults,description,serial:text('serial','Le numéro de série',100),accessories:text('accessories','Les accessoires',2000)};
}

/** Exposes shipping information only; a missing street address never becomes a shipping destination. */
export function publicIntakeSettings(store: Store): PublicIntakeSettings {
  const settings=store.settings.publicIntake;
  return settings?validatePublicIntakeSettings(settings):{shopName:'RépaRapid · Maxxi Games',address:'30 bis, avenue de Fontainebleau',postalCode:'94270',city:'Le Kremlin-Bicêtre',phone:'01 58 46 82 51',email:'contact@reparapid.fr',addressConfirmed:true};
}

/** Published reference prices are public information, independent from dossier quotes and payments. */
export function publicRepairPackages(store: Store): PublishedRepairPackage[] {
  const configured=store.settings.publicRepairPackages;
  return validatePublicRepairPackages(configured===undefined?[]:configured).filter(item=>item.published).map(item=>({
    id:item.id,modelId:item.modelId,fault:item.fault,label:item.label,amount:item.amount,priceMode:item.priceMode,includes:item.includes,
  }));
}

/** Atomic admission with stable codes, no quote/payment, and retries scoped to the authenticated client. */
export function createPublicRepair(store: Store,clientId: string,rawInput: IntakeInput): {repair: Repair; console: ConsoleItem} {
  const input=validateIntakeInput(rawInput);
  validateStore(store);
  if(!store.clients.some(client=>client.id===clientId))throw Error('Client introuvable.');
  const existing=store.repairs.find(repair=>repair.publicRequestId?.toLowerCase()===input.requestId&&store.consoles.some(console=>console.id===repair.consoleId&&console.clientId===clientId));
  if(existing)return {repair:existing,console:store.consoles.find(console=>console.id===existing.consoleId)!};
  const selected=INTAKE_MODELS.find(model=>model.id===input.modelId)!;
  const draft=structuredClone(store),createdAt=now();
  const consoleItem:ConsoleItem={id:uid(),code:nextConsoleCode(draft),clientId,brand:selected.brand,model:input.modelId==='other'?input.customModel:selected.model,variant:'',serial:input.serial,state:'en-panne',condition:'',acquiredAt:'',purchasePrice:0,estimatedValue:0,source:'Demande de réparation en ligne',location:'En attente d’envoi',accessories:input.accessories,notes:'',illustration:selected.illustration,photos:[],archived:false,createdAt};
  draft.consoles.unshift(consoleItem);
  addEvent(draft,`Console ${consoleItem.code} déclarée en ligne par ${draft.clients.find(client=>client.id===clientId)!.name}.`,'created',{clientId,consoleId:consoleItem.id});
  const symptoms=[...input.selectedFaults,...(input.description?[input.description]:[])].join('\n');
  const modelName=consoleItem.brand==='Autre'||consoleItem.model.toLowerCase().startsWith(consoleItem.brand.toLowerCase())?consoleItem.model:`${consoleItem.brand} ${consoleItem.model}`;
  const repair=createRepair(draft,{consoleId:consoleItem.id,title:`Réparation ${modelName}`,symptoms,priority:'normale',dueDate:''});
  repair.stage='attente-envoi';repair.publicRequestId=input.requestId;consoleItem.state='en-panne';
  draft.events[0].text=`Demande ${repair.code} créée en ligne : en attente d’envoi de la console.`;
  draft.events[0].clientId=clientId;
  validateStore(draft);
  store.consoles=draft.consoles;store.repairs=draft.repairs;store.events=draft.events;
  return {repair,console:consoleItem};
}
