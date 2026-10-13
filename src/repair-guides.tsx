import {renderToStaticMarkup} from 'react-dom/server';
import type {ReactNode} from 'react';
import {ShopConsoleArt, type ShopConsoleItem} from './shop-console-art';
import {repairGuides} from './repair-guides-content';
import {guideManifest, GUIDE_ORIGIN, GUIDE_PUBLISHED_DATE} from './repair-guides-manifest.mjs';
import type {RepairGuide, RepairGuideFamily} from './repair-guides-types';

export {repairGuides};
const familyBrands: Record<RepairGuideFamily, string> = {PlayStation: 'Sony', Nintendo: 'Nintendo', Xbox: 'Microsoft', Sega: 'Sega', 'Steam Deck': 'Valve'};
const familyLabels: Record<RepairGuideFamily, string> = {PlayStation: 'PlayStation', Nintendo: 'Nintendo', Xbox: 'Xbox', Sega: 'Consoles Sega', 'Steam Deck': 'Steam Deck'};
const guideUrl = (slug: string) => `/guides/${slug}/`;
const publishedLabel = '13 octobre 2026';
const catalogTitle = 'Tutoriels de réparation de consoles : nos guides pratiques';
const catalogDescription = 'PS5, PS4, Nintendo Switch, Xbox et consoles rétro : identifiez la panne, réalisez les contrôles utiles et apprenez quand confier votre console à un atelier.';

function Brand() {
  return <a className="rp-brand" href="/" aria-label="RépaRapid, accueil"><img className="rp-brand-image" src="/reparapid-logo-original.webp" width="300" height="300" alt=""/><span>RépaRapid<small>PAR MAXXI GAMES · LE KREMLIN-BICÊTRE</small></span></a>;
}
function Shell({children}: {children: ReactNode}) {
  return <div className="reparapid-site rp-guides"><a className="rp-skip" href="#rp-main">Aller au contenu</a><div className="rp-topline"><span>Réparation de consoles · Le Kremlin-Bicêtre</span><a href="/#/connexion">Accès magasin →</a></div><header className="rp-header rp-shell"><Brand/><nav aria-label="Navigation du site"><a href="/guides/">Tutoriels</a><a href="/#/accueil?section=rp-contact">Contact</a><a href="/#/espace-client">Mon compte</a><a className="rp-button rp-primary" href="/#/demande-reparation">Réparer ma console →</a></nav></header>{children}<footer className="rp-footer"><div className="rp-shell rp-footer-inner"><div><Brand/><p>Votre prochaine partie commence ici.</p></div><nav aria-label="Liens utiles"><a href="/guides/">Tous les tutoriels</a><a href="/#/demande-reparation">Demander une réparation</a><a href="/#/espace-client">Mon espace client</a><a href="/#/accueil?section=rp-contact">Contactez-nous</a></nav><p className="rp-legal-note">Les marques et modèles servent à identifier votre console.<br/>RépaRapid est un service indépendant des fabricants.</p></div></footer></div>;
}
function Art({guide, label = false}: {guide: RepairGuide; label?: boolean}) {
  const item: ShopConsoleItem = {brand: familyBrands[guide.family], model: guide.model};
  return <ShopConsoleArt item={item} label={label ? `Illustration de ${guide.model}` : undefined}/>;
}
function Breadcrumb({guide}: {guide?: RepairGuide}) {
  return <nav className="rp-guide-breadcrumb" aria-label="Fil d’Ariane"><ol><li><a href="/">Accueil</a></li><li>{guide ? <a href="/guides/">Tutoriels</a> : <span aria-current="page">Tutoriels</span>}</li>{guide && <li><span aria-current="page">{guide.title}</span></li>}</ol></nav>;
}
function GuideCard({guide}: {guide: RepairGuide}) {
  return <article className="rp-guide-card"><a className="rp-guide-card-art" href={guideUrl(guide.slug)} tabIndex={-1} aria-hidden="true"><Art guide={guide}/></a><div className="rp-guide-card-copy"><div className="rp-guide-tags"><span>{guide.model}</span><span>{guide.difficulty}</span></div><h3><a href={guideUrl(guide.slug)}>{guide.title}</a></h3><p>{guide.description}</p><a className="rp-guide-card-link" href={guideUrl(guide.slug)}>Lire le tutoriel <span aria-hidden="true">→</span></a></div></article>;
}
function RepairCTA({guide}: {guide?: RepairGuide}) {
  const brand = guide?.family === 'Steam Deck' ? 'Autre' : guide ? familyBrands[guide.family] : '';
  const requestUrl = `/#/demande-reparation${brand ? `?marque=${encodeURIComponent(brand)}` : ''}`;
  return <aside className="rp-guide-cta" aria-label="Confier votre réparation à RépaRapid"><span className="rp-eyebrow">UN DOUTE SUR LA SUITE ?</span><h2>L’atelier prend le relais.</h2><p>Décrivez votre console et les vérifications déjà réalisées. RépaRapid · Maxxi Games vous accueille au Kremlin-Bicêtre et propose un suivi dans votre espace client. Le montant est confirmé après diagnostic.</p><div><a className="rp-button rp-primary" href={requestUrl}>Demander une réparation →</a><a className="rp-text-link" href="/#/accueil?section=rp-how">Comment ça marche</a></div></aside>;
}
function Catalog() {
  const families = Object.keys(familyLabels) as RepairGuideFamily[];
  return <Shell><main id="rp-main" tabIndex={-1}><div className="rp-shell"><Breadcrumb/></div><section className="rp-guide-hero"><div className="rp-shell"><span className="rp-eyebrow">DIAGNOSTIQUER · ENTRETENIR · REJOUER</span><h1>Tutoriels de réparation<br/>de consoles.</h1><p>Écran noir, charge impossible, joystick imprécis… Nos tutoriels vous aident à comprendre le symptôme, effectuer des contrôles méthodiques et choisir la prochaine étape.</p><nav className="rp-guide-family-nav" aria-label="Choisir une famille de consoles">{families.map(family => <a key={family} href={`#${family.toLowerCase().replaceAll(' ', '-')}`}>{familyLabels[family]} <span aria-hidden="true">↓</span></a>)}</nav></div></section><div className="rp-shell rp-guide-catalog"><div className="rp-guide-catalog-note"><strong>{repairGuides.length} tutoriels pour les consoles de salon, portables et rétro.</strong><p>Chaque guide précise le matériel, les gestes à suivre, les vérifications finales et les signes qui imposent de s’arrêter. Les variantes d’un même modèle peuvent demander des pièces et procédures différentes.</p></div>{families.map(family => <section className="rp-guide-family" id={family.toLowerCase().replaceAll(' ', '-')} key={family} aria-labelledby={`family-${family.toLowerCase().replaceAll(' ', '-')}`}><div className="rp-guide-section-heading"><span className="rp-eyebrow">{repairGuides.filter(guide => guide.family === family).length} {repairGuides.filter(guide => guide.family === family).length > 1 ? 'TUTORIELS' : 'TUTORIEL'}</span><h2 id={`family-${family.toLowerCase().replaceAll(' ', '-')}`}>{familyLabels[family]}</h2></div><div className="rp-guide-card-grid">{repairGuides.filter(guide => guide.family === family).map(guide => <GuideCard key={guide.slug} guide={guide}/>)}</div></section>)}<RepairCTA/></div></main></Shell>;
}
function TextList({values}: {values: string[]}) {return <ul>{values.map((value, index) => <li key={index}>{value}</li>)}</ul>;}
function GuideArticle({guide}: {guide: RepairGuide}) {
  const related = repairGuides.filter(item => item.slug !== guide.slug && item.family === guide.family).slice(0, 3);
  return <Shell><main id="rp-main" tabIndex={-1}><div className="rp-shell"><Breadcrumb guide={guide}/></div><article><header className="rp-guide-hero rp-guide-article-hero"><div className="rp-shell"><div><span className="rp-eyebrow">TUTORIEL · {guide.family.toUpperCase()}</span><h1>{guide.title}</h1><p>{guide.description}</p><div className="rp-guide-article-meta"><span>{guide.model}</span><span>{guide.difficulty}</span><span>Par RépaRapid · Maxxi Games</span><span>Publié le <time dateTime={GUIDE_PUBLISHED_DATE}>{publishedLabel}</time></span></div></div><div className="rp-guide-hero-art"><Art guide={guide} label/></div></div></header><div className="rp-shell rp-guide-layout"><nav className="rp-guide-toc" aria-label="Sommaire du tutoriel"><span className="rp-eyebrow">DANS CE GUIDE</span><ol><li><a href="#comprendre">Comprendre la panne</a></li><li><a href="#symptomes">Les symptômes</a></li><li><a href="#materiel">Le matériel utile</a></li><li><a href="#etapes">Les étapes</a></li><li><a href="#verifications">Vérifier le résultat</a></li><li><a href="#arreter">Quand s’arrêter</a></li><li><a href="#exemples">Exemples concrets</a></li><li><a href="#questions">Questions fréquentes</a></li><li><a href="#sources">Sources et documentation</a></li></ol><a className="rp-guide-toc-return" href="/guides/">← Tous les tutoriels</a></nav><div className="rp-guide-content"><section id="comprendre"><span className="rp-eyebrow">AVANT DE COMMENCER</span><h2>Comprendre la panne</h2><p>{guide.introduction}</p></section><section id="symptomes"><h2>Les symptômes à repérer</h2><TextList values={guide.symptoms}/></section><section id="materiel"><h2>Le matériel utile</h2><TextList values={guide.tools}/></section><section id="etapes"><span className="rp-eyebrow">PROCÉDEZ DANS L’ORDRE</span><h2>Les étapes du tutoriel</h2><ol className="rp-guide-procedure">{guide.steps.map((step, index) => <li key={index}><span className="rp-guide-step-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}</ol></section><section id="verifications"><h2>Vérifier le résultat</h2><TextList values={guide.checks}/></section><section className="rp-guide-stop" id="arreter"><span className="rp-eyebrow">NE FORCEZ PAS LA RÉPARATION</span><h2>Quand s’arrêter et contacter un atelier</h2><TextList values={guide.stop}/></section><section id="exemples"><h2>Exemples concrets</h2><div className="rp-guide-examples">{guide.examples.map((example, index) => <div key={index}><h3>{example.title}</h3><p>{example.body}</p></div>)}</div></section><section id="questions"><h2>Questions fréquentes</h2><div className="rp-guide-faq">{guide.faq.map((item, index) => <details key={index}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></section><section id="sources"><h2>Sources et documentation</h2><p>Les procédures et limites dépendent du modèle exact. Consultez aussi les instructions du fabricant correspondant à votre appareil.</p><ul className="rp-guide-sources">{guide.sources.map((source, index) => <li key={index}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a></li>)}</ul></section><RepairCTA guide={guide}/></div></div></article>{related.length > 0 && <section className="rp-shell rp-guide-related" aria-labelledby="related-title"><div className="rp-guide-section-heading"><span className="rp-eyebrow">POUR ALLER PLUS LOIN</span><h2 id="related-title">D’autres guides {guide.family}</h2></div><div className="rp-guide-card-grid">{related.map(item => <GuideCard key={item.slug} guide={item}/>)}</div></section>}</main></Shell>;
}

function structuredData(guide?: RepairGuide) {
  const url = GUIDE_ORIGIN + (guide ? guideUrl(guide.slug) : '/guides/');
  const graph: Record<string, unknown>[] = [{
    '@type': 'BreadcrumbList', itemListElement: [
      {'@type': 'ListItem', position: 1, name: 'Accueil', item: GUIDE_ORIGIN + '/'},
      {'@type': 'ListItem', position: 2, name: 'Tutoriels', item: GUIDE_ORIGIN + '/guides/'},
      ...(guide ? [{'@type': 'ListItem', position: 3, name: guide.title, item: url}] : []),
    ],
  }];
  if (guide) {
    graph.push({'@type': 'Article', '@id': url + '#article', headline: guide.title, description: guide.description, inLanguage: 'fr-FR', datePublished: GUIDE_PUBLISHED_DATE, mainEntityOfPage: url, author: {'@type': 'Organization', name: 'RépaRapid · Maxxi Games', url: GUIDE_ORIGIN + '/'}, publisher: {'@type': 'Organization', name: 'RépaRapid · Maxxi Games', url: GUIDE_ORIGIN + '/', logo: {'@type': 'ImageObject', url: GUIDE_ORIGIN + '/reparapid-logo-original.webp'}}});
  } else graph.push({'@type': 'CollectionPage', name: catalogTitle, description: catalogDescription, url, inLanguage: 'fr-FR', mainEntity: {'@type': 'ItemList', itemListElement: repairGuides.map((item, index) => ({'@type': 'ListItem', position: index + 1, name: item.title, url: GUIDE_ORIGIN + guideUrl(item.slug)}))}});
  return {'@context': 'https://schema.org', '@graph': graph};
}
const escapeAttribute = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export function renderGuideDocument({slug, stylesheets}: {slug?: string; stylesheets: string[]}) {
  const guide = slug ? repairGuides.find(item => item.slug === slug) : undefined;
  if (slug && !guide) throw new Error(`Tutoriel introuvable : ${slug}`);
  const canonical = GUIDE_ORIGIN + (guide ? guideUrl(guide.slug) : '/guides/');
  const title = `${guide?.title || catalogTitle} | RépaRapid`;
  const description = guide?.description || catalogDescription;
  const body = renderToStaticMarkup(guide ? <GuideArticle guide={guide}/> : <Catalog/>);
  const json = JSON.stringify(structuredData(guide)).replaceAll('<', '\\u003c');
  return `<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="theme-color" content="#a32720"/><title>${escapeAttribute(title)}</title><meta name="description" content="${escapeAttribute(description)}"/><meta name="robots" content="index,follow"/><link rel="canonical" href="${escapeAttribute(canonical)}"/><meta property="og:type" content="${guide ? 'article' : 'website'}"/><meta property="og:title" content="${escapeAttribute(title)}"/><meta property="og:description" content="${escapeAttribute(description)}"/><meta property="og:url" content="${escapeAttribute(canonical)}"/><meta property="og:locale" content="fr_FR"/><meta property="og:site_name" content="RépaRapid"/><link rel="icon" type="image/png" href="/favicon-reparapid.png"/>${stylesheets.map(href => `<link rel="stylesheet" href="${escapeAttribute(href)}"/>`).join('')}<script type="application/ld+json">${json}</script></head><body>${body}</body></html>\n`;
}

export function validateGuideContent() {
  const manifestSlugs = guideManifest.map(item => item.slug);
  const contentSlugs = repairGuides.map(item => item.slug);
  if (new Set(contentSlugs).size !== contentSlugs.length || contentSlugs.length !== manifestSlugs.length || contentSlugs.some(slug => !manifestSlugs.includes(slug))) throw new Error('Le contenu doit correspondre exactement au manifeste des tutoriels.');
  if (new Set(repairGuides.map(guide => guide.title)).size !== repairGuides.length || new Set(repairGuides.map(guide => guide.description)).size !== repairGuides.length) throw new Error('Chaque tutoriel doit avoir un titre et une description uniques.');
  for (const guide of repairGuides) {
    if (!guide.title || !guide.description || !guide.introduction || !familyBrands[guide.family] || !guide.model || !guide.difficulty) throw new Error(`Métadonnées du tutoriel incomplètes : ${guide.slug}`);
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
