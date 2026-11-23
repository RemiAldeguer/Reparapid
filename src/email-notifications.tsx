import React, {useCallback, useEffect, useRef, useState} from 'react';
import {api} from './api';
import {type Client, dateFmt, timeFmt} from './domain';
import {Badge, Icon, Modal, Panel} from './ui';
import {PageHeader} from './pages';
import './email-notifications.css';

type NotificationStatus = 'pending' | 'sent' | 'failed' | 'cancelled';
type NotificationAudience = 'client' | 'shop';
type NotificationPreferences = Record<NotificationAudience, Record<string, boolean>>;
type EmailNotification = {
  id: string; clientId: string; consoleId: string; repairId: string;
  to: string; consoleName: string; repairCode: string; stage: string;
  status: NotificationStatus; attempts: number; createdAt: number;
  sentAt: number | null; error: string;
  audience: NotificationAudience; eventType: string; eventLabel: string;
};
type NotificationSummary = {
  configured: boolean; provider: 'resend'; sender: string; replyTo: string;
  issue: string; enabled: boolean; testRecipient?: string;
  events: {key: string; label: string}[];
  preferences: NotificationPreferences;
  shopRecipient: string; shopRecipientMissing: boolean;
  counts: Record<NotificationStatus, number>;
  recent: EmailNotification[];
};

const statusLabels: Record<NotificationStatus, string> = {pending: 'En attente', sent: 'Envoyé', failed: 'Échec de l’envoi', cancelled: 'Annulé'};
const statusTones: Record<NotificationStatus, string> = {pending: 'amber', sent: 'green', failed: 'red', cancelled: 'slate'};
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Impossible de consulter les notifications.';

function useNotifications(clientId?: string) {
  const endpoint = `/api/admin/notifications${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ''}`;
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [busy, setBusy] = useState(''), [message, setMessage] = useState('');
  const request = useRef(0), working = useRef(false);
  const refresh = useCallback(async (silent = false) => {
    if (working.current) return;
    const token = ++request.current;
    if (!silent) {setLoading(true); setError(''); setMessage('');}
    try {
      const result = await api<NotificationSummary>(endpoint);
      if (token === request.current) {setSummary(result); setError('');}
    } catch (e) {if (token === request.current) setError(errorText(e));}
    finally {if (token === request.current) setLoading(false);}
  }, [endpoint]);
  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {if (document.visibilityState === 'visible') void refresh(true);}, 30000);
    return () => {clearInterval(interval); request.current++;};
  }, [refresh]);
  async function action(id: string, url: string, body: unknown, success: string, method = 'POST') {
    if (working.current) return false;
    working.current = true;
    const token = ++request.current;
    setBusy(id); setLoading(false); setError(''); setMessage('');
    try {
      await api(url, {method, body});
      if (token !== request.current) return false;
      const result = await api<NotificationSummary>(endpoint);
      if (token === request.current) {setSummary(result); setMessage(success); return true;}
    } catch (e) {if (token === request.current) setError(errorText(e));}
    finally {working.current = false; if (token === request.current) setBusy('');}
    return false;
  }
  return {
    summary, loading, error, busy, message, refresh,
    toggle: () => {
      if (!summary?.configured) return;
      return action('toggle', '/api/admin/notifications', {enabled: !summary.enabled}, summary.enabled ? 'Les notifications sont en pause.' : 'Les prochains événements sélectionnés seront notifiés par e-mail.', 'PUT');
    },
    savePreferences: (preferences: NotificationPreferences) => action('preferences', '/api/admin/notifications', {preferences}, 'Les préférences sont enregistrées pour les prochains événements. Aucun ancien événement n’est envoyé.', 'PUT'),
    retry: (id: string) => action(id, '/api/admin/notifications/retry', {id}, 'L’e-mail est remis en attente d’envoi.'),
  };
}

function ConfigurationBadge({summary}: {summary: NotificationSummary}) {
  return <Badge tone={!summary.configured ? 'amber' : summary.enabled ? 'green' : 'slate'}>{!summary.configured ? 'À configurer' : summary.enabled ? 'Activé' : 'En pause'}</Badge>;
}

function TestRoutingNotice({summary}: {summary: NotificationSummary}) {
  if (!summary.testRecipient) return null;
  return <div className="notification-configuration notification-test-routing" role="status"><Icon name="info" size={18}/><p><strong>Mode test : destinataire unique</strong><br/>Les prochains e-mails clients et magasin seront envoyés uniquement à <strong>{summary.testRecipient}</strong>, lorsque le service d’envoi sera actif.</p></div>;
}

function NotificationHistory({summary, busy, onRetry, clientOnly = false}: {summary: NotificationSummary; busy: string; onRetry: (id: string) => void; clientOnly?: boolean}) {
  const recent = clientOnly ? summary.recent.filter(item => item.audience !== 'shop') : summary.recent;
  return <div className="notification-history">
    <h3>Derniers e-mails</h3>
    {recent.length ? <ol>{recent.map(item => {
      const date = new Date(item.sentAt || item.createdAt).toISOString();
      const canRetry = item.status === 'failed' && summary.configured && summary.enabled
        && (item.audience === 'client' || item.audience === 'shop')
        && summary.preferences[item.audience]?.[item.eventType] === true
        && Date.now() - item.createdAt < 23 * 60 * 60 * 1000;
      return <li key={item.id} className={`notification-item ${item.status}`}>
        <span className="notification-item-icon"><Icon name={item.status === 'sent' ? 'check' : item.status === 'failed' ? 'alert' : item.status === 'cancelled' ? 'close' : 'mail'} size={17}/></span>
        <div className="notification-item-content">
          <div className="notification-item-heading"><strong>{item.consoleName}</strong><Badge tone={statusTones[item.status]}>{statusLabels[item.status]}</Badge></div>
          <p><span className="mono">{item.repairCode}</span><span className="notification-divider">·</span>{item.eventLabel || item.stage}</p>
          <span className="notification-recipient">{item.audience === 'shop' ? 'Magasin' : 'Client'} · destinataire prévu : {item.to}</span>
          <time dateTime={date}>{dateFmt(date)} à {timeFmt(date)}</time>
          {item.error && item.status === 'failed' && <p className="notification-delivery-error">{item.error}</p>}
          {canRetry && <button className="text-link" onClick={() => onRetry(item.id)} disabled={!!busy}><Icon name="restore" size={14}/>{busy === item.id ? 'Nouvelle tentative…' : 'Réessayer l’envoi'}</button>}
        </div>
      </li>;
    })}</ol> : <div className="notification-empty"><Icon name="mail" size={22}/><p>Aucun e-mail enregistré pour le moment.<br/>{!summary.configured ? 'Les envois pourront être suivis après configuration du service.' : !summary.enabled ? 'Activez les notifications pour suivre les futurs envois.' : 'Les prochains e-mails des événements sélectionnés apparaîtront ici.'}</p></div>}
  </div>;
}

function Feedback({error, message}: {error: string; message: string}) {
  return <>{error && <p className="notification-feedback error" role="alert">{error}</p>}{message && <p className="notification-feedback" role="status">{message}</p>}</>;
}

type NotificationEvent = NotificationSummary['events'][number];
type NotificationPreview = {
  eventType: string; eventLabel: string; audience: NotificationAudience; variant: string;
  variants: {key: string; label: string}[];
  subject: string; text: string; html: string; recipient: string; sender: string; sample: true;
};

const eventDescriptions: Record<string, string> = {
  created: 'Confirmation de la demande ou de l’ouverture du dossier.',
  'attente-envoi': 'Consignes pour imprimer la fiche et préparer le colis.',
  reception: 'Confirmation de l’arrivée de la console à l’atelier.',
  diagnostic: 'Annonce de l’analyse en cours par le magasin.',
  'attente-pieces': 'Information sur l’attente des pièces nécessaires.',
  reparation: 'Annonce du début de l’intervention.',
  tests: 'Information sur les contrôles de fonctionnement.',
  terminee: 'Invitation à organiser le retrait ou le retour.',
  irreparable: 'Invitation à consulter les options après diagnostic.',
  abandonnee: 'Information sur la clôture de l’intervention.',
  'proposal-published': 'Devis disponible ou proposition pour une console irréparable.',
  'proposal-decided': 'Confirmation du choix : réparation, retour ou rachat.',
  'return-transfer-declared': 'Déclaration du virement ; réception encore à confirmer.',
  'return-payment-confirmed': 'Confirmation du virement reçu par le magasin.',
  'return-dispatched': 'Confirmation du départ, avec le suivi lorsqu’il est renseigné.',
  'buyback-completed': 'Confirmation de la finalisation du rachat pour pièces.',
  'withdrawal-requested': 'Confirmation de la déclaration de rétractation enregistrée.',
};

function NotificationPreviewDialog({event, onClose}: {event: NotificationEvent; onClose: () => void}) {
  const [audience, setAudience] = useState<NotificationAudience>('client');
  const [variant, setVariant] = useState(''), [format, setFormat] = useState<'html' | 'text'>('html');
  const [preview, setPreview] = useState<NotificationPreview | null>(null);
  const [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setPreview(null); setError('');
    const query = new URLSearchParams({event: event.key, audience});
    if (variant) query.set('variant', variant);
    void api<NotificationPreview>(`/api/admin/notifications/preview?${query}`).then(result => {
      if (current) setPreview(result);
    }).catch(reason => {if (current) setError(errorText(reason));});
    return () => {current = false;};
  }, [event.key, audience, variant, attempt]);
  // The production template is isolated without scripts, remote assets, forms
  // or links. Keep the frame scrollable so long messages remain readable.
  const document = preview?.html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">`).replace(/href="[^"]*"/g, 'aria-disabled="true"');
  return <Modal title="Aperçu de l’e-mail" subtitle={event.label} onClose={onClose} wide>
    <div className="modal-body notification-preview-body">
      <p className="notification-preview-note"><Icon name="info" size={17}/><span>Exemple avec des données fictives, issu du modèle d’envoi. Aucun e-mail n’est envoyé et les liens sont désactivés.</span></p>
      <fieldset className="notification-preview-audience"><legend>Destinataire</legend>
        {(['client', 'shop'] as const).map(value => <label key={value} className={audience === value ? 'selected' : ''}><input type="radio" name="preview-audience" value={value} checked={audience === value} onChange={() => setAudience(value)}/><Icon name={value === 'client' ? 'user' : 'wrench'} size={16}/>{value === 'client' ? 'Client' : 'Magasin / administrateurs'}</label>)}
      </fieldset>
      {preview && preview.variants.length > 1 && <label className="field notification-preview-scenario"><span>Situation à prévisualiser</span><select value={preview.variant} onChange={e => setVariant(e.target.value)}>{preview.variants.map(item => <option value={item.key} key={item.key}>{item.label}</option>)}</select></label>}
      {error ? <div className="notification-preview-error"><p className="notification-feedback error" role="alert">{error}</p><button className="btn secondary small" onClick={() => setAttempt(value => value + 1)}>Réessayer l’aperçu</button></div> : !preview ? <p className="notification-preview-loading" role="status">Chargement de l’aperçu…</p> : <>
        <dl className="notification-preview-envelope"><div><dt>À</dt><dd>{preview.recipient}</dd></div><div><dt>De</dt><dd>{preview.sender}</dd></div><div><dt>Objet</dt><dd>{preview.subject}</dd></div></dl>
        <div className="notification-preview-formats" role="group" aria-label="Format de l’aperçu"><button type="button" className={`btn small ${format === 'html' ? 'primary' : 'secondary'}`} aria-pressed={format === 'html'} onClick={() => setFormat('html')}>Mise en page</button><button type="button" className={`btn small ${format === 'text' ? 'primary' : 'secondary'}`} aria-pressed={format === 'text'} onClick={() => setFormat('text')}>Version texte</button></div>
        {format === 'html' ? <iframe className="notification-preview-html" title={`Version visuelle : ${preview.subject}`} sandbox="" referrerPolicy="no-referrer" srcDoc={document} tabIndex={0}/> : <pre className="notification-preview-text" tabIndex={0}>{preview.text}</pre>}
      </>}
    </div>
    <div className="modal-footer"><button type="button" className="btn secondary" onClick={onClose}>Fermer l’aperçu</button></div>
  </Modal>;
}

function NotificationPreferencesForm({summary, busy, loading, onSave, onPreview}: {
  summary: NotificationSummary; busy: string; loading: boolean;
  onSave: (preferences: NotificationPreferences) => Promise<boolean>;
  onPreview: (event: NotificationEvent) => void;
}) {
  const [draft, setDraft] = useState<NotificationPreferences | null>(null);
  const preferences = draft || summary.preferences;
  const dirty = summary.events.some(({key}) => (['client', 'shop'] as const).some(audience => preferences[audience][key] !== summary.preferences[audience][key]));
  const groups = [
    {label: 'Suivi de la réparation', events: summary.events.filter(event => !/^(proposal|return|buyback|withdrawal)-/.test(event.key))},
    {label: 'Diagnostic et choix du client', events: summary.events.filter(event => event.key.startsWith('proposal-'))},
    {label: 'Retour, rétractation et rachat', events: summary.events.filter(event => /^(return|buyback|withdrawal)-/.test(event.key))},
  ];
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dirty && await onSave(preferences)) setDraft(null);
  }
  function change(audience: NotificationAudience, key: string, checked: boolean) {
    setDraft(current => {
      const value = current || summary.preferences;
      return {...value, [audience]: {...value[audience], [key]: checked}};
    });
  }
  return <form className="notification-preferences" onSubmit={event => void save(event)}>
    <div className="notification-preferences-intro"><h3>Un e-mail à chaque moment du parcours</h3><p>Choisissez qui prévenir, puis enregistrez. Les aperçus restent disponibles même lorsque les envois sont désactivés ou à configurer.</p></div>
    <table className="notification-preferences-table">
      <caption className="sr-only">Activer ou désactiver les e-mails pour chaque événement et destinataire</caption>
      <thead><tr><th scope="col">Moment du parcours</th><th scope="col">Client</th><th scope="col">Magasin <small>Administrateurs</small></th><th scope="col"><span className="sr-only">Aperçu du contenu</span></th></tr></thead>
      {groups.filter(group => group.events.length).map(group => <tbody key={group.label}>
        <tr className="notification-preference-group"><th scope="rowgroup" colSpan={4}>{group.label}</th></tr>
        {group.events.map(event => <tr key={event.key}>
          <th scope="row"><strong>{event.label}</strong><span className="notification-event-description">{eventDescriptions[event.key] || 'Information sur l’avancement du dossier.'}</span></th>
          {(['client', 'shop'] as const).map(audience => <td key={audience}><label className="notification-preference-switch">
            <span className="notification-mobile-audience">{audience === 'client' ? 'Client' : 'Magasin'}</span>
            <input type="checkbox" role="switch" checked={preferences[audience][event.key]} disabled={!!busy || loading} onChange={e => change(audience, event.key, e.target.checked)}/>
            <span className="notification-switch-track" aria-hidden="true"/>
            <span className="notification-switch-state" aria-hidden="true">{preferences[audience][event.key] ? 'Activé' : 'Désactivé'}</span>
            <span className="sr-only">{audience === 'client' ? 'Client' : 'Magasin / administrateurs'} : {event.label}</span>
          </label></td>)}
          <td className="notification-preview-cell"><button type="button" className="btn secondary small" onClick={() => onPreview(event)} aria-label={`Prévisualiser : ${event.label}`}><Icon name="mail" size={15}/>Prévisualiser</button></td>
        </tr>)}
      </tbody>)}
    </table>
    <div className="notification-preferences-save"><p role="status">{dirty ? 'Modifications non enregistrées.' : 'Les choix enregistrés s’appliquent aux prochains événements, sans rejouer l’historique.'}</p><button type="submit" className="btn primary" disabled={!dirty || !!busy || loading}><Icon name="check" size={16}/>{busy === 'preferences' ? 'Enregistrement…' : 'Enregistrer les préférences'}</button></div>
  </form>;
}

export function EmailNotifications() {
  const {summary, loading, error, busy, message, refresh, toggle, retry, savePreferences} = useNotifications();
  const [previewEvent, setPreviewEvent] = useState<NotificationEvent | null>(null);
  return <div className="email-management">
    <PageHeader eyebrow="COMMUNICATION" title="Les e-mails du parcours" description="Les bons messages, au bon moment, pour vos clients et votre magasin.">
      <button className="btn secondary" disabled={loading || !!busy} onClick={() => void refresh()}><Icon name="restore" size={16}/>{loading ? 'Actualisation…' : 'Actualiser'}</button>
    </PageHeader>
    {!summary && loading && <p className="notification-feedback" role="status">Chargement des e-mails…</p>}
    <Feedback error={error} message={message}/>
    {summary && <>
      <Panel title="Envoi des e-mails" className="email-notifications-panel notification-delivery-panel" aside={<ConfigurationBadge summary={summary}/>}>
        <div className="panel-body notifications-body">
          <TestRoutingNotice summary={summary}/>
          {!summary.configured && <div className="notification-configuration"><Icon name="info" size={18}/><p>{summary.issue || 'Le service d’envoi reste à configurer.'} Vous pouvez déjà préparer les activations et prévisualiser tous les messages.</p></div>}
          {summary.issue && summary.configured && <p className="notification-feedback error" role="alert">{summary.issue}</p>}
          <div className="notification-controls"><div><strong>{!summary.configured ? 'Envoi non configuré' : summary.enabled ? 'Notifications actives' : 'Notifications en pause'}</strong><p>La pause concerne les clients et le magasin. Réactiver les e-mails ne renvoie pas les événements passés.</p></div><button className={`btn ${!summary.configured || summary.enabled ? 'secondary' : 'primary'}`} disabled={!summary.configured || !!busy || loading} onClick={() => void toggle()}><Icon name={!summary.configured ? 'settings' : summary.enabled ? 'pause' : 'mail'} size={16}/>{!summary.configured ? 'Configuration requise' : busy === 'toggle' ? 'Enregistrement…' : summary.enabled ? 'Mettre en pause' : 'Activer les e-mails'}</button></div>
          <details className="notification-addresses"><summary>Adresses d’envoi et de réception</summary><dl className="notification-sender"><div><dt>Expéditeur</dt><dd>{summary.sender || 'Non configuré'}</dd></div>{summary.replyTo && <div><dt>Adresse de réponse</dt><dd>{summary.replyTo}</dd></div>}<div><dt>Magasin / administrateurs</dt><dd>{summary.shopRecipient || 'Adresse de contact à renseigner'}</dd></div><div><dt>Client</dt><dd>L’adresse de contact de sa fiche client.</dd></div></dl><p className="notification-recipient-help">Pour changer l’adresse du magasin : <a href="#/settings">Réglages → Vitrine Reparapid et adresse d’envoi</a>.</p></details>
          {summary.shopRecipientMissing && <div className="notification-configuration"><Icon name="alert" size={18}/><p>Renseignez une adresse de contact valide dans les réglages du magasin pour recevoir les e-mails administrateurs.</p></div>}
        </div>
      </Panel>
      <Panel title="Messages à chaque étape" className="email-notifications-panel notification-template-panel" aside={<span>{summary.events.length} moments du parcours · 2 destinataires</span>}><div className="panel-body notifications-body"><NotificationPreferencesForm summary={summary} busy={busy} loading={loading} onSave={savePreferences} onPreview={setPreviewEvent}/></div></Panel>
      <Panel title="Suivi des envois" className="email-notifications-panel"><div className="panel-body notifications-body">
        <ul className="notification-counts" aria-label="Bilan des notifications"><li><strong>{summary.counts.sent}</strong><span>envoyés</span></li><li><strong>{summary.counts.pending}</strong><span>en attente</span></li><li className={summary.counts.failed ? 'has-errors' : ''}><strong>{summary.counts.failed}</strong><span>en échec</span></li><li><strong>{summary.counts.cancelled}</strong><span>annulés</span></li></ul>
        <NotificationHistory summary={summary} busy={busy} onRetry={id => void retry(id)}/>
      </div></Panel>
    </>}
    {previewEvent && <NotificationPreviewDialog key={previewEvent.key} event={previewEvent} onClose={() => setPreviewEvent(null)}/>}
  </div>;
}

export function ClientNotificationPanel({client}: {client: Client}) {
  const {summary, loading, error, busy, message, refresh, retry} = useNotifications(client.id);
  return <Panel title="Suivi des e-mails au client" className="email-notifications-panel client-notifications-panel" aside={summary ? <ConfigurationBadge summary={summary}/> : <Icon name="mail" size={19}/>}>
    <div className="panel-body notifications-body">
      <div className="notification-client-recipient"><span className="notification-recipient-icon"><Icon name="mail" size={20}/></span><div><span>Adresse de notification</span><strong>{client.email || 'Adresse e-mail à renseigner'}</strong><p>{client.email ? 'Les événements sélectionnés pour le client sont envoyés à cette adresse lorsque les notifications sont actives.' : 'Ajoutez une adresse e-mail avec « Modifier » sur la fiche client pour recevoir les notifications.'}</p></div></div>
      {!summary && loading && <p role="status">Chargement du suivi des e-mails…</p>}
      {summary && <>
        <TestRoutingNotice summary={summary}/>
        {!summary.configured ? <p className="notification-configuration-text">Le service d’envoi reste à configurer. Les préférences sont disponibles dans l’onglet E-mails.</p> : !summary.enabled && <p className="notification-configuration-text">Les notifications sont en pause. Vous pouvez les activer dans l’onglet E-mails.</p>}
        <a className="text-link" href="#/emails">Gérer les e-mails du parcours<Icon name="arrow" size={14}/></a>
        <NotificationHistory summary={summary} busy={busy} onRetry={id => void retry(id)} clientOnly/>
      </>}
      <Feedback error={error} message={message}/>
    </div>
    <div className="panel-footer"><button className="btn secondary small" disabled={loading || !!busy} onClick={() => void refresh()}><Icon name="restore" size={15}/>{loading ? 'Actualisation…' : 'Actualiser les e-mails'}</button></div>
  </Panel>;
}

export function NotificationSettingsPanel() {
  return <Panel title="Les e-mails du parcours"><div className="panel-body"><p className="settings-text">Les activations, les aperçus et le suivi des envois sont dans l’onglet E-mails.</p><a className="btn secondary" href="#/emails"><Icon name="mail" size={17}/>Gérer les e-mails</a></div></Panel>;
}
