import React from 'react';
import {canArrangeRepairDelivery,dateFmt,repairDeliveryLabel,type Repair} from './domain';
import {useApp} from './store';
import {Badge,Field,Icon,Panel} from './ui';
import './repair-delivery.css';
export function RepairDeliveryAdmin({repair}:{repair:Repair}){
  const {ask,serverCommand}=useApp();
  if(!canArrangeRepairDelivery(repair))return null;
  const delivery=repair.delivery;
  function complete(tracking=''){
    ask({title:delivery!.method==='pickup'?'Confirmer la remise au client ?':'Confirmer l’expédition de la console ?',
      body:delivery!.method==='pickup'?'Confirmez uniquement lorsque la console a été remise au client.':`L’envoi est inclus, sans frais supplémentaires. Suivi communiqué : ${tracking}.`,
      label:delivery!.method==='pickup'?'Console remise au client':'Confirmer l’expédition',run:()=>{void serverCommand(`/api/admin/repairs/${encodeURIComponent(repair.id)}/delivery`,{action:'complete',deliveryId:delivery!.id,tracking},'Récupération de la console mise à jour.');}});
  }
  function ship(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const fields=new FormData(event.currentTarget);complete(String(fields.get('tracking')||'').trim());}
  return <Panel title="Récupération de la console" aside={<Badge tone={delivery?.completedAt?'green':'amber'}>{repairDeliveryLabel(delivery)}</Badge>}>
    <div className="panel-body form-stack">{!delivery?<p>La réparation est terminée. Le client peut maintenant choisir le retrait en magasin ou l’envoi inclus depuis son espace.</p>:<>
      <p>Choix confirmé par le client le {dateFmt(delivery.requestedAt,true)} : <strong>{delivery.method==='pickup'?'retrait en magasin':'envoi inclus, sans frais supplémentaires'}</strong>.</p>
      {delivery.method==='shipping'&&<div className="delivery-address"><strong>Destinataire et adresse confirmés</strong><address>{delivery.recipient}<br/>{delivery.address}</address>{delivery.phone&&<p>Téléphone : {delivery.phone}</p>}</div>}
      {delivery.completedAt?<p className="notice"><Icon name="check" size={18}/>{repairDeliveryLabel(delivery)} le {dateFmt(delivery.completedAt,true)}.{delivery.tracking&&<> Suivi : {delivery.tracking}</>}</p>
        :delivery.method==='pickup'?<button className="btn primary" type="button" onClick={()=>complete()}>Confirmer la remise au client</button>
        :<form className="form-stack" onSubmit={ship}><Field label="Suivi du colis *" hint="Numéro de suivi ou informations permettant au client de suivre son colis."><input name="tracking" required maxLength={300}/></Field><button className="btn primary" type="submit"><Icon name="package" size={17}/>Confirmer l’expédition incluse</button></form>}
    </>}</div>
  </Panel>;
}
