// Shared HTTP boundary for the diagnostic proposal workflow. Domain operations
// are injected by each host; no client receives the internal workshop snapshot.
// The bounded public explanation and banking text may contain four-byte UTF-8.
export const REPAIR_PROPOSAL_BODY_LIMIT = 40 * 1024;
export class RepairProposalError extends Error {
  constructor(status, message) {super(message); this.status = status;}
}

function object(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some(key => !fields.includes(key))) {
    throw new RepairProposalError(400, 'Action de diagnostic invalide.');
  }
  return value;
}
function identifier(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,120}$/.test(value)) {
    throw new RepairProposalError(400, 'Référence de proposition invalide.');
  }
  return value;
}
export function proposalRepairId(value) {
  let id;
  try {id = decodeURIComponent(value);} catch {}
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(id || '')) throw new RepairProposalError(404, 'Dossier introuvable.');
  return id;
}
export function clientProposalRequest(body) {
  object(body, ['proposalId', 'action']);
  if (!['repair', 'return', 'buyback', 'declare-transfer'].includes(body.action)) {
    throw new RepairProposalError(400, 'Choix de diagnostic invalide.');
  }
  return {proposalId: identifier(body.proposalId), action: body.action};
}
export function adminProposalRequest(body) {
  object(body, ['revision', 'action', 'kind', 'description', 'repairAmount', 'buybackAmount', 'returnFee', 'bankInstructions', 'proposalId', 'tracking']);
  if (!Number.isSafeInteger(body.revision) || body.revision < 0 || body.revision >= 1e9) {
    throw new RepairProposalError(400, 'Révision invalide.');
  }
  if (body.action === 'publish') {
    object(body, ['revision', 'action', 'kind', 'description', 'repairAmount', 'buybackAmount', 'returnFee', 'bankInstructions']);
    return {revision: body.revision, action: body.action, input: {
      kind: body.kind, description: body.description, repairAmount: body.repairAmount,
      buybackAmount: body.buybackAmount, returnFee: body.returnFee, bankInstructions: body.bankInstructions,
    }};
  }
  if (!['confirm-return-payment', 'dispatch-return', 'complete-buyback'].includes(body.action)) {
    throw new RepairProposalError(400, 'Action de diagnostic invalide.');
  }
  object(body, ['revision', 'action', 'proposalId', ...(body.action === 'dispatch-return' ? ['tracking'] : [])]);
  if (body.action === 'dispatch-return' && (typeof body.tracking !== 'string' || body.tracking.length > 300)) {
    throw new RepairProposalError(400, 'Suivi du retour invalide.');
  }
  return {revision: body.revision, action: body.action, proposalId: identifier(body.proposalId), tracking: body.tracking};
}

export function assertProposalOwner(store, clientId, repairId) {
  const repair = store.repairs.find(item => item.id === repairId);
  const console = repair && store.consoles.find(item => item.id === repair.consoleId);
  if (!store.clients.some(item => item.id === clientId) || !console || console.clientId !== clientId) {
    throw new RepairProposalError(404, 'Dossier introuvable.');
  }
}
export function applyClientProposal(store, clientId, repairId, request, actions) {
  assertProposalOwner(store, clientId, repairId);
  try {
    return request.action === 'declare-transfer'
      ? actions.declareRepairReturnTransfer(store, repairId, request.proposalId)
      : actions.decideRepairProposal(store, repairId, request.proposalId, request.action);
  } catch (error) {throw new RepairProposalError(409, error.message);}
}
export function applyAdminProposal(store, repairId, request, actions) {
  if (!store.repairs.some(item => item.id === repairId)) throw new RepairProposalError(404, 'Dossier introuvable.');
  try {
    if (request.action === 'publish') return actions.publishRepairProposal(store, repairId, request.input);
    if (request.action === 'confirm-return-payment') return actions.confirmRepairReturnPayment(store, repairId, request.proposalId);
    if (request.action === 'dispatch-return') return actions.dispatchRepairReturn(store, repairId, request.proposalId, request.tracking);
    return actions.completeRepairBuyback(store, repairId, request.proposalId);
  } catch (error) {throw new RepairProposalError(409, error.message);}
}

const proposalKeys = ['id', 'kind', 'description', 'repairAmount', 'buybackAmount', 'returnFee', 'bankInstructions', 'publishedAt',
  'decision', 'decidedAt', 'transferDeclaredAt', 'returnPaidAt', 'returnedAt', 'tracking', 'buybackCompletedAt'];
const proposalValue = proposal => proposal === undefined ? undefined : JSON.stringify(proposalKeys.map(key => proposal?.[key]));
// Dedicated actions own the proposal and its client decision. A normal Store
// save may change other fields, but cannot create, replace or silently omit it.
export function assertProposalEditPreserved(before, after, mode) {
  if (mode !== 'edit') return;
  const previous = new Map(before.repairs.map(repair => [repair.id, repair]));
  const oldConsoles = new Map(before.consoles.map(console => [console.id, console]));
  const newConsoles = new Map(after.consoles.map(console => [console.id, console]));
  for (const repair of after.repairs) {
    const old = previous.get(repair.id);
    if (old?.proposal && (old.consoleId !== repair.consoleId
      || oldConsoles.get(old.consoleId)?.clientId !== newConsoles.get(repair.consoleId)?.clientId)) {
      throw new RepairProposalError(409, 'Une proposition de diagnostic reste liée à sa console et au client auquel elle a été présentée.');
    }
    if (proposalValue(old?.proposal) !== proposalValue(repair.proposal)) {
      throw new RepairProposalError(409, 'Utilisez les actions du diagnostic pour publier une proposition et traiter le choix du client. Rechargez les données si votre interface est ancienne.');
    }
    if (old?.publicRequestId && ['attente-envoi', 'reception', 'diagnostic'].includes(old.stage)
      && repair.payment && !(repair.proposal?.kind === 'repair' && repair.proposal.decision === 'repair')
      && (old.payment?.amount !== repair.payment.amount || old.payment?.paidAt !== repair.payment.paidAt)) {
      throw new RepairProposalError(409, 'Attendez l’accord du client sur la proposition avant d’enregistrer un règlement de réparation.');
    }
    if (old?.publicRequestId && ['attente-envoi', 'reception', 'diagnostic'].includes(old.stage)
      && (['attente-pieces', 'reparation', 'tests', 'terminee'].includes(repair.stage)
        || (old.stage === 'diagnostic' && ['irreparable', 'abandonnee'].includes(repair.stage)))
      && !(repair.proposal?.kind === 'repair' && repair.proposal.decision === 'repair')) {
      throw new RepairProposalError(409, 'Publiez le diagnostic et attendez l’accord du client avant de commencer la réparation.');
    }
  }
}

export function publicRepairProposal(proposal) {
  if (!proposal) return undefined;
  return {
    id: proposal.id, kind: proposal.kind, description: proposal.description,
    repairAmount: proposal.repairAmount, buybackAmount: proposal.buybackAmount, returnFee: proposal.returnFee,
    bankInstructions: proposal.decision === 'return' && proposal.returnFee > 0 ? proposal.bankInstructions : '',
    publishedAt: proposal.publishedAt, decision: proposal.decision, decidedAt: proposal.decidedAt,
    transferDeclaredAt: proposal.transferDeclaredAt, returnPaidAt: proposal.returnPaidAt,
    returnedAt: proposal.returnedAt, tracking: proposal.tracking, buybackCompletedAt: proposal.buybackCompletedAt,
  };
}
