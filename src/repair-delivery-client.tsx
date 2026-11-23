import React,{useState} from 'react';
import {dateFmt,repairDeliveryLabel,type RepairDelivery,type RepairDeliveryInput} from './domain';
import {Icon,Modal} from './ui';
import type {ProposalFeedback} from './repair-proposal-client';
import './repair-delivery.css';

export function RepairDeliveryClient({repairId,delivery,clientName,disabled,feedback,onChoose}:{
  repairId:string;delivery?:RepairDelivery;clientName:string;disabled:boolean;feedback:ProposalFeedback;
  onChoose:(repairId:string,input:RepairDeliveryInput)=>Promise<boolean>;
}){
  const [method,setMethod]=useState<'pickup'|'shipping'|null>(null);
  async function confirm(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(!method||disabled)return;
    const form=new FormData(event.currentTarget);
    const input:RepairDeliveryInput={method,recipient:method==='shipping'?String(form.get('recipient')||'').trim():'',
      address:method==='shipping'?String(form.get('address')||'').trim():'',phone:method==='shipping'?String(form.get('phone')||'').trim():''};
    if(await onChoose(repairId,input))setMethod(null);
  }
  const ownFeedback=feedback.repairId===repairId;
  return <section className="portal-delivery" aria-label="Récupérer ma console">
    <span className="portal-section-label">LA DERNIÈRE ÉTAPE</span><h2>{delivery?repairDeliveryLabel(delivery):'Comment récupérer votre console ?'}</h2>
    {!delivery?<><p>Votre réparation est terminée. Choisissez ce qui vous convient : le retrait en magasin ou l’envoi inclus à votre adresse.</p>
      <div className="delivery-choices"><button className="delivery-choice" type="button" disabled={disabled} onClick={()=>setMethod('pickup')}><Icon name="location" size={28}/><strong>Je viens au magasin</strong><span>Je récupère ma console directement à l’atelier.</span><small>Retrait sur place</small></button>
      <button className="delivery-choice" type="button" disabled={disabled} onClick={()=>setMethod('shipping')}><Icon name="package" size={28}/><strong>Envoyez-moi ma console</strong><span>Je renseigne l’adresse à laquelle recevoir ma console.</span><small>Envoi inclus · sans frais supplémentaires</small></button></div></>
      :<><p>{delivery.completedAt?delivery.method==='pickup'?`Le magasin confirme la remise de votre console le ${dateFmt(delivery.completedAt)}.`:`Votre console a été expédiée le ${dateFmt(delivery.completedAt)}.`
        :delivery.method==='pickup'?'Votre choix est enregistré. Contactez l’atelier pour convenir du retrait de votre console.':'Votre adresse est enregistrée. Le magasin prépare votre colis ; l’envoi est inclus, sans virement supplémentaire.'}</p>
        {delivery.method==='shipping'&&<div className="delivery-address"><strong>Adresse de livraison confirmée</strong><address>{delivery.recipient}<br/>{delivery.address}</address>{delivery.phone&&<p>{delivery.phone}</p>}{delivery.tracking&&<p><strong>Suivi communiqué par le magasin</strong><br/><span className="prewrap">{delivery.tracking}</span></p>}</div>}
        <p className="form-hint">Choix enregistré le {dateFmt(delivery.requestedAt)}. Pour toute question, contactez l’atelier.</p></>}
    {ownFeedback&&feedback.message&&<p className="portal-proposal-feedback success" role="status">{feedback.message}</p>}
    {ownFeedback&&feedback.error&&!method&&<p className="portal-proposal-feedback error" role="alert">{feedback.error}</p>}
    {method&&!delivery&&<Modal title={method==='pickup'?'Confirmer le retrait en magasin ?':'Où envoyer votre console ?'} onClose={()=>{if(!disabled)setMethod(null);}}>
      <form onSubmit={event=>void confirm(event)}><div className="modal-body form-stack"><p>{method==='pickup'?'Le magasin sera informé que vous souhaitez récupérer votre console sur place.':'L’envoi est inclus. Vérifiez votre adresse complète avant de confirmer.'}</p>
      {method==='shipping'&&<><label className="delivery-field"><span>Nom du destinataire</span><input name="recipient" defaultValue={clientName} required maxLength={200} autoComplete="name" disabled={disabled}/></label>
      <label className="delivery-field"><span>Adresse complète de livraison</span><textarea name="address" rows={4} maxLength={1000} required autoComplete="street-address" placeholder="Numéro et rue, complément éventuel&#10;Code postal et ville&#10;Pays" disabled={disabled}/><small>Incluez le code postal, la ville et le pays.</small></label>
      <label className="delivery-field"><span>Téléphone pour la livraison · facultatif</span><input name="phone" type="tel" maxLength={80} autoComplete="tel" disabled={disabled}/></label></>}
      {ownFeedback&&feedback.error&&<p className="auth-error" role="alert">{feedback.error}</p>}</div>
      <div className="modal-footer"><button className="btn secondary" type="button" disabled={disabled} onClick={()=>setMethod(null)}>Annuler</button><button className="btn primary" type="submit" disabled={disabled}>{disabled?'Enregistrement…':method==='pickup'?'Confirmer mon retrait':'Confirmer l’envoi inclus'}</button></div></form>
    </Modal>}
  </section>;
}
