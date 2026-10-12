import {addEvent, createRepair, nextConsoleCode, now, uid, validatePublicIntakeSettings, validateStore} from './domain.ts';
import type {ConsoleItem, Illustration, PublicIntakeSettings, Repair, Store} from './domain.ts';

export interface IntakeModel {id: string; brand: string; model: string; family: string; illustration: Illustration;}
/** Stable identifiers keep the public form and both server implementations on the same catalogue. */
export const INTAKE_MODELS: readonly IntakeModel[] = [
  {id:'ps5',brand:'Sony',model:'PlayStation 5',family:'PlayStation',illustration:'playstation'},
  {id:'ps5-digital',brand:'Sony',model:'PlayStation 5 Digital Edition',family:'PlayStation',illustration:'playstation'},
  {id:'ps5-slim',brand:'Sony',model:'PlayStation 5 Slim',family:'PlayStation',illustration:'playstation'},
  {id:'ps5-pro',brand:'Sony',model:'PlayStation 5 Pro',family:'PlayStation',illustration:'playstation'},
  {id:'ps4',brand:'Sony',model:'PlayStation 4',family:'PlayStation',illustration:'playstation'},
  {id:'ps4-slim',brand:'Sony',model:'PlayStation 4 Slim',family:'PlayStation',illustration:'playstation'},
  {id:'ps4-pro',brand:'Sony',model:'PlayStation 4 Pro',family:'PlayStation',illustration:'playstation'},
  {id:'ps3',brand:'Sony',model:'PlayStation 3',family:'PlayStation',illustration:'playstation'},
  {id:'ps2',brand:'Sony',model:'PlayStation 2',family:'PlayStation',illustration:'playstation'},
  {id:'ps1',brand:'Sony',model:'PlayStation',family:'PlayStation',illustration:'playstation'},
  {id:'psp',brand:'Sony',model:'PSP',family:'Consoles portables',illustration:'playstation'},
  {id:'ps-vita',brand:'Sony',model:'PS Vita',family:'Consoles portables',illustration:'playstation'},
  {id:'switch-2',brand:'Nintendo',model:'Switch 2',family:'Nintendo Switch',illustration:'switch'},
  {id:'switch',brand:'Nintendo',model:'Switch',family:'Nintendo Switch',illustration:'switch'},
  {id:'switch-oled',brand:'Nintendo',model:'Switch OLED',family:'Nintendo Switch',illustration:'switch'},
  {id:'switch-lite',brand:'Nintendo',model:'Switch Lite',family:'Nintendo Switch',illustration:'switch'},
  {id:'xbox-series-x',brand:'Microsoft',model:'Xbox Series X',family:'Xbox',illustration:'playstation'},
  {id:'xbox-series-s',brand:'Microsoft',model:'Xbox Series S',family:'Xbox',illustration:'playstation'},
  {id:'xbox-one',brand:'Microsoft',model:'Xbox One',family:'Xbox',illustration:'playstation'},
  {id:'xbox-one-s',brand:'Microsoft',model:'Xbox One S',family:'Xbox',illustration:'playstation'},
  {id:'xbox-one-x',brand:'Microsoft',model:'Xbox One X',family:'Xbox',illustration:'playstation'},
  {id:'xbox-360',brand:'Microsoft',model:'Xbox 360',family:'Xbox',illustration:'playstation'},
  {id:'wii-u',brand:'Nintendo',model:'Wii U',family:'Nintendo',illustration:'snes'},
  {id:'wii',brand:'Nintendo',model:'Wii',family:'Nintendo',illustration:'snes'},
  {id:'3ds',brand:'Nintendo',model:'Nintendo 3DS / New 3DS',family:'Consoles portables',illustration:'gameboy'},
  {id:'3ds-xl',brand:'Nintendo',model:'Nintendo 3DS XL / New 3DS XL',family:'Consoles portables',illustration:'gameboy'},
  {id:'2ds',brand:'Nintendo',model:'Nintendo 2DS / New 2DS XL',family:'Consoles portables',illustration:'gameboy'},
  {id:'ds',brand:'Nintendo',model:'Nintendo DS / DS Lite / DSi',family:'Consoles portables',illustration:'gameboy'},
  {id:'game-boy',brand:'Nintendo',model:'Game Boy / Game Boy Color',family:'Consoles rétro',illustration:'gameboy'},
  {id:'game-boy-advance',brand:'Nintendo',model:'Game Boy Advance / Advance SP',family:'Consoles rétro',illustration:'gameboy'},
  {id:'nes',brand:'Nintendo',model:'NES',family:'Consoles rétro',illustration:'snes'},
  {id:'snes',brand:'Nintendo',model:'Super Nintendo',family:'Consoles rétro',illustration:'snes'},
  {id:'n64',brand:'Nintendo',model:'Nintendo 64',family:'Consoles rétro',illustration:'snes'},
  {id:'gamecube',brand:'Nintendo',model:'GameCube',family:'Consoles rétro',illustration:'snes'},
  {id:'megadrive',brand:'Sega',model:'Mega Drive',family:'Consoles rétro',illustration:'megadrive'},
  {id:'dreamcast',brand:'Sega',model:'Dreamcast',family:'Consoles rétro',illustration:'dreamcast'},
  {id:'game-gear',brand:'Sega',model:'Game Gear',family:'Consoles rétro',illustration:'gamegear'},
  {id:'other',brand:'Autre',model:'Autre console',family:'Autre',illustration:'gameboy'},
];

const STARTUP='La console ne s’allume plus';
const DIGITAL_MODELS=new Set(['ps5-digital','ps5-pro','xbox-series-s']);
const RETRO_CARTRIDGES=new Set(['nes','snes','n64','megadrive']);
const OLD_HANDHELDS=new Set(['game-boy','game-boy-advance','game-gear']);
/** Suggestions describe reported symptoms; they never imply an established diagnosis or quote. */
export function faultSuggestions(modelId: string): string[] {
  if(!INTAKE_MODELS.some(model=>model.id===modelId))return [];
  if(modelId.startsWith('switch'))return [STARTUP,'La console ne charge plus / problème USB-C','Écran cassé ou affichage défectueux','Joystick qui bouge seul (drift)','Boutons ou commandes défectueux','Les jeux sur cartouche ne sont plus lus','Surchauffe ou console bruyante',...(modelId==='switch-lite'?[]:['Aucune image sur le téléviseur / problème de dock'])];
  if(['ds','3ds','3ds-xl','2ds'].includes(modelId))return [STARTUP,'La batterie ne charge plus','Écran cassé ou affichage défectueux','Écran tactile défectueux','Boutons ou joystick défectueux','Les jeux sur cartouche ne sont plus lus','Charnière ou coque endommagée'];
  if(OLD_HANDHELDS.has(modelId))return [STARTUP,'Écran ou rétroéclairage défectueux','Absence de son / son défectueux','Boutons défectueux','Les jeux sur cartouche ne sont plus lus','Batterie ou contacts d’alimentation défectueux'];
  if(['psp','ps-vita'].includes(modelId))return [STARTUP,'La batterie ne charge plus','Écran cassé ou affichage défectueux','Joystick ou boutons défectueux','Les jeux ne sont plus lus','Absence de son / son défectueux'];
  if(RETRO_CARTRIDGES.has(modelId))return [STARTUP,'Aucune image / affichage défectueux','Les jeux sur cartouche ne sont plus lus','Absence de son / son défectueux','Connecteur manette défectueux','La console s’éteint toute seule'];
  if(['ps1','ps2','gamecube','dreamcast','wii','wii-u'].includes(modelId))return [STARTUP,'Aucune image / affichage défectueux','Les disques ne sont plus lus','Absence de son / son défectueux','Commandes ou connecteurs défectueux','La console s’éteint toute seule'];
  if(modelId==='other')return [STARTUP,'La console ne charge plus','Aucune image / écran défectueux','Les jeux ne sont plus lus','Commandes défectueuses','Absence de son / son défectueux','Surchauffe ou arrêt inattendu'];
  return [STARTUP,'Aucune image / port HDMI endommagé','Surchauffe ou console bruyante','La console s’éteint toute seule',...(DIGITAL_MODELS.has(modelId)?[]:['Les disques ne sont plus lus']),'Connexion Wi-Fi ou réseau défectueuse','Erreur système / démarrage bloqué'];
}

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
