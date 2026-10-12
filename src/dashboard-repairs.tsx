import React,{useState} from 'react';
import {useApp} from './store';
import {money,repairTotalCost} from './domain';
import {Icon,ConsoleVisual,StageBadge} from './ui';
import {RepairPaymentBadge,RepairPaymentButton} from './repair-payment';

type PaymentFilter='all'|'unpaid'|'paid';
const filters:{id:PaymentFilter;label:string}[]=[{id:'all',label:'Toutes'},{id:'unpaid',label:'Non payées'},{id:'paid',label:'Payées'}];

export function DashboardRepairs() {
 const {data,go}=useApp();
 const [filter,setFilter]=useState<PaymentFilter>('all');
 const clients=new Map(data.clients.map(client=>[client.id,client]));
 const consoles=new Map(data.consoles.map(console=>[console.id,console]));
 const repairs=data.repairs.flatMap(repair=>{
  const console=consoles.get(repair.consoleId),client=console?.clientId?clients.get(console.clientId):undefined;
  return console&&client?[{repair,console,client}]:[];
 }).sort((a,b)=>Number(a.repair.payment!=null)-Number(b.repair.payment!=null)
  ||Number(b.repair.stage==='terminee')-Number(a.repair.stage==='terminee')
  ||b.repair.updatedAt.localeCompare(a.repair.updatedAt)||b.repair.code.localeCompare(a.repair.code));
 const counts={all:repairs.length,unpaid:repairs.filter(({repair})=>repair.payment==null).length,paid:repairs.filter(({repair})=>repair.payment!=null).length};
 const matching=repairs.filter(({repair})=>filter==='all'||(filter==='paid'?repair.payment!=null:repair.payment==null));
 return <section className="summary-repairs" aria-labelledby="summary-repairs-title">
  <div className="summary-repairs-head"><div><h3 id="summary-repairs-title">Réparations clients</h3><p>Non payées en premier · pièces incluses</p></div><div className="summary-repairs-filters" role="group" aria-label="Filtrer les réparations de la synthèse">{filters.map(({id,label})=><button key={id} type="button" aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}<span>{counts[id]}</span></button>)}</div></div>
  {matching.length?<ul key={filter} className="summary-repairs-list" tabIndex={0} aria-label="Liste des réparations clients">{matching.map(({repair,console,client})=><li className="summary-repair-row" key={repair.id}>
   <div className="summary-repair-identity"><div className={`mini-visual art-${console.illustration}`}><ConsoleVisual item={console} small/></div><div className="summary-repair-copy"><button type="button" className="summary-repair-title" onClick={()=>go('/repairs/'+repair.id)}>{console.brand} {console.model}</button><p>{repair.title}</p><div className="summary-repair-owner"><button type="button" className="text-link" onClick={()=>go('/clients/'+client.id)} aria-label={`Ouvrir la fiche client ${client.name}`}><Icon name="users" size={12}/>{client.name}</button><span className="mono">{repair.code}</span></div></div></div>
   <div className="summary-repair-states"><StageBadge stage={repair.stage}/><RepairPaymentBadge repair={repair}/></div>
   <div className="summary-repair-amount"><small>Coût total</small><strong>{money(repairTotalCost(data,repair))}</strong>{repair.payment&&<small className="summary-repair-received">Reçu : {money(repair.payment.amount)}</small>}</div>
   <div className="summary-repair-actions"><RepairPaymentButton repair={repair}/><button type="button" className="icon-btn" onClick={()=>go('/repairs/'+repair.id)} aria-label={`Ouvrir ${repair.code}`} title="Ouvrir le dossier"><Icon name="right" size={16}/></button></div>
  </li>)}</ul>:<p className="summary-repairs-empty">{filter==='paid'?'Aucune réparation payée pour le moment.':filter==='unpaid'?'Tous les règlements clients sont enregistrés.':'Vos réparations clients apparaîtront ici.'}</p>}
  <div className="summary-repairs-foot"><span>{`${matching.length} dossier${matching.length===1?'':'s'} client${matching.length===1?'':'s'}`}</span><button type="button" className="text-link" onClick={()=>go(filter==='all'?'/repairs':`/repairs?payment=${filter}`)}>{filter==='all'?'Voir l’atelier':filter==='unpaid'?'Voir toutes les non payées':'Voir toutes les payées'}<Icon name="arrow" size={14}/></button></div>
 </section>;
}
