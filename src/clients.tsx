import React, {useId, useState} from 'react';
import {useApp} from './store';
import {PageHeader, RepairRows} from './pages';
import {Icon, Modal, Field, Panel, Badge, Empty, ConsoleArt, ConsoleVisual, StateBadge} from './ui';
import {NintendoModelPicker} from './nintendo-model-picker';
import {ClientAccessPanel} from './client-access';
import {ClientNotificationPanel} from './email-notifications';
import {type Client, type ClientRepairInput, type Priority, PRIORITIES, active, createClient, updateClient, createClientRepairs, dateFmt, uid} from './domain';
import './clients.css';

const plural = (count: number, singular: string, pluralForm = `${singular}s`) => `${count} ${count === 1 ? singular : pluralForm}`;
const initials = (name: string) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('fr-FR');
const searchable = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr-FR');

function ClientAvatar({name}: {name: string}) {
  return <span className="client-avatar" aria-hidden="true">{initials(name)}</span>;
}

function ClientForm({client, onClose}: {client?: Client; onClose: () => void}) {
  const {transact, go} = useApp();
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {name: String(form.get('name') || '').trim(), email: String(form.get('email') || '').trim(), phone: String(form.get('phone') || '').trim(), address: String(form.get('address') || '').trim(), notes: String(form.get('notes') || '').trim()};
    let saved = client?.id || '';
    const accepted = transact(store => {
      if (client) updateClient(store, client.id, input);
      else saved = createClient(store, input).id;
    }, client ? 'Fiche client mise à jour.' : 'Client ajouté. Vous pouvez maintenant enregistrer ses consoles.');
    if (accepted) {onClose(); go(`/clients/${saved}`);}
  }
  return <Modal title={client ? 'Modifier le client' : 'Un nouveau client'} subtitle={client ? `${client.code} · ${client.name}` : 'Ses coordonnées et ses consoles, réunies dans une seule fiche.'} onClose={onClose} wide>
    <form onSubmit={submit}>
      <div className="modal-body form-grid">
        <Field label="Nom du client *" className="span-2"><input name="name" defaultValue={client?.name} maxLength={200} placeholder="Prénom et nom, ou nom de société" autoComplete="name" autoFocus required/></Field>
        <Field label="Adresse e-mail"><input name="email" type="email" defaultValue={client?.email} maxLength={254} placeholder="client@exemple.fr" autoComplete="email"/></Field>
        <Field label="Téléphone"><input name="phone" type="tel" defaultValue={client?.phone} maxLength={80} placeholder="06 12 34 56 78" autoComplete="tel"/></Field>
        <Field label="Adresse" className="span-2"><textarea name="address" defaultValue={client?.address} maxLength={1000} placeholder="Adresse postale" autoComplete="street-address" rows={2}/></Field>
        <Field label="Notes sur le client" className="span-2"><textarea name="notes" defaultValue={client?.notes} maxLength={30000} placeholder="Préférences de contact, informations utiles…" rows={3}/></Field>
      </div>
      <div className="modal-footer"><button type="button" className="btn secondary" onClick={onClose}>Annuler</button><button type="submit" className="btn primary"><Icon name="check" size={17}/>{client ? 'Enregistrer' : 'Ajouter le client'}</button></div>
    </form>
  </Modal>;
}

export function Clients() {
  const {data, go} = useApp();
  const [search, setSearch] = useState(''), [filter, setFilter] = useState('all'), [showForm, setShowForm] = useState(false);
  const summaries = data.clients.map(client => {
    const consoles = data.consoles.filter(console => console.clientId === client.id);
    const consoleIds = new Set(consoles.map(console => console.id));
    const repairs = data.repairs.filter(repair => consoleIds.has(repair.consoleId));
    return {client, consoles, repairs, openCount: repairs.filter(active).length};
  });
  const rows = summaries.filter(({client, openCount}) => (filter !== 'active' || openCount > 0) && searchable([client.name, client.code, client.email, client.phone, client.address].join(' ')).includes(searchable(search.trim()))).sort((a, b) => a.client.name.localeCompare(b.client.name, 'fr'));
  const activeCount = summaries.filter(summary => summary.openCount > 0).length;
  return <>
    <PageHeader eyebrow="LES CLIENTS DE LA CLINIQUE" title="Chaque client, toutes ses consoles." description={`${plural(data.clients.length, 'client')} référencé${data.clients.length === 1 ? '' : 's'} · Retrouvez leurs coordonnées et leurs demandes de réparation.`}>
      <button className="btn primary" onClick={() => setShowForm(true)}><Icon name="plus" size={18}/>Nouveau client</button>
    </PageHeader>
    <div className="client-summary"><span><Icon name="users" size={18}/><strong>{data.clients.length}</strong> clients</span><span><Icon name="wrench" size={17}/><strong>{activeCount}</strong> avec des réparations en cours</span></div>
    <div className="toolbar"><div className="search-field"><Icon name="search" size={18}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nom, référence, e-mail ou téléphone…" aria-label="Rechercher un client"/></div><select value={filter} onChange={event => setFilter(event.target.value)} aria-label="Filtrer les clients"><option value="all">Tous les clients</option><option value="active">Réparations en cours</option></select></div>
    <div className="results-line"><span>{plural(rows.length, 'client')} affiché{rows.length === 1 ? '' : 's'}</span>{(search || filter !== 'all') && <button className="text-link" onClick={() => {setSearch(''); setFilter('all');}}>Réinitialiser les filtres</button>}</div>
    {rows.length ? <div className="client-grid">{rows.map(({client, consoles, repairs, openCount}) => <article key={client.id} className="panel client-card">
      <div className="client-card-heading"><ClientAvatar name={client.name}/><div><span className="mono client-code">{client.code}</span><button className="client-name" onClick={() => go(`/clients/${client.id}`)}>{client.name}</button></div><button className="icon-btn" onClick={() => go(`/clients/${client.id}`)} aria-label={`Ouvrir la fiche de ${client.name}`}><Icon name="right" size={18}/></button></div>
      <div className="client-card-contacts">{client.email && <span><Icon name="mail" size={15}/>{client.email}</span>}{client.phone && <span><Icon name="phone" size={15}/>{client.phone}</span>}{!client.email && !client.phone && <span className="muted">Coordonnées à compléter</span>}</div>
      <div className="client-card-footer"><span>{plural(consoles.length, 'console')} · {plural(repairs.length, 'demande')}</span>{openCount > 0 ? <Badge tone="blue">{openCount} en cours</Badge> : <Badge dot={false}>{repairs.length ? 'Dossiers clôturés' : 'Aucune demande'}</Badge>}</div>
    </article>)}</div> : <div className="panel"><Empty icon="users" title={data.clients.length ? 'Aucun client ne correspond' : 'Votre premier client vous attend'} action={<button className="btn primary" onClick={() => setShowForm(true)}><Icon name="plus" size={17}/>Nouveau client</button>}>{data.clients.length ? 'Modifiez votre recherche ou affichez tous les clients.' : 'Créez sa fiche, puis enregistrez une ou plusieurs consoles à réparer.'}</Empty></div>}
    {showForm && <ClientForm onClose={() => setShowForm(false)}/>}
  </>;
}

type IntakeLine = ClientRepairInput & {key: string; variant: string};
const newIntakeLine = (): IntakeLine => ({key: uid(), consoleId: '', brand: '', model: '', variant: '', serial: '', accessories: '', title: '', symptoms: '', priority: 'normale', dueDate: ''});

function ClientIntakeModal({client, onClose}: {client: Client; onClose: () => void}) {
  const {data, transact} = useApp();
  const [lines, setLines] = useState<IntakeLine[]>(() => [newIntakeLine()]);
  const brandSuggestions = useId();
  const colorSuggestions = useId();
  const owned = data.consoles.filter(console => console.clientId === client.id);
  const choices = owned.filter(console => !console.archived && !data.repairs.some(repair => repair.consoleId === console.id && active(repair)));
  function updateLine(key: string, changes: Partial<IntakeLine>) {setLines(previous => previous.map(line => line.key === key ? {...line, ...changes} : line));}
  function chooseConsole(key: string, id: string) {
    const console = choices.find(item => item.id === id);
    updateLine(key, {consoleId: id, brand: console?.brand || '', model: console?.model || '', variant: console?.variant || '', serial: console?.serial || '', accessories: console?.accessories || ''});
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const inputs = lines.map(({key: _key, ...line}) => ({...line, consoleId: line.consoleId || undefined, brand: line.brand.trim(), model: line.model.trim(), variant: line.variant.trim(), serial: line.serial.trim(), accessories: line.accessories.trim(), title: line.title.trim(), symptoms: line.symptoms.trim()}));
    const accepted = transact(store => {createClientRepairs(store, client.id, inputs);}, `${plural(inputs.length, 'dossier')} ouvert${inputs.length === 1 ? '' : 's'} pour ${client.name}.`);
    if (accepted) onClose();
  }
  return <Modal title="Nouvelle demande de réparation" subtitle={`${client.name} · Ajoutez chaque console et la réparation souhaitée.`} onClose={onClose} wide>
    <form onSubmit={submit}>
      <div className="modal-body client-intake-body">
        <div className="client-intake-intro"><Icon name="gamepad" size={20}/><p>Une demande peut regrouper plusieurs consoles. Chacune disposera de son propre dossier dans l’atelier.</p></div>
        <datalist id={brandSuggestions}>{['Nintendo', 'Sony', 'Sega', 'Microsoft', 'Atari', 'SNK', 'NEC', 'Autre'].map(brand => <option key={brand} value={brand}/>)}</datalist>
        <datalist id={colorSuggestions}>{['Gris', 'Noir', 'Blanc', 'Rouge', 'Bleu', 'Rose', 'Violet', 'Jaune', 'Vert', 'Turquoise', 'Orange', 'Argent', 'Or', 'Transparent'].map(color => <option key={color} value={color}/>)}</datalist>
        <div className="client-intake-lines">{lines.map((line, index) => {
          const existing = !!line.consoleId;
          const illustration = choices.find(console => console.id === line.consoleId)?.illustration || 'gameboy';
          return <fieldset className="client-intake-line" key={line.key}>
            <legend>Console {index + 1}</legend>
            <div className="client-intake-line-heading"><span>{existing ? `${line.brand} ${line.model}` : 'Nouvelle console'}</span>{lines.length > 1 && <button type="button" className="text-link danger-text" onClick={() => setLines(previous => previous.filter(item => item.key !== line.key))} aria-label={`Retirer la console ${index + 1}`}><Icon name="close" size={15}/>Retirer</button>}</div>
            <div className="form-grid">
              <Field label="Console à réparer" className="span-2" hint={owned.length > choices.length ? 'Les consoles archivées ou avec un dossier en cours ne sont pas disponibles.' : undefined}><select value={line.consoleId || ''} onChange={event => chooseConsole(line.key, event.target.value)}><option value="">Enregistrer une nouvelle console</option>{choices.filter(console => console.id === line.consoleId || !lines.some(other => other.key !== line.key && other.consoleId === console.id)).map(console => <option key={console.id} value={console.id}>{console.code} · {console.brand} {console.model}{console.serial ? ` · ${console.serial}` : ''}</option>)}</select></Field>
              {existing ? <div className="span-2 client-intake-console"><span className={`mini-visual art-${illustration}`}><ConsoleArt item={{illustration, brand: line.brand, model: line.model, variant: line.variant}} small/></span><div><strong>{line.brand} {line.model}</strong><p>{line.variant && `${line.variant} · `}{line.serial ? `N° de série : ${line.serial}` : 'Numéro de série non renseigné'}{line.accessories ? ` · ${line.accessories}` : ''}</p></div></div> : <>
                <NintendoModelPicker brand={line.brand} model={line.model} onSelect={model => updateLine(line.key, model ? {brand: 'Nintendo', model} : {model: ''})}/>
                <Field label="Marque *"><input value={line.brand} onChange={event => updateLine(line.key, {brand: event.target.value})} list={brandSuggestions} maxLength={80} placeholder="Nintendo, Sony…" required autoFocus={index === 0}/></Field>
                <Field label="Modèle *"><input value={line.model} onChange={event => updateLine(line.key, {model: event.target.value})} maxLength={120} placeholder="Game Boy, PlayStation…" required/></Field>
                <Field label="Couleur / variante"><input value={line.variant} onChange={event => updateLine(line.key, {variant: event.target.value})} list={colorSuggestions} maxLength={150} placeholder="Bleu, rose, noir · Édition…"/></Field>
                <Field label="Numéro de série"><input value={line.serial} onChange={event => updateLine(line.key, {serial: event.target.value})} maxLength={100} placeholder="Optionnel"/></Field>
                <Field label="Accessoires déposés"><input value={line.accessories} onChange={event => updateLine(line.key, {accessories: event.target.value})} maxLength={30000} placeholder="Alimentation, manettes…"/></Field>
                {line.model.trim() && <div className="span-2 selected-console"><ConsoleArt item={{illustration, brand: line.brand, model: line.model, variant: line.variant}} small/><div><strong>{line.brand} {line.model}</strong><small>{line.variant || 'Couleur non renseignée'}</small></div></div>}
              </>}
              <Field label="Objet de la réparation *" className="span-2"><input value={line.title} onChange={event => updateLine(line.key, {title: event.target.value})} maxLength={200} placeholder="Ex. La console ne s’allume plus" required/></Field>
              <Field label="Panne ou demande du client" className="span-2"><textarea value={line.symptoms} onChange={event => updateLine(line.key, {symptoms: event.target.value})} maxLength={30000} placeholder="Décrivez les symptômes, les circonstances et ce que le client souhaite faire réparer." rows={3}/></Field>
              <Field label="Priorité"><select value={line.priority} onChange={event => updateLine(line.key, {priority: event.target.value as Priority})}>{Object.entries(PRIORITIES).map(([priority, label]) => <option key={priority} value={priority}>{label}</option>)}</select></Field>
              <Field label="Échéance souhaitée"><input type="date" value={line.dueDate} onChange={event => updateLine(line.key, {dueDate: event.target.value})}/></Field>
            </div>
          </fieldset>;
        })}</div>
        <div className="client-intake-add"><button type="button" className="btn secondary" disabled={lines.length >= 20} onClick={() => setLines(previous => previous.length < 20 ? [...previous, newIntakeLine()] : previous)}><Icon name="plus" size={17}/>Ajouter une console</button><span>{plural(lines.length, 'console')} · 20 maximum par demande</span></div>
      </div>
      <div className="modal-footer"><button type="button" className="btn secondary" onClick={onClose}>Annuler</button><button type="submit" className="btn primary"><Icon name="check" size={17}/>Créer {plural(lines.length, 'dossier')}</button></div>
    </form>
  </Modal>;
}

export function ClientDetail({id}: {id: string}) {
  const {data, go} = useApp();
  const [showForm, setShowForm] = useState(false), [showIntake, setShowIntake] = useState(false), [filter, setFilter] = useState('all');
  const client = data.clients.find(item => item.id === id);
  if (!client) return <div className="panel"><Empty title="Client introuvable" icon="search" action={<button className="btn primary" onClick={() => go('/clients')}>Retour aux clients</button>}>Cette fiche n’est pas disponible dans l’atelier actuel.</Empty></div>;
  const telephone = /\d/.test(client.phone) ? client.phone.replace(/[^\d+]/g, '') : '';
  const consoles = data.consoles.filter(console => console.clientId === id);
  const consoleIds = new Set(consoles.map(console => console.id));
  const repairs = data.repairs.filter(repair => consoleIds.has(repair.consoleId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const openCount = repairs.filter(active).length;
  const displayedRepairs = repairs.filter(repair => filter === 'all' || (filter === 'active' ? active(repair) : !active(repair)));
  return <>
    <div className="back-link"><button onClick={() => go('/clients')}><Icon name="back" size={17}/>Retour aux clients</button><span className="mono">{client.code}</span></div>
    <PageHeader eyebrow="FICHE CLIENT" title={client.name} description={`Client depuis le ${dateFmt(client.createdAt)} · ${plural(consoles.length, 'console')} enregistrée${consoles.length === 1 ? '' : 's'}.`}>
      <button className="btn secondary" onClick={() => setShowForm(true)}><Icon name="edit" size={17}/>Modifier</button><button className="btn primary" onClick={() => setShowIntake(true)}><Icon name="plus" size={18}/>Nouvelle demande</button>
    </PageHeader>
    <div className="client-detail-grid">
      <Panel title="Coordonnées" aside={<Icon name="user" size={20}/>}><div className="panel-body client-contact-list"><div className="client-contact"><Icon name="mail" size={18}/><div><span>Adresse e-mail</span>{client.email ? <a href={`mailto:${encodeURIComponent(client.email)}`}>{client.email}</a> : <p>Non renseignée</p>}</div></div><div className="client-contact"><Icon name="phone" size={18}/><div><span>Téléphone</span>{telephone ? <a href={`tel:${telephone}`}>{client.phone}</a> : <p>{client.phone || 'Non renseigné'}</p>}</div></div><div className="client-contact"><Icon name="location" size={18}/><div><span>Adresse</span><p className="prewrap">{client.address || 'Non renseignée'}</p></div></div></div></Panel>
      <Panel title="Notes sur le client" aside={<Icon name="note" size={19}/>}><div className="panel-body"><p className="prewrap client-notes">{client.notes || 'Aucune note pour le moment.'}</p></div></Panel>
    </div>
    <ClientAccessPanel key={client.id} client={client}/>
    <ClientNotificationPanel key={`notifications-${client.id}`} client={client}/>
    <div className="client-repair-summary"><span><strong>{repairs.length}</strong> demandes de réparation</span><span><i className="client-stat-dot blue"/><strong>{openCount}</strong> en cours</span><span><i className="client-stat-dot green"/><strong>{repairs.length - openCount}</strong> clôturées</span></div>
    <Panel title="Demandes de réparation" aside={<button className="text-link" onClick={() => go(`/repairs?client=${client.id}`)}>Voir l’atelier<Icon name="arrow" size={15}/></button>}>
      {repairs.length > 0 && <div className="client-repair-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Toutes<span>{repairs.length}</span></button><button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>En cours<span>{openCount}</span></button><button className={filter === 'closed' ? 'active' : ''} onClick={() => setFilter('closed')}>Clôturées<span>{repairs.length - openCount}</span></button></div>}
      {displayedRepairs.length ? <RepairRows repairs={displayedRepairs}/> : <Empty title={repairs.length ? 'Aucun dossier dans cette vue' : 'Aucune demande pour ce client'} icon="wrench" action={!repairs.length ? <button className="btn primary" onClick={() => setShowIntake(true)}>Nouvelle demande</button> : undefined}>{repairs.length ? 'Les autres dossiers restent accessibles dans les onglets ci-dessus.' : 'Ajoutez une ou plusieurs consoles à réparer pour ouvrir leurs dossiers.'}</Empty>}
    </Panel>
    <Panel title={`Les consoles de ${client.name}`} className="client-consoles-panel" aside={<span className="muted small-text">{plural(consoles.length, 'console')}</span>}>
      {consoles.length ? <div className="client-console-grid">{consoles.map(console => <button className="client-console" key={console.id} onClick={() => go(`/inventory/${console.id}`)}><span className={`mini-visual art-${console.illustration}`}><ConsoleVisual item={console} small/></span><div><span className="mono client-code">{console.code}</span><strong>{console.brand} {console.model}</strong><small>{console.serial ? `N° ${console.serial}` : 'Numéro de série non renseigné'}</small><span className="client-console-state"><StateBadge state={console.state}/>{console.archived && <Badge dot={false}>Archivée</Badge>}</span></div><Icon name="right" size={17}/></button>)}</div> : <Empty title="Pas encore de console enregistrée" icon="gamepad">Les consoles ajoutées à une demande apparaîtront ici automatiquement.</Empty>}
    </Panel>
    {showForm && <ClientForm client={client} onClose={() => setShowForm(false)}/>}
    {showIntake && <ClientIntakeModal client={client} onClose={() => setShowIntake(false)}/>}
  </>;
}
