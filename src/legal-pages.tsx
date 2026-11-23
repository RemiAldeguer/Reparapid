import {useEffect, useRef, type MouseEvent} from 'react';
import {StorefrontShell} from './public-home';
import {Icon} from './ui';
import {LEGAL_VERSION, LEGAL_DOCUMENTS, LEGAL_SOURCES, LEGAL_SOURCES_CHECKED_AT, legalDocumentText, type LegalDocumentKind, type LegalSection} from './legal-content.mjs';
import './legal-pages.css';

type LegalKind = LegalDocumentKind;
const legalLinks = [
  {kind: 'cgu', label: 'CGU', href: '#/cgu'},
  {kind: 'cgv', label: 'CGV', href: '#/cgv'},
  {kind: 'mentions', label: 'Mentions légales', href: '#/mentions-legales'},
  {kind: 'cookies', label: 'Politique de cookies', href: '/politique-de-cookies-ue/'},
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

function LegalNavigation({active}: {active: LegalKind}) {
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
      <header className="rp-legal-heading"><span className="rp-eyebrow">RÉPARAPID · MAXXI GAMES</span><h1 ref={headingRef} tabIndex={-1}>{document.title}</h1><p className="rp-legal-version">Version du <time dateTime={LEGAL_VERSION.slice(0,10)}>{readableDate(LEGAL_VERSION)}</time></p><p className="rp-legal-intro">{document.intro}</p></header>
      <div className="rp-legal-tools"><button className="rp-button rp-outline" type="button" onClick={() => window.print()}><Icon name="print" size={17}/>Imprimer</button><button className="rp-button rp-outline" type="button" onClick={() => downloadText(legalDocumentText(kind), `reparapid-${kind}-${LEGAL_VERSION}.txt`)}><Icon name="download" size={17}/>Télécharger le texte (.txt)</button></div>
      {kind === 'cgv' && <aside className="rp-legal-warning" aria-label="Information à compléter"><Icon name="info" size={21}/><div><strong>Informations sur le médiateur à compléter par Maxxi Games</strong><p>Les coordonnées du médiateur de la consommation ne sont pas encore renseignées dans ces conditions.</p></div></aside>}
      <div className="rp-legal-layout"><LegalContents sections={document.sections} prefix={prefix}/><div className="rp-legal-reading"><article className="rp-legal-document" aria-label={document.title}>{document.sections.map(section => <section id={`${prefix}-${section.id}`} key={section.id} tabIndex={-1} aria-labelledby={`${prefix}-${section.id}-title`}><h2 id={`${prefix}-${section.id}-title`}>{section.title}</h2>{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map((bullet, index) => <li key={index}>{bullet}</li>)}</ul>}</section>)}</article><LegalSources/></div></div>
    </div>
  </main></StorefrontShell>;
}
