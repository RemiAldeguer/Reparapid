import {useEffect, useRef, useState, type FormEvent, type MouseEvent} from 'react';
import {ConsoleArt, Icon, Logo} from './ui';
import './public-home.css';

const features = [
  {icon: 'users', title: 'Chaque client, chaque console.', description: 'Rassemblez les coordonnées, les consoles et les demandes de réparation dans un même dossier.'},
  {icon: 'grid', title: 'Un atelier qui reste lisible.', description: 'Suivez les réparations dans le kanban, du diagnostic à la remise au client.'},
  {icon: 'package', title: 'Les bonnes pièces, au bon moment.', description: 'Notez les pièces utilisées et celles à demander au client, puis suivez leur réception et leur installation.'},
  {icon: 'euro', title: 'Des paiements faciles à suivre.', description: 'Fixez le montant de l’intervention et distinguez les réparations payées de celles à encaisser.'},
  {icon: 'trend', title: 'Une vue claire sur vos gains.', description: 'Retrouvez les montants encaissés et les coûts des pièces, avec une synthèse par semaine ou par mois.'},
  {icon: 'gamepad', title: 'Vos clients gardent le fil.', description: 'Donnez à chaque client un accès pour suivre ses consoles et les pièces attendues par l’atelier.'},
];

function sectionLink(event: MouseEvent<HTMLAnchorElement>, id: string) {
  event.preventDefault();
  const section = document.getElementById(id);
  section?.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'});
  section?.focus({preventScroll: true});
}

function WorkshopPreview() {
  return <div className="ph-preview-wrap">
    <div className="ph-preview" aria-hidden="true">
      <div className="ph-preview-bar"><span className="ph-window-dots"><i/><i/><i/></span><span>La Clinique Rétro · Atelier</span><Icon name="shield" size={14}/></div>
      <div className="ph-preview-workspace">
        <div className="ph-preview-sidebar"><Logo/><span className="is-active"><Icon name="wrench" size={19}/></span><span><Icon name="gamepad" size={19}/></span><span><Icon name="users" size={19}/></span><span><Icon name="package" size={19}/></span><span><Icon name="trend" size={19}/></span></div>
        <div className="ph-preview-main">
          <div className="ph-preview-heading"><div><span>EXEMPLE D’ATELIER</span><h2>Sur l’établi.</h2></div><span className="ph-preview-add"><Icon name="plus" size={13}/>Réparation</span></div>
          <div className="ph-preview-board">
            <div className="ph-preview-column"><h3><i/>Diagnostic</h3><div className="ph-demo-card"><div className="ph-demo-console"><ConsoleArt item={{model: 'Game Boy Color', variant: 'Violet', brand: 'Nintendo'}} small/></div><span className="ph-demo-brand">NINTENDO</span><strong>Game Boy Color</strong><p>Écran à remplacer</p><div className="ph-demo-card-footer"><span><Icon name="user" size={12}/>Dossier client</span><Icon name="right" size={13}/></div></div></div>
            <div className="ph-preview-column"><h3><i/>En réparation</h3><div className="ph-demo-card"><div className="ph-demo-console"><ConsoleArt item={{model: 'Nintendo Switch Lite', variant: 'Turquoise', brand: 'Nintendo'}} small/></div><span className="ph-demo-brand">NINTENDO</span><strong>Switch Lite</strong><p>Remplacement du joystick</p><div className="ph-demo-card-footer"><span><Icon name="checklist" size={12}/>Tests en cours</span><Icon name="right" size={13}/></div></div></div>
          </div>
          <div className="ph-preview-receipt"><span><Icon name="euro" size={16}/>Paiement client</span><strong><Icon name="check" size={13}/>Reçu</strong></div>
        </div>
      </div>
    </div>
    <div className="ph-preview-part" aria-hidden="true"><span className="ph-preview-part-icon"><Icon name="package" size={21}/></span><div><small>PIÈCE DEMANDÉE AU CLIENT</small><strong>Écran Game Boy Color</strong><span><i/>Livrée à l’atelier</span></div><Icon name="check" size={19}/></div>
    <p className="ph-preview-caption"><span/>Aperçu avec des dossiers fictifs</p>
  </div>;
}

function RegistrationForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const [busy, setBusy] = useState(false), [submitted, setSubmitted] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    mounted.current = true;
    const clearPasswords = () => {
      formRef.current?.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(input => {input.value = '';});
      controller.current?.abort();
    };
    window.addEventListener('pagehide', clearPasswords);
    return () => {mounted.current = false; clearPasswords(); window.removeEventListener('pagehide', clearPasswords);};
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget, values = new FormData(form);
    const password = String(values.get('password') || ''), confirmation = String(values.get('confirmation') || '');
    if (password !== confirmation) {setError('Les deux mots de passe doivent être identiques.'); return;}
    const body = {
      name: String(values.get('name') || '').trim(),
      email: String(values.get('email') || '').trim(),
      workshopName: String(values.get('workshopName') || '').trim(),
      message: String(values.get('message') || '').trim(),
      password,
    };
    form.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(input => {input.value = '';});
    setError(''); setBusy(true);
    const requestController = new AbortController(); controller.current = requestController;
    try {
      // A public request never reads an admin session or changes its authentication state.
      const response = await fetch('/api/public/registrations', {
        method: 'POST', credentials: 'omit', cache: 'no-store',
        signal: AbortSignal.any([requestController.signal, AbortSignal.timeout(30000)]),
        headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body),
      });
      const decoded = await response.json().catch(() => ({}));
      const result = decoded && typeof decoded === 'object' ? decoded : {};
      if (!mounted.current || requestController.signal.aborted) return;
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Votre demande n’a pas pu être envoyée. Réessayez.');
      if (!response.headers.get('content-type')?.includes('application/json') || result.accepted !== true) throw new Error('Le service est momentanément indisponible. Réessayez.');
      form.reset(); setSubmitted(true);
    } catch (failure) {
      if (mounted.current && !requestController.signal.aborted) setError(failure instanceof Error && failure.name !== 'TimeoutError' && failure.name !== 'TypeError' ? failure.message : 'Le serveur est injoignable. Vérifiez votre connexion puis réessayez.');
    } finally {
      if (controller.current === requestController) controller.current = null;
      if (mounted.current) setBusy(false);
    }
  }
  if (submitted) return <div className="ph-registration-card ph-registration-success" role="status">
    <span className="ph-success-icon"><Icon name="check" size={30}/></span>
    <span className="ph-eyebrow">DEMANDE TRANSMISE</span>
    <h3>Votre demande a bien été reçue.</h3>
    <p>Elle est soumise à validation. Vous pourrez vous connecter avec les identifiants choisis une fois votre accès accepté.</p>
    <a className="ph-button ph-button-outline" href="#/connexion">Retour à la connexion<Icon name="arrow" size={17}/></a>
  </div>;
  return <div className="ph-registration-card">
    <div className="ph-form-heading"><span className="ph-form-icon"><Icon name="wrench" size={22}/></span><div><h3>Présentez-nous votre atelier.</h3><p>Votre demande sera étudiée avant l’ouverture de votre accès.</p></div></div>
    <form ref={formRef} onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy}>
        <div className="ph-form-grid">
          <label className="ph-field"><span>Votre nom</span><input name="name" type="text" autoComplete="name" required minLength={2} maxLength={120} placeholder="Prénom et nom"/></label>
          <label className="ph-field"><span>Adresse e-mail</span><input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="vous@votre-atelier.fr"/></label>
          <label className="ph-field ph-field-wide"><span>Nom de votre atelier</span><input name="workshopName" type="text" autoComplete="organization" required minLength={2} maxLength={120} placeholder="Le nom de votre activité"/></label>
          <label className="ph-field ph-field-wide"><span>Votre activité <small>Facultatif</small></span><textarea name="message" rows={3} maxLength={2000} placeholder="Les consoles que vous réparez, votre façon de travailler…"/></label>
          <label className="ph-field"><span>Mot de passe</span><input name="password" type="password" autoComplete="new-password" minLength={15} maxLength={128} required aria-describedby="ph-password-hint"/></label>
          <label className="ph-field"><span>Confirmer le mot de passe</span><input name="confirmation" type="password" autoComplete="new-password" minLength={15} maxLength={128} required/></label>
        </div>
        <p className="ph-password-hint" id="ph-password-hint">Au moins 15 caractères. Vous pouvez utiliser une longue phrase.</p>
        {error && <p className="ph-form-error" role="alert"><Icon name="alert" size={17}/>{error}</p>}
        <button className="ph-button ph-button-primary ph-submit" type="submit">{busy ? 'Envoi de la demande…' : 'Demander mon accès'}{!busy && <Icon name="arrow" size={18}/>}</button>
      </fieldset>
      <p className="ph-form-note"><Icon name="shield" size={15}/>L’envoi de ce formulaire ouvre une demande, soumise à validation.</p>
    </form>
  </div>;
}

export function PublicHome() {
  useEffect(() => {document.title = 'La Clinique Rétro · Le logiciel des ateliers de réparation';}, []);
  return <div className="public-home">
    <a href="#ph-main" className="ph-skip-link" onClick={event => sectionLink(event, 'ph-main')}>Aller au contenu</a>
    <header className="ph-header"><div className="ph-shell ph-header-inner">
      <a className="ph-brand" href="#/" aria-label="La Clinique Rétro, accueil"><Logo/><span>La Clinique <strong>Rétro<span>.</span></strong></span></a>
      <nav className="ph-navigation" aria-label="Navigation du site"><a href="#ph-features" onClick={event => sectionLink(event, 'ph-features')}>Fonctionnalités</a><a href="#ph-access" onClick={event => sectionLink(event, 'ph-access')}>Demander un accès</a></nav>
      <a className="ph-header-login" href="#/connexion">Se connecter<Icon name="arrow" size={16}/></a>
    </div></header>
    <main id="ph-main" tabIndex={-1}>
      <section className="ph-hero ph-shell" aria-labelledby="ph-title">
        <div className="ph-hero-copy"><span className="ph-hero-label"><i/>LE LOGICIEL DES ATELIERS DE RÉPARATION</span><h1 id="ph-title">Moins de paperasse.<br/>Plus de <em>réparations.</em></h1><p>De la première panne au dernier test, gardez vos clients, vos consoles et votre atelier sur la même longueur d’onde.</p><div className="ph-hero-actions"><a className="ph-button ph-button-primary" href="#ph-access" onClick={event => sectionLink(event, 'ph-access')}>Demander un accès<Icon name="arrow" size={18}/></a><a className="ph-hero-secondary" href="#ph-features" onClick={event => sectionLink(event, 'ph-features')}>Découvrir l’atelier<Icon name="down" size={16}/></a></div><p className="ph-hero-note"><Icon name="check" size={15}/>Un accès sur validation, pensé pour votre activité.</p></div>
        <WorkshopPreview/>
      </section>
      <div className="ph-benefits"><div className="ph-shell ph-benefits-inner"><span><Icon name="gamepad" size={20}/>Consoles & manettes</span><span><Icon name="wrench" size={20}/>Du diagnostic à la livraison</span><span><Icon name="users" size={20}/>L’atelier & ses clients</span></div></div>
      <section className="ph-features ph-shell" id="ph-features" tabIndex={-1} aria-labelledby="ph-features-title">
        <div className="ph-section-heading"><span className="ph-eyebrow">TOUT SUIT LE MÊME DOSSIER</span><h2 id="ph-features-title">Votre établi mérite<br/>un peu d’ordre.</h2><p>Le travail de réparation reste entre vos mains.<br/>Le suivi trouve sa place ici.</p></div>
        <div className="ph-feature-grid">{features.map((feature, index) => <article className={`ph-feature ${index === 0 ? 'ph-feature-lead' : ''}`} key={feature.title}><span className="ph-feature-icon"><Icon name={feature.icon} size={24}/></span><h3>{feature.title}</h3><p>{feature.description}</p>{index === 0 && <span className="ph-feature-detail"><Icon name="check" size={15}/>Plusieurs consoles par client</span>}</article>)}</div>
      </section>
      <div className="ph-client-band ph-shell"><span className="ph-client-icon"><Icon name="gamepad" size={28}/></span><div><h2>Une console en réparation ?</h2><p>Retrouvez le suivi communiqué par votre atelier.</p></div><a className="ph-button ph-button-outline" href="#/espace-client">Mon espace client<Icon name="arrow" size={17}/></a></div>
      <section className="ph-access" id="ph-access" tabIndex={-1} aria-labelledby="ph-access-title"><div className="ph-shell ph-access-grid">
        <div className="ph-access-copy"><span className="ph-eyebrow">UNE PLACE POUR VOTRE ATELIER</span><h2 id="ph-access-title">Prêt à remettre<br/>de l’ordre dans<br/><em>vos réparations ?</em></h2><p>L’accès à La Clinique Rétro est ouvert sur demande. Présentez votre activité pour que votre inscription puisse être étudiée.</p><ol className="ph-access-steps"><li><span>01</span><div><strong>Présentez votre atelier</strong><p>Quelques informations sur vous et votre activité.</p></div></li><li><span>02</span><div><strong>Votre demande est étudiée</strong><p>Une validation précède l’ouverture de votre accès.</p></div></li><li><span>03</span><div><strong>Connectez-vous une fois accepté</strong><p>Retrouvez l’atelier avec les identifiants choisis.</p></div></li></ol><p className="ph-already-member">Déjà inscrit ? <a href="#/connexion">Se connecter<Icon name="arrow" size={14}/></a></p></div>
        <RegistrationForm/>
      </div></section>
    </main>
    <footer className="ph-footer"><div className="ph-shell ph-footer-inner"><div><a className="ph-brand" href="#/"><Logo/><span>La Clinique <strong>Rétro<span>.</span></strong></span></a><p>Le suivi de votre atelier, au même endroit.</p></div><nav aria-label="Liens de pied de page"><a href="#ph-features" onClick={event => sectionLink(event, 'ph-features')}>Fonctionnalités</a><a href="#/connexion">Connexion atelier</a><a href="#/espace-client">Espace client</a></nav><span className="ph-footer-tag"><Icon name="wrench" size={15}/>La passion, ça se répare.</span></div></footer>
  </div>;
}
