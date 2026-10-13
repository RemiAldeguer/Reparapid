import React, {useEffect, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import {dateFmt, stageInfo, CLIENT_PART_STATUSES, type ClientPartRequest, type ConsoleState, type Stage} from './domain';
import {Badge, ConsoleArt, Empty, Icon, Logo, Modal, Panel, StageBadge, StateBadge} from './ui';
import {createSessionEpoch, observeSessionPrivacy, type SessionTicket} from './session-privacy';
import {clientApi, ClientApiError, type ClientSession, type IntakeShop} from './client-api';
import {StorefrontShell} from './public-home';
import './repair-intake.css';
import './client-portal.css';

type PortalConsole = {id: string; code: string; brand: string; model: string; variant: string; serial: string; state: ConsoleState; accessories: string};
type PortalClientPart = Pick<ClientPartRequest, 'id' | 'name' | 'quantity' | 'note' | 'status'>;
type PortalRepair = {id: string; code: string; consoleId: string; title: string; symptoms: string; stage: Stage; dueDate: string; createdAt: string; updatedAt: string; completedAt: string; totalCost: number | null; intakeSubmitted?: boolean; clientParts?: PortalClientPart[]};
type PortalData = {client: {name: string}; workshop: {name: string}; consoles: PortalConsole[]; repairs: PortalRepair[]};
type ShippingSheet = {repair: Pick<PortalRepair, 'id' | 'code' | 'title' | 'symptoms' | 'stage' | 'createdAt'>; console: Pick<PortalConsole, 'brand' | 'model' | 'variant' | 'serial' | 'accessories'>; customer: {name: string; email: string; phone: string; address: string}; shop: IntakeShop};
const ShippingContext = React.createContext<{onOpen: (repairId: string) => void; busy: boolean} | null>(null);
function ShippingDocument({sheet}: {sheet: ShippingSheet}) {
  return <article className="intake-sheet-document"><header><div className="intake-sheet-brand"><div><img src="./reparapid-logo-original.webp" width="300" height="300" alt=""/><strong>RépaRapid</strong></div><p>FICHE À JOINDRE À VOTRE CONSOLE</p></div><div><span>DOSSIER</span><h2>{sheet.repair.code}</h2><p>Demande du {dateFmt(sheet.repair.createdAt)}</p></div></header><div className="intake-sheet-parties"><section><h3>Expéditeur · client</h3><strong>{sheet.customer.name}</strong><p className="prewrap">{sheet.customer.address}</p><p>{sheet.customer.email}<br/>{sheet.customer.phone}</p></section><section className="intake-sheet-destination"><h3>Destinataire · atelier</h3><strong>{sheet.shop.shopName}</strong>{sheet.shop.addressConfirmed ? <p className="prewrap">{sheet.shop.address}<br/>{sheet.shop.postalCode} {sheet.shop.city}</p> : <p>Adresse d’expédition à confirmer.<br/>Ne pas envoyer la console avant confirmation.</p>}<p>{sheet.shop.email}<br/>{sheet.shop.phone}</p></section></div><section className="intake-sheet-console"><h3>Console à réparer</h3><h4>{consoleName(sheet.console)}</h4><dl><div><dt>Numéro de série</dt><dd>{sheet.console.serial || 'Non renseigné'}</dd></div><div><dt>Accessoires déclarés</dt><dd className="prewrap">{sheet.console.accessories || 'Aucun accessoire déclaré'}</dd></div></dl></section><section className="intake-sheet-symptoms"><h3>Symptômes signalés par le client</h3><p className="prewrap">{sheet.repair.symptoms}</p></section><section className="intake-sheet-guidance"><h3>Avant de fermer le colis</h3><ol><li>Éteignez la console. Retirez les jeux, disques et cartes mémoire non nécessaires.</li><li>Protégez la console et les accessoires séparément, puis immobilisez-les dans un carton adapté.</li><li>Glissez cette fiche dans le colis. Conservez votre preuve d’envoi et le numéro de suivi du transporteur.</li></ol><p>Cette fiche identifie votre dossier. Ce n’est pas une étiquette de transport. Aucun règlement n’est effectué : le montant sera confirmé après diagnostic.</p></section><footer>{sheet.repair.code} · Suivi disponible dans votre espace client RépaRapid.</footer></article>;
}

const consoleName = (item: {brand: string; model: string}) => item.brand === 'Autre' || item.model.toLocaleLowerCase('fr').startsWith(item.brand.toLocaleLowerCase('fr')) ? item.model : `${item.brand} ${item.model}`;
const closedStages = new Set<Stage>(['terminee', 'irreparable', 'abandonnee']);
const isOpenRepair = (repair: PortalRepair) => !closedStages.has(repair.stage);
const repairsFor = (data: PortalData, consoleId: string) => data.repairs.filter(repair => repair.consoleId === consoleId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
const stageDescriptions: Record<Stage, string> = {
  'attente-envoi': 'Votre demande est enregistrée. Préparez votre console et joignez la fiche récapitulative avant de l’envoyer à l’atelier.',
  reception: 'Votre console a été réceptionnée par l’atelier.',
  diagnostic: 'L’atelier recherche l’origine du problème.',
  'attente-pieces': 'L’atelier attend les pièces nécessaires.',
  reparation: 'La réparation de votre console est en cours.',
  tests: 'L’atelier vérifie le bon fonctionnement de votre console.',
  terminee: 'La réparation de votre console est terminée.',
  irreparable: 'L’atelier a clôturé ce dossier comme irréparable.',
  abandonnee: 'Cette demande de réparation est clôturée.',
};

const money = (amount: number | null) => amount === null ? 'Montant à confirmer' : new Intl.NumberFormat('fr-FR', {style: 'currency', currency: 'EUR'}).format(amount);
const partOrder = {'en-attente': 0, disponible: 1, livree: 2, installee: 3};
const sortedParts = (parts: PortalClientPart[]) => [...parts].sort((a, b) => partOrder[a.status] - partOrder[b.status] || a.name.localeCompare(b.name, 'fr'));
const partTone = (status: PortalClientPart['status']) => status === 'installee' ? 'green' : status === 'livree' ? 'blue' : status === 'disponible' ? 'teal' : 'amber';
const partLabel = (status: PortalClientPart['status']) => status === 'en-attente' ? 'À fournir' : CLIENT_PART_STATUSES[status];
const quantityFor = (repairs: PortalRepair[], status?: PortalClientPart['status']) => repairs.reduce((sum, repair) => sum + (repair.clientParts || []).reduce((quantity, part) => quantity + (!status || part.status === status ? part.quantity : 0), 0), 0);
const journeySteps: {stage: Stage; label: string; icon: string}[] = [
  {stage: 'attente-envoi', label: 'Envoi', icon: 'package'},
  {stage: 'reception', label: 'Réception', icon: 'inbox'},
  {stage: 'diagnostic', label: 'Diagnostic', icon: 'stethoscope'},
  {stage: 'attente-pieces', label: 'Pièces', icon: 'package'},
  {stage: 'reparation', label: 'Réparation', icon: 'wrench'},
  {stage: 'tests', label: 'Vérifications', icon: 'checklist'},
  {stage: 'terminee', label: 'Terminée', icon: 'check'},
];
function jumpTo(id: string) {
  const target = document.getElementById(id);
  target?.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'});
  target?.focus({preventScroll: true});
}
function PortalRepairStage({repair}: {repair: PortalRepair}) {
  return repair.intakeSubmitted && repair.stage === 'terminee' ? <Badge tone="green">Prête à récupérer</Badge> : <StageBadge stage={repair.stage}/>;
}
function RepairJourney({stage,intakeSubmitted=false}: {stage: Stage; intakeSubmitted?: boolean}) {
  if (stage === 'irreparable' || stage === 'abandonnee') return <div className="portal-closed-journey"><Icon name="archive" size={19}/><span>Dossier clôturé · {stageInfo(stage).short}</span></div>;
  const currentStep = journeySteps.findIndex(step => step.stage === stage);
  return <ol className="portal-journey" aria-label="Étapes de la réparation">{journeySteps.map((step, index) => <li key={step.stage} className={index < currentStep ? 'is-past' : index === currentStep ? 'is-current' : 'is-future'} aria-current={index === currentStep ? 'step' : undefined}><span><Icon name={index < currentStep ? 'check' : step.icon} size={16}/></span><strong>{intakeSubmitted && step.stage === 'terminee' ? 'Prête' : step.label}</strong></li>)}</ol>;
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
function RepairProgress({repair}: {repair: PortalRepair}) {
  const shipping = React.useContext(ShippingContext);
  return <article className="portal-repair">
    <div className="portal-repair-heading"><div><span className="mono">{repair.code}</span><h3>{repair.title}</h3></div><PortalRepairStage repair={repair}/></div>
    <p className="portal-stage-description">{repair.intakeSubmitted && repair.stage === 'terminee' ? 'Votre réparation est terminée. Contactez l’atelier pour convenir du retrait de votre console ou de son retour.' : stageDescriptions[repair.stage]}</p>
    <RepairJourney stage={repair.stage} intakeSubmitted={repair.intakeSubmitted}/>
    {repair.intakeSubmitted && shipping && <div className="portal-shipping-action"><Icon name="package" size={22}/><div><strong>{repair.stage === 'attente-envoi' ? 'Votre fiche pour préparer l’envoi' : 'La fiche de votre demande'}</strong><p>Le récapitulatif à joindre à votre console. L’adresse de l’atelier y figure.</p></div><button type="button" className="btn secondary" disabled={shipping.busy} onClick={() => shipping.onOpen(repair.id)}><Icon name="print" size={16}/>Voir la fiche</button></div>}
    <div className="portal-repair-amount"><span><Icon name="euro" size={18}/>{repair.totalCost === null ? 'Montant de l’intervention après diagnostic' : 'Montant actuel de ce dossier'}</span><strong>{money(repair.totalCost)}</strong></div>
    {repair.symptoms && <div className="portal-symptoms"><span>Votre demande</span><p className="prewrap">{repair.symptoms}</p></div>}
    <dl className="portal-repair-dates"><div><dt>Demande reçue</dt><dd>{dateFmt(repair.createdAt)}</dd></div>{repair.dueDate && <div><dt>Date prévue</dt><dd>{dateFmt(repair.dueDate)}</dd></div>}{repair.completedAt && <div><dt>Dossier clôturé</dt><dd>{dateFmt(repair.completedAt)}</dd></div>}<div><dt>Dernière mise à jour</dt><dd>{dateFmt(repair.updatedAt)}</dd></div></dl>
    {!!repair.clientParts?.length && <section className="portal-client-parts" aria-label={`Pièces à fournir pour ${repair.code}`}><h4><Icon name="package" size={18}/>Pièces demandées pour ce dossier</h4><p className="portal-client-parts-intro">Marquer disponible confirme toute la quantité demandée chez vous. L’atelier confirme ensuite la livraison et l’installation.</p><ul>{sortedParts(repair.clientParts).map(part => <PartLine key={part.id} part={part} repairId={repair.id}/>)}</ul></section>}
  </article>;
}
function ConsoleOverview({item}: {item: PortalConsole}) {
  return <div className="portal-console-overview"><div className="portal-console-visual" aria-hidden="true"><ConsoleArt item={item} small/></div><div className="portal-console-info"><span className="mono">{item.code}</span>{item.variant && <span>{item.variant}</span>}{item.serial && <span>N° de série : {item.serial}</span>}{item.accessories && <span>Accessoires : {item.accessories}</span>}</div></div>;
}
function ConsoleRepairs({repairs}: {repairs: PortalRepair[]}) {
  return <>{repairs.length ? repairs.map(repair => <RepairProgress key={repair.id} repair={repair}/>) : <Empty icon="wrench" title="Aucune demande enregistrée">L’atelier n’a pas encore ouvert de dossier de réparation pour cette console.</Empty>}</>;
}
function ConsoleTile({item, repairs, onOpen}: {item: PortalConsole; repairs: PortalRepair[]; onOpen: (event: React.MouseEvent<HTMLButtonElement>) => void}) {
  const repair = repairs.find(isOpenRepair) || repairs[0];
  const requestedParts = repairs.flatMap(entry => sortedParts(entry.clientParts || []).map(part => ({part, code: entry.code})));
  requestedParts.sort((a, b) => partOrder[a.part.status] - partOrder[b.part.status]);
  const waitingParts = quantityFor(repairs, 'en-attente');
  const date = repair && (repair.completedAt || repair.dueDate || repair.updatedAt);
  const dateLabel = repair?.completedAt ? 'Clôturée le' : repair?.dueDate ? 'Date prévue' : 'Actualisée le';
  return <article className="portal-mosaic-card"><button type="button" className="portal-mosaic-open" onClick={onOpen} aria-label={`Voir le suivi de ${item.brand} ${item.model}, ${item.code}${item.variant ? `, ${item.variant}` : ''}${repair ? `, ${stageInfo(repair.stage).short}` : ''}`}>
    <span className="portal-mosaic-art"><span className="mono portal-mosaic-code">{item.code}</span>{repair ? <PortalRepairStage repair={repair}/> : <StateBadge state={item.state}/>}<ConsoleArt item={item}/></span>
    <span className="portal-mosaic-body"><span className="portal-mosaic-brand">{item.brand}</span><strong className="portal-mosaic-model">{item.model}</strong><span className="portal-mosaic-variant">{item.variant || 'Couleur non renseignée'}</span><span className="portal-mosaic-status"><strong>{repair?.title || 'Aucune demande enregistrée'}</strong>{repair && <span className="mono">{repair.code}</span>}</span>
    {repair && <span className="portal-mosaic-amount"><span>{repair.totalCost === null ? 'Après diagnostic' : 'Montant actuel'}</span><strong>{money(repair.totalCost)}</strong></span>}
    {!!requestedParts.length && <span className="portal-mosaic-part-list"><span className="portal-mosaic-part-label"><Icon name="package" size={14}/>{waitingParts ? `${waitingParts} ${waitingParts === 1 ? 'pièce à fournir' : 'pièces à fournir'}` : 'Pièces demandées'}</span>{requestedParts.slice(0, 2).map(({part, code}) => <span className="portal-mosaic-part-row" key={`${code}:${part.id}`}><span>{part.quantity} × {part.name}</span><Badge tone={partTone(part.status)} dot={false}>{partLabel(part.status)}</Badge></span>)}{requestedParts.length > 2 && <small>+ {requestedParts.length - 2} autre{requestedParts.length - 2 > 1 ? 's' : ''} demande{requestedParts.length - 2 > 1 ? 's' : ''} dans le suivi</small>}</span>}
    <span className="portal-mosaic-footer">{date && <span className="portal-mosaic-date"><small>{dateLabel}</small><strong>{dateFmt(date)}</strong></span>}<span className="portal-mosaic-link">Voir le suivi<Icon name="right" size={15}/></span></span></span>
  </button></article>;
}
function RequestedPartsBoard({data, onOpen}: {data: PortalData; onOpen: (id: string, opener: HTMLButtonElement) => void}) {
  const [filter, setFilter] = useState<'all' | PortalClientPart['status']>('all');
  const quantities = {all: quantityFor(data.repairs), 'en-attente': quantityFor(data.repairs, 'en-attente'), disponible: quantityFor(data.repairs, 'disponible'), livree: quantityFor(data.repairs, 'livree'), installee: quantityFor(data.repairs, 'installee')};
  const groups = data.repairs.flatMap(repair => {
    const item = data.consoles.find(console => console.id === repair.consoleId);
    const parts = sortedParts((repair.clientParts || []).filter(part => filter === 'all' || part.status === filter));
    return item && parts.length ? [{item, repair, parts}] : [];
  }).sort((a, b) => Math.min(...a.parts.map(part => partOrder[part.status])) - Math.min(...b.parts.map(part => partOrder[part.status])) || b.repair.updatedAt.localeCompare(a.repair.updatedAt));
  const filters = [{value: 'all', label: 'Toutes'}, {value: 'en-attente', label: 'À fournir'}, {value: 'disponible', label: 'Disponibles'}, {value: 'livree', label: 'Livrées'}, {value: 'installee', label: 'Installées'}] as const;
  return <section className={`portal-requested-parts ${quantities['en-attente'] ? 'has-waiting-parts' : ''}`} id="portal-requested-parts" tabIndex={-1} aria-labelledby="portal-parts-title">
    <div className="portal-parts-heading"><span className="portal-parts-heading-icon"><Icon name="package" size={25}/></span><div><span className="portal-section-label">POUR FAIRE AVANCER VOS RÉPARATIONS</span><h2 id="portal-parts-title">Pièces à fournir à l’atelier</h2><p>{quantities['en-attente'] ? <>{quantities['en-attente']} {quantities['en-attente'] === 1 ? 'pièce est attendue' : 'pièces sont attendues'}. Retrouvez ici ce que l’atelier vous demande.</> : quantities.disponible ? `${quantities.disponible} ${quantities.disponible === 1 ? 'pièce est signalée disponible' : 'pièces sont signalées disponibles'} chez vous. L’atelier confirmera la réception après livraison.` : quantities.all ? 'Aucune pièce à fournir pour le moment. Retrouvez ci-dessous les pièces déjà livrées ou installées.' : 'Aucune pièce ne vous est demandée pour le moment.'}</p></div>{quantities['en-attente'] > 0 && <Badge tone="amber">{quantities['en-attente']} à fournir</Badge>}</div>
    {quantities.all > 0 ? <>
      <div className="portal-parts-toolbar"><div className="portal-parts-filters" role="group" aria-label="Filtrer les pièces demandées">{filters.map(item => <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}<span>{quantities[item.value]}</span></button>)}</div><span className="portal-parts-reading"><Icon name="info" size={14}/>Vous signalez toute la quantité demandée chez vous. L’atelier confirme ensuite la livraison.</span></div>
      {groups.length ? <div className="portal-parts-groups">{groups.map(group => <article className="portal-parts-group" key={group.repair.id}><header><div className="portal-parts-group-art" aria-hidden="true"><ConsoleArt item={group.item} small/></div><div className="portal-parts-group-title"><h3>{consoleName(group.item)}{group.item.variant && <span> · {group.item.variant}</span>}</h3><p><span className="mono">{group.repair.code}</span>{group.repair.title}</p></div><button type="button" className="text-link" onClick={event => onOpen(group.item.id, event.currentTarget)}>Voir la console<Icon name="right" size={15}/></button></header><ul>{group.parts.map(part => <PartLine key={part.id} part={part} repairId={group.repair.id}/>)}</ul></article>)}</div> : <div className="portal-parts-empty-filter"><Icon name="check" size={23}/><p>{filter === 'en-attente' ? 'Aucune pièce en attente. Les pièces peuvent être disponibles chez vous, livrées ou installées.' : filter === 'disponible' ? 'Aucune pièce signalée disponible chez vous pour le moment.' : filter === 'livree' ? 'Aucune pièce au statut « Livrée » pour le moment.' : 'Aucune pièce au statut « Installée » pour le moment.'}</p><button type="button" className="text-link" onClick={() => setFilter('all')}>Voir toutes les pièces</button></div>}
    </> : <div className="portal-parts-clear"><Icon name="check" size={20}/><p>Si l’atelier a besoin d’une pièce à fournir par vos soins, elle apparaîtra ici avec les précisions utiles.</p></div>}
  </section>;
}
function PortalCollection({data, view, onView, onOpen}: {data: PortalData; view: 'mosaic' | 'details'; onView: (value: 'mosaic' | 'details') => void; onOpen: (id: string, opener: HTMLButtonElement) => void}) {
  const [search, setSearch] = useState(''), [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const query = search.trim().toLocaleLowerCase('fr-FR');
  const statusMatches = (repair: PortalRepair) => filter === 'all' || (filter === 'open' ? isOpenRepair(repair) : !isOpenRepair(repair));
  const visibleConsoles = data.consoles.filter(item => {
    const repairs = repairsFor(data, item.id);
    const matchesStatus = filter === 'all' || repairs.some(statusMatches);
    const searchValues = [item.brand, item.model, item.variant, item.code, item.serial, ...repairs.filter(statusMatches).flatMap(repair => [repair.code, repair.title, repair.symptoms])];
    return matchesStatus && (!query || searchValues.some(value => value.toLocaleLowerCase('fr-FR').includes(query)));
  });
  return <section className="portal-collection" id="portal-consoles" tabIndex={-1} aria-labelledby="portal-consoles-title">
    <div className="portal-view-toolbar"><div><span className="portal-section-label">VOTRE ATELIER EN LIGNE</span><h2 id="portal-consoles-title">Mes consoles & réparations</h2><p>{visibleConsoles.length} console{visibleConsoles.length > 1 ? 's' : ''}{visibleConsoles.length !== data.consoles.length ? ` sur ${data.consoles.length}` : ''}</p></div><div className="portal-view-switch" role="group" aria-label="Affichage des consoles"><button type="button" className={view === 'mosaic' ? 'is-active' : ''} aria-label="Vue mosaïque" aria-pressed={view === 'mosaic'} onClick={() => onView('mosaic')}><Icon name="grid" size={17}/>Mosaïque</button><button type="button" className={view === 'details' ? 'is-active' : ''} aria-label="Vue détaillée" aria-pressed={view === 'details'} onClick={() => onView('details')}><Icon name="list" size={17}/>Détails</button></div></div>
    {data.consoles.length > 0 ? <>
      <div className="portal-collection-filters"><label className="portal-console-search"><Icon name="search" size={18}/><input type="search" aria-label="Rechercher une console ou un dossier" placeholder="Console, dossier ou référence…" value={search} onChange={event => setSearch(event.target.value)}/></label><div className="portal-repair-filters" role="group" aria-label="Filtrer les réparations"><button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Toutes</button><button type="button" aria-pressed={filter === 'open'} onClick={() => setFilter('open')}>En cours</button><button type="button" aria-pressed={filter === 'closed'} onClick={() => setFilter('closed')}>Clôturées</button></div></div>
      {visibleConsoles.length ? view === 'mosaic' ? <div className="portal-mosaic">{visibleConsoles.map(item => <ConsoleTile key={item.id} item={item} repairs={repairsFor(data, item.id).filter(statusMatches)} onOpen={event => onOpen(item.id, event.currentTarget)}/>)}</div> : <div className="portal-consoles">{visibleConsoles.map(item => <Panel key={item.id} title={consoleName(item)} className="portal-console" aside={<StateBadge state={item.state}/>}><ConsoleOverview item={item}/><ConsoleRepairs repairs={repairsFor(data, item.id).filter(statusMatches)}/></Panel>)}</div> : <section className="panel"><Empty icon="search" title="Aucun suivi ne correspond à votre recherche" action={<button type="button" className="btn secondary" onClick={() => {setSearch(''); setFilter('all');}}>Afficher toutes mes consoles</button>}>Essayez un autre modèle, une référence de dossier ou un autre filtre.</Empty></section>}
    </> : <section className="panel"><Empty icon="gamepad" title="Vos consoles apparaîtront ici">Dès que l’atelier enregistre une console à votre nom, vous retrouvez son suivi dans cet espace.</Empty></section>}
  </section>;
}
function PortalOverview({data, view, onView, onOpen}: {data: PortalData; view: 'mosaic' | 'details'; onView: (value: 'mosaic' | 'details') => void; onOpen: (id: string, opener: HTMLButtonElement) => void}) {
  const openCount = data.repairs.filter(isOpenRepair).length, finishedCount = data.repairs.filter(repair => repair.stage === 'terminee').length;
  const waitingParts = quantityFor(data.repairs, 'en-attente');
  return <>
    <div className="portal-summary"><div><span className="portal-stat-icon"><Icon name="gamepad" size={22}/></span><strong>{data.consoles.length}</strong><span>{data.consoles.length === 1 ? 'console enregistrée' : 'consoles enregistrées'}</span></div><div><span className="portal-stat-icon"><Icon name="wrench" size={22}/></span><strong>{openCount}</strong><span>{openCount === 1 ? 'dossier ouvert' : 'dossiers ouverts'}</span></div><div><span className="portal-stat-icon"><Icon name="check" size={22}/></span><strong>{finishedCount}</strong><span>{finishedCount === 1 ? 'réparation terminée' : 'réparations terminées'}</span></div><button type="button" className={`portal-stat-parts ${waitingParts ? 'is-waiting' : ''}`} onClick={() => jumpTo('portal-requested-parts')}><span className="portal-stat-icon"><Icon name="package" size={22}/></span><strong>{waitingParts}</strong><span>{waitingParts === 1 ? 'pièce à fournir' : 'pièces à fournir'}<Icon name="right" size={13}/></span></button></div>
    <RequestedPartsBoard data={data} onOpen={onOpen}/>
    <PortalCollection data={data} view={view} onView={onView} onOpen={onOpen}/>
  </>;
}

function ClientLogin({busy, error, message, onLogin}: {busy: boolean; error: string; message: string; onLogin: (event: React.FormEvent<HTMLFormElement>) => void}) {
  const tenant = new URLSearchParams(window.location.search).has('atelier');
  return <StorefrontShell compact enableIntake={!tenant}><main className="rp-shell ri-login" id="rp-main" tabIndex={-1}><section className="ri-login-copy"><span className="rp-eyebrow">MON ESPACE CLIENT</span><h1>La suite de votre<br/>réparation est ici.</h1><p>Retrouvez vos dossiers, imprimez la fiche d’envoi et suivez l’avancement de vos consoles.</p>{!tenant && <a className="rp-text-link" href="#/demande-reparation">Une nouvelle panne ?<Icon name="arrow" size={17}/></a>}</section><section className="ri-form-card ri-login-card"><h2>Connectez-vous à votre compte.</h2><p className="ri-intro">Utilisez l’adresse e-mail et le mot de passe de votre compte client.</p>{message && <p className="ri-notice" role="status">{message}</p>}<form onSubmit={onLogin}><fieldset disabled={busy}><label className="ri-field"><span>Adresse e-mail</span><input type="email" name="email" autoComplete="username" maxLength={254} required autoFocus/></label><label className="ri-field"><span>Mot de passe</span><input type="password" name="password" autoComplete="current-password" maxLength={128} required/></label>{error && <p className="ri-error" role="alert">{error}</p>}<button className="rp-button rp-primary ri-login-submit" disabled={busy}>{busy ? 'Connexion…' : 'Ouvrir mon espace client'}<Icon name="arrow" size={18}/></button></fieldset></form><p className="ri-hint">Mot de passe oublié ? Contactez l’atelier pour rétablir votre accès.</p><div className="ri-login-links"><a className="rp-text-link" href="#/accueil"><Icon name="back" size={15}/>Accueil</a><a className="rp-text-link" href="#/connexion">Accès magasin<Icon name="arrow" size={15}/></a></div></section></main></StorefrontShell>;
}

export function ClientPortal() {
  const [session, setSession] = useState<ClientSession | null>(null), [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [refreshing, setRefreshing] = useState(false);
  const [serviceError, setServiceError] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [checkedAt, setCheckedAt] = useState('');
  const [view, setView] = useState<'mosaic' | 'details'>('mosaic');
  const [selectedConsoleId, setSelectedConsoleId] = useState('');
  const [sheet, setSheet] = useState<ShippingSheet | null>(null), [sheetBusy, setSheetBusy] = useState(false), [sheetError, setSheetError] = useState(''), [printReady, setPrintReady] = useState(false);
  const sheetRequest = useRef(0), printInProgress = useRef(false);
  const [partBusyKey, setPartBusyKey] = useState(''), [partFeedback, setPartFeedback] = useState<PartFeedback>({message: '', error: ''});
  const partRequest = useRef('');
  const consoleOpener = useRef<HTMLButtonElement | null>(null);
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
    currentSession.current = null; consoleOpener.current = null; portalRequest.current++; sheetRequest.current++; setSheet(null); setSheetError(''); setSheetBusy(false); setPrintReady(false);
    partRequest.current = ''; setPartBusyKey(''); setPartFeedback({message: '', error: ''});
    setSession(null); setData(null); setSelectedConsoleId(''); setView('mosaic'); setCheckedAt('');
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
    return () => {stop(); mounted.current = false; epoch.advance(); currentSession.current = null; consoleOpener.current = null; portalRequest.current++; sheetRequest.current++; partRequest.current = '';};
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
    setData(null); setSelectedConsoleId('');
    void refresh();
  }, [session?.user.clientId, session?.csrfToken]);
  useEffect(() => {if (data && selectedConsoleId && !data.consoles.some(item => item.id === selectedConsoleId)) setSelectedConsoleId('');}, [data, selectedConsoleId]);
  useEffect(() => {if (!selectedConsoleId && consoleOpener.current) {if (consoleOpener.current.isConnected) consoleOpener.current.focus(); consoleOpener.current = null;}}, [selectedConsoleId]);
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
      setSelectedConsoleId(''); setSheet(value);
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
  const selectedConsole = data?.consoles.find(item => item.id === selectedConsoleId);
  const openConsole = (id: string, opener: HTMLButtonElement) => {consoleOpener.current = opener; setSelectedConsoleId(id);};
  const tenant = new URLSearchParams(window.location.search).has('atelier');
  const newRepairId = new URLSearchParams(window.location.hash.split('?')[1]).get('demande');
  const newlyCreated = data?.repairs.find(repair => repair.id === newRepairId && repair.intakeSubmitted);
  return <ShippingContext.Provider value={{onOpen: repairId => void openSheet(repairId), busy: sheetBusy}}><PartActionsContext.Provider value={{busyKey: partBusyKey, refreshing, feedback: partFeedback, onAvailable: (repairId, part) => void markAvailable(repairId, part)}}><div className={`client-portal${tenant ? '' : ' reparapid-portal'}`}>
    <a className="portal-skip-link" href="#portal-content" onClick={event => {event.preventDefault(); document.getElementById('portal-content')?.focus();}}>Aller à mon suivi</a>
    <header className="portal-header"><a href="#/espace-client" className="portal-brand">{tenant ? <><Logo/><span>{data?.workshop.name || 'Votre atelier'}<small>Espace client</small></span></> : <><img className="portal-rp-logo" src="./reparapid-logo-original.webp" width="300" height="300" alt=""/><span>RépaRapid<small>Mon espace client</small></span></>}</a><nav className="portal-header-nav" aria-label="Navigation de mon suivi">{!tenant && <a href="#/demande-reparation"><Icon name="plus" size={16}/>Nouvelle réparation</a>}<button type="button" onClick={() => jumpTo('portal-requested-parts')}><Icon name="package" size={16}/>Pièces demandées</button><button type="button" onClick={() => jumpTo('portal-consoles')}><Icon name="gamepad" size={16}/>Mes consoles</button></nav><div className="portal-account"><span>Espace personnel</span><button className="btn secondary" onClick={() => void logout()} disabled={busy}><Icon name="logout" size={17}/>{busy ? 'Déconnexion…' : 'Se déconnecter'}</button></div></header>
    <main id="portal-content" tabIndex={-1} className="portal-content">
      <div className="portal-welcome"><div><span className="eyebrow">LE SUIVI DE VOS RÉPARATIONS</span><h1>Bonjour {data?.client.name || session.user.name}.</h1><p>Vos dossiers, les prochaines étapes et le suivi de vos consoles.</p></div><button className="btn primary" onClick={() => void refresh()} disabled={refreshing || !!partBusyKey}><Icon name="restore" size={17}/>{refreshing ? 'Actualisation…' : 'Actualiser le suivi'}</button></div>
      {newlyCreated && <section className="portal-intake-success" role="status"><span><Icon name="check" size={25}/></span><div><strong>Votre demande {newlyCreated.code} est enregistrée.</strong><p>{newlyCreated.stage === 'attente-envoi' ? 'Votre console est en attente d’envoi. Imprimez la fiche récapitulative avant de préparer votre colis.' : 'Retrouvez sa fiche et son avancement dans votre espace client.'}</p></div><button className="btn secondary" type="button" disabled={sheetBusy} onClick={() => void openSheet(newlyCreated.id)}><Icon name="print" size={16}/>Voir ma fiche d’envoi</button></section>}
      {sheetError && !sheet && <p className="auth-error portal-error" role="alert">{sheetError}</p>}
      {!selectedConsoleId && error && <p className="auth-error portal-error" role="alert">{error}</p>}
      {!selectedConsoleId && <AvailabilityFeedback/>}
      {!data ? <section className="panel">{refreshing ? <p className="portal-loading" role="status">Chargement de votre suivi…</p> : <Empty title="Vos réparations ne sont pas encore disponibles" action={<button className="btn primary" onClick={() => void refresh()}>Réessayer</button>}>Réessayez pour retrouver le suivi de votre atelier.</Empty>}</section> : <>
        <PortalOverview data={data} view={view} onView={setView} onOpen={openConsole}/>
        {checkedAt && <p className="portal-last-checked">Suivi actualisé le {dateFmt(checkedAt)} à {new Intl.DateTimeFormat('fr-FR', {hour: '2-digit', minute: '2-digit'}).format(new Date(checkedAt))}.</p>}
      </>}
      <footer className="portal-footer"><span>Une question sur votre réparation ? Contactez {tenant ? data?.workshop.name || 'votre atelier' : 'votre atelier'}.</span><a className="text-link" href="#/connexion">Connexion atelier</a></footer>
    </main>
    {selectedConsole && data && <Modal title={consoleName(selectedConsole)} subtitle={selectedConsole.code} onClose={() => setSelectedConsoleId('')} wide><div className="portal-console-dialog"><div className="portal-console-dialog-body"><div className="portal-console-dialog-state"><StateBadge state={selectedConsole.state}/></div><div className="portal-dialog-feedback"><AvailabilityFeedback/>{error && <p className="auth-error portal-error" role="alert">{error}</p>}</div><ConsoleOverview item={selectedConsole}/><ConsoleRepairs repairs={repairsFor(data, selectedConsole.id)}/></div><div className="modal-footer"><button type="button" className="btn primary" onClick={() => setSelectedConsoleId('')}>Fermer</button></div></div></Modal>}
    {sheet && <Modal title="Votre fiche récapitulative" subtitle={sheet.repair.code} wide onClose={() => {sheetRequest.current++; setSheet(null); setSheetError(''); setPrintReady(false); setSheetBusy(false);}}><div className="intake-sheet-preview"><p className="intake-sheet-intro">Glissez cette fiche dans le colis. Elle permet à l’atelier d’identifier votre console et votre demande.</p>{!sheet.shop.addressConfirmed && <p className="intake-sheet-blocked" role="status"><Icon name="alert" size={18}/><span>L’adresse d’expédition reste à confirmer. Contactez {sheet.shop.shopName}{sheet.shop.email && <> à <a href={`mailto:${sheet.shop.email}`}>{sheet.shop.email}</a></>}{sheet.shop.phone && <> au <a href={`tel:${sheet.shop.phone.replace(/\s/g, '')}`}>{sheet.shop.phone}</a></>}. N’envoyez pas votre console pour le moment.</span></p>}<ShippingDocument sheet={sheet}/>{sheetError && <p className="auth-error" role="alert">{sheetError}</p>}</div><div className="modal-footer intake-sheet-footer"><button type="button" className="btn secondary" onClick={() => {sheetRequest.current++; setSheet(null); setSheetError(''); setPrintReady(false); setSheetBusy(false);}}>Fermer</button><button type="button" className="btn primary" disabled={sheetBusy || !sheet.shop.addressConfirmed} onClick={() => void openSheet(sheet.repair.id, true)}><Icon name="print" size={17}/>{sheetBusy ? 'Vérification…' : 'Imprimer / enregistrer en PDF'}</button></div></Modal>}
  </div>{sheet && printReady && sheet.shop.addressConfirmed && <div className="intake-sheet-print"><ShippingDocument sheet={sheet}/></div>}</PartActionsContext.Provider></ShippingContext.Provider>;
}
