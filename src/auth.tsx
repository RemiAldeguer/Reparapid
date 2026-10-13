import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {flushSync} from 'react-dom';
import { api, ApiError, setSession, type Session, type Admin } from './api';
import { Icon } from './ui';
import {createSessionEpoch, observeSessionPrivacy, type SessionTicket} from './session-privacy';
const AuthContext = createContext<{ user: Admin; logout: () => Promise<void>; signedOut: (message: string) => void } | null>(null);
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('Connexion administrateur requise.');
  return value;
}
function broadcastLogout(source: string) {
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel('clinique-auth'); channel.postMessage({type: 'logout', source}); channel.close();
  }
}
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, saveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true), [serviceError, setServiceError] = useState('');
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => {document.title = session ? 'Gestion du magasin · RépaRapid' : 'Connexion magasin · RépaRapid';}, [!!session]);
  const [epoch] = useState(createSessionEpoch);
  const [tabId] = useState(() => crypto.randomUUID());
  const mounted = useRef(false), currentSession = useRef<Session | null>(null);
  const automaticCheck = useRef(true), loggingOut = useRef(false);
  const current = (ticket: SessionTicket) => mounted.current && epoch.current(ticket);
  function reset(checking: boolean, text = '') {
    currentSession.current = null; setSession(null); saveSession(null);
    setLoading(checking); setBusy(loggingOut.current); setError(''); setServiceError(''); setMessage(text);
  }
  function clear(text: string) {
    automaticCheck.current = false; epoch.advance();
    flushSync(() => reset(false, text));
  }
  function accept(value: Session, ticket: SessionTicket) {
    if (!current(ticket)) return;
    if (value.expiresAt <= Date.now()) {clear('Votre session a expiré. Reconnectez-vous.'); return;}
    if (window.location.hash.split('?')[0].replace(/\/$/, '') === '#/connexion') window.location.replace('#/dashboard');
    currentSession.current = value; setSession(value); saveSession(value);
    setLoading(false); setError(''); setServiceError(''); setMessage('');
  }
  async function check(synchronous = false) {
    if (loggingOut.current || !automaticCheck.current) return;
    const ticket = epoch.advance();
    if (synchronous) flushSync(() => reset(true)); else reset(true);
    try {accept(await api<Session>('/api/auth/me', {signal: ticket.signal}), ticket);}
    catch (e) {
      if (!current(ticket)) return;
      if (e instanceof ApiError && e.status === 401) clear('');
      else {setServiceError(e instanceof Error ? e.message : 'Serveur indisponible.'); setLoading(false);}
    }
  }
  async function revalidate() {
    if (loggingOut.current || !automaticCheck.current) return;
    const previous = currentSession.current;
    if (!previous) {void check(true); return;}
    if (previous.expiresAt <= Date.now()) {clear('Votre session a expiré. Reconnectez-vous.'); return;}
    const ticket = epoch.advance();
    try {accept(await api<Session>('/api/auth/me', {signal: ticket.signal}), ticket);}
    catch (e) {if (current(ticket) && e instanceof ApiError && e.status === 401) clear('Votre session a expiré. Reconnectez-vous.');}
  }
  useEffect(() => {
    mounted.current = true; void check();
    const stop = observeSessionPrivacy({
      onPageHide: () => {epoch.advance(); flushSync(() => reset(true));},
      onRestore: () => {if (automaticCheck.current && !loggingOut.current) void check(true); else flushSync(() => reset(false));},
      onVisible: () => void revalidate(),
      onBackground: () => {epoch.advance();},
    });
    return () => {stop(); mounted.current = false; epoch.advance(); currentSession.current = null; setSession(null);};
  }, []);
  useEffect(() => {
    const expired = () => clear('Votre session est terminée. Reconnectez-vous. Les actions non confirmées ne sont pas garanties enregistrées.');
    window.addEventListener('clinique:expired', expired);
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel('clinique-auth') : null;
    if (channel) channel.onmessage = e => { if (e.data === 'logout' || (e.data?.type === 'logout' && e.data?.source !== tabId)) expired(); };
    return () => { window.removeEventListener('clinique:expired', expired); channel?.close(); };
  }, []);
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {if (document.visibilityState === 'visible') void revalidate();}, 60000);
    const timeout = setTimeout(() => {if (currentSession.current?.expiresAt === session.expiresAt) clear('Votre session a expiré. Reconnectez-vous.');}, Math.max(0, session.expiresAt - Date.now()));
    return () => {clearInterval(interval); clearTimeout(timeout);};
  }, [session?.expiresAt]);
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget, fields = new FormData(form);
    if (loggingOut.current) return;
    automaticCheck.current = true;
    const ticket = epoch.advance();
    setBusy(true); setError(''); setMessage('');
    try {
      const value = await api<Session>('/api/auth/login', { method: 'POST', body: { email: fields.get('email'), password: fields.get('password') }, signal: ticket.signal });
      if (current(ticket)) {form.reset(); accept(value, ticket);}
    } catch (e) {if (current(ticket)) setError(e instanceof Error ? e.message : 'Connexion impossible.');}
    finally {if (current(ticket)) setBusy(false);}
  }
  function signedOut(text: string) { clear(text); broadcastLogout(tabId); }
  async function logout() {
    if (loggingOut.current || !currentSession.current) return;
    loggingOut.current = true; automaticCheck.current = false;
    const ticket = epoch.advance();
    // Capture the CSRF header before removing the authenticated subtree.
    const revoke = api('/api/auth/logout', {method: 'POST'});
    flushSync(() => reset(true));
    broadcastLogout(tabId);
    try {await revoke; if (current(ticket)) clear('Vous êtes déconnecté.');}
    catch (e) {
      if (current(ticket)) {
        clear('L’accès a été fermé sur cet onglet.');
        if (!(e instanceof ApiError && e.status === 401)) setError(`La déconnexion du serveur n’a pas été confirmée. ${e instanceof Error ? e.message : 'Réessayez de vous connecter.'}`);
      }
    } finally {
      loggingOut.current = false;
      if (mounted.current && !currentSession.current) {setLoading(false); setBusy(false);}
    }
  }
  if (loading || serviceError) return <div className="auth-page"><section className="auth-card" aria-live="polite"><img className="auth-brand-logo" src="/reparapid-logo-original.webp" alt="RépaRapid" width={300} height={300}/><h1>Accès magasin</h1><p>{loading ? 'Vérification de votre session…' : serviceError}</p>{!loading && <><p>L’administration nécessite le serveur de l’application. Aucun accès local de secours ne contourne la connexion.</p><button className="btn primary" onClick={() => { setLoading(true); void check(); }}>Réessayer</button></>}</section></div>;
  if (session) return <AuthContext.Provider key={`${session.user.workshopId || 'root'}:${session.user.email}:${session.csrfToken}`} value={{ user: session.user, logout, signedOut }}>{children}</AuthContext.Provider>;
  return <div className="auth-page"><div className="auth-intro"><img className="auth-brand-logo" src="/reparapid-logo-original.webp" alt="RépaRapid" width={300} height={300}/><span className="auth-eyebrow">RÉPARAPID · MAXXI GAMES</span><h1>Le suivi de vos<br/>réparations.</h1><p>Clients, consoles, réparations et stock : retrouvez toute l’activité du magasin au même endroit.</p><div className="auth-motto"><Icon name="gamepad" size={38}/><span>Réparer. Préserver. Rejouer.</span></div></div><section className="auth-card"><span className="auth-lock"><Icon name="shield" size={27}/></span><span className="auth-eyebrow">CONNEXION MAGASIN</span><h2>Bienvenue chez RépaRapid.</h2><p>Connectez-vous pour gérer les dossiers et l’activité de votre atelier.</p>{message && <p className="auth-notice" role="status">{message}</p>}<form onSubmit={login}><label className="field"><span>Adresse e-mail</span><input type="email" name="email" autoComplete="username" maxLength={254} required autoFocus disabled={busy}/></label><label className="field"><span>Mot de passe</span><input type="password" name="password" autoComplete="current-password" maxLength={128} required disabled={busy}/></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="btn primary auth-submit" disabled={busy}>{busy ? 'Connexion…' : 'Accéder au magasin'}<Icon name="arrow" size={18}/></button></form><p className="auth-help">L’accès à la gestion est réservé à l’équipe du magasin. Adressez-vous au responsable de l’atelier pour obtenir vos identifiants.</p><div className="button-row"><a className="text-link auth-other-access" href="#/accueil">Accueil<Icon name="back" size={15}/></a><a className="text-link auth-other-access" href="#/espace-client">Espace client<Icon name="arrow" size={15}/></a></div></section></div>;
}
export function SessionActions() {
  const { logout, user } = useAuth();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <span className="session-actions"><span className="session-email">{user.role === 'super_admin' ? 'Super administrateur' : 'Administrateur'}</span><button className="icon-btn" title="Se déconnecter" aria-label="Se déconnecter" disabled={busy} onClick={async () => {
    setBusy(true); setError(''); try { await logout(); } catch (e) { setError(e instanceof Error ? e.message : 'Déconnexion impossible.'); } finally { setBusy(false); }
  }}><Icon name="logout" size={19}/></button>{error && <span role="alert" className="auth-error session-error">{error}</span>}</span>;
}
