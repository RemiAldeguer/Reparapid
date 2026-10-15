import React from 'react';
import type {Stage} from './domain';
import type {IntakeShop} from './client-api';
import './client-shipping-sheet.css';

export type ShippingSheet = {
  repair: {id: string; code: string; title: string; symptoms: string; stage: Stage; createdAt: string};
  console: {brand: string; model: string; variant: string; serial: string; accessories: string};
  customer: {name: string; email: string; phone: string; address: string};
  shop: IntakeShop;
};

const consoleName = (item: ShippingSheet['console']) => item.brand === 'Autre' || item.model.toLocaleLowerCase('fr').startsWith(item.brand.toLocaleLowerCase('fr')) ? item.model : `${item.brand} ${item.model}`;
const requestedOn = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date non renseignée' : new Intl.DateTimeFormat('fr-FR', {day: '2-digit', month: '2-digit', year: 'numeric'}).format(date);
};

/** Also used beside the client's repair progress, before opening the printable sheet. */
export function ShippingPreparationDiagram() {
  return <figure className="shipping-preparation-diagram">
    <svg className="shipping-diagram-wide" viewBox="0 0 660 142" role="img" aria-label="Imprimez la fiche et découpez sur les pointillés. Gardez le talon chez vous et glissez la fiche atelier avec la console protégée dans le colis." focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path className="shipping-diagram-paper" d="M27 26h45l13 13v66H27z"/><path d="M72 26v14h13M38 52h35M38 61h24M38 85h35M38 94h24"/><path strokeDasharray="3 4" d="M28 74h56"/>
        <path className="shipping-diagram-arrow" d="M100 69h33m-7-6 7 6-7 6"/>
        <circle cx="157" cy="60" r="8"/><circle cx="157" cy="82" r="8"/><path d="m164 65 36 27m-36-15 36-29"/>
        <path className="shipping-diagram-arrow" d="M216 70h29V35h41m-7-6 7 6-7 6M245 70v37h41m-7-6 7 6-7 6"/>
        <path className="shipping-diagram-house" d="m303 36 28-22 28 22m-48-6v34h40V30M326 64V47h11v17"/>
        <path className="shipping-diagram-paper" d="M312 40h10v17h-10z"/>
        <path className="shipping-diagram-box" d="m303 100 28-12 28 12v25l-28 12-28-12zM303 100l28 12 28-12M331 112v25M303 100l-9-8 27-12 10 8M359 100l9-8-27-12-10 8"/>
        <path className="shipping-diagram-paper" d="m319 97 2-22 19 2-2 22z"/><path d="m326 83 9 1m-10 5 9 1"/>
      </g>
      <g fill="currentColor" fontFamily="Arial, sans-serif">
        <text x="56" y="130" textAnchor="middle" fontSize="12" fontWeight="700">1. Imprimez</text>
        <text x="179" y="130" textAnchor="middle" fontSize="12" fontWeight="700">2. Découpez</text>
        <text x="383" y="32" fontSize="13" fontWeight="700">3. Gardez le talon chez vous</text>
        <text x="383" y="51" fontSize="11">Votre référence pour suivre la réparation.</text>
        <text x="383" y="100" fontSize="13" fontWeight="700">4. Mettez la fiche dans le colis</text>
        <text x="383" y="119" fontSize="11">Avec votre console soigneusement protégée.</text>
      </g>
    </svg>
    <svg className="shipping-diagram-compact" viewBox="0 0 320 230" role="img" aria-label="Imprimez puis découpez. Le talon reste chez vous ; la fiche atelier est glissée dans le colis avec la console protégée." focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path className="shipping-diagram-paper" d="M43 11h34l11 11v50H43z"/><path d="M77 11v12h11M51 32h27M51 40h18M51 57h27M51 65h18"/><path strokeDasharray="3 4" d="M44 49h42"/>
        <path className="shipping-diagram-arrow" d="M108 42h48m-7-6 7 6-7 6"/>
        <circle cx="184" cy="32" r="8"/><circle cx="184" cy="54" r="8"/><path d="m191 37 36 27m-36-15 36-29"/>
        <path className="shipping-diagram-arrow" d="M240 43h37v62H80v16m-6-7 6 7 6-7M240 105v16m-6-7 6 7 6-7"/>
        <path className="shipping-diagram-house" d="m53 150 27-22 27 22m-46-6v33h38v-33M75 177v-17h11v17"/>
        <path className="shipping-diagram-paper" d="M63 153h9v15h-9z"/>
        <path className="shipping-diagram-box" d="m213 148 27-12 27 12v24l-27 12-27-12zM213 148l27 12 27-12M240 160v24M213 148l-8-8 26-12 9 8M267 148l8-8-26-12-9 8"/>
        <path className="shipping-diagram-paper" d="m229 146 2-22 18 2-2 22z"/><path d="m236 132 7 1m-8 5 7 1"/>
      </g>
      <g fill="currentColor" fontFamily="Arial, sans-serif" textAnchor="middle">
        <text x="65" y="89" fontSize="12" fontWeight="700">1. Imprimez</text>
        <text x="206" y="89" fontSize="12" fontWeight="700">2. Découpez</text>
        <text x="80" y="203" fontSize="12" fontWeight="700">3. Gardez le talon</text>
        <text x="80" y="221" fontSize="11">chez vous.</text>
        <text x="240" y="203" fontSize="12" fontWeight="700">4. Fiche dans le colis</text>
        <text x="240" y="221" fontSize="11">avec la console protégée.</text>
      </g>
    </svg>
    <figcaption>Imprimez, découpez, puis séparez les deux parties : <strong>le talon reste chez vous, la fiche atelier part dans le colis.</strong></figcaption>
  </figure>;
}

function CutLine() {
  return <div className="shipping-cut-line"><svg width="23" height="23" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="6" r="3"/><circle cx="5" cy="18" r="3"/><path d="m7.5 7.5 14 14m-14-5 14-14"/></svg><span>Découpez ici · gardez le talon ci-dessus</span></div>;
}

export function ShippingDocument({sheet}: {sheet: ShippingSheet}) {
  return <article className="intake-sheet-document shipping-cut-sheet">
    <section className="shipping-cut-stub" aria-label="Talon à conserver chez vous">
      <div className="shipping-cut-heading"><div className="shipping-cut-brand"><img src="./reparapid-logo-original.webp" width="300" height="300" alt=""/><strong>RépaRapid</strong></div><span className="shipping-cut-piece-label">01 · À CONSERVER CHEZ VOUS</span></div>
      <div className="shipping-cut-stub-summary"><div><span className="shipping-cut-eyebrow">Votre référence de réparation</span><strong className="shipping-cut-reference">{sheet.repair.code}</strong><p>Demande du {requestedOn(sheet.repair.createdAt)}</p></div><div><strong>{consoleName(sheet.console)}</strong>{sheet.console.variant && <p>{sheet.console.variant}</p>}<p>{sheet.customer.name}</p><p>{sheet.customer.email}{sheet.customer.phone && <> · {sheet.customer.phone}</>}</p></div></div>
      <p className="shipping-cut-stub-contact">Suivez ce dossier dans votre espace client RépaRapid. Pour contacter l’atelier : <strong>{sheet.shop.phone || sheet.shop.email || sheet.shop.shopName}</strong>{sheet.shop.phone && sheet.shop.email && <> · {sheet.shop.email}</>}</p>
      <ShippingPreparationDiagram/>
      <p className="shipping-cut-transport-note">Conservez ce talon ainsi que la preuve d’envoi et le numéro de suivi du transporteur. <strong>Cette fiche n’est pas une étiquette de transport : l’affranchissement se prévoit séparément.</strong></p>
    </section>
    <CutLine/>
    <section className="shipping-cut-workshop" aria-label="Fiche atelier à glisser dans le colis">
      <header className="shipping-cut-workshop-heading"><div><span className="shipping-cut-piece-label">02 · À GLISSER DANS LE COLIS</span><h2>La fiche de votre console.</h2><p>Placez cette partie avec la console protégée, à l’intérieur du carton.</p></div><div className="shipping-cut-workshop-reference"><span>DOSSIER</span><strong>{sheet.repair.code}</strong><span>{requestedOn(sheet.repair.createdAt)}</span></div></header>
      <div className="shipping-cut-parties"><section><h3>Expéditeur · client</h3><strong>{sheet.customer.name}</strong><p className="shipping-cut-multiline">{sheet.customer.address || 'Adresse non renseignée'}</p><p>{sheet.customer.email}<br/>{sheet.customer.phone || 'Téléphone non renseigné'}</p></section><section className={`shipping-cut-destination${sheet.shop.addressConfirmed ? '' : ' shipping-cut-destination-unconfirmed'}`}><h3>Destinataire · atelier</h3><strong>{sheet.shop.shopName}</strong>{sheet.shop.addressConfirmed ? <p className="shipping-cut-multiline">{sheet.shop.address}<br/>{sheet.shop.postalCode} {sheet.shop.city}</p> : <p className="shipping-cut-address-warning"><strong>Adresse d’expédition à confirmer.</strong> N’envoyez pas la console avant confirmation de l’atelier.</p>}<p>{sheet.shop.email}<br/>{sheet.shop.phone}</p></section></div>
      <section className="shipping-cut-console"><h3>Console à réparer</h3><h4>{consoleName(sheet.console)}{sheet.console.variant && <span> · {sheet.console.variant}</span>}</h4><dl><div><dt>Numéro de série</dt><dd>{sheet.console.serial || 'Non renseigné'}</dd></div><div><dt>Accessoires déclarés</dt><dd className="shipping-cut-multiline">{sheet.console.accessories || 'Aucun accessoire déclaré'}</dd></div></dl></section>
      <section className="shipping-cut-symptoms"><h3>Demande · {sheet.repair.title}</h3><p className="shipping-cut-multiline">{sheet.repair.symptoms || 'Aucun symptôme renseigné'}</p></section>
      <section className="shipping-cut-checklist"><h3>Avant de fermer le colis</h3><ol><li>Éteignez la console. Retirez jeux, disques et cartes mémoire non nécessaires.</li><li>Protégez la console et les accessoires séparément ; immobilisez-les dans un carton adapté.</li><li>Glissez cette partie dans le carton. Gardez l’autre partie chez vous.</li></ol><p>Le montant de l’intervention est confirmé après diagnostic. Cette fiche identifie votre dossier ; elle ne constitue ni une étiquette de transport ni un affranchissement. Si la fiche atelier comporte plusieurs pages, joignez-les toutes au colis.</p></section>
      <footer className="shipping-cut-footer"><strong>{sheet.repair.code}</strong><span>Fiche atelier · à conserver avec la console jusqu’à sa prise en charge.</span></footer>
    </section>
  </article>;
}
