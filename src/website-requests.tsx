import React, {useMemo, useState} from 'react';
import {useApp} from './store';
import {PageHeader} from './pages';
import {Badge, ConsoleVisual, Empty, Icon} from './ui';
import {ShopConsoleArt} from './shop-console-art';
import {active, dateFmt, moveRepair, stageInfo, type Repair, type Stage} from './domain';
import './website-requests.css';

type RequestGroup = 'all' | 'waiting' | 'processing' | 'ready' | 'closed';
const requestGroups: {id: RequestGroup; label: string; description: string; icon: string}[] = [
  {id: 'waiting', label: 'À réceptionner', description: 'Consoles attendues au magasin', icon: 'inbox'},
  {id: 'processing', label: 'En traitement', description: 'De la réception aux derniers tests', icon: 'wrench'},
  {id: 'ready', label: 'Prêtes à récupérer', description: 'Réparations terminées', icon: 'check'},
  {id: 'closed', label: 'Autres clôturées', description: 'Irréparables ou abandonnées', icon: 'archive'},
];

function requestGroup(repair: Repair): Exclude<RequestGroup, 'all'> {
  if (repair.proposal?.decision === 'return' && !repair.proposal.returnedAt || repair.proposal?.decision === 'buyback' && !repair.proposal.buybackCompletedAt) return 'processing';
  if (repair.stage === 'attente-envoi') return 'waiting';
  if (repair.stage === 'terminee') return 'ready';
  return active(repair) ? 'processing' : 'closed';
}
const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const nextAction: Partial<Record<Stage, {stage: Stage; label: string; icon: string}>> = {
  'attente-envoi': {stage: 'reception', label: 'Confirmer la réception', icon: 'inbox'},
  reception: {stage: 'diagnostic', label: 'Commencer le diagnostic', icon: 'search'},
  diagnostic: {stage: 'reparation', label: 'Lancer la réparation', icon: 'wrench'},
  'attente-pieces': {stage: 'reparation', label: 'Reprendre la réparation', icon: 'wrench'},
  reparation: {stage: 'tests', label: 'Passer aux tests', icon: 'checklist'},
  tests: {stage: 'terminee', label: 'Prête à récupérer', icon: 'check'},
};

export function WebsiteRequests() {
  const {data, go, ask, transact} = useApp();
  const [group, setGroup] = useState<RequestGroup>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'recent' | 'oldest' | 'updated'>('recent');
  const [view, setView] = useState<'list' | 'cards'>('list');
  const consoles = useMemo(() => new Map(data.consoles.map(item => [item.id, item])), [data.consoles]);
  const clients = useMemo(() => new Map(data.clients.map(client => [client.id, client])), [data.clients]);
  const requests = data.repairs.filter(repair => !!repair.publicRequestId);
  const counts = {all: requests.length, waiting: 0, processing: 0, ready: 0, closed: 0};
  for (const repair of requests) counts[requestGroup(repair)]++;
  const searchText = normalizeSearch(search);
  const rows = requests.filter(repair => {
    if (group !== 'all' && requestGroup(repair) !== group) return false;
    const item = consoles.get(repair.consoleId);
    const client = item?.clientId ? clients.get(item.clientId) : undefined;
    return normalizeSearch([repair.code, repair.title, repair.symptoms, item?.brand, item?.model, item?.variant, item?.serial, client?.name, client?.code, client?.email].filter(Boolean).join(' ')).includes(searchText);
  }).sort((a, b) => sort === 'oldest' ? a.createdAt.localeCompare(b.createdAt) || a.code.localeCompare(b.code) : sort === 'updated' ? b.updatedAt.localeCompare(a.updatedAt) || b.code.localeCompare(a.code) : b.createdAt.localeCompare(a.createdAt) || b.code.localeCompare(a.code));

  function advance(repair: Repair, target: Stage) {
    return transact(draft => {
      const current = draft.repairs.find(item => item.id === repair.id);
      if (!current?.publicRequestId) throw Error('Cette demande du site n’est plus disponible.');
      if (current.stage !== repair.stage) throw Error('L’étape de cette demande a changé. Consultez son dossier avant de continuer.');
      if (nextAction[current.stage]?.stage !== target) throw Error('Cette action ne correspond plus à l’étape de la demande.');
      moveRepair(draft, current.id, target);
    }, target === 'terminee' ? 'Réparation terminée : console prête à récupérer. Tous les tests ont été marqués OK.' : target === 'reception' ? 'Réception de la console enregistrée.' : 'Étape de la demande mise à jour.');
  }

  function applyNext(repair: Repair) {
    if(repair.stage==='diagnostic'&&repair.proposal?.decision!=='repair'){go('/repairs/'+repair.id);return;}
    const action = repair.stage==='diagnostic'&&repair.proposal?.decision!=='repair' ? {stage:'diagnostic' as Stage,label:repair.proposal?'Voir la proposition':'Préparer la proposition',icon:'note'} : nextAction[repair.stage];
    if (!action) return;
    if (action.stage === 'reception') {
      ask({title: 'La console est-elle reçue ?', body: `Confirmez la réception physique de la console du dossier ${repair.code} au magasin. La demande passera en Réception, avant le diagnostic.`, label: 'Confirmer la réception', run: () => advance(repair, 'reception')});
    } else if (action.stage === 'terminee') {
      ask({title: 'Console prête à récupérer ?', body: `Le dossier ${repair.code} sera clôturé en « Terminée ». Tous ses tests seront marqués OK et le chronomètre sera arrêté. Confirmez que la réparation est terminée et que la console est prête à récupérer au magasin.`, label: 'Confirmer : prête à récupérer', run: () => advance(repair, 'terminee')});
    } else advance(repair, action.stage);
  }

  return <div className="website-requests-page">
    <PageHeader eyebrow="RÉPARAPID · DEMANDES EN LIGNE" title="Demandes du site" description="Réceptionnez les consoles demandées en ligne et suivez leur réparation jusqu’à ce qu’elles soient prêtes à récupérer.">
      <button className="btn secondary" type="button" onClick={() => go('/repairs')}><Icon name="wrench" size={17}/>Tout l’atelier</button>
    </PageHeader>
    <div className="website-request-metrics" aria-label="Synthèse des demandes du site">
      {requestGroups.map(category => <button type="button" key={category.id} className={`website-request-metric ${category.id}`} aria-pressed={group === category.id} onClick={() => setGroup(current => current === category.id ? 'all' : category.id)}>
        <span className="website-request-metric-top"><span>{category.label}</span><Icon name={category.icon} size={19}/></span>
        <strong>{counts[category.id]}</strong><small>{category.description}</small>
      </button>)}
    </div>
    <div className="website-request-toolbar">
      <label className="website-request-search"><Icon name="search" size={18}/><input type="search" value={search} onChange={event => setSearch(event.target.value)} aria-label="Rechercher une demande du site" placeholder="Référence, modèle, client ou panne…"/></label>
      <label className="website-request-select"><span>Afficher</span><select aria-label="Filtrer les demandes du site" value={group} onChange={event => setGroup(event.target.value as RequestGroup)}><option value="all">Toutes les demandes ({counts.all})</option>{requestGroups.map(category => <option key={category.id} value={category.id}>{category.label} ({counts[category.id]})</option>)}</select></label>
      <label className="website-request-select"><span>Trier</span><select aria-label="Trier les demandes du site" value={sort} onChange={event => setSort(event.target.value as typeof sort)}><option value="recent">Les plus récentes</option><option value="oldest">Les plus anciennes</option><option value="updated">Dernière mise à jour</option></select></label>
    </div>
    <div className="website-request-results">
      <div className="website-request-result-count" aria-live="polite"><span>{rows.length} demande{rows.length !== 1 ? 's' : ''} affichée{rows.length !== 1 ? 's' : ''} sur {requests.length}</span>{(search || group !== 'all') && <button className="text-link" type="button" onClick={() => {setSearch(''); setGroup('all');}}>Réinitialiser les filtres</button>}</div>
      <div className="website-request-view-switch" role="group" aria-label="Affichage des demandes du site">
        <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}><Icon name="list" size={16}/>Liste</button>
        <button type="button" aria-pressed={view === 'cards'} onClick={() => setView('cards')}><Icon name="grid" size={16}/>Cartes</button>
      </div>
    </div>
    {rows.length ? view === 'list' ? <div className="website-request-list">
      <p className="website-request-scroll-hint"><Icon name="arrow" size={14}/>Faites défiler le tableau pour voir les statuts et les actions.</p>
      <div className="website-request-table-scroll" role="region" aria-label="Liste des demandes du site" tabIndex={0}>
        <table className="website-request-table">
          <caption className="sr-only">Demandes de réparation créées sur le site, avec leur console, client, panne, date, statut et actions.</caption>
          <colgroup><col className="website-request-col-console"/><col className="website-request-col-client"/><col className="website-request-col-symptoms"/><col className="website-request-col-date"/><col className="website-request-col-stage"/><col className="website-request-col-actions"/></colgroup>
          <thead><tr><th scope="col">Dossier / console</th><th scope="col">Client</th><th scope="col">Panne signalée</th><th scope="col">Demandée le</th><th scope="col">Statut</th><th scope="col">Actions</th></tr></thead>
          <tbody>{rows.map(repair => {
            const item = consoles.get(repair.consoleId);
            const client = item?.clientId ? clients.get(item.clientId) : undefined;
            const action = repair.stage==='diagnostic'&&repair.proposal?.decision!=='repair' ? {stage:'diagnostic' as Stage,label:repair.proposal?'Voir la proposition':'Préparer la proposition',icon:'note'} : nextAction[repair.stage];
            const stage = stageInfo(repair.stage);
            return <tr key={repair.id} aria-label={`Demande ${repair.code}`}>
              <th scope="row"><div className="website-request-list-console"><div className="website-request-art">{item ? item.photos.length ? <ConsoleVisual item={item} small/> : <ShopConsoleArt item={item}/> : <Icon name="gamepad" size={26}/>}</div><div><button type="button" className="website-request-list-title" onClick={() => go('/repairs/' + repair.id)}>{item ? [item.brand, item.model].join(' ') : repair.title}</button><span className="mono">{repair.code}</span>{item?.variant && <small>{item.variant}</small>}{item?.serial && <small>N° de série : {item.serial}</small>}</div></div></th>
              <td><div className="website-request-list-client">{client ? <><button type="button" className="text-link" onClick={() => go('/clients/' + client.id)}>{client.name}<Icon name="right" size={12}/></button>{client.email && <a href={`mailto:${encodeURIComponent(client.email)}`}>{client.email}</a>}{client.phone && <a href={`tel:${client.phone.replace(/\s/g, '')}`}>{client.phone}</a>}</> : <span>Client non renseigné</span>}</div></td>
              <td>{repair.symptoms.length > 130 ? <details className="website-request-list-symptoms"><summary aria-label={`Panne signalée du dossier ${repair.code}`}><span>{repair.symptoms}</span><small>Lire la panne<Icon name="down" size={12}/></small></summary><p>{repair.symptoms}</p></details> : <p className="website-request-list-short-symptoms">{repair.symptoms || 'Aucun symptôme renseigné.'}</p>}</td>
              <td className="website-request-list-dates"><time dateTime={repair.createdAt}>{dateFmt(repair.createdAt)}</time><small>{repair.completedAt ? 'Clôturée le' : 'Mise à jour le'}<time dateTime={repair.completedAt || repair.updatedAt}>{dateFmt(repair.completedAt || repair.updatedAt)}</time></small></td>
              <td><Badge tone={stage.color}>{repair.proposal?.decision==='pending'?'Accord client attendu':repair.proposal?.decision==='return'?(repair.proposal.returnedAt?'Retour expédié':repair.proposal.returnFee>0&&!repair.proposal.returnPaidAt?'Virement retour attendu':'Retour à préparer'):repair.proposal?.decision==='buyback'?(repair.proposal.buybackCompletedAt?'Rachat finalisé':'Rachat à finaliser'):repair.stage === 'terminee' ? 'Prête à récupérer' : stage.label}</Badge>{repair.stage === 'terminee' && <span className="website-request-completed">Réparation terminée</span>}</td>
              <td><div className="website-request-list-actions"><button type="button" className="btn secondary" onClick={() => go('/repairs/' + repair.id)} aria-label={`Ouvrir le dossier ${repair.code}`}>Ouvrir le dossier<Icon name="arrow" size={14}/></button>{action && <button type="button" className="btn primary" onClick={() => applyNext(repair)} aria-label={`${action.label} · ${repair.code}`}><Icon name={action.icon} size={14}/>{action.label}</button>}</div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </div> : <div className="website-request-grid">{rows.map(repair => {
      const item = consoles.get(repair.consoleId);
      const client = item?.clientId ? clients.get(item.clientId) : undefined;
      const action = repair.stage==='diagnostic'&&repair.proposal?.decision!=='repair' ? {stage:'diagnostic' as Stage,label:repair.proposal?'Voir la proposition':'Préparer la proposition',icon:'note'} : nextAction[repair.stage];
      const stage = stageInfo(repair.stage);
      return <article className="website-request-card" key={repair.id} aria-label={`Demande ${repair.code}`}>
        <div className="website-request-card-top"><span className="mono">{repair.code}</span><Badge tone={stage.color}>{repair.proposal?.decision==='pending'?'Accord client attendu':repair.proposal?.decision==='return'?(repair.proposal.returnedAt?'Retour expédié':repair.proposal.returnFee>0&&!repair.proposal.returnPaidAt?'Virement retour attendu':'Retour à préparer'):repair.proposal?.decision==='buyback'?(repair.proposal.buybackCompletedAt?'Rachat finalisé':'Rachat à finaliser'):repair.stage === 'terminee' ? 'Prête à récupérer' : stage.label}</Badge></div>
        <div className="website-request-console"><div className="website-request-art">{item ? item.photos.length ? <ConsoleVisual item={item} small/> : <ShopConsoleArt item={item}/> : <Icon name="gamepad" size={35}/>}</div><div><h2><button type="button" onClick={() => go('/repairs/' + repair.id)}>{item ? [item.brand, item.model].join(' ') : repair.title}</button></h2>{item?.variant && <p>{item.variant}</p>}{item?.serial && <small>N° de série : {item.serial}</small>}{repair.stage === 'terminee' && <span className="website-request-completed">Réparation terminée</span>}</div></div>
        <div className="website-request-client"><Icon name="users" size={17}/>{client ? <button type="button" className="text-link" onClick={() => go('/clients/' + client.id)}>{client.name}<Icon name="right" size={13}/></button> : <span>Client non renseigné</span>}</div>
        {client && (client.email || client.phone) && <div className="website-request-contact">{client.email && <a href={`mailto:${encodeURIComponent(client.email)}`}><Icon name="mail" size={14}/>{client.email}</a>}{client.phone && <a href={`tel:${client.phone.replace(/\s/g, '')}`}><Icon name="phone" size={14}/>{client.phone}</a>}</div>}
        <div className="website-request-symptoms"><h3>Panne signalée</h3><p tabIndex={repair.symptoms.length > 250 ? 0 : undefined}>{repair.symptoms || 'Aucun symptôme renseigné.'}</p></div>
        <dl className="website-request-dates"><div><dt>Demande créée</dt><dd><time dateTime={repair.createdAt}>{dateFmt(repair.createdAt)}</time></dd></div><div><dt>{repair.completedAt ? 'Clôturée' : 'Dernière mise à jour'}</dt><dd><time dateTime={repair.completedAt || repair.updatedAt}>{dateFmt(repair.completedAt || repair.updatedAt)}</time></dd></div></dl>
        <div className="website-request-actions"><button type="button" className="btn secondary" onClick={() => go('/repairs/' + repair.id)}>Ouvrir le dossier<Icon name="arrow" size={16}/></button>{action && <button type="button" className="btn primary" onClick={() => applyNext(repair)}><Icon name={action.icon} size={16}/>{action.label}</button>}</div>
      </article>;
    })}</div> : <div className="panel"><Empty icon="inbox" title={requests.length ? 'Aucune demande ne correspond' : 'Les demandes du site arriveront ici'} action={requests.length ? <button type="button" className="btn secondary" onClick={() => {setSearch(''); setGroup('all');}}>Afficher toutes les demandes</button> : undefined}>{requests.length ? 'Modifiez votre recherche ou le filtre pour retrouver un dossier.' : 'Après le formulaire et la création du compte client, chaque demande de réparation apparaît ici en attente d’envoi.'}</Empty></div>}
    <p className="website-request-help"><Icon name="info" size={16}/><span>Cette liste regroupe les demandes créées sur le site. Le dossier donne accès au diagnostic, aux pièces, aux tests et au paiement. Une console prête à récupérer est une réparation terminée ; contactez le client pour organiser sa récupération.</span></p>
  </div>;
}
