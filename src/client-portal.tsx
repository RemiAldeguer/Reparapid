import React, {useEffect, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import {dateFmt, stageInfo, CLIENT_PART_STATUSES, type ClientPartRequest, type ConsoleState, type Stage} from './domain';
import {Badge, ConsoleArt, Empty, Icon, Logo, Modal, StageBadge, StateBadge} from './ui';
import {createSessionEpoch, observeSessionPrivacy, type SessionTicket} from './session-privacy';
import {clientApi, ClientApiError, type ClientSession} from './client-api';
import {StorefrontShell} from './public-home';
import {ShippingDocument, type ShippingSheet} from './client-shipping-sheet';
import {ShippingProcessDiagram} from './shipping-process-diagram';
import './repair-intake.css';
import './client-portal.css';

type PortalConsole = {id: string; code: string; brand: string; model: string; variant: string; serial: string; state: ConsoleState; accessories: string};
type PortalClientPart = Pick<ClientPartRequest, 'id' | 'name' | 'quantity' | 'note' | 'status'>;
type PortalRepair = {id: string; code: string; consoleId: string; title: string; symptoms: string; stage: Stage; dueDate: string; createdAt: string; updatedAt: string; completedAt: string; totalCost: number | null; intakeSubmitted?: boolean; clientParts?: PortalClientPart[]};
type PortalData = {client: {name: string}; workshop: {name: string}; consoles: PortalConsole[]; repairs: PortalRepair[]};
const ShippingContext = React.createContext<{onOpen: (repairId: string) => void; busy: boolean} | null>(null);

const consoleName = (item: {brand: string; model: string}) => item.brand === 'Autre' || item.model.toLocaleLowerCase('fr').startsWith(item.brand.toLocaleLowerCase('fr')) ? item.model : `${item.brand} ${item.model}`;
const closedStages = new Set<Stage>(['terminee', 'irreparable', 'abandonnee']);
const isOpenRepair = (repair: PortalRepair) => !closedStages.has(repair.stage);
const stageDescriptions: Record<Stage, string> = {
  'attente-envoi': 'Votre demande est enregistrée. Préparez votre colis ; l’atelier confirmera sa réception dans cet espace.',
  reception: 'L’atelier a réceptionné votre console. Elle va pouvoir être examinée.',
  diagnostic: 'L’atelier recherche l’origine de la panne et précise l’intervention nécessaire.',
  'attente-pieces': 'L’atelier attend les pièces nécessaires à l’intervention.',
  reparation: 'L’atelier intervient sur votre console.',
  tests: 'L’atelier vérifie le bon fonctionnement de votre console après l’intervention.',
  terminee: 'La réparation de votre console est terminée.',
  irreparable: 'L’atelier a clôturé ce dossier comme irréparable. Contactez-le pour organiser la suite.',
  abandonnee: 'Ce dossier est clôturé. Contactez l’atelier si vous avez une question.',
};
const expectedActions: Record<Stage, {title: string; text: string}> = {
  'attente-envoi': {title: 'À vous de préparer l’envoi', text: 'Imprimez la fiche, découpez le talon à conserver, puis glissez la partie atelier dans le colis avec votre console.'},
  reception: {title: 'Votre console est à l’atelier', text: 'Vous n’avez rien à envoyer de plus pour le moment. Retrouvez ici la prochaine mise à jour du dossier.'},
  diagnostic: {title: 'Le diagnostic est en cours', text: 'L’atelier vous précisera la réparation et son montant. Vous pouvez le contacter si vous souhaitez ajouter une information.'},
  'attente-pieces': {title: 'La suite dépend des pièces', text: 'Le suivi sera mis à jour lorsque l’atelier pourra reprendre l’intervention.'},
  reparation: {title: 'L’atelier s’occupe de votre console', text: 'La prochaine étape est la vérification de son fonctionnement.'},
  tests: {title: 'Dernières vérifications', text: 'Attendez la confirmation de l’atelier avant d’organiser le retrait ou le retour de votre console.'},
  terminee: {title: 'Organisez le retrait ou le retour', text: 'Contactez l’atelier pour convenir de la récupération de votre console.'},
  irreparable: {title: 'Contactez l’atelier', text: 'Convenez ensemble de la récupération de votre console et des suites de ce dossier.'},
  abandonnee: {title: 'Un point sur votre dossier ?', text: 'L’atelier reste votre interlocuteur pour toute question sur cette clôture.'},
};
const money = (amount: number | null) => amount === null ? 'À confirmer après diagnostic' : new Intl.NumberFormat('fr-FR', {style: 'currency', currency: 'EUR'}).format(amount);
const partOrder = {'en-attente': 0, disponible: 1, livree: 2, installee: 3};
const sortedParts = (parts: PortalClientPart[]) => [...parts].sort((a, b) => partOrder[a.status] - partOrder[b.status] || a.name.localeCompare(b.name, 'fr'));
const partTone = (status: PortalClientPart['status']) => status === 'installee' ? 'green' : status === 'livree' ? 'blue' : status === 'disponible' ? 'teal' : 'amber';
const partLabel = (status: PortalClientPart['status']) => status === 'en-attente' ? 'À fournir' : CLIENT_PART_STATUSES[status];
const quantityFor = (repairs: PortalRepair[], status?: PortalClientPart['status']) => repairs.reduce((sum, repair) => sum + (repair.clientParts || []).reduce((quantity, part) => quantity + (!status || part.status === status ? part.quantity : 0), 0), 0);
function jumpTo(id: string) {
  const target = document.getElementById(id);
  target?.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'});
  target?.focus({preventScroll: true});
}
function PortalRepairStage({repair}: {repair: PortalRepair}) {
  return repair.intakeSubmitted && repair.stage === 'terminee' ? <Badge tone="green">Prête à récupérer</Badge> : <StageBadge stage={repair.stage}/>;
}
function RepairJourney({repair}: {repair: PortalRepair}) {
  if (repair.stage === 'irreparable' || repair.stage === 'abandonnee') return <div className="portal-closed-journey"><Icon name="archive" size={19}/><span>Dossier clôturé · {stageInfo(repair.stage).short}</span></div>;
  const steps: {stage: Stage; label: string; text: string; icon: string}[] = [
    ...(repair.intakeSubmitted || repair.stage === 'attente-envoi' ? [{stage: 'attente-envoi' as Stage, label: 'Préparer et envoyer', text: 'Votre fiche accompagne la console.', icon: 'package'}] : []),
    {stage: 'reception', label: 'Réception à l’atelier', text: 'Le magasin confirme l’arrivée de la console.', icon: 'inbox'},
    {stage: 'diagnostic', label: 'Diagnostic', text: 'La panne et l’intervention sont précisées.', icon: 'stethoscope'},
    ...(repair.stage === 'attente-pieces' ? [{stage: 'attente-pieces' as Stage, label: 'Attente des pièces', text: 'Les pièces nécessaires sont attendues.', icon: 'package'}] : []),
    {stage: 'reparation', label: 'Réparation', text: 'L’atelier réalise l’intervention.', icon: 'wrench'},
    {stage: 'tests', label: 'Vérifications', text: 'Le fonctionnement est contrôlé.', icon: 'checklist'},
    {stage: 'terminee', label: repair.intakeSubmitted ? 'Prête à récupérer' : 'Réparation terminée', text: 'Le retrait ou le retour se convient avec l’atelier.', icon: 'check'},
  ];
  const currentStep = steps.findIndex(step => step.stage === repair.stage);
  return <ol className="portal-journey" aria-label="Étapes de la réparation">{steps.map((step, index) => <li key={step.stage} className={index < currentStep ? 'is-past' : index === currentStep ? 'is-current' : 'is-future'} aria-current={index === currentStep ? 'step' : undefined}><span className="portal-journey-icon"><Icon name={index < currentStep ? 'check' : step.icon} size={18}/></span><div><strong>{step.label}</strong><p>{step.text}</p>{index === currentStep && <small>Étape actuelle</small>}</div></li>)}</ol>;
}
type PartFeedback = {message: string; error: string};
type PartActions = {busyKey: string; refreshing: boolean; feedback: PartFeedback; onAvailable: (repairId: string, part: PortalClientPart) => void};
const PartActionsContext = React.createContext<PartActions | null>(null);
function AvailabilityFeedback() {
  const actions = React.useContext(PartActionsContext);
  if (!actions) return null;
  return <>{actions.feedback.message && <p className="portal-availability-notice" role="status"><Icon name="check" size={18}/>{actions.feedback.message}</p>}{actions.feedback.error && <p className="portal-availability-error" role="alert"><Icon name="alert" size={18}/>{actions.feedback.error}</p>}</>;
}
function PartLine({part, repairId}: {part: PortalClientPart; repairId: string}) {
  const actions = React.useContext(PartActionsContext);
  const key = `${repairId}:${part.id}`, working = actions?.busyKey === key;
  return <li className={`portal-part-line ${part.status}`}><span className="portal-part-quantity">{part.quantity} ×</span><div className="portal-part-copy"><strong>{part.name}</strong>{part.note && <p className="prewrap">{part.note}</p>}{part.status === 'disponible' && <p className="portal-part-available-description"><Icon name="check" size={14}/>{part.quantity === 1 ? 'Vous avez la pièce. Sa livraison reste à confirmer.' : 'Vous avez ces pièces. Leur livraison reste à confirmer.'}</p>}</div><div className="portal-part-state"><Badge tone={partTone(part.status)}>{partLabel(part.status)}</Badge>{part.status === 'en-attente' && actions && <button type="button" className="portal-part-available-button" aria-label={`Marquer disponible : ${part.quantity} × ${part.name}`} disabled={!!actions.busyKey || actions.refreshing} onClick={() => actions.onAvailable(repairId, part)}><Icon name="check" size={15}/>{working ? 'Enregistrement…' : 'Marquer disponible'}</button>}</div></li>;
}
function RepairDetails({repair, item}: {repair: PortalRepair; item: PortalConsole}) {
  const showClientParts = React.useContext(PartActionsContext) !== null;
  return <article className="portal-repair-panel" aria-labelledby="portal-repair-title"><header className="portal-panel-heading"><span className="portal-section-label">VOTRE RÉPARATION</span><span className="mono">{repair.code}</span></header><div className="portal-console-hero"><div className="portal-console-visual" aria-hidden="true"><ConsoleArt item={item}/></div><div><span className="portal-console-brand">{item.brand}</span><h2 id="portal-repair-title">{consoleName(item)}</h2>{item.variant && <p>{item.variant}</p>}<StateBadge state={item.state}/></div></div><div className="portal-repair-copy"><h3>{repair.title}</h3><div className="portal-symptoms"><span>La panne que vous avez signalée</span><p className="prewrap">{repair.symptoms || 'Aucun symptôme renseigné.'}</p></div><div className="portal-repair-amount"><span><Icon name="euro" size={18}/>{repair.totalCost === null ? 'Montant de l’intervention' : 'Montant actuel du dossier'}</span><strong>{money(repair.totalCost)}</strong></div><dl className="portal-console-facts"><div><dt>Référence console</dt><dd className="mono">{item.code}</dd></div><div><dt>Numéro de série</dt><dd>{item.serial || 'Non renseigné'}</dd></div><div className="portal-fact-wide"><dt>Accessoires déclarés</dt><dd className="prewrap">{item.accessories || 'Aucun accessoire déclaré'}</dd></div></dl><dl className="portal-repair-dates"><div><dt>Demande enregistrée</dt><dd>{dateFmt(repair.createdAt)}</dd></div>{repair.dueDate && <div><dt>Date prévue par l’atelier</dt><dd>{dateFmt(repair.dueDate)}</dd></div>}{repair.completedAt && <div><dt>Dossier clôturé</dt><dd>{dateFmt(repair.completedAt)}</dd></div>}<div><dt>Dernière mise à jour</dt><dd>{dateFmt(repair.updatedAt)}</dd></div></dl>{showClientParts && !!repair.clientParts?.length && <section className="portal-client-parts" aria-label={`Pièces à fournir pour ${repair.code}`}><h4><Icon name="package" size={18}/>Pièces demandées pour ce dossier</h4><p className="portal-client-parts-intro">Marquer disponible confirme toute la quantité demandée chez vous. L’atelier confirme ensuite la livraison et l’installation.</p><ul>{sortedParts(repair.clientParts).map(part => <PartLine key={part.id} part={part} repairId={repair.id}/>)}</ul></section>}</div></article>;
}
function RepairProcess({repair, tenant}: {repair: PortalRepair; tenant: boolean}) {
  const shipping = React.useContext(ShippingContext);
  const action = expectedActions[repair.stage];
  return <aside className="portal-process-panel" aria-labelledby="portal-process-title"><header className="portal-panel-heading"><span className="portal-section-label" id="portal-process-title">LA SUITE, ÉTAPE PAR ÉTAPE</span><PortalRepairStage repair={repair}/></header><div className="portal-next-action"><span><Icon name={repair.stage === 'attente-envoi' ? 'package' : repair.stage === 'irreparable' || repair.stage === 'abandonnee' ? 'archive' : repair.stage === 'terminee' ? 'check' : 'wrench'} size={23}/></span><div><h2>{action.title}</h2><p>{repair.intakeSubmitted && repair.stage === 'terminee' ? 'Votre réparation est terminée. Contactez l’atelier pour convenir du retrait de votre console ou de son retour.' : repair.stage === 'attente-envoi' && !repair.intakeSubmitted ? stageDescriptions[repair.stage] : action.text}</p></div></div>{repair.stage !== 'attente-envoi' && <p className="portal-stage-description">{stageDescriptions[repair.stage]}</p>}{repair.intakeSubmitted && shipping && <section className="portal-shipping-action" aria-label="Préparer le colis"><h3>{repair.stage === 'attente-envoi' ? 'Deux parties, deux destinations.' : 'Retrouver votre fiche d’envoi'}</h3><p>{repair.stage === 'attente-envoi' ? 'Gardez le talon avec la référence du dossier. La partie atelier accompagne votre console dans le colis.' : 'La fiche reste accessible. Si la console a déjà été réceptionnée, aucun nouvel envoi n’est demandé.'}</p><button type="button" className="btn primary" disabled={shipping.busy} onClick={() => shipping.onOpen(repair.id)}><Icon name="print" size={17}/>{shipping.busy ? 'Chargement de la fiche…' : 'Imprimer ma fiche d’envoi'}</button>{repair.stage === 'attente-envoi' && <><ShippingProcessDiagram/><p className="portal-shipping-note">La fiche identifie votre console. Prévoyez une étiquette de transport et conservez le suivi du transporteur.</p></>}</section>}<RepairJourney repair={repair}/>{!tenant && <a className="portal-contact-link" href="#/accueil?section=rp-contact"><Icon name="mail" size={17}/>Une question ? Contacter l’atelier<Icon name="right" size={16}/></a>}</aside>;
}
function RequestedPartsBoard({data, onSelect}: {data: PortalData; onSelect: (repairId: string) => void}) {
  const waiting = quantityFor(data.repairs, 'en-attente'), all = quantityFor(data.repairs);
  const groups = data.repairs.flatMap(repair => {
    const item = data.consoles.find(console => console.id === repair.consoleId);
    const parts = sortedParts(repair.clientParts || []);
    return item && parts.length ? [{item, repair, parts}] : [];
  });
  return <section className="portal-requested-parts" id="portal-requested-parts" tabIndex={-1} aria-labelledby="portal-parts-title"><header className="portal-parts-heading"><Icon name="package" size={24}/><div><h2 id="portal-parts-title">Pièces à fournir à l’atelier</h2><p>{waiting ? `${waiting} ${waiting === 1 ? 'pièce est attendue' : 'pièces sont attendues'}. Vous signalez la disponibilité chez vous ; l’atelier confirme la livraison et l’installation.` : 'Aucune pièce à fournir pour le moment.'}</p></div></header>{all > 0 ? <div className="portal-parts-groups">{groups.map(({repair, item, parts}) => <article className="portal-parts-group" key={repair.id}><header><div><h3>{consoleName(item)}</h3><p><span className="mono">{repair.code}</span> · {repair.title}</p></div><button type="button" className="text-link" onClick={() => {onSelect(repair.id); jumpTo('portal-selected-repair');}}>Voir le dossier<Icon name="right" size={15}/></button></header><ul>{parts.map(part => <PartLine key={part.id} part={part} repairId={repair.id}/>)}</ul></article>)}</div> : <p className="portal-parts-clear">Les demandes de pièces de l’atelier apparaîtront ici.</p>}</section>;
}
function PortalCollection({data, selectedId, onSelect, tenant}: {data: PortalData; selectedId: string; onSelect: (repairId: string) => void; tenant: boolean}) {
  const entries = data.repairs.flatMap(repair => {
    const item = data.consoles.find(console => console.id === repair.consoleId);
    return item ? [{repair, item}] : [];
  });
  const selected = entries.find(entry => entry.repair.id === selectedId) || entries[0];
  const withoutRepairs = data.consoles.filter(item => !data.repairs.some(repair => repair.consoleId === item.id));
  return <section className="portal-collection" id="portal-consoles" tabIndex={-1} aria-label="Mes réparations">{entries.length > 1 && <div className="portal-dossier-picker"><div><span className="portal-section-label">MES DOSSIERS</span><p>Choisissez la réparation à suivre.</p></div><div className="portal-dossier-buttons" role="group" aria-label="Choisir un dossier de réparation">{entries.map(({repair, item}) => <button key={repair.id} type="button" aria-pressed={selected?.repair.id === repair.id} onClick={() => onSelect(repair.id)}><span className="mono">{repair.code}</span><strong>{consoleName(item)}</strong><span>{repair.intakeSubmitted && repair.stage === 'terminee' ? 'Prête à récupérer' : stageInfo(repair.stage).short}</span></button>)}</div></div>}{selected ? <div className="portal-repair-split" id="portal-selected-repair" tabIndex={-1}><RepairDetails repair={selected.repair} item={selected.item}/><RepairProcess repair={selected.repair} tenant={tenant}/></div> : !data.consoles.length && <section className="panel"><Empty icon="gamepad" title="Votre première réparation commence ici" action={!tenant && <a className="btn primary" href="#/demande-reparation">Demander une réparation<Icon name="right" size={16}/></a>}>{tenant ? 'Dès que l’atelier ouvre un dossier à votre nom, son suivi apparaît dans cet espace.' : 'Sélectionnez votre console pour décrire la panne et préparer votre envoi.'}</Empty></section>}{withoutRepairs.length > 0 && <section className="portal-unassigned"><h2>Consoles sans dossier de réparation</h2><div>{withoutRepairs.map(item => <article key={item.id}><div aria-hidden="true"><ConsoleArt item={item} small/></div><div><h3>{consoleName(item)}</h3><p className="mono">{item.code}</p>{item.variant && <p>{item.variant}</p>}{item.serial && <p>N° de série : {item.serial}</p>}{item.accessories && <p className="prewrap">Accessoires : {item.accessories}</p>}<StateBadge state={item.state}/><p>L’atelier n’a pas encore ouvert de dossier pour cette console.</p></div></article>)}</div></section>}</section>;
}

function ClientLogin({busy, error, message, onLogin}: {busy: boolean; error: string; message: string; onLogin: (event: React.FormEvent<HTMLFormElement>) => void}) {
  const tenant = !!new URLSearchParams(window.location.search).get('atelier');
  return <StorefrontShell compact enableIntake={!tenant}><main className="rp-shell ri-login" id="rp-main" tabIndex={-1}><section className="ri-login-copy"><span className="rp-eyebrow">MON ESPACE CLIENT</span><h1>La suite de votre<br/>réparation est ici.</h1><p>Retrouvez vos dossiers, imprimez la fiche d’envoi et suivez l’avancement de vos consoles.</p>{!tenant && <a className="rp-text-link" href="#/demande-reparation">Une nouvelle panne ?<Icon name="arrow" size={17}/></a>}</section><section className="ri-form-card ri-login-card"><h2>Connectez-vous à votre compte.</h2><p className="ri-intro">Utilisez l’adresse e-mail et le mot de passe de votre compte client.</p>{message && <p className="ri-notice" role="status">{message}</p>}<form onSubmit={onLogin}><fieldset disabled={busy}><label className="ri-field"><span>Adresse e-mail</span><input type="email" name="email" autoComplete="username" maxLength={254} required autoFocus/></label><label className="ri-field"><span>Mot de passe</span><input type="password" name="password" autoComplete="current-password" maxLength={128} required/></label>{error && <p className="ri-error" role="alert">{error}</p>}<button className="rp-button rp-primary ri-login-submit" disabled={busy}>{busy ? 'Connexion…' : 'Ouvrir mon espace client'}<Icon name="arrow" size={18}/></button></fieldset></form><p className="ri-hint">Mot de passe oublié ? Contactez l’atelier pour rétablir votre accès.</p><div className="ri-login-links"><a className="rp-text-link" href="#/accueil"><Icon name="back" size={15}/>Accueil</a><a className="rp-text-link" href="#/connexion">Accès magasin<Icon name="arrow" size={15}/></a></div></section></main></StorefrontShell>;
}

export function ClientPortal() {
  const [session, setSession] = useState<ClientSession | null>(null), [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [refreshing, setRefreshing] = useState(false);
  const [serviceError, setServiceError] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [checkedAt, setCheckedAt] = useState('');
  const [selectedRepairId, setSelectedRepairId] = useState('');
  const requestedRepairId = new URLSearchParams(window.location.hash.split('?')[1]).get('demande') || '';
  const [sheet, setSheet] = useState<ShippingSheet | null>(null), [sheetBusy, setSheetBusy] = useState(false), [sheetError, setSheetError] = useState(''), [printReady, setPrintReady] = useState(false);
  const sheetRequest = useRef(0), printInProgress = useRef(false);
  const [partBusyKey, setPartBusyKey] = useState(''), [partFeedback, setPartFeedback] = useState<PartFeedback>({message: '', error: ''});
  const partRequest = useRef('');
  const [epoch] = useState(createSessionEpoch);
  const mounted = useRef(false), currentSession = useRef<ClientSession | null>(null);
  const automaticCheck = useRef(true), loggingOut = useRef(false);
  const portalRequest = useRef(0), authRequest = useRef(0);
  const current = (ticket: SessionTicket) => mounted.current && epoch.current(ticket);
  const [tabId] = useState(() => crypto.randomUUID());
  function broadcast(type: 'logout' | 'changed') {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('clinique-client-auth');
      channel.postMessage({type, source: tabId}); channel.close();
    }
  }
  function reset(checking: boolean, text = '') {
    currentSession.current = null; portalRequest.current++; sheetRequest.current++; setSheet(null); setSheetError(''); setSheetBusy(false); setPrintReady(false);
    partRequest.current = ''; setPartBusyKey(''); setPartFeedback({message: '', error: ''});
    setSession(null); setData(null); setSelectedRepairId(''); setCheckedAt('');
    setLoading(checking); setRefreshing(false); setBusy(loggingOut.current); setMessage(text); setError(''); setServiceError('');
  }
  function clearSession(text: string) {
    automaticCheck.current = false; epoch.advance();
    flushSync(() => reset(false, text));
  }
  function accept(value: ClientSession, ticket: SessionTicket) {
    if (!current(ticket)) return false;
    if (value.expiresAt <= Date.now()) {clearSession('Votre session a expiré. Reconnectez-vous.'); return false;}
    currentSession.current = value; setSession(value); setLoading(false); setError(''); setServiceError(''); setMessage('');
    return true;
  }
  async function check(synchronous = false) {
    if (loggingOut.current || !automaticCheck.current) return;
    const ticket = epoch.advance(), request = ++authRequest.current;
    if (synchronous) flushSync(() => reset(true)); else reset(true);
    try {const value = await clientApi<ClientSession>('/api/client/auth/me', {signal: ticket.signal}); if (request === authRequest.current) accept(value, ticket);}
    catch (e) {
      if (!current(ticket) || request !== authRequest.current) return;
      if (e instanceof ClientApiError && e.status === 401) clearSession('');
      else {setServiceError(e instanceof Error ? e.message : 'Serveur indisponible.'); setLoading(false);}
    }
  }
  useEffect(() => {
    document.title = 'Mon espace client · RépaRapid'; mounted.current = true; void check();
    const stop = observeSessionPrivacy({
      onPageHide: () => {epoch.advance(); flushSync(() => reset(true));},
      onRestore: () => {if (automaticCheck.current && !loggingOut.current) void check(true); else flushSync(() => reset(false));},
      onVisible: () => {if (automaticCheck.current && !loggingOut.current) void check(true);},
      onBackground: () => {if (printInProgress.current) return; epoch.advance(); portalRequest.current++; sheetRequest.current++; setPrintReady(false); setSheet(null); setSheetBusy(false);},
    });
    return () => {stop(); mounted.current = false; epoch.advance(); currentSession.current = null; portalRequest.current++; sheetRequest.current++; partRequest.current = '';};
  }, []);
  useEffect(() => {
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel('clinique-client-auth') : null;
    if (channel) channel.onmessage = event => {
      if (event.data?.source === tabId) return;
      if (event.data?.type === 'logout') clearSession('Vous êtes déconnecté.');
      if (event.data?.type === 'changed') {automaticCheck.current = true; void check(true);}
    };
    return () => channel?.close();
  }, [tabId]);
  useEffect(() => {
    if (!session) return;
    setData(null); setSelectedRepairId('');
    void refresh();
  }, [session?.user.clientId, session?.csrfToken]);
  useEffect(() => {
    if (!data) return;
    const repairs = data.repairs.filter(repair => data.consoles.some(item => item.id === repair.consoleId));
    setSelectedRepairId(previous => repairs.some(repair => repair.id === previous) ? previous : repairs.find(repair => repair.id === requestedRepairId)?.id || repairs.find(isOpenRepair)?.id || repairs[0]?.id || '');
  }, [data]);
  useEffect(() => {if (requestedRepairId && data?.repairs.some(repair => repair.id === requestedRepairId)) setSelectedRepairId(requestedRepairId);}, [requestedRepairId]);
  useEffect(() => {
    if (!session) return;
    const expired = () => {if (currentSession.current?.expiresAt === session.expiresAt) clearSession('Votre session a expiré. Reconnectez-vous.');};
    const interval = setInterval(() => {if (document.visibilityState === 'visible') void revalidate();}, 60000);
    const timeout = setTimeout(expired, Math.max(0, session.expiresAt - Date.now()));
    return () => {clearInterval(interval); clearTimeout(timeout);};
  }, [session?.expiresAt]);
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, fields = new FormData(form);
    if (loggingOut.current) return;
    const password = String(fields.get('password') || ''); form.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(input => {input.value = '';});
    automaticCheck.current = true;
    const ticket = epoch.advance();
    setBusy(true); setError(''); setMessage('');
    try {
      const workshopId = new URLSearchParams(window.location.search).get('atelier') || undefined;
      const value = await clientApi<ClientSession>('/api/client/auth/login', {method: 'POST', body: {email: String(fields.get('email') || '').trim(), password, workshopId}, signal: ticket.signal});
      if (current(ticket)) {form.reset(); if (accept(value, ticket)) broadcast('changed');}
    } catch (e) {if (current(ticket)) setError(e instanceof Error ? e.message : 'Connexion impossible.');}
    finally {if (current(ticket)) setBusy(false);}
  }
  async function revalidate() {
    const previous = currentSession.current;
    if (!previous || loggingOut.current || !automaticCheck.current) return;
    if (previous.expiresAt <= Date.now()) {clearSession('Votre session a expiré. Reconnectez-vous.'); return;}
    const ticket = epoch.capture(), request = ++authRequest.current;
    try {
      const value = await clientApi<ClientSession>('/api/client/auth/me', {signal: ticket.signal});
      if (!current(ticket) || request !== authRequest.current) return;
      if (value.user.clientId !== previous.user.clientId || value.csrfToken !== previous.csrfToken) {void check(true); return;}
      accept(value, ticket);
    } catch (e) {if (current(ticket) && request === authRequest.current && e instanceof ClientApiError && e.status === 401) clearSession('Votre session a expiré. Reconnectez-vous.');}
  }
  async function refresh() {
    if (!currentSession.current || loggingOut.current || partRequest.current) return;
    const ticket = epoch.capture(), request = ++portalRequest.current;
    setRefreshing(true); setError('');
    try {const value = await clientApi<PortalData>('/api/client/portal', {signal: ticket.signal}); if (current(ticket) && request === portalRequest.current) {setData(value); setCheckedAt(new Date().toISOString());}}
    catch (e) {if (current(ticket) && request === portalRequest.current) {if (e instanceof ClientApiError && e.status === 401) clearSession('Votre session a expiré. Reconnectez-vous.'); else setError(e instanceof Error ? e.message : 'Impossible d’actualiser vos réparations.');}}
    finally {if (current(ticket) && request === portalRequest.current) setRefreshing(false);}
  }
  async function markAvailable(repairId: string, part: PortalClientPart) {
    const previous = currentSession.current;
    if (!previous || loggingOut.current || partRequest.current || part.status !== 'en-attente') return;
    const ticket = epoch.capture(), key = `${repairId}:${part.id}`;
    const sameSession = () => current(ticket) && currentSession.current?.csrfToken === previous.csrfToken;
    partRequest.current = key; portalRequest.current++;
    setPartBusyKey(key); setPartFeedback({message: '', error: ''}); setError(''); setRefreshing(false);
    try {
      const next = await clientApi<PortalData>(`/api/client/repairs/${encodeURIComponent(repairId)}/parts/${encodeURIComponent(part.id)}/available`, {
        method: 'POST', body: {}, csrfToken: previous.csrfToken, signal: ticket.signal,
      });
      if (!sameSession() || partRequest.current !== key) return;
      setData(next); setCheckedAt(new Date().toISOString());
      setPartFeedback({message: 'La pièce est signalée disponible chez vous. Sa livraison reste à confirmer par l’atelier.', error: ''});
    } catch (failure) {
      if (!sameSession() || partRequest.current !== key) return;
      if (failure instanceof ClientApiError && failure.status === 401) {clearSession('Votre session a expiré. Reconnectez-vous.'); return;}
      if (failure instanceof ClientApiError && (failure.status === 409 || failure.status === 404)) {
        partRequest.current = ''; setPartBusyKey('');
        setPartFeedback({message: '', error: 'Cette pièce a changé ou a été retirée depuis votre consultation. Vérifiez son statut après l’actualisation du suivi avant toute nouvelle action.'});
        await refresh();
      } else setPartFeedback({message: '', error: failure instanceof Error ? failure.message : 'La disponibilité de la pièce n’a pas pu être enregistrée.'});
    } finally {
      if (sameSession() && partRequest.current === key) {partRequest.current = ''; setPartBusyKey('');}
    }
  }
  async function openSheet(repairId: string, printing = false) {
    const previous = currentSession.current;
    if (!previous || loggingOut.current || sheetBusy) return;
    const ticket = epoch.capture(), request = ++sheetRequest.current;
    setSheetBusy(true); setSheetError(''); setPrintReady(false);
    const sameSession = () => current(ticket) && request === sheetRequest.current && currentSession.current?.csrfToken === previous.csrfToken;
    try {
      const freshSession = await clientApi<ClientSession>('/api/client/auth/me', {signal: ticket.signal});
      if (!sameSession()) return;
      if (freshSession.user.clientId !== previous.user.clientId || freshSession.csrfToken !== previous.csrfToken) {void check(true); return;}
      const value = await clientApi<ShippingSheet>(`/api/client/repair-intake/${encodeURIComponent(repairId)}/sheet`, {signal: ticket.signal});
      if (!sameSession()) return;
      setSheet(value);
      if (printing && value.shop.addressConfirmed) {
        flushSync(() => {setSheet(value); setPrintReady(true);});
        printInProgress.current = true;
        try {window.print();} finally {printInProgress.current = false; if (current(ticket)) setPrintReady(false);}
      }
    } catch (failure) {
      if (!sameSession()) return;
      if (failure instanceof ClientApiError && failure.status === 401) {clearSession('Votre session a expiré. Reconnectez-vous.'); return;}
      setSheetError(failure instanceof Error ? failure.message : 'La fiche n’a pas pu être chargée.');
    } finally {if (sameSession()) setSheetBusy(false);}
  }
  async function logout() {
    const previous = currentSession.current;
    if (!previous || loggingOut.current) return;
    loggingOut.current = true; automaticCheck.current = false;
    const ticket = epoch.advance();
    const revoke = clientApi('/api/client/auth/logout', {method: 'POST', csrfToken: previous.csrfToken});
    flushSync(() => reset(true)); broadcast('logout');
    try {await revoke; if (current(ticket)) clearSession('Vous êtes déconnecté.');}
    catch (e) {
      if (current(ticket)) {
        clearSession('L’accès a été fermé sur cet onglet.');
        if (!(e instanceof ClientApiError && e.status === 401)) setError(`La déconnexion du serveur n’a pas été confirmée. ${e instanceof Error ? e.message : 'Réessayez de vous connecter.'}`);
      }
    } finally {
      loggingOut.current = false;
      if (mounted.current && !currentSession.current) {if (automaticCheck.current) void check(true); else {setLoading(false); setBusy(false);}}
    }
  }
  if (loading || serviceError) return <div className="auth-page"><section className="auth-card" aria-live="polite"><Logo/><h1>Espace client</h1><p>{loading ? 'Vérification de votre session…' : serviceError}</p>{!loading && <div className="button-row"><button className="btn primary" onClick={() => {setLoading(true); void check();}}>Réessayer</button><a className="text-link" href="#/dashboard">Accès administrateur</a></div>}</section></div>;
  if (!session) return <ClientLogin busy={busy} error={error} message={message} onLogin={event => void login(event)}/>;
  const tenant = !!new URLSearchParams(window.location.search).get('atelier');
  const newlyCreated = data?.repairs.find(repair => repair.id === requestedRepairId && repair.intakeSubmitted);
  // Keep the legacy payload intact; only independent workshops use client-supplied parts.
  return <ShippingContext.Provider value={{onOpen: repairId => void openSheet(repairId), busy: sheetBusy}}><PartActionsContext.Provider value={tenant ? {busyKey: partBusyKey, refreshing, feedback: partFeedback, onAvailable: (repairId, part) => void markAvailable(repairId, part)} : null}><div className={`client-portal${tenant ? '' : ' reparapid-portal'}`}>
    <a className="portal-skip-link" href="#portal-content" onClick={event => {event.preventDefault(); document.getElementById('portal-content')?.focus();}}>Aller à mon suivi</a>
    <header className="portal-header"><a href="#/espace-client" className="portal-brand">{tenant ? <><Logo/><span>{data?.workshop.name || 'Votre atelier'}<small>Espace client</small></span></> : <><img className="portal-rp-logo" src="./reparapid-logo-original.webp" width="300" height="300" alt=""/><span>RépaRapid<small>Mon espace client</small></span></>}</a><nav className="portal-header-nav" aria-label="Navigation de mon suivi">{!tenant && <a href="#/demande-reparation"><Icon name="plus" size={16}/>Nouvelle réparation</a>}{tenant && <button type="button" onClick={() => jumpTo('portal-requested-parts')}><Icon name="package" size={16}/>Pièces demandées</button>}<button type="button" onClick={() => jumpTo('portal-consoles')}><Icon name="gamepad" size={16}/>Mes réparations</button></nav><div className="portal-account"><span>Espace personnel</span><button className="btn secondary" onClick={() => void logout()} disabled={busy}><Icon name="logout" size={17}/>{busy ? 'Déconnexion…' : 'Se déconnecter'}</button></div></header>
    <main id="portal-content" tabIndex={-1} className="portal-content">
      <div className="portal-welcome"><div><span className="eyebrow">LE SUIVI DE VOS RÉPARATIONS</span><h1>Bonjour {data?.client.name || session.user.name}.</h1><p>Vos dossiers, les prochaines étapes et le suivi de vos consoles.</p></div><button className="btn primary" onClick={() => void refresh()} disabled={refreshing || !!partBusyKey}><Icon name="restore" size={17}/>{refreshing ? 'Actualisation…' : 'Actualiser le suivi'}</button></div>
      {newlyCreated && <section className="portal-intake-success" role="status"><span><Icon name="check" size={25}/></span><div><strong>Votre demande {newlyCreated.code} est enregistrée.</strong><p>{newlyCreated.stage === 'attente-envoi' ? 'Imprimez la fiche, gardez son talon et joignez la partie atelier au colis avec votre console.' : 'Retrouvez sa fiche et son avancement dans votre espace client.'}</p></div><button className="btn secondary" type="button" disabled={sheetBusy} onClick={() => void openSheet(newlyCreated.id)}><Icon name="print" size={16}/>Voir ma fiche d’envoi</button></section>}
      {sheetError && !sheet && <p className="auth-error portal-error" role="alert">{sheetError}</p>}
      {error && <p className="auth-error portal-error" role="alert">{error}</p>}
      <AvailabilityFeedback/>
      {!data ? <section className="panel">{refreshing ? <p className="portal-loading" role="status">Chargement de votre suivi…</p> : <Empty title="Vos réparations ne sont pas encore disponibles" action={<button className="btn primary" onClick={() => void refresh()}>Réessayer</button>}>Réessayez pour retrouver le suivi de votre atelier.</Empty>}</section> : <>
        <PortalCollection data={data} selectedId={selectedRepairId} onSelect={setSelectedRepairId} tenant={tenant}/>{tenant && <RequestedPartsBoard data={data} onSelect={setSelectedRepairId}/>}
        {checkedAt && <p className="portal-last-checked">Suivi actualisé le {dateFmt(checkedAt)} à {new Intl.DateTimeFormat('fr-FR', {hour: '2-digit', minute: '2-digit'}).format(new Date(checkedAt))}.</p>}
      </>}
      <footer className="portal-footer"><span>Une question sur votre réparation ? Contactez {tenant ? data?.workshop.name || 'votre atelier' : 'votre atelier'}.</span><a className="text-link" href="#/connexion">Connexion atelier</a></footer>
    </main>

    {sheet && <Modal title="Votre fiche d’envoi à découper" subtitle={sheet.repair.code} wide onClose={() => {sheetRequest.current++; setSheet(null); setSheetError(''); setPrintReady(false); setSheetBusy(false);}}><div className="intake-sheet-preview"><p className="intake-sheet-intro">Imprimez la fiche, découpez le talon à conserver, puis glissez la partie atelier dans le colis avec votre console. Le schéma ci-dessous vous guide.</p>{!sheet.shop.addressConfirmed && <p className="intake-sheet-blocked" role="status"><Icon name="alert" size={18}/><span>L’adresse d’expédition reste à confirmer. Contactez {sheet.shop.shopName}{sheet.shop.email && <> à <a href={`mailto:${sheet.shop.email}`}>{sheet.shop.email}</a></>}{sheet.shop.phone && <> au <a href={`tel:${sheet.shop.phone.replace(/\s/g, '')}`}>{sheet.shop.phone}</a></>}. N’envoyez pas votre console pour le moment.</span></p>}<ShippingDocument sheet={sheet}/>{sheetError && <p className="auth-error" role="alert">{sheetError}</p>}</div><div className="modal-footer intake-sheet-footer"><button type="button" className="btn secondary" onClick={() => {sheetRequest.current++; setSheet(null); setSheetError(''); setPrintReady(false); setSheetBusy(false);}}>Fermer</button><button type="button" className="btn primary" disabled={sheetBusy || !sheet.shop.addressConfirmed} onClick={() => void openSheet(sheet.repair.id, true)}><Icon name="print" size={17}/>{sheetBusy ? 'Vérification…' : 'Imprimer / enregistrer en PDF'}</button></div></Modal>}
  </div>{sheet && printReady && sheet.shop.addressConfirmed && <div className="intake-sheet-print"><ShippingDocument sheet={sheet}/></div>}</PartActionsContext.Provider></ShippingContext.Provider>;
}
