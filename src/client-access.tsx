import React, {useEffect, useState} from 'react';
import {api} from './api';
import {useAuth} from './auth';
import {type Client, dateFmt} from './domain';
import {Badge, Field, Icon, Modal, Panel} from './ui';
import './client-access.css';

type ClientAccess = {email: string; enabled: boolean; createdAt: number; updatedAt: number};
type AccessResponse = {access: ClientAccess | null};
type Credentials = {email: string; password: string};
function clientPortalUrl(workshopId: string | null) {
  const scoped = workshopId && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(workshopId);
  return `${window.location.origin}/${scoped ? `?atelier=${encodeURIComponent(workshopId)}` : ''}#/espace-client`;
}

function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
}

function AccessForm({client, access, onClose, onSaved}: {client: Client; access: ClientAccess | null; onClose: () => void; onSaved: (access: ClientAccess) => void}) {
  const {user} = useAuth();
  const [email, setEmail] = useState(access?.email || client.email);
  const [password, setPassword] = useState(''), [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [copied, setCopied] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const portalUrl = clientPortalUrl(user.workshopId);
  const [reset] = useState(() => !!access);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const cleanEmail = email.trim();
      const result = await api<AccessResponse>(`/api/admin/client-access/${encodeURIComponent(client.id)}`, {method: 'POST', body: {email: cleanEmail, password}});
      if (!result.access) throw new Error('L’accès n’a pas été confirmé par le serveur.');
      onSaved(result.access);
      setCredentials({email: result.access.email, password});
      setPassword('');
    } catch (e) {setError(e instanceof Error ? e.message : 'Impossible d’enregistrer cet accès.');}
    finally {setBusy(false);}
  }
  async function copyCredentials() {
    if (!credentials) return;
    setError('');
    try {
      await navigator.clipboard.writeText(`La Clinique Rétro — votre espace client\n${portalUrl}\nAdresse e-mail : ${credentials.email}\nMot de passe : ${credentials.password}`);
      setCopied(true);
    } catch {setError('La copie est indisponible. Vous pouvez sélectionner les identifiants ci-dessus.');}
  }
  return <Modal title={credentials ? 'Les identifiants sont prêts' : reset ? 'Réinitialiser l’accès client' : 'Créer un accès client'} subtitle={client.name} onClose={() => {if (!busy) onClose();}}>
    {credentials ? <>
      <div className="modal-body client-access-credentials">
        <p className="auth-notice" role="status">{reset ? 'Le nouveau mot de passe est enregistré. Les anciennes sessions du client ont été fermées.' : 'L’accès client est créé.'} Transmettez ces identifiants au client.</p>
        <dl><div><dt>Espace client</dt><dd><a href={portalUrl}>{portalUrl}</a></dd></div><div><dt>Adresse e-mail</dt><dd>{credentials.email}</dd></div><div><dt>Mot de passe</dt><dd className="mono client-access-password">{credentials.password}</dd></div></dl>
        <p className="muted small-text">Le mot de passe ne sera plus affiché après fermeture de cette fenêtre. Aucun e-mail n’est envoyé automatiquement.</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
      </div>
      <div className="modal-footer"><button className="btn secondary" onClick={() => void copyCredentials()}><Icon name={copied ? 'check' : 'note'} size={17}/>{copied ? 'Identifiants copiés' : 'Copier les identifiants'}</button><button className="btn primary" onClick={onClose}>Fermer</button></div>
    </> : <form onSubmit={submit}>
      <div className="modal-body client-access-form">
        <p>{reset ? 'Enregistrez un nouveau mot de passe pour cet accès. Le précédent mot de passe et les sessions ouvertes seront invalidés.' : 'Le client pourra consulter uniquement ses consoles et le suivi de ses demandes de réparation.'}</p>
        <Field label="Adresse e-mail de connexion"><input value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="off" maxLength={254} required autoFocus disabled={busy}/></Field>
        <Field label="Mot de passe" hint="De 15 à 128 caractères. Vous pouvez utiliser une phrase ou générer un mot de passe."><input value={password} onChange={event => setPassword(event.target.value)} type={visible ? 'text' : 'password'} autoComplete="new-password" minLength={15} maxLength={128} required disabled={busy}/></Field>
        <div className="button-row"><button type="button" className="btn secondary small" onClick={() => {setPassword(generatePassword()); setVisible(true);}} disabled={busy}>Générer un mot de passe</button><button type="button" className="text-link" onClick={() => setVisible(value => !value)} disabled={busy}>{visible ? 'Masquer' : 'Afficher'}</button></div>
        {error && <p className="auth-error" role="alert">{error}</p>}
      </div>
      <div className="modal-footer"><button type="button" className="btn secondary" onClick={onClose} disabled={busy}>Annuler</button><button type="submit" className="btn primary" disabled={busy}><Icon name="shield" size={17}/>{busy ? 'Enregistrement…' : reset ? 'Enregistrer le nouvel accès' : 'Créer l’accès'}</button></div>
    </form>}
  </Modal>;
}

export function ClientAccessPanel({client}: {client: Client}) {
  const {user} = useAuth();
  const [access, setAccess] = useState<ClientAccess | null>(null);
  const [loading, setLoading] = useState(true), [loaded, setLoaded] = useState(false), [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false), [showDisable, setShowDisable] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [linkCopied, setLinkCopied] = useState(false);
  const endpoint = `/api/admin/client-access/${encodeURIComponent(client.id)}`;
  const portalUrl = clientPortalUrl(user.workshopId);
  useEffect(() => {
    let alive = true;
    setAccess(null); setShowForm(false); setShowDisable(false); setMessage(''); setLinkCopied(false); setBusy(false);
    setLoading(true); setLoaded(false); setError('');
    api<AccessResponse>(endpoint).then(value => {if (alive) {setAccess(value.access); setLoaded(true);}}).catch(e => {if (alive) setError(e instanceof Error ? e.message : 'Impossible de consulter cet accès.');}).finally(() => {if (alive) setLoading(false);});
    return () => {alive = false;};
  }, [endpoint]);
  async function refresh() {
    setLoading(true); setError('');
    try {const value = await api<AccessResponse>(endpoint); setAccess(value.access); setLoaded(true);}
    catch (e) {setError(e instanceof Error ? e.message : 'Impossible de consulter cet accès.');}
    finally {setLoading(false);}
  }
  async function disable() {
    if (!access?.enabled) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await api(endpoint, {method: 'DELETE'});
      setAccess(previous => previous ? {...previous, enabled: false} : null);
      setShowDisable(false); setMessage('Accès désactivé. Les sessions du client sont fermées.');
    } catch (e) {setError(e instanceof Error ? e.message : 'Impossible de désactiver cet accès.');}
    finally {setBusy(false);}
  }
  return <Panel title="Accès à l’espace client" className="client-access-panel" aside={<Icon name="shield" size={19}/>}>
    <div className="panel-body client-access-body">
      {loading ? <p role="status">Chargement de l’accès…</p> : loaded && <>
        <div className="client-access-status"><Badge tone={access?.enabled ? 'green' : 'slate'}>{access?.enabled ? 'Accès actif' : access ? 'Accès désactivé' : 'Aucun accès créé'}</Badge>{access && <span className="small-text muted">Créé le {dateFmt(new Date(access.createdAt).toISOString())}</span>}</div>
        <p>{access ? <><strong>{access.email}</strong><br/>Le client retrouve ses consoles et l’avancement de ses réparations dans son espace.</> : 'Créez des identifiants pour permettre au client de suivre ses réparations.'}</p>
        <div className="client-access-link"><a className="text-link" href={portalUrl} target="_blank" rel="noopener noreferrer">Ouvrir l’espace client<Icon name="arrow" size={15}/></a><button className="text-link" onClick={async () => {setError(''); try {await navigator.clipboard.writeText(portalUrl); setLinkCopied(true);} catch {setError(`La copie est indisponible. Lien : ${portalUrl}`);}}}>{linkCopied ? 'Lien copié' : 'Copier le lien'}</button></div>
        <div className="button-row"><button className="btn primary" onClick={() => {setMessage(''); setError(''); setShowForm(true);}}><Icon name={access ? 'restore' : 'plus'} size={16}/>{access?.enabled ? 'Réinitialiser l’accès' : access ? 'Réactiver l’accès' : 'Créer un accès'}</button>{access?.enabled && <button className="btn secondary danger-text" onClick={() => {setError(''); setShowDisable(true);}}>Désactiver l’accès</button>}</div>
      </>}
      {message && <p className="auth-notice" role="status">{message}</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      {!loading && !loaded && <button className="btn secondary" onClick={() => void refresh()}>Réessayer</button>}
    </div>
    {showForm && <AccessForm client={client} access={access} onClose={() => setShowForm(false)} onSaved={value => {setAccess(value); setLoaded(true); setMessage('Accès client enregistré.');}}/>}
    {showDisable && access?.enabled && <Modal title="Désactiver l’accès client ?" subtitle={client.name} onClose={() => {if (!busy) setShowDisable(false);}}><div className="modal-body"><p className="confirm-body">{access.email} ne pourra plus se connecter. Ses sessions ouvertes seront fermées. Vous pourrez réactiver son accès avec un nouveau mot de passe.</p>{error && <p className="auth-error" role="alert">{error}</p>}</div><div className="modal-footer"><button className="btn secondary" onClick={() => setShowDisable(false)} disabled={busy}>Annuler</button><button className="btn danger" onClick={() => void disable()} disabled={busy}>{busy ? 'Désactivation…' : 'Désactiver l’accès'}</button></div></Modal>}
  </Panel>;
}
