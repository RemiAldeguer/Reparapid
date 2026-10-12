import React,{useEffect,useState} from 'react';
import {useApp} from './store';
import {Badge,Empty,Field,Icon,Modal,Panel} from './ui';
import {number,text} from './forms';
import {
  type Repair,type ClientPartRequest,type ClientPartStatus,CLIENT_PART_STATUSES,active,
  addClientPartRequest,updateClientPartRequest,setClientPartRequestStatus,removeClientPartRequest,
} from './domain';
import './client-part-requests.css';

const STATUS_ORDER:ClientPartStatus[]=['en-attente','disponible','livree','installee'];

export function ClientPartRequestsPanel({repair}:{repair:Repair}){
  const {data,transact,ask,go,edit}=useApp();
  const [editor,setEditor]=useState<{id:string|null}|null>(null);
  const consoleItem=data.consoles.find(item=>item.id===repair.consoleId);
  const client=data.clients.find(item=>item.id===consoleItem?.clientId);
  const requests=repair.clientParts??[];
  const open=active(repair),canEdit=open&&!!client;
  const editedRequest=editor?.id?requests.find(item=>item.id===editor.id):undefined;
  const editHint=!client?'Rattachez la console à un client pour demander des pièces.':!open?'Rouvrez le dossier pour ajouter une demande ou modifier son contenu.':undefined;

  useEffect(()=>{setEditor(null);},[repair.id]);
  useEffect(()=>{if(!canEdit)setEditor(null);},[canEdit]);

  function remove(request:ClientPartRequest){
    ask({
      title:'Supprimer cette demande de pièce ?',
      body:`La demande « ${request.name} » sera retirée du dossier et de l’espace client. Le stock et le montant de la réparation restent inchangés.`,
      label:'Supprimer la demande',destructive:true,
      run:()=>transact(s=>removeClientPartRequest(s,repair.id,request.id),'Demande de pièce supprimée.'),
    });
  }

  return <Panel className="client-part-panel" title="Pièces à demander au client" aside={
    <button type="button" className="btn primary small" disabled={!canEdit} title={editHint} onClick={()=>setEditor({id:null})}>
      <Icon name="plus" size={16}/>Demander une pièce
    </button>
  }>
    <div className="client-part-intro">
      {client?<p className="client-part-owner">À fournir par <button type="button" className="text-link" onClick={()=>go('/clients/'+client.id)}>{client.name}</button></p>:<div className="client-part-unassigned">
        <p>Rattachez cette console à un client pour lui demander des pièces et les afficher dans son espace client.</p>
        {consoleItem&&<button type="button" className="btn secondary small" onClick={()=>edit({type:'console',id:consoleItem.id})}><Icon name="users" size={16}/>Rattacher un client</button>}
      </div>}
      <p className="client-part-explanation">Ces pièces sont fournies par le client. Elles ne sont pas prélevées dans le stock de l’atelier et ne sont pas ajoutées au coût du dossier.</p>
      <div className="client-part-counts" aria-label="Quantités de pièces par statut">
        {STATUS_ORDER.map(status=>{
          const count=requests.filter(item=>item.status===status).reduce((total,item)=>total+item.quantity,0);
          const label=status==='en-attente'?'en attente':status==='disponible'?`disponible${count>1?'s':''}`:status==='livree'?`livrée${count>1?'s':''}`:`installée${count>1?'s':''}`;
          return <Badge key={status} tone={status==='en-attente'?'amber':status==='disponible'?'teal':status==='livree'?'blue':'green'}>{count} {label}</Badge>;
        })}
      </div>
      {!open&&<p className="client-part-closed"><Icon name="info" size={15}/>Dossier clôturé : vous pouvez encore mettre à jour les statuts ou retirer une demande.</p>}
    </div>
    {requests.length?<ul className="client-part-list">{requests.map(request=><li key={request.id} className="client-part-item">
      <div className="client-part-copy"><h3>{request.name}</h3><p className="client-part-quantity">Quantité : <strong>{request.quantity}</strong></p>{request.note&&<p className="client-part-note">{request.note}</p>}</div>
      <Field label="Statut" className="client-part-status"><select aria-label={`Statut de la pièce ${request.name}`} disabled={!client} title={!client?editHint:undefined} value={request.status} data-status={request.status} onChange={e=>transact(s=>setClientPartRequestStatus(s,repair.id,request.id,e.target.value as ClientPartStatus),'Statut de la pièce client mis à jour.')}>
        {STATUS_ORDER.map(status=><option key={status} value={status}>{CLIENT_PART_STATUSES[status]}</option>)}
      </select></Field>
      <div className="client-part-actions">
        <button type="button" className="icon-btn" aria-label={`Modifier la demande ${request.name}`} title={editHint||'Modifier la demande'} disabled={!canEdit} onClick={()=>setEditor({id:request.id})}><Icon name="edit" size={17}/></button>
        <button type="button" className="icon-btn danger-icon" aria-label={`Supprimer la demande ${request.name}`} disabled={!client} title={!client?editHint:"Supprimer la demande"} onClick={()=>remove(request)}><Icon name="trash" size={17}/></button>
      </div>
    </li>)}</ul>:<Empty title="Aucune pièce demandée" icon="package">{canEdit?'Ajoutez les pièces que le client doit fournir pour cette réparation. Il pourra signaler leur disponibilité puis suivre leur réception et leur installation dans son espace client.':!client?'Les demandes de pièces destinées au client apparaîtront ici après son rattachement.':'Aucune pièce à fournir par le client n’a été enregistrée pour ce dossier.'}</Empty>}
    {editor&&canEdit&&(editor.id===null||editedRequest)&&<ClientPartRequestForm key={editor.id??'new'} repair={repair} request={editedRequest} clientName={client!.name} onClose={()=>setEditor(null)}/>}
  </Panel>;
}

function ClientPartRequestForm({repair,request,clientName,onClose}:{repair:Repair;request?:ClientPartRequest;clientName:string;onClose:()=>void}){
  const {transact}=useApp();
  function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const values={name:text(form,'name'),quantity:number(form,'quantity'),note:text(form,'note')};
    const accepted=transact(s=>{
      if(request)updateClientPartRequest(s,repair.id,request.id,values);
      else addClientPartRequest(s,repair.id,values);
    },request?'Demande de pièce mise à jour.':'Pièce demandée au client.');
    if(accepted)onClose();
  }
  return <Modal title={request?'Modifier la demande de pièce':'Demander une pièce au client'} subtitle={`${repair.code} · Visible dans l’espace client de ${clientName}.`} onClose={onClose}>
    <form className="client-part-form" onSubmit={submit}>
      <div className="modal-body form-stack">
        <Field label="Nom de la pièce *"><input name="name" defaultValue={request?.name||''} placeholder="Écran supérieur Nintendo DS…" maxLength={200} required autoFocus/></Field>
        <Field label="Quantité *" hint="De 1 à 1 000 unités."><input name="quantity" type="number" defaultValue={request?.quantity??1} min={1} max={1000} step={1} inputMode="numeric" required/></Field>
        <Field label="Précisions pour le client" hint="Optionnel · 1 000 caractères maximum."><textarea name="note" defaultValue={request?.note||''} placeholder="Référence, couleur, lien vers la pièce ou instructions de livraison…" rows={4} maxLength={1000}/></Field>
        {!request&&<p className="form-hint">La demande sera ajoutée avec le statut « En attente de la pièce ».</p>}
      </div>
      <div className="modal-footer"><button type="button" className="btn secondary" onClick={onClose}>Annuler</button><button type="submit" className="btn primary"><Icon name="check" size={17}/>{request?'Enregistrer':'Ajouter la demande'}</button></div>
    </form>
  </Modal>;
}

export function ClientPartRequestsPrint({repair}:{repair:Repair}){
  const requests=repair.clientParts??[];
  if(!requests.length)return null;
  return <><h3>Pièces à fournir par le client</h3>{requests.map(request=><div key={request.id}><p>{request.quantity} × {request.name} · {CLIENT_PART_STATUSES[request.status]}.</p>{request.note&&<p className="prewrap">{request.note}</p>}</div>)}</>;
}
