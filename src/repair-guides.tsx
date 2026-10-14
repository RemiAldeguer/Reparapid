import {renderToStaticMarkup} from 'react-dom/server';
import type {ReactNode} from 'react';
import {GuideDeviceArt} from './guide-device-art';
import {guideFamilies, guideFamilyId} from './repair-guide-families';
import {repairGuides} from './repair-guides-content';
import {guideManifest, guideCollections, GUIDE_ORIGIN, GUIDE_PUBLISHED_DATE} from './repair-guides-manifest.mjs';
import type {RepairGuide, RepairGuideFamily} from './repair-guides-types';

export {repairGuides};
type Collection = 'consoles' | 'smartphones';
const phoneGuide = (guide: RepairGuide) => guideFamilies[guide.family].deviceType === 'smartphone';
const collectionPath = (collection: Collection) => `/guides/${collection}/`;
const collectionLabel = (collection: Collection) => collection === 'consoles' ? 'Consoles et manettes' : 'Smartphones';
const selectedGuides = (collection?: Collection) => collection ? repairGuides.filter(guide => phoneGuide(guide) === (collection === 'smartphones')) : repairGuides;
const guideUrl = (slug: string) => `/guides/${slug}/`;
const publishedLabel = '13 octobre 2026';
const catalogTitle = 'Tutoriels de réparation de consoles et smartphones';
const catalogDescription = 'Consoles, manettes, iPhone, Samsung Galaxy et Pixel : trouvez un tutoriel de diagnostic, d’entretien ou de réparation avec étapes, matériel et exemples.';
const collectionDescription = (collection: Collection) => collection === 'consoles' ? 'PlayStation, Nintendo, Xbox, Sega, Steam Deck et manettes : des tutoriels de réparation, entretien et diagnostic adaptés aux modèles.' : 'iPhone, Samsung Galaxy, Google Pixel, Xiaomi et Motorola : des tutoriels pour les écrans, batteries, charge, son et autres pannes.';

function Brand() {
  return <a className="rp-brand" href="/" aria-label="RépaRapid, accueil"><img className="rp-brand-image" src="/reparapid-logo-original.webp" width="300" height="300" alt=""/><span>RépaRapid<small className="rp-partner-brand"><span className="rp-partner-signature"><span>par</span><img src="/maxxi-games-logo-original.png" width="500" height="500" alt="Maxxi Games"/></span><span>LE KREMLIN-BICÊTRE</span></small></span></a>;
}
function Shell({children}: {children: ReactNode}) {
  return <div className="reparapid-site rp-guides"><a className="rp-skip" href="#rp-main">Aller au contenu</a><div className="rp-topline"><span>Réparation de consoles · Le Kremlin-Bicêtre</span><a href="/#/connexion">Accès magasin →</a></div><header className="rp-header rp-shell"><Brand/><nav aria-label="Navigation du site"><a href="/guides/">Tutoriels</a><a href="/#/accueil?section=rp-contact">Contact</a><a href="/#/espace-client">Mon compte</a><a className="rp-button rp-primary" href="/#/demande-reparation">Réparer ma console →</a></nav></header>{children}<footer className="rp-footer"><div className="rp-shell rp-footer-inner"><div><Brand/><p>Votre prochaine partie commence ici.</p></div><nav aria-label="Liens utiles"><a href="/guides/">Tous les tutoriels</a><a href="/#/demande-reparation">Demander une réparation</a><a href="/#/espace-client">Mon espace client</a><a href="/#/accueil?section=rp-contact">Contactez-nous</a></nav><p className="rp-legal-note">Les marques et modèles servent à identifier votre console.<br/>RépaRapid est un service indépendant des fabricants.</p></div></footer></div>;
}
function Art({guide, label = false}: {guide: RepairGuide; label?: boolean}) {
  return <GuideDeviceArt device={guide} label={label ? `Illustration de ${guide.model}` : undefined}/>;
}
function Breadcrumb({guide, collection}: {guide?: RepairGuide; collection?: Collection}) {
  const category = guide ? phoneGuide(guide) ? 'smartphones' : 'consoles' : collection;
  return <nav className="rp-guide-breadcrumb" aria-label="Fil d’Ariane"><ol><li><a href="/">Accueil</a></li><li>{guide || collection ? <a href="/guides/">Tutoriels</a> : <span aria-current="page">Tutoriels</span>}</li>{category && <li>{guide ? <a href={collectionPath(category)}>{collectionLabel(category)}</a> : <span aria-current="page">{collectionLabel(category)}</span>}</li>}{guide && <li><span aria-current="page">{guide.title}</span></li>}</ol></nav>;
}
function GuideCard({guide}: {guide: RepairGuide}) {
  return <article className="rp-guide-card" data-guide-card data-search={`${guide.family} ${guideFamilies[guide.family].brand} ${guide.model} ${guide.title} ${guide.description} ${guide.difficulty}`} data-device-type={phoneGuide(guide) ? 'smartphone' : 'console'}><a className="rp-guide-card-art" href={guideUrl(guide.slug)} tabIndex={-1} aria-hidden="true"><Art guide={guide}/></a><div className="rp-guide-card-copy"><div className="rp-guide-tags"><span>{guide.model}</span><span>{guide.difficulty}</span></div><h3><a href={guideUrl(guide.slug)}>{guide.title}</a></h3><p>{guide.description}</p><a className="rp-guide-card-link" href={guideUrl(guide.slug)}>Lire le tutoriel <span aria-hidden="true">→</span></a></div></article>;
}
function RepairCTA({guide}: {guide?: RepairGuide}) {
  if (guide && phoneGuide(guide)) return <aside className="rp-guide-cta" aria-label="Contacter RépaRapid"><span className="rp-eyebrow">UNE QUESTION SUR VOTRE APPAREIL ?</span><h2>Parlons de votre dépannage.</h2><p>Indiquez le modèle de votre téléphone, les symptômes et les vérifications déjà réalisées. Contactez RépaRapid pour discuter de la suite et des possibilités de prise en charge.</p><a className="rp-button rp-primary" href="/#/accueil?section=rp-contact">Contacter l’atelier →</a></aside>;
  const brand = guide?.family === 'Steam Deck' ? 'Autre' : guide ? guideFamilies[guide.family].brand : '';
  const requestUrl = `/#/demande-reparation${brand ? `?marque=${encodeURIComponent(brand)}` : ''}`;
  return <aside className="rp-guide-cta" aria-label="Confier votre réparation à RépaRapid"><span className="rp-eyebrow">UN DOUTE SUR LA SUITE ?</span><h2>L’atelier prend le relais.</h2><p>Décrivez votre console et les vérifications déjà réalisées. RépaRapid · Maxxi Games vous accueille au Kremlin-Bicêtre et propose un suivi dans votre espace client. Le montant est confirmé après diagnostic.</p><div><a className="rp-button rp-primary" href={requestUrl}>Demander une réparation →</a><a className="rp-text-link" href="/#/accueil?section=rp-how">Comment ça marche</a></div></aside>;
}
function Catalog({collection}: {collection?: Collection}) {
  const guides = selectedGuides(collection);
  const families = (Object.keys(guideFamilies) as RepairGuideFamily[]).filter(family => guides.some(guide => guide.family === family));
  const countFor = (deviceType: 'console' | 'smartphone') => repairGuides.filter(guide => guideFamilies[guide.family].deviceType === deviceType).length;
  return <Shell><main id="rp-main" tabIndex={-1}><div className="rp-shell"><Breadcrumb collection={collection}/></div>
    <section className="rp-guide-hero"><div className="rp-shell"><span className="rp-eyebrow">COMPRENDRE · RÉPARER · PROLONGER</span><h1>{collection ? <>Tutoriels de réparation :<br/>{collectionLabel(collection)}.</> : <>Tutoriels de réparation :<br/>consoles et smartphones.</>}</h1><p>Écran cassé, batterie fatiguée, charge impossible, joystick imprécis… Trouvez les étapes, le matériel et les contrôles adaptés à votre appareil.</p>
      <nav className="rp-guide-collection-nav" aria-label="Choisir les appareils"><a href="/guides/" aria-current={!collection ? 'page' : undefined}>Tous les tutoriels <strong>{repairGuides.length}</strong></a>{guideCollections.map(page => <a key={page.collection} href={page.pathname} aria-current={collection === page.collection ? 'page' : undefined}>{collectionLabel(page.collection)} <strong>{countFor(page.collection === 'smartphones' ? 'smartphone' : 'console')}</strong></a>)}</nav>
      <nav className="rp-guide-family-nav" aria-label="Choisir une famille d’appareils">{families.map(family => <a key={family} href={`#${guideFamilyId(family)}`}>{guideFamilies[family].label} <span aria-hidden="true">↓</span></a>)}</nav>
    </div></section>
    <div className="rp-shell rp-guide-catalog">
      <form className="rp-guide-search" data-guide-search-form hidden><label htmlFor="guide-search-input">Rechercher un tutoriel</label><div><input id="guide-search-input" type="search" name="q" placeholder="Modèle, panne, batterie, écran…" autoComplete="off"/><button type="reset">Effacer</button></div><p data-guide-search-count role="status" aria-live="polite">{guides.length} tutoriels disponibles</p></form>
      <div className="rp-guide-catalog-note"><strong>{guides.length} tutoriels {collection ? `pour ${collection === 'smartphones' ? 'les smartphones' : 'les consoles et manettes'}.` : 'pour les consoles, manettes et smartphones.'}</strong><p>Chaque guide précise le matériel, les gestes à suivre, les vérifications finales et les signes qui imposent de s’arrêter. Choisissez le modèle exact avant tout démontage.</p></div>
      <p className="rp-guide-no-results" data-guide-no-results hidden>Aucun tutoriel ne correspond à cette recherche. Essayez le nom du modèle ou un symptôme plus court.</p>
      {families.map(family => {const familyGuides = guides.filter(guide => guide.family === family);return <section className="rp-guide-family" data-guide-family id={guideFamilyId(family)} key={family} aria-labelledby={`family-${guideFamilyId(family)}`}><div className="rp-guide-section-heading"><span className="rp-eyebrow">{familyGuides.length} {familyGuides.length > 1 ? 'TUTORIELS' : 'TUTORIEL'}</span><h2 id={`family-${guideFamilyId(family)}`}>{guideFamilies[family].label}</h2></div><div className="rp-guide-card-grid">{familyGuides.map(guide => <GuideCard key={guide.slug} guide={guide}/>)}</div></section>;})}
      {collection === 'smartphones' ? <aside className="rp-guide-cta"><h2>Besoin d’un conseil ?</h2><p>Contactez l’atelier en précisant votre appareil et les essais déjà réalisés.</p><a className="rp-button rp-primary" href="/#/accueil?section=rp-contact">Contacter RépaRapid →</a></aside> : <RepairCTA/>}
    </div></main></Shell>;
}
function TextList({values}: {values: string[]}) {return <ul>{values.map((value, index) => <li key={index}>{value}</li>)}</ul>;}
function GuideArticle({guide}: {guide: RepairGuide}) {
  const related = repairGuides.filter(item => item.slug !== guide.slug && item.family === guide.family).slice(0, 3);
  return <Shell><main id="rp-main" tabIndex={-1}><div className="rp-shell"><Breadcrumb guide={guide}/></div><article><header className="rp-guide-hero rp-guide-article-hero"><div className="rp-shell"><div><span className="rp-eyebrow">TUTORIEL · {guide.family.toUpperCase()}</span><h1>{guide.title}</h1><p>{guide.description}</p><div className="rp-guide-article-meta"><span>{guide.model}</span><span>{guide.difficulty}</span><span>Par RépaRapid · Maxxi Games</span><span>Publié le <time dateTime={GUIDE_PUBLISHED_DATE}>{publishedLabel}</time></span></div></div><div className="rp-guide-hero-art"><Art guide={guide} label/></div></div></header><div className="rp-shell rp-guide-layout"><nav className="rp-guide-toc" aria-label="Sommaire du tutoriel"><span className="rp-eyebrow">DANS CE GUIDE</span><ol><li><a href="#comprendre">Comprendre la panne</a></li><li><a href="#symptomes">Les symptômes</a></li><li><a href="#materiel">Le matériel utile</a></li><li><a href="#etapes">Les étapes</a></li><li><a href="#verifications">Vérifier le résultat</a></li><li><a href="#arreter">Quand s’arrêter</a></li><li><a href="#exemples">Exemples concrets</a></li><li><a href="#questions">Questions fréquentes</a></li><li><a href="#sources">Sources et documentation</a></li></ol><a className="rp-guide-toc-return" href="/guides/">← Tous les tutoriels</a></nav><div className="rp-guide-content"><section id="comprendre"><span className="rp-eyebrow">AVANT DE COMMENCER</span><h2>Comprendre la panne</h2><p>{guide.introduction}</p></section><section id="symptomes"><h2>Les symptômes à repérer</h2><TextList values={guide.symptoms}/></section><section id="materiel"><h2>Le matériel utile</h2><TextList values={guide.tools}/></section><section id="etapes"><span className="rp-eyebrow">PROCÉDEZ DANS L’ORDRE</span><h2>Les étapes du tutoriel</h2><ol className="rp-guide-procedure">{guide.steps.map((step, index) => <li key={index}><span className="rp-guide-step-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}</ol></section><section id="verifications"><h2>Vérifier le résultat</h2><TextList values={guide.checks}/></section><section className="rp-guide-stop" id="arreter"><span className="rp-eyebrow">NE FORCEZ PAS LA RÉPARATION</span><h2>Quand s’arrêter et contacter un atelier</h2><TextList values={guide.stop}/></section><section id="exemples"><h2>Exemples concrets</h2><div className="rp-guide-examples">{guide.examples.map((example, index) => <div key={index}><h3>{example.title}</h3><p>{example.body}</p></div>)}</div></section><section id="questions"><h2>Questions fréquentes</h2><div className="rp-guide-faq">{guide.faq.map((item, index) => <details key={index}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></section><section id="sources"><h2>Sources et documentation</h2><p>Les procédures et limites dépendent du modèle exact. Consultez aussi les instructions du fabricant correspondant à votre appareil.</p><ul className="rp-guide-sources">{guide.sources.map((source, index) => <li key={index}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a></li>)}</ul></section><RepairCTA guide={guide}/></div></div></article>{related.length > 0 && <section className="rp-shell rp-guide-related" aria-labelledby="related-title"><div className="rp-guide-section-heading"><span className="rp-eyebrow">POUR ALLER PLUS LOIN</span><h2 id="related-title">D’autres guides {guide.family}</h2></div><div className="rp-guide-card-grid">{related.map(item => <GuideCard key={item.slug} guide={item}/>)}</div></section>}</main></Shell>;
}

function structuredData(guide?: RepairGuide, collection?: Collection) {
  const pathname = guide ? guideUrl(guide.slug) : collection ? collectionPath(collection) : '/guides/';
  const url = GUIDE_ORIGIN + pathname;
  const category = guide ? phoneGuide(guide) ? 'smartphones' : 'consoles' : collection;
  const breadcrumbs = [
    {'@type': 'ListItem', position: 1, name: 'Accueil', item: GUIDE_ORIGIN + '/'},
    {'@type': 'ListItem', position: 2, name: 'Tutoriels', item: GUIDE_ORIGIN + '/guides/'},
    ...(category ? [{'@type': 'ListItem', position: 3, name: collectionLabel(category), item: GUIDE_ORIGIN + collectionPath(category)}] : []),
    ...(guide ? [{'@type': 'ListItem', position: 4, name: guide.title, item: url}] : []),
  ];
  const graph: Record<string, unknown>[] = [{'@type': 'BreadcrumbList', itemListElement: breadcrumbs}];
  if (guide) graph.push({'@type': 'Article', '@id': url + '#article', headline: guide.title, description: guide.description, inLanguage: 'fr-FR', datePublished: GUIDE_PUBLISHED_DATE, mainEntityOfPage: url, author: {'@type': 'Organization', name: 'RépaRapid · Maxxi Games', url: GUIDE_ORIGIN + '/'}, publisher: {'@type': 'Organization', name: 'RépaRapid · Maxxi Games', url: GUIDE_ORIGIN + '/', logo: {'@type': 'ImageObject', url: GUIDE_ORIGIN + '/reparapid-logo-original.webp'}}});
  else graph.push({'@type': 'CollectionPage', name: collection ? `Tutoriels de réparation : ${collectionLabel(collection)}` : catalogTitle, description: collection ? collectionDescription(collection) : catalogDescription, url, inLanguage: 'fr-FR', mainEntity: {'@type': 'ItemList', itemListElement: selectedGuides(collection).map((item, index) => ({'@type': 'ListItem', position: index + 1, name: item.title, url: GUIDE_ORIGIN + guideUrl(item.slug)}))}});
  return {'@context': 'https://schema.org', '@graph': graph};
}
const escapeAttribute = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export function renderGuideDocument({slug, collection, stylesheets, scripts = []}: {slug?: string; collection?: Collection; stylesheets: string[]; scripts?: string[]}) {
  const guide = slug ? repairGuides.find(item => item.slug === slug) : undefined;
  if (slug && !guide) throw new Error(`Tutoriel introuvable : ${slug}`);
  if (collection && !guideCollections.some(page => page.collection === collection)) throw new Error('Collection inconnue.');
  const canonical = GUIDE_ORIGIN + (guide ? guideUrl(guide.slug) : collection ? collectionPath(collection) : '/guides/');
  const title = `${guide?.title || (collection ? `Tutoriels de réparation : ${collectionLabel(collection)}` : catalogTitle)} | RépaRapid`;
  const description = guide?.description || (collection ? collectionDescription(collection) : catalogDescription);
  const body = renderToStaticMarkup(guide ? <GuideArticle guide={guide}/> : <Catalog collection={collection}/>);
  const json = JSON.stringify(structuredData(guide, collection)).replaceAll('<', '\\u003c');
  return `<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="theme-color" content="#a32720"/><title>${escapeAttribute(title)}</title><meta name="description" content="${escapeAttribute(description)}"/><meta name="robots" content="index,follow"/><link rel="canonical" href="${escapeAttribute(canonical)}"/><meta property="og:type" content="${guide ? 'article' : 'website'}"/><meta property="og:title" content="${escapeAttribute(title)}"/><meta property="og:description" content="${escapeAttribute(description)}"/><meta property="og:url" content="${escapeAttribute(canonical)}"/><meta property="og:locale" content="fr_FR"/><meta property="og:site_name" content="RépaRapid"/><link rel="icon" type="image/png" href="/favicon-reparapid.png"/>${stylesheets.map(href => `<link rel="stylesheet" href="${escapeAttribute(href)}"/>`).join('')}<script type="application/ld+json">${json}</script>${!guide ? scripts.map(src => `<script defer src="${escapeAttribute(src)}"></script>`).join('') : ''}</head><body>${body}</body></html>\n`;
}

export function validateGuideContent() {
  const manifestSlugs = guideManifest.map(item => item.slug);
  const contentSlugs = repairGuides.map(item => item.slug);
  if (new Set(contentSlugs).size !== contentSlugs.length || contentSlugs.length !== manifestSlugs.length || contentSlugs.some(slug => !manifestSlugs.includes(slug))) throw new Error('Le contenu doit correspondre exactement au manifeste des tutoriels.');
  if (new Set(repairGuides.map(guide => guide.title)).size !== repairGuides.length || new Set(repairGuides.map(guide => guide.description)).size !== repairGuides.length) throw new Error('Chaque tutoriel doit avoir un titre et une description uniques.');
  for (const guide of repairGuides) {
    if (guide.deviceType && guide.deviceType !== guideFamilies[guide.family]?.deviceType) throw new Error(`Type d’appareil incohérent : ${guide.slug}`);
    if (!guide.title || !guide.description || !guide.introduction || !guideFamilies[guide.family] || !guide.model || !guide.difficulty) throw new Error(`Métadonnées du tutoriel incomplètes : ${guide.slug}`);
    for (const name of ['symptoms', 'tools', 'steps', 'checks', 'stop', 'examples', 'faq', 'sources'] as const) if (!Array.isArray(guide[name]) || !guide[name].length) throw new Error(`Section du tutoriel manquante : ${guide.slug}/${name}`);
    for (const name of ['symptoms', 'tools', 'checks', 'stop'] as const) if (guide[name].some(value => typeof value !== 'string' || !value.trim())) throw new Error(`Texte du tutoriel invalide : ${guide.slug}/${name}`);
    for (const item of [...guide.steps, ...guide.examples]) if (!item.title?.trim() || !item.body?.trim()) throw new Error(`Étape ou exemple incomplet : ${guide.slug}`);
    for (const item of guide.faq) if (!item.question?.trim() || !item.answer?.trim()) throw new Error(`Question incomplète : ${guide.slug}`);
    for (const source of guide.sources) {
      const url = new URL(source.url);
      if (!source.title?.trim() || url.protocol !== 'https:' || url.username || url.password) throw new Error(`Source invalide : ${guide.slug}`);
    }
  }
}
