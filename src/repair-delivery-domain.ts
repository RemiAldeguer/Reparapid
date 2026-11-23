/** Final logistics are separate from repair completion and never record a payment. */
export interface RepairDeliveryInput {method:'pickup'|'shipping';recipient:string;address:string;phone:string;}
export interface RepairDelivery extends RepairDeliveryInput {id:string;requestedAt:string;completedAt:string;tracking:string;}
export function repairDeliveryLabel(delivery:RepairDelivery|undefined):string{
  if(!delivery)return 'Récupération à choisir';
  return delivery.completedAt?(delivery.method==='pickup'?'Console remise':'Console expédiée')
    :delivery.method==='pickup'?'Retrait en magasin':'Envoi en préparation';
}
function record(raw:unknown,fields:string[]):Record<string,unknown>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(key=>!fields.includes(key)))throw Error('Choix de récupération invalide.');
  return raw as Record<string,unknown>;
}
function text(value:unknown,max:number,multiline=false):string{
  if(typeof value!=='string'||value.length>max||(multiline?/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/:/[\u0000-\u001f\u007f]/).test(value))throw Error('Coordonnées de récupération invalides ou trop longues.');
  return value.trim();
}
export function validateRepairDeliveryInput(raw:unknown):RepairDeliveryInput{
  const value=record(raw,['method','recipient','address','phone']);
  if(!['pickup','shipping'].includes(value.method as string))throw Error('Choisissez le retrait en magasin ou l’envoi inclus.');
  const recipient=text(value.recipient,200),address=text(value.address,1000,true),phone=text(value.phone,80);
  if(value.method==='shipping'&&(!recipient||!address))throw Error('Renseignez le destinataire et son adresse complète pour l’envoi.');
  if(value.method==='pickup'&&(recipient||address||phone))throw Error('Le retrait en magasin ne nécessite pas d’adresse de livraison.');
  return {method:value.method as RepairDeliveryInput['method'],recipient,address,phone};
}
function timestamp(value:unknown):value is string{
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))return false;
  const date=new Date(value);return Number.isFinite(date.getTime())&&date.toISOString()===value;
}
export function validateRepairDelivery(raw:unknown):RepairDelivery{
  const value=record(raw,['id','method','recipient','address','phone','requestedAt','completedAt','tracking']);
  const input=validateRepairDeliveryInput({method:value.method,recipient:value.recipient,address:value.address,phone:value.phone});
  if(typeof value.id!=='string'||!/^[A-Za-z0-9_-]{1,120}$/.test(value.id)||!timestamp(value.requestedAt))throw Error('Référence ou date de récupération invalide.');
  if(value.completedAt!==''&&(!timestamp(value.completedAt)||value.completedAt<value.requestedAt))throw Error('Date de remise ou d’expédition invalide.');
  const tracking=text(value.tracking,300);
  if(input.method==='pickup'&&tracking||input.method==='shipping'&&Boolean(value.completedAt)!==Boolean(tracking))throw Error('L’expédition exige un suivi ; le retrait en magasin n’en utilise pas.');
  return {...input,id:value.id,requestedAt:value.requestedAt,completedAt:value.completedAt as string,tracking};
}
