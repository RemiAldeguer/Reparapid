import React, {useEffect, useId, useRef, useState} from 'react';
import {useApp} from './store';
import {type Repair, cents, money, partsCost, repairTotalCost, setRepairTotalCost} from './domain';
import {Icon} from './ui';

export function RepairTotalCostEditor({repair}: {repair: Repair}) {
  const {data, transact} = useApp();
  const total = repairTotalCost(data, repair), cost = partsCost(repair);
  const [editing, setEditing] = useState(false), [value, setValue] = useState(() => total.toFixed(2));
  const inputId = useId(), hintId = useId();
  const input = useRef<HTMLInputElement>(null), editButton = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);

  useEffect(() => {setEditing(false); setValue(total.toFixed(2));}, [repair.id]);
  useEffect(() => {
    if (editing) {input.current?.focus(); input.current?.select();}
    else if (wasEditing.current) editButton.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  function open() {setValue(total.toFixed(2)); setEditing(true);}
  function cancel() {setValue(total.toFixed(2)); setEditing(false);}
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); event.stopPropagation();
    const amount = input.current?.valueAsNumber ?? Number(value);
    if (transact(store => setRepairTotalCost(store, repair.id, amount), 'Montant total enregistré.')) setEditing(false);
  }
  const stopDrag = (event: React.DragEvent<HTMLButtonElement>) => {event.preventDefault(); event.stopPropagation();};

  return <div className={`repair-card-cost repair-total-cost${editing ? ' is-editing' : ''}`} onClick={event => event.stopPropagation()} onDragStart={event => {event.preventDefault(); event.stopPropagation();}}>
    {editing ? <form className="repair-total-cost-form" onSubmit={submit} onKeyDown={event => {if (event.key === 'Escape') {event.preventDefault(); event.stopPropagation(); cancel();}}}>
      <label htmlFor={inputId}>Montant total (€)</label>
      <div className="repair-total-cost-input"><input ref={input} id={inputId} type="number" inputMode="decimal" value={value} onChange={event => setValue(event.target.value)} min={cost} max={cents(cost + 1_000_000)} step="0.01" required aria-label={`Montant total de ${repair.code}`} aria-describedby={hintId}/><span aria-hidden="true">€</span></div>
      <p id={hintId} className="repair-total-cost-hint">{cost > 0 ? `Pièces incluses : ${money(cost)}. Minimum : ${money(cost)}.` : 'Pièces incluses. 0 € accepté.'}{repair.payment && <span>Le paiement reçu est conservé.</span>}</p>
      <div className="repair-total-cost-actions"><button className="repair-total-cost-save" type="submit" draggable={false} onDragStart={stopDrag} aria-label={`Enregistrer le montant total de ${repair.code}`}><Icon name="check" size={13}/>Enregistrer</button><button className="repair-total-cost-cancel" type="button" draggable={false} onDragStart={stopDrag} onClick={cancel}>Annuler</button></div>
    </form> : <><span>{repair.proposal?'Coût interne':'Montant total'}<small>{repair.proposal?'Devis client séparé':'Pièces incluses'}</small></span><button ref={editButton} className="repair-total-cost-edit" type="button" onClick={open} draggable={false} onDragStart={stopDrag} aria-label={`Modifier le montant total de ${repair.code}`} title="Modifier le montant total, pièces incluses"><strong>{money(total)}</strong><Icon name="edit" size={13}/></button></>}
  </div>;
}
