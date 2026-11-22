import React, {useEffect, useId, useState} from 'react';
import {dateFmt, money, type RepairProposal, type Stage} from './domain';
import {Icon, Modal} from './ui';
import {LEGAL_VERSION} from './legal-content.mjs';
import type {ProposalReceiptKind} from './legal-receipts';
import './repair-proposal-client.css';

export type ProposalClientAction = 'repair' | 'return' | 'buyback' | 'declare-transfer' | 'withdraw';
export type ProposalLegalConsent = {version: string; accepted: true; earlyStartRequested: boolean; earlyStartAcknowledged: boolean};
export type ProposalFeedback = {repairId: string; message: string; error: string};
type ProposalStatus = {label: string; tone: string; icon: string; title: string; text: string};

export function proposalClientStatus(proposal: RepairProposal | undefined, stage: Stage): ProposalStatus | null {
  if (!proposal) return null;
  if (proposal.withdrawal) return {label: 'Rétractation enregistrée', tone: 'amber', icon: 'note', title: 'Votre rétractation est enregistrée', text: 'Votre déclaration a été reçue. Conservez votre accusé et contactez le magasin pour organiser les suites et tout remboursement légalement dû.'};
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
  if (proposal.decision === 'repair' && stage === 'diagnostic') return {label: 'Devis accepté', tone: 'green', icon: 'check', title: 'Vous avez accepté la réparation', text: proposal.legal?.earlyStartRequested === false ? 'Votre accord est enregistré. Vous n’avez pas demandé de commencement avant la fin du délai de rétractation.' : 'Votre accord est enregistré. L’atelier confirme le planning de l’intervention.'};
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

export function RepairProposalClient({repairId, repairCode, proposal, stage, busy, disabled, feedback, onAction, onDownload, requireLegal = true}: {
  repairId: string; repairCode: string; proposal: RepairProposal; stage: Stage; busy: boolean; disabled: boolean;
  feedback: ProposalFeedback; onAction: (repairId: string, proposalId: string, action: ProposalClientAction, legal?: ProposalLegalConsent) => Promise<boolean>; requireLegal?: boolean;
  onDownload: (repairId: string, proposalId: string, kind: ProposalReceiptKind) => Promise<boolean>;
}) {
  const [confirmation, setConfirmation] = useState<ProposalClientAction | null>(null), [acknowledged, setAcknowledged] = useState(false);
  const [earlyStart, setEarlyStart] = useState(false), [earlyAcknowledged, setEarlyAcknowledged] = useState(false), [documentError, setDocumentError] = useState('');
  const headingId = useId();
  useEffect(() => {setConfirmation(null); setAcknowledged(false); setEarlyStart(false); setEarlyAcknowledged(false); setDocumentError('');}, [proposal.id, proposal.decision, proposal.withdrawal?.id]);
  const status = proposalClientStatus(proposal, stage);
  const pending = proposal.decision === 'pending';
  const repairable = proposal.kind === 'repair';
  const ownFeedback = feedback.repairId === repairId;
  const confirmCopy = confirmation === 'repair'
    ? {title: 'Accepter ce devis ?', text: `Vous commandez l’intervention décrite pour ${money(proposal.repairAmount!)} TTC, pièces comprises.${proposal.repairAmount! > 0 ? ' Votre accord vous engage au paiement de ce montant. Le règlement sera organisé avec le magasin.' : ' Cette réparation est offerte.'}`, acknowledgement: requireLegal ? 'J’ai lu le devis et les CGV et je les accepte.' : 'J’ai lu la proposition et j’accepte ce prix.', button: proposal.repairAmount! > 0 ? 'Accepter le devis avec obligation de paiement' : 'Accepter le devis gratuit'}
    : confirmation === 'withdraw'
      ? {title: 'Confirmer votre rétractation ?', text: `Vous notifiez à Maxxi Games votre rétractation du contrat de réparation ${repairCode}, accepté le ${dateFmt(proposal.decidedAt)} pour ${money(proposal.repairAmount!)} TTC. Votre déclaration sera enregistrée avec sa date et son heure, et un accusé téléchargeable vous sera remis. Les suites financières et le retour seront organisés avec le magasin.`, acknowledgement: 'Je confirme vouloir me rétracter de ce contrat de réparation.', button: 'Confirmer ma rétractation'}
    : confirmation === 'buyback'
      ? {title: 'Accepter le rachat pour pièces ?', text: `Vous acceptez l’offre de rachat de votre console pour ${money(proposal.buybackAmount!)}. Le magasin vous contactera pour finaliser le rachat et son règlement. Votre console ne sera pas renvoyée.`, acknowledgement: 'J’accepte cette offre de rachat pour pièces.', button: 'Confirmer le rachat'}
      : confirmation === 'declare-transfer'
        ? {title: 'Signaler votre virement ?', text: `Confirmez avoir effectué le virement de ${money(proposal.returnFee)} avec la référence ${repairCode}. Le magasin vérifiera sa réception ; cette déclaration ne vaut pas confirmation de paiement.`, acknowledgement: 'J’ai effectué ce virement.', button: 'Signaler mon virement'}
        : {title: repairable ? 'Refuser la réparation et demander le retour ?' : 'Demander le retour de votre console ?', text: `${repairable ? 'La réparation ne sera pas réalisée. ' : ''}${proposal.returnFee === 0 ? 'Le retour est sans frais.' : `Vous devrez régler ${money(proposal.returnFee)} de frais de retour par virement avant l’expédition.`} Votre choix sera transmis au magasin.`, acknowledgement: repairable ? 'Je refuse la réparation et je demande le retour.' : 'Je demande le retour de ma console.', button: 'Confirmer le retour'};
  const ask = (action: ProposalClientAction) => {setAcknowledged(false); setEarlyStart(false); setEarlyAcknowledged(false); setConfirmation(action);};
  async function download(kind: ProposalReceiptKind) {
    if (disabled) return;
    if (await onDownload(repairId, proposal.id, kind)) setDocumentError('');
    else setDocumentError('Le téléchargement n’a pas démarré. Réessayez ou reconnectez-vous ; votre enregistrement est conservé.');
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmation || !acknowledged || disabled || confirmation === 'repair' && requireLegal && earlyStart && !earlyAcknowledged) return;
    const legal: ProposalLegalConsent | undefined = confirmation === 'repair' && requireLegal
      ? {version: LEGAL_VERSION, accepted: true, earlyStartRequested: earlyStart, earlyStartAcknowledged: earlyStart && earlyAcknowledged} : undefined;
    if (await onAction(repairId, proposal.id, confirmation, legal)) {setConfirmation(null); setAcknowledged(false);}
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
    {proposal.decision === 'repair' && <>
      <p className="portal-proposal-confirmed"><Icon name="check" size={17}/>Accord enregistré le {dateFmt(proposal.decidedAt)} pour {money(proposal.repairAmount!)} TTC. Le paiement n’est pas exécuté automatiquement.</p>
      {requireLegal && <div className="portal-contract-documents">
        {proposal.legal && <section><h3>Votre confirmation de contrat</h3><p>CGV acceptées : version {proposal.legal.version}. {proposal.legal.earlyStartRequested ? 'Vous avez demandé un commencement avant la fin du délai de rétractation.' : 'Vous n’avez pas demandé de commencement anticipé.'}</p><button type="button" className="btn secondary" disabled={disabled} onClick={() => void download('contract')}><Icon name="download" size={16}/>Télécharger ma confirmation et les CGV</button></section>}
        <section><h3>{proposal.withdrawal ? 'Votre accusé de rétractation' : 'Votre droit de rétractation'}</h3>{proposal.withdrawal ? <><p>Déclaration reçue le {dateFmt(proposal.withdrawal.requestedAt, true)}. Cet enregistrement ne déclenche aucun remboursement automatique ; le magasin doit organiser les suites et tout remboursement dû.</p><button type="button" className="btn secondary" disabled={disabled} onClick={() => void download('withdrawal')}><Icon name="download" size={16}/>Télécharger mon accusé de réception</button></> : <><p>Un contrat de réparation conclu à distance bénéficie en principe d’un délai de rétractation de 14 jours. Le commencement de l’intervention ne supprime pas ce droit à lui seul.</p><a href="#/cgv" target="_blank" rel="noopener noreferrer">Consulter les modalités des CGV</a><button type="button" className="btn secondary" disabled={disabled} onClick={() => ask('withdraw')}>Exercer mon droit de rétractation</button></>}</section>
      </div>}
    </>}
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
    {busy && <p className="portal-proposal-feedback" role="status">Traitement en cours…</p>}
    {documentError && <p className="portal-proposal-feedback error" role="alert">{documentError}</p>}
    {confirmation && <Modal title={confirmCopy.title} subtitle={repairCode} onClose={() => {if (!busy) setConfirmation(null);}}><form className="portal-proposal-confirmation" onSubmit={event => void submit(event)}><div className="modal-body"><p>{confirmCopy.text}</p>
      {confirmation === 'repair' && requireLegal && <div className="portal-contract-terms"><a href="#/cgv" target="_blank" rel="noopener noreferrer">Lire les CGV — version {LEGAL_VERSION} (nouvel onglet)</a><p>Vous disposez en principe de 14 jours pour vous rétracter à compter de cet accord. La confirmation, les conditions acceptées et le formulaire de rétractation seront téléchargeables et conservés dans votre dossier.</p></div>}
      <label><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} required disabled={busy}/><span>{confirmCopy.acknowledgement}</span></label>
      {confirmation === 'repair' && requireLegal && <fieldset className="portal-contract-early"><legend>Quand commencer l’intervention ?</legend><p>Sans demande ci-dessous, l’atelier attendra la fin du délai de rétractation.</p><label><input type="checkbox" checked={earlyStart} onChange={event => {setEarlyStart(event.target.checked); setEarlyAcknowledged(false);}} disabled={busy}/><span>Je demande expressément que la réparation puisse commencer avant la fin du délai de rétractation. <small>Facultatif</small></span></label>{earlyStart && <label><input type="checkbox" checked={earlyAcknowledged} onChange={event => setEarlyAcknowledged(event.target.checked)} required disabled={busy}/><span>Je reconnais que mon droit de rétractation disparaîtra seulement lorsque la prestation aura été pleinement exécutée. Si je me rétracte auparavant, seule la part légalement due du service réalisé peut être demandée.</span></label>}</fieldset>}
      {ownFeedback && feedback.error && <p className="portal-proposal-feedback error" role="alert">{feedback.error}</p>}</div><div className="modal-footer"><button type="button" className="btn secondary" disabled={busy} onClick={() => setConfirmation(null)}>Annuler</button><button type="submit" className="btn primary" disabled={!acknowledged || disabled || confirmation === 'repair' && requireLegal && earlyStart && !earlyAcknowledged}>{busy ? 'Enregistrement…' : confirmCopy.button}</button></div></form></Modal>}
  </section>;
}
