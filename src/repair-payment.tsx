import React from 'react';
import {useApp} from './store';
import {type Repair,money,dateFmt,timeFmt,repairTotalCost,setRepairPayment} from './domain';
import {Badge,Icon,Panel} from './ui';

export function RepairPaymentBadge({repair}:{repair:Repair}) {
 const paid=repair.payment!=null;
 return <span className="repair-payment-badge" title={paid?`${money(repair.payment!.amount)} enregistrés le ${dateFmt(repair.payment!.paidAt)} à ${timeFmt(repair.payment!.paidAt)}`:'Aucun paiement enregistré'}><Badge tone={paid?'green':'amber'} dot={false}><Icon name={paid?'check':'clock'} size={12}/>{paid?'Payée':'Non payée'}</Badge></span>;
}

function useRepairPaymentActions(repair:Repair) {
 const {data,transact,ask}=useApp();
 const payment=repair.payment,total=repairTotalCost(data,repair);
 function markPaid() {
  ask({title:'Enregistrer le paiement reçu ?',body:`Vous confirmez avoir reçu ${money(total)} pour le dossier ${repair.code}, pièces incluses. Ce montant sera ajouté au total encaissé.`,label:'Confirmer le paiement',run:()=>transact(s=>setRepairPayment(s,repair.id,true),'Paiement enregistré.')});
 }
 function markUnpaid() {
  ask({title:'Corriger le paiement enregistré ?',body:`Le dossier ${repair.code} sera marqué non payé. Cette correction retire ${money(payment!.amount)} du total encaissé.`,label:'Marquer comme non payée',run:()=>transact(s=>setRepairPayment(s,repair.id,false),'Dossier marqué non payé.')});
 }
 return {payment,total,markPaid,markUnpaid};
}

export function RepairPaymentButton({repair}:{repair:Repair}) {
 const {data}=useApp();
 const {total,markPaid}=useRepairPaymentActions(repair);
 const item=data.consoles.find(console=>console.id===repair.consoleId);
 if(repair.payment||!data.clients.some(client=>client.id===item?.clientId))return null;
 const label=`Marquer ${repair.code} comme payée (${money(total)})`;
 return <button type="button" className="repair-payment-quick" aria-label={label} title={label} draggable={false} onDragStart={e=>{e.preventDefault();e.stopPropagation();}} onClick={e=>{e.stopPropagation();markPaid();}}><Icon name="check" size={13}/>Marquer payée</button>;
}

export function RepairPaymentPanel({repair}:{repair:Repair}) {
 const {payment,total,markPaid,markUnpaid}=useRepairPaymentActions(repair);
 return <Panel title="Paiement client" className={`repair-payment-panel ${payment?'is-paid':'is-unpaid'}`} aside={<RepairPaymentBadge repair={repair}/>}><div className="repair-payment-body"><div className="repair-payment-copy"><span>{payment?'Montant reçu':'Montant à recevoir'}</span><strong>{money(payment?payment.amount:total)}</strong><p>{payment?`Enregistré le ${dateFmt(payment.paidAt)} à ${timeFmt(payment.paidAt)}`:'Le règlement est à enregistrer après réception du paiement.'}</p></div><button type="button" className={`btn ${payment?'secondary':'primary'}`} onClick={payment?markUnpaid:markPaid}><Icon name={payment?'restore':'check'} size={17}/>{payment?'Marquer comme non payée':'Marquer comme payée'}</button></div>{payment&&<p className="repair-payment-hint">Le montant reçu est conservé si le coût ou le statut de la réparation évolue.</p>}</Panel>;
}
