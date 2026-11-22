import {useEffect, useRef, type MouseEvent} from 'react';
import {StorefrontShell} from './public-home';
import {Icon} from './ui';
import {LEGAL_VERSION, LEGAL_DOCUMENTS, LEGAL_OPERATOR, LEGAL_SOURCES, LEGAL_SOURCES_CHECKED_AT, legalDocumentText, WITHDRAWAL_TEMPLATE, type LegalDocumentKind, type LegalSection} from './legal-content.mjs';
import './legal-pages.css';

type LegalKind = LegalDocumentKind;
const legalLinks = [
  {kind: 'cgu', label: 'CGU', href: '#/cgu'},
  {kind: 'cgv', label: 'CGV', href: '#/cgv'},
  {kind: 'mentions', label: 'Mentions légales', href: '#/mentions-legales'},
  {kind: 'withdrawal', label: 'Rétractation', href: '#/retractation'},
] as const;

function readableDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris'}).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

function downloadText(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', content], {type: 'text/plain;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function useLegalPage(title: string) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `${title} · RépaRapid`;
    window.scrollTo({top: 0});
    headingRef.current?.focus({preventScroll: true});
  }, [title]);
  return headingRef;
}

function LegalNavigation({active}: {active: LegalKind | 'withdrawal'}) {
  return <nav className="rp-legal-navigation" aria-label="Informations juridiques">{legalLinks.map(link => <a href={link.href} key={link.kind} aria-current={active === link.kind ? 'page' : undefined}>{link.label}</a>)}</nav>;
}

function scrollToSection(event: MouseEvent<HTMLButtonElement>, id: string) {
  event.preventDefault();
  const section = document.getElementById(id);
  section?.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'});
  section?.focus({preventScroll: true});
}

function LegalContents({sections, prefix}: {sections: readonly LegalSection[]; prefix: string}) {
  return <nav className="rp-legal-contents" aria-label="Sommaire de cette page"><h2>Dans cette page</h2><ol>{sections.map(section => <li key={section.id}><button type="button" onClick={event => scrollToSection(event, `${prefix}-${section.id}`)}>{section.title}</button></li>)}</ol></nav>;
}

function LegalSources() {
  return <details className="rp-legal-sources"><summary>Sources et références</summary><div><p>Références consultées le {readableDate(LEGAL_SOURCES_CHECKED_AT)}. Les liens externes s’ouvrent dans un nouvel onglet.</p><ul>{LEGAL_SOURCES.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<Icon name="arrow" size={14}/></a></li>)}</ul></div></details>;
}

export function LegalPage({kind}: {kind: LegalKind}) {
  const document = LEGAL_DOCUMENTS[kind];
  const headingRef = useLegalPage(document.title);
  const prefix = `rp-legal-${kind}`;
  return <StorefrontShell compact><main className="rp-legal-page" id="rp-main" tabIndex={-1}>
    <div className="rp-shell">
      <a className="rp-text-link rp-legal-back" href="#/accueil"><Icon name="back" size={16}/>Retour à l’accueil</a>
      <LegalNavigation active={kind}/>
      <header className="rp-legal-heading"><span className="rp-eyebrow">RÉPARAPID · MAXXI GAMES</span><h1 ref={headingRef} tabIndex={-1}>{document.title}</h1><p className="rp-legal-version">Version du <time dateTime={LEGAL_VERSION}>{readableDate(LEGAL_VERSION)}</time></p><p className="rp-legal-intro">{document.intro}</p></header>
      <div className="rp-legal-tools"><button className="rp-button rp-outline" type="button" onClick={() => window.print()}><Icon name="print" size={17}/>Imprimer</button><button className="rp-button rp-outline" type="button" onClick={() => downloadText(legalDocumentText(kind), `reparapid-${kind}-${LEGAL_VERSION}.txt`)}><Icon name="download" size={17}/>Télécharger le texte (.txt)</button></div>
      {kind === 'cgv' && <aside className="rp-legal-warning" aria-label="Information à compléter"><Icon name="info" size={21}/><div><strong>Informations sur le médiateur à compléter par Maxxi Games</strong><p>Les coordonnées du médiateur de la consommation ne sont pas encore renseignées dans ces conditions.</p></div></aside>}
      <div className="rp-legal-layout"><LegalContents sections={document.sections} prefix={prefix}/><div className="rp-legal-reading"><article className="rp-legal-document" aria-label={document.title}>{document.sections.map(section => <section id={`${prefix}-${section.id}`} key={section.id} tabIndex={-1} aria-labelledby={`${prefix}-${section.id}-title`}><h2 id={`${prefix}-${section.id}-title`}>{section.title}</h2>{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map((bullet, index) => <li key={index}>{bullet}</li>)}</ul>}</section>)}</article><LegalSources/></div></div>
    </div>
  </main></StorefrontShell>;
}

const withdrawalSections: readonly LegalSection[] = [
  {id: 'delai', title: 'Votre délai de rétractation', paragraphs: ['Pour une prestation de services conclue à distance, vous disposez en principe de 14 jours à compter de la conclusion du contrat pour exercer votre droit de rétractation, sans avoir à justifier votre décision.', 'Les conditions générales de vente précisent les règles applicables à votre réparation. Le refus d’un devis et la demande de retour restent également accessibles depuis votre dossier.']},
  {id: 'demarrage', title: 'Si la prestation a déjà commencé', paragraphs: ['Un démarrage avant la fin des 14 jours nécessite votre demande expresse. Si vous vous rétractez après ce démarrage, un montant proportionné au service déjà fourni peut être dû, dans les conditions prévues par la loi et les CGV.', 'Le droit de rétractation n’est perdu avant la fin de ce délai que lorsque la prestation est pleinement exécutée, après votre accord préalable et exprès au démarrage et votre reconnaissance de cette perte à l’exécution complète.']},
  {id: 'demande', title: 'Transmettre votre décision', paragraphs: ['Utilisez votre dossier pour identifier la réparation concernée et transmettre votre décision. Vous pouvez aussi adresser au magasin le formulaire type ou toute déclaration dénuée d’ambiguïté exprimant votre volonté de vous rétracter.', 'Indiquez vos nom, coordonnées, référence du dossier et date de conclusion du contrat. Conservez une copie de votre demande et de son envoi. Le formulaire type est facultatif.']},
];

export function WithdrawalPage() {
  const title = 'Exercer mon droit de rétractation';
  const headingRef = useLegalPage(title);
  const prefix = 'rp-legal-withdrawal';
  const emailHref = `mailto:${encodeURIComponent(LEGAL_OPERATOR.email)}?subject=${encodeURIComponent('Rétractation · RépaRapid')}`;
  return <StorefrontShell compact><main className="rp-legal-page" id="rp-main" tabIndex={-1}>
    <div className="rp-shell">
      <a className="rp-text-link rp-legal-back" href="#/accueil"><Icon name="back" size={16}/>Retour à l’accueil</a>
      <LegalNavigation active="withdrawal"/>
      <header className="rp-legal-heading"><span className="rp-eyebrow">VOS DROITS · UNE DÉMARCHE ACCESSIBLE</span><h1 ref={headingRef} tabIndex={-1}>{title}</h1><p className="rp-legal-version">Informations du <time dateTime={LEGAL_VERSION}>{readableDate(LEGAL_VERSION)}</time></p><p className="rp-legal-intro">Retrouvez les règles du délai de 14 jours et les moyens de transmettre votre décision à Maxxi Games.</p></header>
      <div className="rp-legal-layout"><LegalContents sections={withdrawalSections} prefix={prefix}/><div className="rp-legal-reading"><article className="rp-legal-document" aria-label={title}>
        {withdrawalSections.map(section => <section id={`${prefix}-${section.id}`} key={section.id} tabIndex={-1} aria-labelledby={`${prefix}-${section.id}-title`}><h2 id={`${prefix}-${section.id}-title`}>{section.title}</h2>{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}{section.id === 'demande' && <><div className="rp-legal-withdrawal-action"><a className="rp-button rp-primary" href="#/espace-client">Exercer mon droit depuis mon dossier<Icon name="arrow" size={17}/></a><p>Connectez-vous, puis ouvrez le dossier concerné.</p></div><div className="rp-legal-contact"><h3>Par e-mail ou par courrier</h3><p><a href={emailHref}>{LEGAL_OPERATOR.email}</a></p><address><strong>{LEGAL_OPERATOR.legalName} · {LEGAL_OPERATOR.tradeName}</strong><br/>{LEGAL_OPERATOR.address}</address><p className="rp-legal-contact-note">Le lien e-mail ouvre votre messagerie. Envoyez votre message pour le transmettre au magasin.</p></div><button className="rp-button rp-outline rp-legal-template-download" type="button" onClick={() => downloadText(WITHDRAWAL_TEMPLATE, `reparapid-formulaire-retractation-${LEGAL_VERSION}.txt`)}><Icon name="download" size={17}/>Télécharger le formulaire type (.txt)</button></>}</section>)}
        <p className="rp-legal-related">Consultez également les <a href="#/cgv">conditions générales de vente</a>.</p>
      </article><LegalSources/></div></div>
    </div>
  </main></StorefrontShell>;
}
