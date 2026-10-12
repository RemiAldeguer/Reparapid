import React, {useCallback, useEffect, useRef, useState} from 'react';
import {api} from './api';
import {type Client, dateFmt, timeFmt} from './domain';
import {Badge, Icon, Panel} from './ui';
import './email-notifications.css';

type NotificationStatus = 'pending' | 'sent' | 'failed' | 'cancelled';
type EmailNotification = {
  id: string; clientId: string; consoleId: string; repairId: string;
  to: string; consoleName: string; repairCode: string; stage: string;
  status: NotificationStatus; attempts: number; createdAt: number;
  sentAt: number | null; error: string;
};
type NotificationSummary = {
  configured: boolean; provider: 'resend'; sender: string; replyTo: string;
  issue: string; enabled: boolean;
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
    if (working.current) return;
    working.current = true;
    const token = ++request.current;
    setBusy(id); setLoading(false); setError(''); setMessage('');
    try {
      await api(url, {method, body});
      if (token !== request.current) return;
      const result = await api<NotificationSummary>(endpoint);
      if (token === request.current) {setSummary(result); setMessage(success);}
    } catch (e) {if (token === request.current) setError(errorText(e));}
    finally {working.current = false; if (token === request.current) setBusy('');}
  }
  return {
    summary, loading, error, busy, message, refresh,
    toggle: () => {
      if (!summary?.configured) return;
      return action('toggle', '/api/admin/notifications', {enabled: !summary.enabled}, summary.enabled ? 'Les notifications sont en pause.' : 'Les prochains changements de statut seront notifiés par e-mail.', 'PUT');
    },
    retry: (id: string) => action(id, '/api/admin/notifications/retry', {id}, 'L’e-mail est remis en attente d’envoi.'),
  };
}

function ConfigurationBadge({summary}: {summary: NotificationSummary}) {
  return <Badge tone={!summary.configured ? 'amber' : summary.enabled ? 'green' : 'slate'}>{!summary.configured ? 'À configurer' : summary.enabled ? 'Activé' : 'En pause'}</Badge>;
}

function NotificationHistory({summary, busy, onRetry}: {summary: NotificationSummary; busy: string; onRetry: (id: string) => void}) {
  return <div className="notification-history">
    <h3>Derniers e-mails</h3>
    {summary.recent.length ? <ol>{summary.recent.map(item => {
      const date = new Date(item.sentAt || item.createdAt).toISOString();
      const canRetry = item.status === 'failed' && summary.configured && summary.enabled && Date.now() - item.createdAt < 23 * 60 * 60 * 1000;
      return <li key={item.id} className={`notification-item ${item.status}`}>
        <span className="notification-item-icon"><Icon name={item.status === 'sent' ? 'check' : item.status === 'failed' ? 'alert' : item.status === 'cancelled' ? 'close' : 'mail'} size={17}/></span>
        <div className="notification-item-content">
          <div className="notification-item-heading"><strong>{item.consoleName}</strong><Badge tone={statusTones[item.status]}>{statusLabels[item.status]}</Badge></div>
          <p><span className="mono">{item.repairCode}</span><span className="notification-divider">·</span>{item.stage}</p>
          <span className="notification-recipient">{item.to}</span>
          <time dateTime={date}>{dateFmt(date)} à {timeFmt(date)}</time>
          {item.error && item.status === 'failed' && <p className="notification-delivery-error">{item.error}</p>}
          {canRetry && <button className="text-link" onClick={() => onRetry(item.id)} disabled={!!busy}><Icon name="restore" size={14}/>{busy === item.id ? 'Nouvelle tentative…' : 'Réessayer l’envoi'}</button>}
        </div>
      </li>;
    })}</ol> : <div className="notification-empty"><Icon name="mail" size={22}/><p>Aucun e-mail enregistré pour le moment.<br/>{!summary.configured ? 'Les envois pourront être suivis après configuration du service.' : !summary.enabled ? 'Activez les notifications pour suivre les futurs envois.' : 'Les prochains e-mails de changement de statut apparaîtront ici.'}</p></div>}
  </div>;
}

function Feedback({error, message}: {error: string; message: string}) {
  return <>{error && <p className="notification-feedback error" role="alert">{error}</p>}{message && <p className="notification-feedback" role="status">{message}</p>}</>;
}

export function NotificationSettingsPanel() {
  const {summary, loading, error, busy, message, refresh, toggle, retry} = useNotifications();
  return <Panel title="Notifications par e-mail" className="email-notifications-panel" aside={summary ? <ConfigurationBadge summary={summary}/> : <Icon name="mail" size={19}/>}>
    <div className="panel-body notifications-body">
      <p>Un e-mail informe le client à chaque changement de statut d’une réparation de ses consoles. L’adresse renseignée dans sa fiche client est utilisée.</p>
      {!summary && loading && <p role="status">Chargement des notifications…</p>}
      {summary && <>
        {!summary.configured && <div className="notification-configuration"><Icon name="info" size={18}/><p>Un service d’envoi et une adresse d’expéditeur doivent être configurés pour activer les e-mails.</p></div>}
        {summary.issue && summary.configured && <p className="notification-feedback error" role="alert">{summary.issue}</p>}
        <dl className="notification-sender"><div><dt>Adresse d’expéditeur</dt><dd>{summary.sender || 'Non configurée'}</dd></div>{summary.replyTo && <div><dt>Adresse de réponse</dt><dd>{summary.replyTo}</dd></div>}</dl>
        <div className="notification-controls"><div><strong>{!summary.configured ? 'Envoi non configuré' : summary.enabled ? 'Notifications actives' : 'Notifications en pause'}</strong><p>Seuls les futurs changements de statut déclenchent un envoi. L’historique existant n’est pas envoyé.</p></div><button className={`btn ${!summary.configured || summary.enabled ? 'secondary' : 'primary'}`} disabled={!summary.configured || !!busy || loading} onClick={() => void toggle()}><Icon name={!summary.configured ? 'settings' : summary.enabled ? 'pause' : 'mail'} size={16}/>{!summary.configured ? 'Configuration requise' : busy === 'toggle' ? 'Enregistrement…' : summary.enabled ? 'Mettre en pause' : 'Activer les e-mails'}</button></div>
        <ul className="notification-counts" aria-label="Bilan des notifications"><li><strong>{summary.counts.sent}</strong><span>envoyés</span></li><li><strong>{summary.counts.pending}</strong><span>en attente</span></li><li className={summary.counts.failed ? 'has-errors' : ''}><strong>{summary.counts.failed}</strong><span>en échec</span></li><li><strong>{summary.counts.cancelled}</strong><span>annulés</span></li></ul>
        <NotificationHistory summary={summary} busy={busy} onRetry={id => void retry(id)}/>
      </>}
      <Feedback error={error} message={message}/>
    </div>
    <div className="panel-footer"><button className="btn secondary small" disabled={loading || !!busy} onClick={() => void refresh()}><Icon name="restore" size={15}/>{loading ? 'Actualisation…' : 'Actualiser'}</button></div>
  </Panel>;
}

export function ClientNotificationPanel({client}: {client: Client}) {
  const {summary, loading, error, busy, message, refresh, retry} = useNotifications(client.id);
  return <Panel title="Suivi des e-mails au client" className="email-notifications-panel client-notifications-panel" aside={summary ? <ConfigurationBadge summary={summary}/> : <Icon name="mail" size={19}/>}>
    <div className="panel-body notifications-body">
      <div className="notification-client-recipient"><span className="notification-recipient-icon"><Icon name="mail" size={20}/></span><div><span>Adresse de notification</span><strong>{client.email || 'Adresse e-mail à renseigner'}</strong><p>{client.email ? 'Chaque changement de statut de réparation est envoyé à cette adresse lorsque les notifications sont actives.' : 'Ajoutez une adresse e-mail avec « Modifier » sur la fiche client pour recevoir les notifications.'}</p></div></div>
      {!summary && loading && <p role="status">Chargement du suivi des e-mails…</p>}
      {summary && <>
        {!summary.configured ? <p className="notification-configuration-text">Le service d’envoi doit être configuré dans les réglages de l’atelier.</p> : !summary.enabled && <p className="notification-configuration-text">Les notifications sont en pause. Vous pouvez les activer dans les réglages de l’atelier.</p>}
        <a className="text-link" href="#/settings">Réglages des notifications<Icon name="arrow" size={14}/></a>
        <NotificationHistory summary={summary} busy={busy} onRetry={id => void retry(id)}/>
      </>}
      <Feedback error={error} message={message}/>
    </div>
    <div className="panel-footer"><button className="btn secondary small" disabled={loading || !!busy} onClick={() => void refresh()}><Icon name="restore" size={15}/>{loading ? 'Actualisation…' : 'Actualiser les e-mails'}</button></div>
  </Panel>;
}
