import React from 'react';
import {useApp} from './store';
import {useAuth} from './auth';
import {ConsoleVisual,Icon} from './ui';
import './dashboard-client-parts.css';

export function DashboardClientParts() {
  const {data,go}=useApp();
  const {user}=useAuth();
  if(!user.workshopId)return null;
  const clients=new Map(data.clients.map(client=>[client.id,client]));
  const consoles=new Map(data.consoles.map(console=>[console.id,console]));
  const waiting=data.repairs.flatMap(repair=>{
    const console=consoles.get(repair.consoleId),client=console?.clientId?clients.get(console.clientId):undefined;
    return console&&client?(repair.clientParts??[]).filter(part=>part.status==='en-attente').map(part=>({part,repair,console,client})):[];
  }).sort((a,b)=>a.part.createdAt.localeCompare(b.part.createdAt)||a.repair.code.localeCompare(b.repair.code)||a.part.name.localeCompare(b.part.name,'fr'));
  const quantity=waiting.reduce((total,{part})=>total+part.quantity,0),clientCount=new Set(waiting.map(({client})=>client.id)).size;
  return <section className="summary-client-parts" aria-labelledby="summary-client-parts-title">
    <div className="summary-client-parts-head"><span className="summary-client-parts-icon" aria-hidden="true"><Icon name="package" size={20}/></span><div><h3 id="summary-client-parts-title">Pièces à fournir par les clients</h3><p>{waiting.length?`${waiting.length} demande${waiting.length===1?'':'s'} pour ${clientCount} client${clientCount===1?'':'s'} · les plus anciennes en premier`:'Les demandes encore en attente apparaissent ici.'}</p></div><span className="summary-client-parts-count">{quantity} pièce{quantity===1?'':'s'} en attente</span></div>
    {waiting.length?<ul className="summary-client-parts-list" tabIndex={0} aria-label="Pièces clients en attente">{waiting.map(({part,repair,console,client})=><li key={part.id} className="summary-client-part-row">
      <span className="summary-client-part-quantity" aria-label={`Quantité : ${part.quantity}`}>{part.quantity} ×</span>
      <div className="summary-client-part-copy"><strong>{part.name}</strong>{part.note&&<p title={part.note}>{part.note}</p>}<div className="summary-client-part-owner"><button type="button" className="text-link" onClick={()=>go('/clients/'+client.id)} aria-label={`Ouvrir la fiche client ${client.name}`}><Icon name="users" size={12}/>{client.name}</button><span className="mono">{repair.code}</span></div></div>
      <button type="button" className="summary-client-part-console" onClick={()=>go('/repairs/'+repair.id)} aria-label={`Ouvrir ${repair.code} : ${console.brand} ${console.model}${console.variant?`, ${console.variant}`:''}`}><span className={`mini-visual art-${console.illustration}`}><ConsoleVisual item={console} small/></span><span><strong>{console.brand} {console.model}</strong><small>{console.variant||'Couleur non renseignée'}</small></span></button>
      <button type="button" className="icon-btn" onClick={()=>go('/repairs/'+repair.id)} aria-label={`Ouvrir le dossier ${repair.code} pour ${part.name}`} title="Ouvrir le dossier"><Icon name="right" size={17}/></button>
    </li>)}</ul>:<p className="summary-client-parts-empty"><Icon name="check" size={16}/>Aucune pièce à fournir en attente.</p>}
  </section>;
}
