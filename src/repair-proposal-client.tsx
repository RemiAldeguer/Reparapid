import React, {useEffect, useId, useState} from 'react';
import {dateFmt, money, type RepairProposal, type Stage} from './domain';
import {Icon, Modal} from './ui';
import './repair-proposal-client.css';

export type ProposalClientAction = 'repair' | 'return' | 'buyback' | 'declare-transfer';
export type ProposalFeedback = {repairId: string; message: string; error: string};
type ProposalStatus = {label: string; tone: string; icon: string; title: string; text: string};

export function proposalClientStatus(proposal: RepairProposal | undefined, stage: Stage): ProposalStatus | null {
  if (!proposal) return null;
  if (proposal.decision === 'pending') return {label: 'Votre réponse est attendue', tone: 'amber', icon: 'note', title: 'Le diagnostic est terminé', text: 'Lisez la proposition de l’atelier et choisissez la suite pour votre console.'};
  if (proposal.decision === 'return') {
    if (proposal.returnedAt) return {label: 'Retour expédié', tone: 'green', icon: 'package', title: 'Votre console a été expédiée', text: 'Le magasin a confirmé l’expédition de votre console.'};
    if (proposal.returnPaidAt || proposal.returnFee === 0) return {label: 'Retour en préparation', tone: 'blue', icon: 'package', title: 'Le magasin prépare votre retour', text: proposal.returnFee === 0 ? 'Aucun frais de retour à régler. Le magasin confirmera l’expédition ici.' : 'Le magasin a confirmé la réception du virement. Il peut préparer le retour de votre console.'};
    if (proposal.transferDeclaredAt) return {label: 'Virement à vérifier', tone: 'amber', icon: 'clock', title: 'Votre virement est signalé', text: 'Le magasin doit encore vérifier sa réception avant de préparer le retour.'};
    return {label: 'Frais de retour à régler', tone: 'amber', icon: 'euro', title: 'Réglez les frais de retour', text: 'Effectuez le virement demandé pour permettre au magasin de vous renvoyer la console.'};
  }
  if (proposal.decision === 'buyback') return proposal.buybackCompletedAt
    ? {label: 'Rachat finalisé', tone: 'green', icon: 'check', title: 'Le magasin a finalisé le rachat', text: 'La finalisation du rachat pour pièces a été confirmée par le magasin.'}
    : {label: 'Rachat accepté', tone: 'purple', icon: 'check', title: 'Votre accord de rachat est enregistré', text: 'Le magasin vous contactera pour finaliser le rachat pour pièces et son règlement.'};
  if (proposal.decision === 'repair' && stage === 'diagnostic') return {label: 'Devis accepté', tone: 'green', icon: 'check', title: 'Vous avez accepté la réparation', text: 'Votre accord est enregistré. Le magasin peut maintenant lancer l’intervention.'};
  return null;
}

export function proposalNeedsFollowUp(proposal: RepairProposal | undefined) {
  return !!proposal && (proposal.decision === 'pending' || proposal.decision === 'return' && !proposal.returnedAt || proposal.decision === 'buyback' && !proposal.buybackCompletedAt);
}

export function ProposalOutcomeJourney({proposal}: {proposal: RepairProposal}) {
  const returning = proposal.decision === 'return';
  const paymentReady = proposal.returnFee === 0 || !!proposal.returnPaidAt;
  const finished = returning ? !!proposal.returnedAt : !!proposal.buybackCompletedAt;
  const steps = [
    {title: 'Diagnostic terminé', text: proposal.kind === 'repair' ? 'La réparation a été proposée.' : 'La console ne peut pas être réparée.', done: true, icon: 'stethoscope'},
    {title: returning ? 'Retour demandé' : 'Rachat accepté', text: 'Votre choix est enregistré.', done: true, icon: 'check'},
    ...(returning && proposal.returnFee > 0 ? [{title: 'Frais de retour', text: paymentReady ? 'Virement reçu par le magasin.' : proposal.transferDeclaredAt ? 'Virement signalé, réception à vérifier.' : 'Virement à effectuer.', done: paymentReady, icon: 'euro'}] : []),
    {title: returning ? 'Retour expédié' : 'Rachat finalisé', text: finished ? 'Confirmé par le magasin.' : returning ? 'Le magasin prépare l’expédition.' : 'À finaliser avec le magasin.', done: finished, icon: returning ? 'package' : 'check'},
  ];
  const current = steps.findIndex(step => !step.done);
  return <ol className="portal-proposal-journey" aria-label={returning ? 'Étapes du retour de votre console' : 'Étapes du rachat pour pièces'}>{steps.map((step, index) => <li key={step.title} className={step.done ? 'is-past' : index === current ? 'is-current' : 'is-future'} aria-current={index === current ? 'step' : undefined}><span aria-hidden="true"><Icon name={step.done ? 'check' : step.icon} size={19}/></span><div><strong>{step.title}</strong><p>{step.text}</p></div></li>)}</ol>;
}

export function RepairProposalClient({repairId, repairCode, proposal, stage, busy, disabled, feedback, onAction}: {
  repairId: string; repairCode: string; proposal: RepairProposal; stage: Stage; busy: boolean; disabled: boolean;
  feedback: ProposalFeedback; onAction: (repairId: string, proposalId: string, action: ProposalClientAction) => Promise<boolean>;
}) {
  const [confirmation, setConfirmation] = useState<ProposalClientAction | null>(null), [acknowledged, setAcknowledged] = useState(false);
  const headingId = useId();
  useEffect(() => {setConfirmation(null); setAcknowledged(false);}, [proposal.id, proposal.decision]);
  const status = proposalClientStatus(proposal, stage);
  const pending = proposal.decision === 'pending';
  const repairable = proposal.kind === 'repair';
  const ownFeedback = feedback.repairId === repairId;
  const confirmCopy = confirmation === 'repair'
    ? {title: 'Accepter cette réparation ?', text: `Vous autorisez l’atelier à réaliser l’intervention décrite pour ${money(proposal.repairAmount!)} TTC.`, acknowledgement: 'J’ai lu la proposition et j’accepte ce prix.', button: 'Confirmer mon accord'}
    : confirmation === 'buyback'
      ? {title: 'Accepter le rachat pour pièces ?', text: `Vous acceptez l’offre de rachat de votre console pour ${money(proposal.buybackAmount!)}. Le magasin vous contactera pour finaliser le rachat et son règlement. Votre console ne sera pas renvoyée.`, acknowledgement: 'J’accepte cette offre de rachat pour pièces.', button: 'Confirmer le rachat'}
      : confirmation === 'declare-transfer'
        ? {title: 'Signaler votre virement ?', text: `Confirmez avoir effectué le virement de ${money(proposal.returnFee)} avec la référence ${repairCode}. Le magasin vérifiera sa réception ; cette déclaration ne vaut pas confirmation de paiement.`, acknowledgement: 'J’ai effectué ce virement.', button: 'Signaler mon virement'}
        : {title: repairable ? 'Refuser la réparation et demander le retour ?' : 'Demander le retour de votre console ?', text: `${repairable ? 'La réparation ne sera pas réalisée. ' : ''}${proposal.returnFee === 0 ? 'Le retour est sans frais.' : `Vous devrez régler ${money(proposal.returnFee)} de frais de retour par virement avant l’expédition.`} Votre choix sera transmis au magasin.`, acknowledgement: repairable ? 'Je refuse la réparation et je demande le retour.' : 'Je demande le retour de ma console.', button: 'Confirmer le retour'};
  const ask = (action: ProposalClientAction) => {setAcknowledged(false); setConfirmation(action);};
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmation || !acknowledged || disabled) return;
    if (await onAction(repairId, proposal.id, confirmation)) {setConfirmation(null); setAcknowledged(false);}
  }
  return <section className="portal-proposal" aria-labelledby={headingId} aria-busy={busy}>
    <div className="portal-proposal-heading"><span className="portal-proposal-symbol" aria-hidden="true"><Icon name={status?.icon || 'check'} size={23}/></span><div><span className="portal-section-label">APRÈS LE DIAGNOSTIC</span><h2 id={headingId}>{status?.title || 'Votre réparation a été acceptée'}</h2></div></div>
    {status && <p className="portal-proposal-intro">{status.text}</p>}
    <div className="portal-proposal-description"><span>{repairable ? 'Réparation proposée par le magasin' : 'Conclusion du magasin'}</span><p className="prewrap">{proposal.description}</p><small>Proposition du {dateFmt(proposal.publishedAt)}.</small></div>
    {repairable && <div className="portal-proposal-price"><span>{proposal.decision === 'repair' ? 'Devis accepté' : proposal.decision === 'return' ? 'Devis refusé' : 'Prix de la réparation'}<small>Montant TTC, pièces incluses</small></span><strong>{money(proposal.repairAmount!)}</strong></div>}
    {pending && <>
      <div className="portal-proposal-choices">
        {repairable ? <button type="button" className="btn primary" disabled={disabled} onClick={() => ask('repair')}><Icon name="check" size={17}/>Accepter la réparation</button> : proposal.buybackAmount !== null && <div className="portal-proposal-buyback"><div><span>Offre de rachat pour pièces</span><strong>{money(proposal.buybackAmount)}</strong></div><p>Le magasin vous propose de conserver votre console en l’achetant pour pièces.</p><button type="button" className="btn primary" disabled={disabled} onClick={() => ask('buyback')}><Icon name="check" size={17}/>Accepter le rachat pour pièces</button></div>}
        <div className="portal-proposal-return-choice"><div><span>Retour de votre console</span><strong>{proposal.returnFee === 0 ? 'Sans frais' : money(proposal.returnFee)}</strong></div><p>{proposal.returnFee === 0 ? 'Aucun règlement demandé pour ce retour.' : 'Frais fixés pour votre dossier, à régler par virement avant le retour.'}</p><button type="button" className="btn secondary" disabled={disabled} onClick={() => ask('return')}><Icon name="package" size={17}/>{repairable ? 'Refuser et demander le retour' : 'Demander le retour'}</button></div>
      </div><p className="portal-proposal-choice-note">Votre choix vous sera demandé une dernière fois avant son enregistrement.</p>
    </>}
    {proposal.decision === 'repair' && <p className="portal-proposal-confirmed"><Icon name="check" size={17}/>Accord enregistré le {dateFmt(proposal.decidedAt)}. Aucun paiement de réparation n’est déclenché par ce bouton.</p>}
    {proposal.decision === 'return' && <div className="portal-proposal-transfer">
      <div className="portal-proposal-price"><span>Frais de retour<small>{proposal.returnFee === 0 ? 'Retour sans frais' : 'Règlement par virement'}</small></span><strong>{money(proposal.returnFee)}</strong></div>
      {proposal.returnedAt ? <><p className="portal-proposal-confirmed"><Icon name="check" size={17}/>Expédition confirmée le {dateFmt(proposal.returnedAt)}.</p>{proposal.tracking && <div className="portal-proposal-bank"><span>Suivi communiqué par le magasin</span><p className="prewrap">{proposal.tracking}</p></div>}</> : proposal.returnFee === 0 ? <p>Aucun virement n’est nécessaire. Le magasin confirmera l’expédition ici.</p> : proposal.returnPaidAt ? <p className="portal-proposal-confirmed"><Icon name="check" size={17}/>Réception du virement confirmée par le magasin le {dateFmt(proposal.returnPaidAt)}.</p> : <>
        <div className="portal-proposal-bank"><span>Coordonnées et consignes du magasin</span>{proposal.bankInstructions ? <p className="prewrap">{proposal.bankInstructions}</p> : <p>Contactez le magasin pour obtenir ses coordonnées bancaires avant d’effectuer votre virement.</p>}<dl><dt>Montant à virer</dt><dd>{money(proposal.returnFee)}</dd><dt>Référence à indiquer</dt><dd className="mono">{repairCode}</dd></dl></div>
        {proposal.transferDeclaredAt ? <p className="portal-proposal-pending"><Icon name="clock" size={17}/>Virement signalé le {dateFmt(proposal.transferDeclaredAt)}. Sa réception reste à vérifier par le magasin.</p> : <><p>Après avoir effectué votre virement, signalez-le au magasin.</p><button type="button" className="btn primary" disabled={disabled} onClick={() => ask('declare-transfer')}><Icon name="check" size={17}/>J’ai effectué le virement</button></>}
      </>}
    </div>}
    {proposal.decision === 'buyback' && <div className="portal-proposal-buyback-result"><div className="portal-proposal-price"><span>Offre de rachat acceptée</span><strong>{money(proposal.buybackAmount!)}</strong></div><p>Accord enregistré le {dateFmt(proposal.decidedAt)}. {proposal.buybackCompletedAt ? `Rachat finalisé par le magasin le ${dateFmt(proposal.buybackCompletedAt)}.` : 'Le rachat et son règlement restent à finaliser avec le magasin.'}</p></div>}
    {ownFeedback && feedback.message && <p className="portal-proposal-feedback success" role="status"><Icon name="check" size={17}/>{feedback.message}</p>}
    {ownFeedback && feedback.error && <p className="portal-proposal-feedback error" role="alert"><Icon name="alert" size={17}/>{feedback.error}</p>}
    {busy && <p className="portal-proposal-feedback" role="status">Enregistrement de votre réponse…</p>}
    {confirmation && <Modal title={confirmCopy.title} subtitle={repairCode} onClose={() => {if (!busy) setConfirmation(null);}}><form className="portal-proposal-confirmation" onSubmit={event => void submit(event)}><div className="modal-body"><p>{confirmCopy.text}</p><label><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} required disabled={busy}/><span>{confirmCopy.acknowledgement}</span></label>{ownFeedback && feedback.error && <p className="portal-proposal-feedback error" role="alert">{feedback.error}</p>}</div><div className="modal-footer"><button type="button" className="btn secondary" disabled={busy} onClick={() => setConfirmation(null)}>Annuler</button><button type="submit" className="btn primary" disabled={!acknowledged || disabled}>{busy ? 'Enregistrement…' : confirmCopy.button}</button></div></form></Modal>}
  </section>;
}
