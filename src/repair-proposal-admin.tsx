import React, {useState} from 'react';
import {dateFmt, money, type Repair, type RepairProposalInput} from './domain';
import {useApp} from './store';
import {Badge, Field, Icon, Panel} from './ui';
import './repair-proposal-admin.css';

export function RepairProposalAdmin({repair}: {repair: Repair}) {
  const {data, serverCommand, ask, notify} = useApp();
  const proposal = repair.proposal;
  const [editing, setEditing] = useState(!proposal);
  const [kind, setKind] = useState<RepairProposalInput['kind']>(proposal?.kind || 'repair');
  const [returnFee, setReturnFee] = useState(proposal ? String(proposal.returnFee) : '');
  const [buyback, setBuyback] = useState(proposal?.buybackAmount != null);
  const [tracking, setTracking] = useState('');
  const item = data.consoles.find(console => console.id === repair.consoleId);
  if (!item?.clientId) return null;
  const endpoint = `/api/admin/repairs/${encodeURIComponent(repair.id)}/proposal`;
  function command(action: string, title: string, body: string, label: string, extra: Record<string, unknown> = {}) {
    ask({title, body, label, run: () => {void serverCommand(endpoint, {action, proposalId: proposal!.id, ...extra}, 'Dossier client mis à jour.');}});
  }
  function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const input: RepairProposalInput = {kind, description: String(fields.get('description') || '').trim(),
      repairAmount: kind === 'repair' ? Number(fields.get('repairAmount')) : null,
      buybackAmount: kind === 'unrepairable' && buyback ? Number(fields.get('buybackAmount')) : null,
      returnFee: Number(returnFee), bankInstructions: String(fields.get('bankInstructions') || '').trim()};
    if(!input.description || input.returnFee>0&&!input.bankInstructions){notify('Renseignez une explication et les instructions de virement nécessaires, sans laisser uniquement des espaces.',true);return;}
    ask({title: proposal ? 'Remplacer la proposition en attente ?' : 'Publier cette proposition au client ?',
      body: `${kind === 'repair' ? `Réparation proposée : ${money(input.repairAmount!)} TTC, pièces et intervention comprises.` : `Console irréparable.${input.buybackAmount !== null ? ` Offre de rachat pour pièces : ${money(input.buybackAmount)}.` : ''}`} Frais de retour si le client le demande : ${money(input.returnFee)}. Le client pourra répondre dans son espace.`,
      label: 'Publier dans l’espace client', run: () => {void serverCommand(endpoint, {action: 'publish', ...input}, 'Proposition publiée dans l’espace client.').then(ok => {if (ok) setEditing(false);});}});
  }
  const title = !proposal ? 'Proposition au client' : proposal.decision === 'pending' ? 'Réponse du client attendue' : proposal.decision === 'repair' ? 'Réparation acceptée' : proposal.decision === 'return' ? 'Retour de la console' : 'Rachat pour pièces';
  return <Panel title={title} aside={<Badge tone={proposal?.decision === 'pending' ? 'amber' : proposal ? 'green' : 'blue'}>{proposal ? 'Espace client' : 'À préparer'}</Badge>}>
    <div className="panel-body proposal-admin">
      <p className="proposal-admin-intro">Ce bloc est partagé avec le client. Les observations du diagnostic technique restent internes à l’atelier.</p>
      {proposal && <>
        <div className="proposal-admin-published"><span className="eyebrow">{proposal.kind === 'repair' ? 'RÉPARATION PROPOSÉE' : 'CONSOLE IRRÉPARABLE'}</span><p className="prewrap">{proposal.description}</p><dl className="proposal-admin-amounts">
          {proposal.repairAmount !== null && <div><dt>Prix total TTC proposé</dt><dd>{money(proposal.repairAmount)}</dd></div>}
          {proposal.buybackAmount !== null && <div><dt>Offre de rachat pour pièces</dt><dd>{money(proposal.buybackAmount)}</dd></div>}
          <div><dt>Frais de retour</dt><dd>{money(proposal.returnFee)}</dd></div></dl><small>Publiée le {dateFmt(proposal.publishedAt, true)}{proposal.decidedAt && ` · Choix enregistré le ${dateFmt(proposal.decidedAt, true)}`}</small>
        </div>
        {proposal.decision === 'pending' && <div className="notice"><Icon name="clock" size={18}/><span>Le client peut {proposal.kind === 'repair' ? 'accepter la réparation ou la refuser et demander le retour' : proposal.buybackAmount !== null ? 'accepter le rachat ou demander le retour' : 'demander le retour'}. Attendez son choix avant d’intervenir.</span></div>}
        {proposal.decision === 'repair' && <div className="notice"><Icon name="check" size={18}/><span>Accord du client enregistré pour {money(proposal.repairAmount!)} TTC. Vous pouvez lancer la réparation. Le devis accepté reste fixe ; le bilan interne des pièces et du temps est conservé séparément.</span></div>}
        {proposal.decision === 'return' && <section className="proposal-admin-operation" aria-label="Virement et expédition du retour">
          <h3><Icon name="package" size={19}/>Retour demandé par le client</h3>
          {proposal.returnFee > 0 ? <>
            <p>Virement attendu : <strong>{money(proposal.returnFee)}</strong> · Référence : <strong className="mono">{repair.code}</strong>.</p>
            <details><summary>Instructions de virement transmises au client</summary><p className="prewrap">{proposal.bankInstructions}</p></details>
            {proposal.returnPaidAt ? <p className="proposal-admin-success"><Icon name="check" size={18}/>Virement reçu, confirmé le {dateFmt(proposal.returnPaidAt, true)}.</p> : <><p>{proposal.transferDeclaredAt ? `Le client a déclaré son virement le ${dateFmt(proposal.transferDeclaredAt, true)}. Vérifiez sa réception sur le compte du magasin.` : 'En attente du virement du client. Vérifiez le compte du magasin avant de confirmer la réception.'}</p><button type="button" className="btn primary" onClick={() => command('confirm-return-payment', 'Confirmer la réception du virement ?', `Vous confirmez avoir reçu ${money(proposal.returnFee)} pour le retour de ${repair.code}. Cette confirmation autorisera son expédition.`, 'Confirmer : virement reçu')}><Icon name="check" size={17}/>Confirmer le virement reçu</button></>}
          </> : <p>Le retour est offert. Aucun virement n’est demandé.</p>}
          {proposal.returnedAt ? <p className="proposal-admin-success"><Icon name="check" size={18}/>Retour expédié le {dateFmt(proposal.returnedAt, true)}.<br/>Suivi : {proposal.tracking}</p> : (proposal.returnFee === 0 || proposal.returnPaidAt) ? <form className="form-stack" onSubmit={event => {event.preventDefault(); if(!tracking.trim()){notify('Renseignez le transporteur et le suivi du colis.',true);return;} command('dispatch-return', 'Confirmer l’expédition du retour ?', `La console du dossier ${repair.code} sera indiquée comme expédiée. Suivi : ${tracking.trim()}.`, 'Confirmer l’expédition', {tracking: tracking.trim()});}}><Field label="Transporteur et numéro de suivi *"><input value={tracking} onChange={event => setTracking(event.target.value)} maxLength={300} required placeholder="Renseignez le suivi réel du colis"/></Field><button className="btn primary" type="submit"><Icon name="package" size={17}/>Enregistrer le retour expédié</button></form> : <p className="form-hint">L’expédition sera disponible après confirmation du virement.</p>}
        </section>}
        {proposal.decision === 'buyback' && <section className="proposal-admin-operation"><h3><Icon name="check" size={19}/>Rachat accepté : {money(proposal.buybackAmount!)}</h3><p>Le client a donné son accord pour céder cette console pour pièces. Organisez le règlement avec lui ; son accord seul n’enregistre aucun paiement ni entrée en stock.</p>{proposal.buybackCompletedAt ? <p>Rachat finalisé le {dateFmt(proposal.buybackCompletedAt, true)}.</p> : <button type="button" className="btn primary" onClick={() => command('complete-buyback', 'Finaliser le rachat pour pièces ?', `Confirmez avoir terminé les démarches et le règlement du rachat convenu à ${money(proposal.buybackAmount!)} pour ${repair.code}. L’historique et le propriétaire du dossier sont conservés.`, 'Confirmer le rachat finalisé')}>Marquer le rachat finalisé</button>}</section>}
      </>}
      {repair.stage !== 'diagnostic' && !proposal && <p className="notice">Passez le dossier en diagnostic pour préparer la proposition et la publier au client.</p>}
      {proposal?.decision === 'pending' && !editing && <button type="button" className="btn secondary" onClick={() => setEditing(true)}><Icon name="edit" size={17}/>Modifier la proposition en attente</button>}
      {repair.payment && !proposal && <p className="notice">Un paiement est déjà enregistré sur ce dossier. Vérifiez ce reçu et corrigez-le dans « Paiement client » avant de publier une nouvelle proposition.</p>}
      {repair.stage === 'diagnostic' && !repair.payment && (!proposal || proposal.decision === 'pending' && editing) && <form className="form-stack proposal-admin-form" onSubmit={publish}>
        <fieldset><legend>Résultat du diagnostic</legend><div className="proposal-admin-options"><label><input type="radio" name="proposalKind" value="repair" checked={kind === 'repair'} onChange={() => setKind('repair')}/>Console réparable</label><label><input type="radio" name="proposalKind" value="unrepairable" checked={kind === 'unrepairable'} onChange={() => setKind('unrepairable')}/>Console irréparable</label></div></fieldset>
        <Field label={kind === 'repair' ? 'Réparation proposée au client *' : 'Explication à transmettre au client *'} hint="Décrivez clairement le diagnostic et les suites possibles."><textarea name="description" defaultValue={proposal?.description || ''} rows={4} maxLength={5000} required/></Field>
        {kind === 'repair' ? <Field label="Prix total de la réparation TTC (€) *" hint="Pièces et intervention comprises. 0 € indique une réparation offerte."><input name="repairAmount" type="number" min="0" max="100000" step="0.01" inputMode="decimal" defaultValue={proposal?.repairAmount ?? ''} required/></Field> : <><label className="proposal-admin-checkbox"><input type="checkbox" checked={buyback} onChange={event => setBuyback(event.target.checked)}/>Proposer un rachat pour pièces</label>{buyback && <Field label="Prix de rachat proposé au client (€) *"><input name="buybackAmount" type="number" min="0" max="100000" step="0.01" inputMode="decimal" defaultValue={proposal?.buybackAmount ?? ''} required/></Field>}</>}
        <Field label="Frais de retour de ce dossier (€) *" hint="Montant demandé si le client refuse la réparation ou souhaite récupérer la console irréparable. Saisissez 0 pour offrir le retour."><input type="number" min="0" max="100000" step="0.01" inputMode="decimal" value={returnFee} onChange={event => setReturnFee(event.target.value)} required/></Field>
        <Field label={`Instructions de virement${Number(returnFee) > 0 ? ' *' : ''}`} hint="Bénéficiaire, IBAN et consignes utiles. Affichés uniquement au client concerné lorsqu’il demande le retour."><textarea name="bankInstructions" defaultValue={proposal?.bankInstructions || ''} rows={4} maxLength={3000} required={Number(returnFee) > 0} autoComplete="off"/></Field>
        <div className="button-row">{proposal && <button type="button" className="btn secondary" onClick={() => setEditing(false)}>Annuler les modifications</button>}<button type="submit" className="btn primary"><Icon name="right" size={17}/>{proposal ? 'Publier la nouvelle proposition' : 'Publier la proposition au client'}</button></div>
      </form>}
    </div>
  </Panel>;
}
