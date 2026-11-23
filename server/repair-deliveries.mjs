import {RepairProposalError,assertProposalOwner} from './repair-proposals.mjs';
export function clientDeliveryRequest(body,validate){
  try{return validate(body);}catch(error){throw new RepairProposalError(400,error.message);}
}
export function adminDeliveryRequest(body){
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!['revision','action','deliveryId','tracking'].includes(key))
    ||body.action!=='complete'||!Number.isSafeInteger(body.revision)||body.revision<0||body.revision>=1e9
    ||typeof body.deliveryId!=='string'||!/^[A-Za-z0-9_-]{1,120}$/.test(body.deliveryId)
    ||typeof body.tracking!=='string'||body.tracking.length>300||/[\u0000-\u001f\u007f]/.test(body.tracking))throw new RepairProposalError(400,'Confirmation de récupération invalide.');
  return {revision:body.revision,deliveryId:body.deliveryId,tracking:body.tracking.trim()};
}
export function applyClientDelivery(store,clientId,repairId,input,actions){
  assertProposalOwner(store,clientId,repairId);
  try{return actions.chooseRepairDelivery(store,clientId,repairId,input);}catch(error){throw new RepairProposalError(409,error.message);}
}
export function applyAdminDelivery(store,repairId,input,actions){
  if(!store.repairs.some(repair=>repair.id===repairId))throw new RepairProposalError(404,'Dossier introuvable.');
  try{return actions.completeRepairDelivery(store,repairId,input.deliveryId,input.tracking);}catch(error){throw new RepairProposalError(409,error.message);}
}
export function publicRepairDelivery(delivery){
  if(!delivery)return undefined;
  return Object.fromEntries(['id','method','recipient','address','phone','requestedAt','completedAt','tracking'].map(key=>[key,delivery[key]]));
}
