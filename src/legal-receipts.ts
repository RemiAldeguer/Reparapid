import type {RepairProposal} from './domain';

export type ProposalReceiptKind = 'contract' | 'withdrawal';
const amount = (value: number) => new Intl.NumberFormat('fr-FR', {style: 'currency', currency: 'EUR'}).format(value);
const timestamp = (value: string) => `${new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long', timeStyle: 'long', timeZone: 'Europe/Paris',
}).format(new Date(value))} — ${value}`;

/** Uses the immutable server record, never the currently published terms. */
export function proposalReceiptText(repairCode: string, proposal: RepairProposal, kind: ProposalReceiptKind): string {
  if (kind === 'withdrawal') {
    const record = proposal.withdrawal;
    if (!record) throw Error('L’accusé de rétractation n’est pas encore enregistré.');
    return [
      'RÉPARAPID — MAXXI GAMES / VESTY GAMES 3', 'ACCUSÉ DE RÉCEPTION DE RÉTRACTATION', '',
      `Dossier : ${repairCode}`, `Proposition : ${proposal.id}`, `Référence de la déclaration : ${record.id}`,
      `Déclaration enregistrée le : ${timestamp(record.requestedAt)}`,
      `Client : ${record.customerName}`, `Adresse de contact : ${record.customerEmail || 'Non renseignée'}`,
      '', 'CONTENU DE LA DÉCLARATION REÇUE', record.statement, '',
      'Cette déclaration est enregistrée auprès de Maxxi Games. Conservez cet accusé sur votre appareil.',
      'Les suites et tout remboursement légalement dû seront organisés avec le magasin ; cet accusé ne déclenche aucun remboursement automatique.',
    ].join('\n');
  }
  const record = proposal.legal;
  if (!record || proposal.decision !== 'repair' || proposal.repairAmount === null) throw Error('La confirmation du contrat n’est pas encore enregistrée.');
  return [
    'RÉPARAPID — CONFIRMATION DU CONTRAT DE RÉPARATION', '',
    `Dossier : ${repairCode}`, `Proposition : ${proposal.id}`,
    `Accord enregistré le : ${timestamp(record.acceptedAt)}`,
    `Client au moment de l’accord : ${record.customerName}`,
    `Adresse de contact au moment de l’accord : ${record.customerEmail || 'Non renseignée'}`,
    '', 'INTERVENTION ACCEPTÉE', proposal.description,
    `Prix total accepté : ${amount(proposal.repairAmount)} TTC, pièces incluses.`,
    `Frais de retour annoncés dans la proposition : ${amount(proposal.returnFee)} TTC. Leur éventuelle exigibilité dépend du choix et des règles applicables.`,
    '', `Version des CGV acceptée : ${record.version}`,
    `Commencement avant la fin du délai de rétractation : ${record.earlyStartRequested ? 'demandé expressément' : 'non demandé'}.`,
    ...(record.earlyStartRequested ? ['Le client a reconnu que son droit de rétractation disparaîtra seulement lorsque la prestation aura été pleinement exécutée.'] : []),
    'Cet accord n’exécute aucun paiement bancaire automatique.', '',
    'CONDITIONS GÉNÉRALES DE VENTE REMISES LORS DE L’ACCORD', record.document,
  ].join('\n');
}

export function downloadProposalReceipt(repairCode: string, proposal: RepairProposal, kind: ProposalReceiptKind): void {
  const text = proposalReceiptText(repairCode, proposal, kind);
  const url = URL.createObjectURL(new Blob(['\uFEFF', text], {type: 'text/plain;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = `reparapid-${repairCode.replace(/[^a-zA-Z0-9_-]/g, '-')}-${kind === 'contract' ? 'confirmation' : 'retractation'}.txt`;
  document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
