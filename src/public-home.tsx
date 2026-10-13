import {useEffect, useState, type MouseEvent, type ReactNode, type FormEvent} from 'react';
import {Icon} from './ui';
import {ShopConsoleArt} from './shop-console-art';
export {ShopConsoleArt} from './shop-console-art';
import {clientApi, type IntakeShop} from './client-api';
import './public-home.css';
import './reparapid-brand.css';

export function ReparapidBrand() {
  return <a className="rp-brand" href="#/accueil" aria-label="RépaRapid, accueil"><img className="rp-brand-image" src="./reparapid-logo-original.webp" width="300" height="300" alt=""/><span>RépaRapid<small>PAR MAXXI GAMES · LE KREMLIN-BICÊTRE</small></span></a>;
}
function sectionLink(event: MouseEvent<HTMLAnchorElement>, id: string) {
  event.preventDefault(); const section = document.getElementById(id);
  section?.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'}); section?.focus({preventScroll: true});
}
function contactSectionLink(event: MouseEvent<HTMLAnchorElement>) {
  if (document.getElementById('rp-contact')) sectionLink(event, 'rp-contact');
}
export function StorefrontShell({children, compact = false, enableIntake = true}: {children: ReactNode; compact?: boolean; enableIntake?: boolean}) {
  return <div className="reparapid-site"><a className="rp-skip" href="#rp-main" onClick={event => sectionLink(event, 'rp-main')}>Aller au contenu</a><div className="rp-topline"><Icon name="wrench" size={14}/><span>Réparation de consoles · Le Kremlin-Bicêtre</span><a href="#/connexion">Accès magasin<Icon name="right" size={13}/></a></div><header className="rp-header rp-shell"><ReparapidBrand/><nav aria-label="Navigation du site">{!compact && <a href="#rp-how" onClick={event => sectionLink(event, 'rp-how')}>Comment ça marche</a>}<a href="#/accueil?section=rp-contact" onClick={contactSectionLink}>Contact</a><a href="#/espace-client"><Icon name="user" size={17}/>Mon compte</a>{enableIntake && <a className="rp-button rp-primary" href="#/demande-reparation">Réparer ma console<Icon name="arrow" size={16}/></a>}</nav></header>{children}<footer className="rp-footer"><div className="rp-shell rp-footer-inner"><div><ReparapidBrand/><p>Votre prochaine partie commence ici.</p></div><nav aria-label="Liens utiles">{enableIntake && <a href="#/demande-reparation">Demander une réparation</a>}<a href="#/espace-client">Mon espace client</a><a href="#/accueil?section=rp-contact" onClick={contactSectionLink}>Contactez-nous</a><a href="#/connexion">Connexion magasin</a></nav><p className="rp-legal-note">Les marques et modèles servent à identifier votre console.<br/>Reparapid est un service indépendant des fabricants.</p></div></footer></div>;
}
const consoleFamilies = [{brand: 'Sony', model: 'PlayStation 5', label: 'PlayStation', note: 'PS5 · PS4 · PS3', theme: 'playstation'}, {brand: 'Nintendo', model: 'Nintendo Switch', label: 'Nintendo', note: 'Switch · Wii · consoles portables', theme: 'nintendo'}, {brand: 'Microsoft', model: 'Xbox Series X', label: 'Xbox', note: 'Series X|S · One · 360', theme: 'xbox'}];
const googleReviewsUrl = 'https://www.google.com/maps/search/?api=1&query=Reparapid%20Le%20Kremlin-Bicetre&query_place_id=ChIJIxKphttx5kcRw7EU2fbERBg';
const googleDirectionsUrl = 'https://www.google.com/maps/dir/?api=1&destination=Reparapid%20Le%20Kremlin-Bicetre&destination_place_id=ChIJIxKphttx5kcRw7EU2fbERBg';
const publishedContact: IntakeShop = {shopName: 'RépaRapid · Maxxi Games', address: '30 bis, avenue de Fontainebleau', postalCode: '94270', city: 'Le Kremlin-Bicêtre', phone: '01 58 46 82 51', email: 'contact@reparapid.fr', addressConfirmed: true};
const googleReviewExcerpts = [
  {author:'XevilHaxx',date:'2026-06-05',label:'5 juin 2026',text:'manette réparé super rapidement',initials:'X',color:'red'},
  {author:'Amin Gasmi',date:'2025-10-25',label:'25 octobre 2025',text:'technicien compétant et très sociable',initials:'AG',color:'slate'},
  {author:'Ibrahim Camara',date:'2025-05-07',label:'7 mai 2025',text:'Service top merci',initials:'IC',color:'gold'},
];
const repairJourneySteps = [
  {number: '01', role: 'VOUS · EN LIGNE', icon: 'gamepad', title: 'Décrivez la panne', text: 'Choisissez votre modèle, sélectionnez les symptômes proposés et ajoutez vos précisions. Indiquez aussi les accessoires que vous comptez joindre.', result: 'Modèle et symptômes renseignés'},
  {number: '02', role: 'VOUS · VOTRE COMPTE', icon: 'user', title: 'Enregistrez votre demande', text: 'Créez votre compte ou connectez-vous à votre compte existant. Votre dossier et sa référence apparaissent dans votre espace client.', result: 'Statut : En attente d’envoi'},
  {number: '03', role: 'VOUS · VOTRE COLIS', icon: 'package', title: 'Envoyez votre console', text: 'Depuis votre compte, imprimez la fiche récapitulative et glissez-la dans le colis. Envoyez votre console à Maxxi Games, au Kremlin-Bicêtre, à l’adresse confirmée sur la fiche.', result: 'Fiche jointe, console expédiée'},
  {number: '04', role: 'RÉPARAPID · À L’ATELIER', icon: 'wrench', title: 'Suivez, puis récupérez', text: 'À réception, l’atelier diagnostique et prend en charge la console. Suivez les étapes et le montant dans votre compte. Une fois prête, contactez le magasin pour organiser son retrait ou son retour.', result: 'Statut : Prête à récupérer'},
];
function GoogleStars() {
  return <span className="rp-review-stars" role="img" aria-label="5 étoiles sur 5">{Array.from({length:5},(_,i)=><svg key={i} viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3.1 6.3 7 1-5.1 4.9 1.2 6.9L12 17.8l-6.2 3.3 1.2-6.9L1.9 9.3l7-1z"/></svg>)}</span>;
}
function StoreCommitments() {
  return <section className="rp-commitments" id="rp-commitments" tabIndex={-1} aria-labelledby="rp-commitments-title"><div className="rp-shell"><div className="rp-section-heading"><div><span className="rp-eyebrow">LE SAVOIR-FAIRE DE RÉPARAPID</span><h2 id="rp-commitments-title">Nos engagements.</h2></div><p>Un service soigné, du premier échange<br/>jusqu’à la remise de votre appareil.</p></div><div className="rp-commitment-grid"><article><span className="rp-commitment-icon"><Icon name="clock" size={27}/></span><span className="rp-commitment-kicker">RAPIDITÉ</span><h3>Les pannes courantes,<br/>prises en charge vite.</h3><p>Une intervention express en <strong>1 h</strong> pour les problèmes courants. Si une pièce doit être commandée, le délai annoncé est de <strong>24 à 48 h maximum*</strong>.</p></article><article><span className="rp-commitment-icon"><Icon name="tools" size={27}/></span><span className="rp-commitment-kicker">EXPERTISE</span><h3>Un appareil entre<br/>des mains expérimentées.</h3><p>Un professionnel formé, avec plusieurs années de pratique en maintenance électronique, prend soin de votre console et de ses composants.</p></article><article><span className="rp-commitment-icon"><Icon name="location" size={27}/></span><span className="rp-commitment-kicker">PROXIMITÉ</span><h3>Un atelier<br/>dans votre quartier.</h3><p>Un atelier ouvert depuis sept ans. Le magasin vous accueille du <strong>mardi au samedi</strong>, de <strong>10 h à 20 h</strong>, hors fermetures exceptionnelles.</p></article></div><p className="rp-commitment-footnote">* Hors périodes de forte affluence. Les délais concernent les interventions à l’atelier ; l’acheminement de votre colis est distinct.</p></div></section>;
}
function GoogleReviews() {
  return <section className="rp-reviews rp-shell" id="rp-google-reviews" tabIndex={-1} aria-labelledby="rp-reviews-title"><div className="rp-section-heading"><div><span className="rp-eyebrow">VOS RETOURS COMPTENT</span><h2 id="rp-reviews-title">Les avis Google<br/>de notre atelier.</h2></div><a className="rp-button rp-outline" href={googleReviewsUrl} target="_blank" rel="noopener noreferrer">Tous les avis Google<Icon name="arrow" size={17}/></a></div><div className="rp-review-grid">{googleReviewExcerpts.map(review=><article className="rp-review-card" key={review.author}><div className="rp-review-top"><span className={`rp-review-avatar ${review.color}`} aria-hidden="true">{review.initials}</span><div><h3>{review.author}</h3><time dateTime={review.date}>{review.label}</time></div><span className="rp-google-label">Google</span></div><GoogleStars/><blockquote>« {review.text} »</blockquote><span className="rp-review-excerpt-label">Extrait de l’avis</span></article>)}</div><p className="rp-review-source">Extraits des avis Google affichés sur <a href="https://reparapid.fr/" target="_blank" rel="noopener noreferrer">reparapid.fr</a>. Retrouvez les avis complets sur <a href={googleReviewsUrl} target="_blank" rel="noopener noreferrer">la fiche Google de l’atelier</a>.</p></section>;
}
function StoreContact({shop}: {shop: IntakeShop | null}) {
  const contact = shop || publishedContact;
  function openEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contact.email) return;
    const fields = new FormData(event.currentTarget);
    const firstName = String(fields.get('firstName') || '').trim();
    const lastName = String(fields.get('lastName') || '').trim();
    const email = String(fields.get('email') || '').trim();
    const message = String(fields.get('message') || '').trim();
    const subject = `Contact · ${contact.shopName}`;
    const body = `Bonjour,\r\n\r\n${message}\r\n\r\n${firstName} ${lastName}\r\nE-mail de réponse : ${email}`;
    window.location.href = `mailto:${encodeURIComponent(contact.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  return <section className="rp-contact" id="rp-contact" tabIndex={-1} aria-labelledby="rp-contact-title">
    <div className="rp-shell">
      <div className="rp-section-heading">
        <div><span className="rp-eyebrow">PARLONS DE VOTRE APPAREIL</span><h2 id="rp-contact-title">Contactez-nous !</h2></div>
        <p>Une question sur votre appareil, notre atelier ou nos services ?<br/>L’équipe de RépaRapid est à votre écoute.</p>
      </div>
      <div className="rp-contact-grid">
        <div className="rp-contact-details">
          <span className="rp-contact-store">{contact.shopName}</span>
          {contact.phone && <div className="rp-contact-row"><span className="rp-contact-icon"><Icon name="phone" size={21}/></span><div><h3>Par téléphone</h3><a href={`tel:${contact.phone.replace(/\s/g, '')}`}>{contact.phone}</a></div></div>}
          {contact.email && <div className="rp-contact-row"><span className="rp-contact-icon"><Icon name="mail" size={21}/></span><div><h3>Par e-mail</h3><a href={`mailto:${encodeURIComponent(contact.email)}`}>{contact.email}</a></div></div>}
          <div className="rp-contact-row"><span className="rp-contact-icon"><Icon name="location" size={21}/></span><div><h3>À l’atelier</h3>{contact.address ? <address>{contact.address}<br/>{contact.postalCode} {contact.city}</address> : <p>{contact.city || 'Contactez le magasin pour connaître l’adresse.'}</p>}<a className="rp-contact-directions" href={googleDirectionsUrl} target="_blank" rel="noopener noreferrer">Préparer mon itinéraire<Icon name="arrow" size={15}/></a></div></div>
          <div className="rp-contact-hours"><Icon name="clock" size={20}/><div><strong>Du mardi au samedi · 10 h – 20 h</strong><p>Hors fermetures exceptionnelles.</p></div></div>
          <div className="rp-contact-social"><span>Retrouvez Maxxi Games</span><a href="https://www.instagram.com/maxxigames_kremlinbicetre/" target="_blank" rel="noopener noreferrer">Instagram<Icon name="arrow" size={13}/></a><a href="https://www.tiktok.com/@maxxigameskremlinbicetre" target="_blank" rel="noopener noreferrer">TikTok<Icon name="arrow" size={13}/></a></div>
        </div>
        <form className="rp-contact-form" onSubmit={openEmail} aria-labelledby="rp-contact-form-title">
          <h3 id="rp-contact-form-title">Écrivez-nous.</h3>
          <div className="rp-contact-fields">
            <label><span>Prénom</span><input name="firstName" autoComplete="given-name" required maxLength={80} placeholder="Votre prénom"/></label>
            <label><span>Nom</span><input name="lastName" autoComplete="family-name" required maxLength={80} placeholder="Votre nom"/></label>
            <label className="rp-contact-wide"><span>E-mail</span><input type="email" name="email" autoComplete="email" required maxLength={254} placeholder="vous@exemple.fr"/></label>
            <label className="rp-contact-wide"><span>Votre message</span><textarea name="message" required maxLength={3000} rows={5} placeholder="Comment pouvons-nous vous aider ?"/></label>
          </div>
          <p className="rp-contact-mail-note" id="rp-contact-mail-note"><Icon name="info" size={16}/>{contact.email ? 'Votre messagerie s’ouvrira ; envoyez le message pour le transmettre au magasin.' : 'L’adresse e-mail de l’atelier est momentanément indisponible. Contactez-nous par téléphone.'}</p>
          <button className="rp-button rp-primary" type="submit" disabled={!contact.email} aria-describedby="rp-contact-mail-note">Ouvrir mon e-mail<Icon name="arrow" size={18}/></button>
        </form>
      </div>
    </div>
  </section>;
}
export function PublicHome() {
  const [shop, setShop] = useState<IntakeShop | null>(null);
  useEffect(() => {
    let frame = 0;
    const showRequestedSection = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const sectionId = new URLSearchParams(window.location.hash.split('?')[1]).get('section');
        if (sectionId !== 'rp-contact' && sectionId !== 'rp-how') return;
        const section = document.getElementById(sectionId);
        section?.scrollIntoView({block: 'start'});
        section?.focus({preventScroll: true});
      });
    };
    showRequestedSection();
    window.addEventListener('hashchange', showRequestedSection);
    return () => {cancelAnimationFrame(frame); window.removeEventListener('hashchange', showRequestedSection);};
  }, []);
  useEffect(() => {document.title = 'RépaRapid · Réparation de consoles par Maxxi Games'; const abort = new AbortController(); void clientApi<{shop: IntakeShop}>('/api/public/repair-intake', {signal: abort.signal, rootWorkshop: true}).then(value => setShop(value.shop)).catch(() => {}); return () => abort.abort();}, []);
  return <StorefrontShell><main id="rp-main" tabIndex={-1}>
    <section className="rp-hero rp-shell"><div className="rp-hero-copy"><span className="rp-eyebrow"><i/>UNE PANNE NE TERMINE PAS LA PARTIE.</span><h1>Votre console<br/>a encore <em>du jeu.</em></h1><p>Un écran noir, un joystick qui dérive, une console qui ne démarre plus ? Décrivez la panne. Notre atelier prend le relais.</p><div className="rp-hero-actions"><a className="rp-button rp-primary" href="#/demande-reparation">Demander une réparation<Icon name="arrow" size={19}/></a><a className="rp-text-link" href="#rp-how" onClick={event => sectionLink(event, 'rp-how')}>Comment ça marche<Icon name="down" size={16}/></a></div><p className="rp-hero-note"><Icon name="info" size={16}/>Le montant de l’intervention est confirmé après diagnostic.</p></div><div className="rp-hero-art" aria-hidden="true"><span className="rp-art-cross cross-one">+</span><span className="rp-art-cross cross-two">+</span><div className="rp-art-orbit"/><div className="rp-hero-console"><ShopConsoleArt item={{brand: 'Nintendo', model: 'Nintendo Switch', variant: 'Néon'}}/></div><div className="rp-art-status"><span><Icon name="wrench" size={19}/></span><div><small>ON S’OCCUPE DE LA SUITE</small><strong>Réparer. Rejouer.</strong></div><Icon name="check" size={18}/></div><span className="rp-art-label">PLAYER 1 · READY TO REPAIR</span></div></section>
    <div className="rp-trust-strip"><div className="rp-shell"><span><Icon name="gamepad" size={20}/>Consoles de salon & portables</span><span><Icon name="wrench" size={20}/>Diagnostic à l’atelier</span><span><Icon name="user" size={20}/>Suivi dans votre compte</span></div></div>
    <section className="rp-devices rp-shell" id="rp-devices" tabIndex={-1}><div className="rp-section-heading"><div><span className="rp-eyebrow">ON COMMENCE PAR VOTRE CONSOLE</span><h2>À chaque console,<br/>sa prochaine partie.</h2></div><p>Choisissez le modèle dans le formulaire.<br/>Les pannes proposées s’adaptent à votre console.</p></div><div className="rp-device-grid">{consoleFamilies.map(item => <a href={`#/demande-reparation?marque=${encodeURIComponent(item.brand)}`} className={`rp-device-card ${item.theme}`} key={item.brand}><span className="rp-device-art"><ShopConsoleArt item={item}/></span><span className="rp-device-copy"><span><strong>{item.label}</strong><small>{item.note}</small></span><span className="rp-circle-arrow"><Icon name="arrow" size={20}/></span></span></a>)}</div><p className="rp-model-note">Votre modèle n’est pas dans la liste ? Vous pouvez le renseigner librement.</p></section>
    <StoreCommitments/>
    <section className="rp-how" id="rp-how" tabIndex={-1} aria-labelledby="rp-how-title">
      <div className="rp-shell">
        <div className="rp-section-heading"><div><span className="rp-eyebrow">QUATRE ÉTAPES · UN SEUL DOSSIER</span><h2 id="rp-how-title">Votre réparation,<br/>pas à pas.</h2></div><p>Vous préparez la demande et l’envoi.<br/>L’atelier prend le relais à réception, avec un suivi dans votre compte.</p></div>
        <ol className="rp-steps" aria-label="Les quatre étapes de votre réparation">{repairJourneySteps.map((step, index) => <li className={`rp-journey-step${index === 3 ? ' rp-journey-workshop' : ''}`} key={step.number}>
          <div className="rp-step-top"><span className="rp-step-number" aria-hidden="true">{step.number}</span><Icon name={step.icon} size={25}/></div>
          <p className="rp-step-role">{step.role}</p><h3>{step.title}</h3><p className="rp-step-description">{step.text}</p>
          <div className="rp-step-result"><Icon name={index === 3 ? 'check' : 'right'} size={15}/><span>{step.result}</span></div>
          {index < 3 && <span className="rp-step-link" aria-hidden="true"><Icon name="arrow" size={19}/></span>}
        </li>)}</ol>
        <div className="rp-journey-notes"><p><Icon name="print" size={21}/><span><strong>La fiche identifie votre dossier.</strong> L’étiquette de transport et l’affranchissement sont à prévoir séparément.</span></p><p><Icon name="euro" size={21}/><span><strong>Le montant est confirmé après diagnostic.</strong> Aucun paiement n’est demandé dans le formulaire.</span></p></div>
        <div className="rp-journey-actions"><a className="rp-button rp-primary" href="#/demande-reparation">Faire ma demande de réparation<Icon name="arrow" size={18}/></a><a className="rp-text-link" href="#/espace-client">J’ai déjà un dossier : accéder à mon compte<Icon name="right" size={16}/></a></div>
      </div>
    </section>
    <section className="rp-shop rp-shell"><div className="rp-shop-visual" aria-hidden="true"><span className="rp-shop-grid"/><Icon name="wrench" size={90}/><span>LOCAL WORKSHOP<br/>REAL REPAIRS</span></div><div className="rp-shop-copy"><span className="rp-eyebrow">MAXXI GAMES · LE KREMLIN-BICÊTRE</span><h2>Votre console,<br/>notre établi.</h2><p>Reparapid vous accompagne dans votre demande de réparation. La console est confiée à Maxxi Games au Kremlin-Bicêtre, avec un dossier que vous pouvez retrouver à tout moment.</p>{shop?.addressConfirmed ? <address><strong>{shop.shopName}</strong>{shop.address}<br/>{shop.postalCode} {shop.city}</address> : <p className="rp-contact-note"><Icon name="info" size={17}/>L’adresse d’expédition sera confirmée par l’atelier avant votre envoi.</p>}<a className="rp-button rp-outline" href="#/accueil?section=rp-contact" onClick={contactSectionLink}>Contacter l’atelier<Icon name="arrow" size={18}/></a></div></section>
    <GoogleReviews/>
    <StoreContact shop={shop}/>
    <section className="rp-final-cta"><div className="rp-shell"><div><span className="rp-eyebrow">LA PARTIE N’EST PAS FINIE.</span><h2>On regarde votre panne ?</h2></div><a className="rp-button rp-light" href="#/demande-reparation">Réparer ma console<Icon name="arrow" size={19}/></a></div></section>
  </main></StorefrontShell>;
}
