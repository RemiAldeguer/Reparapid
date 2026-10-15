import {useEffect, useRef, useState, type FormEvent} from 'react';
import {flushSync} from 'react-dom';
import {Icon} from './ui';
import {StorefrontShell, ShopConsoleArt} from './public-home';
import {clientApi, ClientApiError, type ClientSession, type IntakeShop} from './client-api';
import {INTAKE_MODELS, faultSuggestions, validateIntakeInput, type IntakeInput} from './repair-intake-domain';
import {createSessionEpoch, observeSessionPrivacy, type SessionTicket} from './session-privacy';
import {RepairPackageOffers, RepairPackageSummary} from './repair-package-display';
import type {PublishedRepairPackage} from './domain';
import './repair-intake.css';

const modelName = (item: {id: string; brand: string; model: string}) => item.id === 'other' ? 'Autre console' : item.model.toLocaleLowerCase('fr').startsWith(item.brand.toLocaleLowerCase('fr')) ? item.model : `${item.brand} ${item.model}`;
const emptyDraft = (): IntakeInput => ({requestId: crypto.randomUUID(), modelId: '', customModel: '', selectedFaults: [], description: '', serial: '', accessories: ''});
const intakeBrands = ['Toutes', 'Sony', 'Nintendo', 'Microsoft', 'Sega', 'Autre'];
function initialSelection() {
  const query = new URLSearchParams(window.location.hash.split('?')[1]);
  const model = INTAKE_MODELS.find(item => item.id === query.get('modele'));
  const requestedBrand = query.get('marque');
  return {modelId: model?.id || '', step: model && model.id !== 'other' ? 1 : 0, brand: model?.brand || (requestedBrand && intakeBrands.includes(requestedBrand) ? requestedBrand : 'Toutes')};
}
export function RepairIntake() {
  const [selection] = useState(initialSelection);
  const [draft, setDraft] = useState(() => ({...emptyDraft(), modelId: selection.modelId})), [step, setStep] = useState(selection.step);
  const [brand, setBrand] = useState(selection.brand);
  const [session, setSession] = useState<ClientSession | null>(null), [mode, setMode] = useState<'register' | 'login'>('register');
  const [shop, setShop] = useState<IntakeShop | null>(null), [shopError, setShopError] = useState('');
  const [repairPackages, setRepairPackages] = useState<PublishedRepairPackage[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [epoch] = useState(createSessionEpoch);
  const mounted = useRef(false), sessionRef = useRef<ClientSession | null>(null), formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null), requestBusy = useRef(false), hidden = useRef(false);
  const current = (ticket: SessionTicket) => mounted.current && epoch.current(ticket);
  const chosen = INTAKE_MODELS.find(item => item.id === draft.modelId);
  const matchingPackages = repairPackages.filter(item => item.modelId === draft.modelId && draft.selectedFaults.includes(item.fault));
  const modelLabel = chosen ? chosen.id === 'other' ? draft.customModel || modelName(chosen) : modelName(chosen) : 'Votre console';
  function clearPrivate() {sessionRef.current = null; setSession(null); formRef.current?.reset(); setDraft(emptyDraft()); setStep(0); setError(''); setBusy(false); requestBusy.current = false;}
  async function checkSession() {
    const ticket = epoch.capture();
    try {const value = await clientApi<ClientSession>('/api/client/repair-intake/session', {signal: ticket.signal, rootWorkshop: true}); if (current(ticket)) {sessionRef.current = value; setSession(value);}}
    catch (failure) {if (current(ticket) && failure instanceof ClientApiError && failure.status === 401) {sessionRef.current = null; setSession(null);}}
  }
  async function loadShop() {
    const ticket = epoch.capture(); setShopError('');
    try {const value = await clientApi<{shop: IntakeShop; repairPackages: PublishedRepairPackage[]}>('/api/public/repair-intake', {signal: ticket.signal, rootWorkshop: true}); if (current(ticket)) {setShop(value.shop); setRepairPackages(value.repairPackages || []);}}
    catch (failure) {if (current(ticket)) setShopError(failure instanceof Error ? failure.message : 'Les informations de l’atelier sont indisponibles.');}
  }
  useEffect(() => {
    document.title = 'Demander une réparation · RépaRapid'; mounted.current = true; void checkSession(); void loadShop();
    const stop = observeSessionPrivacy({
      onPageHide: () => {hidden.current = true; epoch.advance(); flushSync(clearPrivate);},
      onRestore: () => {hidden.current = false; void checkSession(); void loadShop();},
      onVisible: () => {hidden.current = false; void checkSession(); if (!shop) void loadShop();},
      onBackground: () => {hidden.current = true; epoch.advance(); formRef.current?.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(input => {input.value = '';}); requestBusy.current = false; setBusy(false);},
    });
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel('clinique-client-auth') : null;
    if (channel) channel.onmessage = event => {if (event.data?.type === 'logout') {epoch.advance(); flushSync(clearPrivate); setNotice('Vous êtes déconnecté.');} else if (event.data?.type === 'changed') {epoch.advance(); void checkSession();}};
    return () => {mounted.current = false; epoch.advance(); stop(); channel?.close(); sessionRef.current = null; formRef.current?.reset();};
  }, []);
  useEffect(() => {headingRef.current?.focus();}, [step]);
  useEffect(() => {
    if (!session) return;
    const expiry = setTimeout(() => {epoch.advance(); sessionRef.current = null; setSession(null); formRef.current?.reset(); setNotice('Votre session a expiré. Connectez-vous pour envoyer votre demande.');}, Math.max(0, session.expiresAt - Date.now()));
    const interval = setInterval(() => {if (!hidden.current && !requestBusy.current) void checkSession();}, 60000);
    return () => {clearTimeout(expiry); clearInterval(interval);};
  }, [session?.expiresAt]);
  function go(next: number) {
    setError(''); setNotice('');
    if (next > 0 && (!chosen || (draft.modelId === 'other' && !draft.customModel.trim()))) {setError('Choisissez le modèle de votre console.'); return;}
    if (next > 1) {try {validateIntakeInput(draft);} catch (failure) {setError(failure instanceof Error ? failure.message : 'Précisez la panne de votre console.'); return;}}
    setStep(next);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (requestBusy.current || !shop) return;
    const form = event.currentTarget, fields = new FormData(form);
    let intake: IntakeInput; try {intake = validateIntakeInput(draft);} catch (failure) {setError(failure instanceof Error ? failure.message : 'Demande invalide.'); return;}
    const password = String(fields.get('password') || '');
    if (!sessionRef.current && mode === 'register' && password !== String(fields.get('confirmation') || '')) {setError('Les deux mots de passe doivent être identiques.'); return;}
    const ticket = epoch.capture(); requestBusy.current = true; setBusy(true); setError(''); setNotice('');
    form.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(input => {input.value = '';});
    try {
      let result: {repairId: string; repairCode: string};
      let customerSession = sessionRef.current;
      if (!customerSession && mode === 'register') {
        const value = await clientApi<{session: ClientSession; repairId: string; repairCode: string}>('/api/public/repair-intake/register', {method: 'POST', rootWorkshop: true, body: {customer: {name: String(fields.get('name') || '').trim(), email: String(fields.get('email') || '').trim(), phone: String(fields.get('phone') || '').trim(), address: String(fields.get('address') || '').trim()}, password, intake}, signal: ticket.signal});
        customerSession = value.session; result = value;
      } else {
        if (!customerSession) {
          customerSession = await clientApi<ClientSession>('/api/client/auth/login', {method: 'POST', rootWorkshop: true, body: {email: String(fields.get('email') || '').trim(), password}, signal: ticket.signal});
          if (!current(ticket)) return; sessionRef.current = customerSession; setSession(customerSession);
        }
        result = await clientApi<{repairId: string; repairCode: string}>('/api/client/repair-intake', {method: 'POST', rootWorkshop: true, body: {intake}, csrfToken: customerSession.csrfToken, signal: ticket.signal});
      }
      if (!current(ticket)) return;
      sessionRef.current = customerSession; setSession(customerSession); form.reset();
      if ('BroadcastChannel' in window) {const channel = new BroadcastChannel('clinique-client-auth'); channel.postMessage({type: 'changed'}); channel.close();}
      // The public store has one recipient. A tenant query must not redirect this new order into another atelier.
      window.location.replace(`${window.location.pathname}#/espace-client?demande=${encodeURIComponent(result.repairId)}`);
    } catch (failure) {
      if (!current(ticket)) return;
      if (failure instanceof ClientApiError && failure.status === 401) {sessionRef.current = null; setSession(null);}
      setError(failure instanceof Error ? failure.message : 'Votre demande n’a pas pu être enregistrée. Réessayez.');
    } finally {if (current(ticket)) {requestBusy.current = false; setBusy(false);}}
  }
  const brands = intakeBrands;
  const shownModels = INTAKE_MODELS.filter(item => brand === 'Toutes' || item.brand === brand);
  return <StorefrontShell compact><main className="ri-main rp-shell" id="rp-main" tabIndex={-1}><a className="rp-text-link ri-back-home" href="#/accueil"><Icon name="back" size={16}/>Retour à l’accueil</a><div className="ri-heading"><span className="rp-eyebrow">VOTRE DEMANDE DE RÉPARATION</span><h1>On remet votre console en jeu.</h1><p>Le formulaire décrit votre demande. Le diagnostic et le montant sont confirmés par l’atelier.</p></div><ol className="ri-progress" aria-label="Étapes du formulaire">{['Votre console', 'La panne', 'Votre compte'].map((label, index) => <li key={label} className={index === step ? 'current' : index < step ? 'past' : ''} aria-current={index === step ? 'step' : undefined}><span>{index < step ? <Icon name="check" size={15}/> : index + 1}</span>{label}</li>)}</ol><div className="ri-layout"><section className="ri-form-card" aria-busy={busy}><h2 ref={headingRef} tabIndex={-1}>{step === 0 ? 'Quel est le modèle de votre console ?' : step === 1 ? 'Qu’est-ce qui ne fonctionne plus ?' : session ? 'Votre demande est prête.' : 'Retrouvez votre demande dans votre compte.'}</h2>{step === 0 ? <><p className="ri-intro">Choisissez le modèle exact. Si vous ne le trouvez pas, sélectionnez « Autre console ».</p><div className="ri-brands" role="group" aria-label="Filtrer les modèles par marque">{brands.map(item => <button type="button" key={item} aria-pressed={brand === item} onClick={() => setBrand(item)}>{item}</button>)}</div><fieldset className="ri-models"><legend className="sr-only">Modèle de console</legend>{shownModels.map(item => <label className={`ri-model ${draft.modelId === item.id ? 'selected' : ''}`} key={item.id}><input type="radio" name="model" aria-label={modelName(item)} value={item.id} checked={draft.modelId === item.id} onChange={() => {setDraft(value => ({...value, modelId: item.id, customModel: '', selectedFaults: []})); setError('');}}/><span className="ri-model-art" aria-hidden="true"><ShopConsoleArt item={item}/></span><span className="ri-model-name"><small>{item.brand}</small><strong>{item.model}</strong></span><span className="ri-radio-dot"/></label>)}</fieldset>{draft.modelId === 'other' && <label className="ri-field"><span>Marque et modèle de votre console</span><input type="text" required maxLength={120} value={draft.customModel} onChange={event => setDraft({...draft, customModel: event.target.value})} placeholder="Ex. Atari Jaguar"/></label>}<div className="ri-actions"><button className="rp-button rp-primary" type="button" onClick={() => go(1)}>Décrire la panne<Icon name="arrow" size={18}/></button></div></> : step === 1 ? <form onSubmit={event => {event.preventDefault(); go(2);}}><p className="ri-intro">Sélectionnez les symptômes observés sur votre {modelLabel}. Vous pouvez en choisir plusieurs.</p><fieldset className="ri-faults"><legend>Pannes courantes</legend>{faultSuggestions(draft.modelId).map(fault => <label key={fault} className={draft.selectedFaults.includes(fault) ? 'selected' : ''}><input type="checkbox" checked={draft.selectedFaults.includes(fault)} onChange={event => setDraft({...draft, selectedFaults: event.target.checked ? [...draft.selectedFaults, fault] : draft.selectedFaults.filter(value => value !== fault)})}/><span>{fault}</span></label>)}</fieldset><RepairPackageOffers packages={matchingPackages}/><label className="ri-field"><span>Décrivez le problème <small>{draft.selectedFaults.length ? 'Facultatif' : 'Requis si aucune panne sélectionnée'}</small></span><textarea maxLength={3000} rows={4} value={draft.description} onChange={event => setDraft({...draft, description: event.target.value})} placeholder="Depuis quand ? Dans quelles circonstances ? Votre console a-t-elle déjà été ouverte ?"/></label><div className="ri-field-grid"><label className="ri-field"><span>Numéro de série <small>Facultatif</small></span><input maxLength={100} value={draft.serial} onChange={event => setDraft({...draft, serial: event.target.value})} placeholder="Inscrit sur la console"/></label><label className="ri-field"><span>Accessoires prévus <small>Facultatif</small></span><input maxLength={2000} value={draft.accessories} onChange={event => setDraft({...draft, accessories: event.target.value})} placeholder="Ex. chargeur, manette…"/></label></div><p className="ri-hint"><Icon name="info" size={15}/>Ces informations décrivent les symptômes. Elles ne remplacent pas le diagnostic.</p><div className="ri-actions"><button className="rp-text-link" type="button" onClick={() => go(0)}><Icon name="back" size={16}/>Modifier le modèle</button><button className="rp-button rp-primary" type="submit">Continuer<Icon name="arrow" size={18}/></button></div></form> : <form ref={formRef} onSubmit={event => void submit(event)}><fieldset disabled={busy}>{session ? <div className="ri-connected"><span><Icon name="user" size={25}/></span><div><strong>{session.user.name}</strong><p>{session.user.email}</p><small>La demande sera ajoutée à votre espace client RépaRapid.</small></div></div> : <><div className="ri-account-tabs" role="group" aria-label="Accès à votre compte"><button type="button" aria-pressed={mode === 'register'} onClick={() => {setMode('register'); setError(''); formRef.current?.reset();}}>Créer mon compte</button><button type="button" aria-pressed={mode === 'login'} onClick={() => {setMode('login'); setError(''); formRef.current?.reset();}}>J’ai déjà un compte</button></div><p className="ri-intro">{mode === 'register' ? 'Votre compte permet de retrouver la fiche d’envoi et de suivre cette réparation.' : 'Connectez-vous à votre compte client RépaRapid pour ajouter cette demande.'}</p><div className="ri-field-grid">{mode === 'register' && <label className="ri-field ri-wide"><span>Prénom et nom</span><input name="name" required minLength={2} maxLength={120} autoComplete="name" placeholder="Votre nom complet"/></label>}<label className={`ri-field ${mode === 'login' ? 'ri-wide' : ''}`}><span>Adresse e-mail</span><input name="email" required type="email" maxLength={254} autoComplete="username" placeholder="vous@exemple.fr"/></label>{mode === 'register' && <><label className="ri-field"><span>Téléphone</span><input name="phone" type="tel" required maxLength={50} autoComplete="tel" placeholder="06 00 00 00 00"/></label><label className="ri-field ri-wide"><span>Votre adresse complète</span><textarea name="address" required rows={2} maxLength={1000} autoComplete="street-address" placeholder="N° et rue, code postal, ville, pays"/></label></>}<label className={`ri-field ${mode === 'login' ? 'ri-wide' : ''}`}><span>Mot de passe</span><input type="password" name="password" required minLength={mode === 'register' ? 15 : undefined} maxLength={128} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} aria-describedby={mode === 'register' ? 'ri-password-hint' : undefined}/></label>{mode === 'register' && <label className="ri-field"><span>Confirmer le mot de passe</span><input type="password" name="confirmation" required minLength={15} maxLength={128} autoComplete="new-password"/></label>}</div>{mode === 'register' && <p className="ri-hint" id="ri-password-hint">Au moins 15 caractères. Une longue phrase est facile à retenir.</p>}</>}<div className="ri-order-note"><Icon name="package" size={22}/><div><strong>Prochaine étape : préparer votre envoi.</strong><p>Votre dossier apparaîtra « En attente d’envoi ». Depuis votre compte, vous pourrez imprimer la fiche, garder votre talon et joindre la partie atelier à la console.</p></div></div><p className="ri-privacy-note"><Icon name="shield" size={15}/>Vos coordonnées sont utilisées pour gérer votre dossier de réparation.</p><div className="ri-actions"><button className="rp-text-link" type="button" onClick={() => go(1)}><Icon name="back" size={16}/>Revoir la panne</button><button type="submit" className="rp-button rp-primary" disabled={busy || !shop}>{busy ? 'Enregistrement…' : session || mode === 'login' ? 'Enregistrer ma demande' : 'Créer mon compte et ma demande'}{!busy && <Icon name="arrow" size={17}/>}</button></div></fieldset></form>}{notice && <p className="ri-notice" role="status">{notice}</p>}{error && <p className="ri-error" role="alert"><Icon name="alert" size={17}/>{error}</p>}{shopError && <p className="ri-error" role="alert">{shopError}<button type="button" onClick={() => void loadShop()}>Réessayer</button></p>}</section><aside className="ri-summary" aria-label="Récapitulatif de votre demande"><span className="rp-eyebrow">VOTRE DOSSIER</span><div className="ri-summary-art" aria-hidden="true"><ShopConsoleArt item={chosen || {brand: 'Nintendo', model: 'Nintendo Switch'}}/></div><h3>{chosen ? modelLabel : 'Votre prochaine réparation'}</h3>{draft.selectedFaults.length > 0 && <ul>{draft.selectedFaults.map(fault => <li key={fault}><Icon name="check" size={13}/>{fault}</li>)}</ul>}{draft.description && <p className="ri-summary-description">{draft.description}</p>}<RepairPackageSummary packages={matchingPackages} faultCount={draft.selectedFaults.length}/><div className="ri-destination"><Icon name="location" size={20}/><div><span>VOTRE ATELIER</span><strong>{shop?.shopName || 'RépaRapid · Maxxi Games'}</strong><p>{shop?.city || 'Le Kremlin-Bicêtre'}</p></div></div><p className="ri-summary-footnote">Aucun paiement n’est demandé dans ce formulaire.</p></aside></div></main></StorefrontShell>;
}
