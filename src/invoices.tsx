import React, {useEffect, useMemo, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import {useApp} from './store';
import {api} from './api';
import {PageHeader} from './pages';
import {ConsoleArt, Empty, Icon, StageBadge} from './ui';
import {dateFmt, money, repairTotalCost, validateStore, type Client, type Store} from './domain';
import {buildInvoice, invoiceToday, type InvoiceCustomerInput, type InvoiceInput, type InvoiceSeller, type InvoiceSnapshot} from './invoice-domain';
import './invoices.css';

type InvoiceFields = Required<Omit<InvoiceInput, 'repairIds' | 'customer' | 'format'>> & {customer: InvoiceCustomerInput};
type GeneratedInvoice = {invoice: InvoiceSnapshot; revision: number};
const blankCustomer = (): InvoiceCustomerInput => ({name: '', address: '', email: '', phone: ''});
const customerFields = (client?: Client): InvoiceCustomerInput => client ? {name: client.name, address: client.address, email: client.email, phone: client.phone} : blankCustomer();
const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr-FR');

function initialSelection(data: Store, query: URLSearchParams) {
  const repair = data.repairs.find(item => item.id === query.get('repairId'));
  const repairClient = data.consoles.find(item => item.id === repair?.consoleId)?.clientId;
  const explicitClient = data.clients.find(item => item.id === query.get('clientId'))?.id;
  const clientId = explicitClient || (data.clients.some(item => item.id === repairClient) ? repairClient : '') || '';
  return {clientId, repairIds: repair && repairClient === clientId ? [repair.id] : []};
}

function InvoiceSectionTitle({number, title, detail}: {number: string; title: string; detail: string}) {
  return <div className="invoice-section-heading"><span aria-hidden="true">{number}</span><div><h2>{title}</h2><p>{detail}</p></div></div>;
}

function PartyFields({party, seller = false, onChange}: {party: InvoiceSeller | InvoiceCustomerInput; seller?: boolean; onChange: (field: string, value: string) => void}) {
  const prefix = seller ? 'seller' : 'customer';
  return <div className="invoice-fields-grid">
    <label className="invoice-field invoice-field-wide"><span>{seller ? 'Nom de l’émetteur' : 'Nom du destinataire'} <span aria-hidden="true">*</span></span><input name={`${prefix}Name`} value={party.name} onChange={event => onChange('name', event.target.value)} required maxLength={200} autoComplete={seller ? 'organization' : 'name'}/></label>
    <label className="invoice-field invoice-field-wide"><span>Adresse complète <span aria-hidden="true">*</span></span><textarea name={`${prefix}Address`} value={party.address} onChange={event => onChange('address', event.target.value)} required maxLength={1000} rows={3} autoComplete="street-address" placeholder="Numéro et rue, code postal, ville, pays"/></label>
    {seller && <label className="invoice-field invoice-field-wide"><span>Immatriculation <span aria-hidden="true">*</span></span><input name="sellerRegistration" value={(party as InvoiceSeller).registration} onChange={event => onChange('registration', event.target.value)} required maxLength={120} placeholder="Votre identifiant et registre d’immatriculation"/></label>}
    <label className="invoice-field"><span>E-mail <small>Facultatif</small></span><input name={`${prefix}Email`} type="email" value={party.email} onChange={event => onChange('email', event.target.value)} maxLength={254} autoComplete="email"/></label>
    <label className="invoice-field"><span>Téléphone <small>Facultatif</small></span><input name={`${prefix}Phone`} type="tel" value={party.phone} onChange={event => onChange('phone', event.target.value)} maxLength={80} autoComplete="tel"/></label>
  </div>;
}

function InvoiceDocument({invoice}: {invoice: InvoiceSnapshot}) {
  const simple = invoice.format === 'simple';
  const included = !simple && invoice.taxMode === 'included';
  const title = simple ? 'Facture simple' : 'Facture';
  const reference = `${title}${invoice.number ? ` ${invoice.number}` : ''}`;
  return <article className={`invoice-document${simple ? ' invoice-document-simple' : ''}`} aria-label={reference}>
    <header className="invoice-document-header">
      <div className="invoice-document-brand"><img src="/logo-clinique-retro.svg" width="64" height="64" alt=""/><div><span>ATELIER DE RÉPARATION</span><strong>{invoice.seller.name}</strong></div></div>
      <div className="invoice-document-identity"><h2>{title}</h2>{invoice.number && <p className="invoice-document-number">{invoice.number}</p>}<dl><div><dt>Émission</dt><dd>{dateFmt(invoice.issueDate)}</dd></div>{!simple && <div><dt>Échéance</dt><dd>{dateFmt(invoice.dueDate)}</dd></div>}</dl></div>
    </header>
    <div className="invoice-document-parties">
      {!simple && <section aria-label="Émetteur de la facture"><h3>Émetteur</h3><strong>{invoice.seller.name}</strong><p className="invoice-multiline">{invoice.seller.address}</p><p>Immatriculation : {invoice.seller.registration}</p>{invoice.seller.vatNumber && <p>N° TVA : {invoice.seller.vatNumber}</p>}{invoice.seller.email && <p>{invoice.seller.email}</p>}{invoice.seller.phone && <p>{invoice.seller.phone}</p>}</section>}
      <section className="invoice-document-customer" aria-label="Destinataire de la facture"><h3>{simple ? 'Client' : 'Facturé à'}</h3><strong>{invoice.customer.name}</strong>{!simple && <><p className="invoice-multiline">{invoice.customer.address}</p>{invoice.customer.email && <p>{invoice.customer.email}</p>}{invoice.customer.phone && <p>{invoice.customer.phone}</p>}</>}</section>
    </div>
    <table className="invoice-document-lines">
      <caption>Réparations facturées</caption><colgroup><col className="invoice-line-index"/><col/><col className="invoice-line-amount"/></colgroup>
      <thead><tr><th scope="col">N°</th><th scope="col">Console et intervention</th><th scope="col">{included ? 'Montant TTC' : 'Montant'}</th></tr></thead>
      <tbody>{invoice.lines.map((line, index) => <tr key={line.repairId} className={line.fault.length > 1000 ? 'invoice-line-long' : ''}>
        <td className="invoice-document-line-index">{String(index + 1).padStart(2, '0')}</td>
        <td><strong className="invoice-document-console">{line.consoleName}</strong>{line.variant && <p className="invoice-document-variant">{line.variant}</p>}<p className="invoice-document-reference">{line.repairCode}{line.serial ? ` · Série ${line.serial}` : ''}</p>{line.title && line.title !== line.fault && <p className="invoice-document-service">{line.title}</p>}<p className="invoice-document-fault invoice-multiline"><span>Panne constatée</span>{line.fault}</p>{!simple && <p className="invoice-document-service-date">{line.serviceDate ? `Prestation effectuée le ${dateFmt(line.serviceDate)}` : 'Prestation en cours'}</p>}</td>
        <td className="invoice-document-line-total">{money(line.amount)}</td>
      </tr>)}</tbody>
    </table>
    <div className="invoice-document-bottom">
      <div className="invoice-document-mentions">{!simple && invoice.taxNote && <section><h3>Mention de TVA</h3><p className="invoice-multiline">{invoice.taxNote}</p></section>}{invoice.notes && <section><h3>Informations complémentaires</h3><p className="invoice-multiline">{invoice.notes}</p></section>}</div>
      <dl className="invoice-document-totals">{included && <><div><dt>Total hors TVA</dt><dd>{money(invoice.subtotal)}</dd></div><div><dt>TVA comprise ({new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 2}).format(invoice.taxRate)} %)</dt><dd>{money(invoice.tax)}</dd></div></>}<div className="invoice-document-grand-total"><dt>{included ? 'Total TTC' : 'Total facture'}</dt><dd>{money(invoice.total)}</dd></div></dl>
    </div>
    <footer className="invoice-document-footer"><span>{invoice.seller.name}</span><span>{reference} · Montants en euros</span></footer>
  </article>;
}

export function Invoices({query}: {query: URLSearchParams}) {
  const {data: providerData, go} = useApp();
  const [recentStore, setRecentStore] = useState<Store | null>(null);
  const data = recentStore && recentStore.revision > providerData.revision ? recentStore : providerData;
  const [initial] = useState(() => initialSelection(data, query));
  const [clientId, setClientId] = useState(initial.clientId);
  const [selectedIds, setSelectedIds] = useState<string[]>(initial.repairIds);
  const [search, setSearch] = useState('');
  const [format, setFormat] = useState<'simple' | 'complete'>('complete');
  const [draft, setDraft] = useState<InvoiceFields>(() => ({number: '', issueDate: invoiceToday(), dueDate: invoiceToday(), seller: {name: data.settings.workshop, address: '', registration: '', email: '', phone: '', vatNumber: ''}, customer: customerFields(data.clients.find(item => item.id === initial.clientId)), taxMode: 'none', taxRate: 20, taxNote: '', notes: ''}));
  const [generated, setGenerated] = useState<GeneratedInvoice | null>(null);
  const [error, setError] = useState(''), [previewNotice, setPreviewNotice] = useState('');
  const [busy, setBusy] = useState<'generate' | 'print' | ''>(''), [printReady, setPrintReady] = useState(false);
  const formRef = useRef<HTMLFormElement>(null), errorRef = useRef<HTMLParagraphElement>(null), previewRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(true), requestVersion = useRef(0), requests = useRef(new Set<AbortController>());
  const previousQuery = useRef(query.toString());
  const invoice = generated?.revision === data.revision ? generated.invoice : null;
  const clients = useMemo(() => [...data.clients].sort((a, b) => a.name.localeCompare(b.name, 'fr')), [data.clients]);
  const consoleMap = useMemo(() => new Map(data.consoles.map(item => [item.id, item])), [data.consoles]);
  const repairs = useMemo(() => data.repairs.filter(repair => consoleMap.get(repair.consoleId)?.clientId === clientId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [data.repairs, consoleMap, clientId]);
  const visibleRepairs = useMemo(() => {
    const words = fold(search.trim()).split(/\s+/).filter(Boolean);
    return repairs.filter(repair => {const item = consoleMap.get(repair.consoleId)!; const text = fold([repair.code, repair.title, repair.symptoms, item.code, item.brand, item.model, item.variant, item.serial].join(' ')); return words.every(word => text.includes(word));});
  }, [repairs, consoleMap, search]);
  const selected = new Set(selectedIds);
  const selectedRepairs = repairs.filter(repair => selected.has(repair.id));
  const selectedTotal = selectedRepairs.reduce((sum, repair) => sum + Math.round(repairTotalCost(data, repair) * 100), 0) / 100;

  function invalidate() {requestVersion.current++; for (const request of requests.current) request.abort(); requests.current.clear(); setBusy(''); setPrintReady(false); setGenerated(null); setError(''); setPreviewNotice('');}
  function changeClient(id: string, repairIds: string[] = []) {
    setClientId(id); setSelectedIds(repairIds); setSearch('');
    setDraft(previous => ({...previous, customer: customerFields(data.clients.find(item => item.id === id))}));
    invalidate();
  }
  function changeField<K extends keyof InvoiceFields>(key: K, value: InvoiceFields[K]) {setDraft(previous => ({...previous, [key]: value})); invalidate();}
  function changeParty(party: 'seller' | 'customer', field: string, value: string) {setDraft(previous => ({...previous, [party]: {...previous[party], [field]: value}})); invalidate();}
  function showError(message: string) {setError(message); requestAnimationFrame(() => errorRef.current?.focus());}
  function toggleRepair(id: string) {
    if (!selected.has(id) && selectedIds.length >= 100) {showError('Une facture peut regrouper jusqu’à 100 réparations. Retirez une réparation avant d’en ajouter une autre.'); return;}
    setSelectedIds(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]); invalidate();
  }
  function selectVisible() {
    const next = [...new Set([...selectedIds, ...visibleRepairs.map(repair => repair.id)])];
    if (next.length > 100) {showError('Cette sélection dépasserait 100 réparations. Affinez la recherche pour sélectionner moins de dossiers.'); return;}
    setSelectedIds(next); invalidate();
  }
  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || requests.current.size) return; setGenerated(null); setPrintReady(false); setPreviewNotice('');
    if (!clientId) {showError('Choisissez un client pour préparer sa facture.'); return;}
    if (!selectedIds.length) {showError('Sélectionnez au moins une réparation à faire figurer sur la facture.'); return;}
    if (!formRef.current?.checkValidity()) {setError(format === 'simple' ? 'Vérifiez la date d’émission et les informations saisies.' : 'Complétez les champs obligatoires et vérifiez les coordonnées, les dates et le taux de TVA.'); formRef.current?.reportValidity(); return;}
    const version = ++requestVersion.current, controller = new AbortController(); requests.current.add(controller);
    const current = () => mounted.current && requestVersion.current === version && !controller.signal.aborted;
    const input: InvoiceInput = format === 'simple'
      ? {format: 'simple', repairIds: [...selectedIds], number: draft.number, issueDate: draft.issueDate, notes: draft.notes}
      : structuredClone({...draft, format: 'complete', repairIds: selectedIds, taxRate: draft.taxMode === 'none' ? 0 : draft.taxRate});
    const ownerId = clientId;
    setBusy('generate'); setError('');
    try {
      const fresh = validateStore(await api<Store>('/api/admin/invoice-source', {signal: controller.signal}));
      if (!current()) return;
      setRecentStore(fresh);
      const owned = input.repairIds.every(id => {const repair = fresh.repairs.find(item => item.id === id); return repair && fresh.consoles.find(item => item.id === repair.consoleId)?.clientId === ownerId;});
      if (!owned || !fresh.clients.some(item => item.id === ownerId)) throw Error('Un dossier a été retiré ou rattaché à un autre client. Vérifiez votre sélection avant de générer la facture.');
      const snapshot = buildInvoice(fresh, input);
      setGenerated({invoice: snapshot, revision: fresh.revision}); setError('');
      requestAnimationFrame(() => {previewRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'}); previewRef.current?.focus({preventScroll: true});});
    } catch (failure) {if (current()) showError(failure instanceof Error ? failure.message : 'La facture n’a pas pu être générée. Vérifiez les informations saisies.');}
    finally {requests.current.delete(controller); if (current()) setBusy('');}
  }
  async function printInvoice() {
    if (!generated || !invoice || busy || requests.current.size) return;
    const captured = generated;
    const version = ++requestVersion.current, controller = new AbortController(); requests.current.add(controller);
    const current = () => mounted.current && requestVersion.current === version && !controller.signal.aborted;
    setBusy('print'); setPrintReady(false); setError('');
    try {
      const fresh = validateStore(await api<Store>('/api/admin/invoice-source', {signal: controller.signal}));
      if (!current()) return;
      setRecentStore(fresh);
      const owned = captured.invoice.lines.every(line => {const repair = fresh.repairs.find(item => item.id === line.repairId); return repair && fresh.consoles.find(item => item.id === repair.consoleId)?.clientId === captured.invoice.customer.id;});
      if (fresh.revision !== captured.revision || !owned) {
        setGenerated(null); setPreviewNotice('Les données de l’atelier ont changé. Vérifiez la sélection et les montants, puis générez de nouveau l’aperçu avant de l’imprimer.');
        requestAnimationFrame(() => formRef.current?.scrollIntoView({behavior: 'smooth', block: 'end'}));
        return;
      }
      flushSync(() => {setBusy(''); setPrintReady(true);});
      if (current()) window.print();
    } catch (failure) {if (current()) {setPrintReady(false); showError(failure instanceof Error ? failure.message : 'La vérification avant impression a échoué. Réessayez.');}}
    finally {requests.current.delete(controller); if (current()) setBusy('');}
  }

  useEffect(() => {
    mounted.current = true;
    const afterPrint = () => {if (mounted.current) setPrintReady(false);};
    window.addEventListener('afterprint', afterPrint);
    return () => {mounted.current = false; requestVersion.current++; for (const request of requests.current) request.abort(); requests.current.clear(); window.removeEventListener('afterprint', afterPrint);};
  }, []);
  useEffect(() => {
    if (generated && generated.revision !== data.revision) {setGenerated(null); setPrintReady(false); setPreviewNotice('Les données de l’atelier ont été actualisées. Générez de nouveau l’aperçu pour reprendre les montants actuels.');}
  }, [data.revision, generated]);
  useEffect(() => {
    const valid = new Set(data.repairs.filter(repair => data.consoles.find(item => item.id === repair.consoleId)?.clientId === clientId).map(repair => repair.id));
    setSelectedIds(previous => previous.every(id => valid.has(id)) ? previous : previous.filter(id => valid.has(id)));
    if (clientId && !data.clients.some(item => item.id === clientId)) {setClientId(''); setSearch(''); setDraft(previous => ({...previous, customer: blankCustomer()}));}
  }, [data.revision, data.repairs, data.consoles, data.clients, clientId]);
  const queryText = query.toString();
  useEffect(() => {
    if (previousQuery.current === queryText) return;
    previousQuery.current = queryText;
    const next = initialSelection(data, query); changeClient(next.clientId, next.repairIds);
  }, [queryText]);

  return <div className={`invoice-page${busy ? ' is-busy' : ''}${printReady ? ' is-print-ready' : ''}`} aria-busy={!!busy}>
    <div className="screen-only"><PageHeader eyebrow="LES DOCUMENTS DE VOTRE ATELIER" title="Les factures" description="Rassemblez les réparations d’un client dans un document prêt à imprimer."/></div>
    <div className="invoice-intro screen-only"><span className="invoice-intro-icon"><Icon name="note" size={23}/></span><div><strong>Un client, une ou plusieurs réparations.</strong><p>Les montants actuels des dossiers sont repris, pièces incluses. Choisissez le format, vérifiez l’aperçu, puis imprimez la facture.</p></div></div>
    <form ref={formRef} className="invoice-builder screen-only" onSubmit={event => void generate(event)} noValidate>
      <fieldset className="invoice-builder-fields" disabled={!!busy}>
      <fieldset className="invoice-format-picker"><legend>Format de facture</legend><div className="invoice-format-options">
        <label className={`invoice-format-option${format === 'complete' ? ' is-active' : ''}`}><input type="radio" name="invoiceFormat" value="complete" checked={format === 'complete'} onChange={() => {setFormat('complete'); invalidate();}}/><span className="invoice-format-icon"><Icon name="note" size={21}/></span><span><strong>Facture complète</strong><small>Coordonnées, échéance et présentation de la TVA.</small></span></label>
        <label className={`invoice-format-option${format === 'simple' ? ' is-active' : ''}`}><input type="radio" name="invoiceFormat" value="simple" checked={format === 'simple'} onChange={() => {setFormat('simple'); invalidate();}}/><span className="invoice-format-icon"><Icon name="wrench" size={21}/></span><span><strong>Facture simple</strong><small>Les réparations et leurs montants, sans informations légales.</small></span></label>
      </div></fieldset>
      <section className="invoice-section invoice-selection">
        <InvoiceSectionTitle number="01" title="Choisir les réparations" detail="Les dossiers en cours, clôturés et les consoles archivées sont inclus."/>
        <div className="invoice-selection-body">
          <label className="invoice-field invoice-client-field"><span>Client <span aria-hidden="true">*</span></span><select name="invoiceClient" value={clientId} onChange={event => changeClient(event.target.value)} required><option value="">Choisir un client</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name} · {client.code}</option>)}</select></label>
          {clientId ? <>
            <label className="invoice-search"><Icon name="search" size={18}/><span className="sr-only">Rechercher une réparation de ce client</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Console, référence ou panne…"/></label>
            <div className="invoice-selection-toolbar"><span>{visibleRepairs.length} dossier{visibleRepairs.length === 1 ? '' : 's'} affiché{visibleRepairs.length === 1 ? '' : 's'}{search && ` sur ${repairs.length}`}</span><div><button type="button" className="text-link" onClick={selectVisible} disabled={!visibleRepairs.length || visibleRepairs.every(repair => selected.has(repair.id))}>Sélectionner les dossiers visibles</button><button type="button" className="text-link" onClick={() => {setSelectedIds([]); invalidate();}} disabled={!selectedIds.length}>Retirer la sélection</button></div></div>
            {visibleRepairs.length ? <ul className="invoice-repairs-list">{visibleRepairs.map(repair => {
              const item = consoleMap.get(repair.consoleId)!;
              const fault = repair.symptoms.trim() || repair.title;
              return <li key={repair.id}><label className={`invoice-repair-option${selected.has(repair.id) ? ' is-selected' : ''}`}><input type="checkbox" checked={selected.has(repair.id)} onChange={() => toggleRepair(repair.id)} aria-label={`Ajouter ${repair.code}, ${item.brand} ${item.model}, ${money(repairTotalCost(data, repair))} à la facture`}/><span className={`invoice-console-visual art-${item.illustration}`}><ConsoleArt item={item} small/></span><span className="invoice-repair-copy"><strong>{item.brand} {item.model}</strong><span className="invoice-repair-variant">{[item.variant, item.code].filter(Boolean).join(' · ')}</span><span className="invoice-repair-reference"><span className="mono">{repair.code}</span><StageBadge stage={repair.stage}/></span><span className="invoice-repair-fault">{fault.length > 240 ? `${fault.slice(0, 240)}…` : fault}</span></span><span className="invoice-repair-cost"><strong>{money(repairTotalCost(data, repair))}</strong><span>Coût actuel</span></span></label></li>;
            })}</ul> : <Empty icon="wrench" title={repairs.length ? 'Aucun dossier ne correspond' : 'Ce client n’a pas encore de réparation'}>{repairs.length ? 'Essayez une autre console, une référence ou un mot de la panne.' : 'Ses dossiers apparaîtront ici après l’ouverture d’une réparation.'}</Empty>}
          </> : <Empty icon="users" title={clients.length ? 'Commencez par choisir un client' : 'Votre premier client vous attend'} action={!clients.length ? <button type="button" className="btn secondary" onClick={() => go('/clients')}>Ouvrir les clients<Icon name="arrow" size={16}/></button> : undefined}>La facture regroupe uniquement les réparations d’un même client.</Empty>}
        </div>
        <div className="invoice-selection-total"><div><span>{selectedRepairs.length} réparation{selectedRepairs.length === 1 ? '' : 's'} sélectionnée{selectedRepairs.length === 1 ? '' : 's'}</span><small>Jusqu’à 100 dossiers par facture · un montant nul est accepté</small></div><div><span>Total actuel</span><strong>{money(selectedTotal)}</strong></div></div>
      </section>

      <section className="invoice-section">
        <InvoiceSectionTitle number="02" title="Préparer le document" detail={format === 'simple' ? 'Les noms de l’atelier et du client sont repris de vos dossiers.' : 'Les champs marqués d’un astérisque sont obligatoires.'}/>
        <div className="invoice-section-body">
          <div className={`invoice-fields-grid invoice-identity-fields${format === 'simple' ? ' invoice-identity-simple' : ''}`}>
            <label className="invoice-field invoice-number-field"><span>Numéro de facture {format === 'complete' ? <span aria-hidden="true">*</span> : <small>Facultatif</small>}</span><input name="invoiceNumber" value={draft.number} onChange={event => changeField('number', event.target.value)} required={format === 'complete'} maxLength={80} placeholder={format === 'simple' ? 'Une référence, si vous le souhaitez' : 'Votre numéro de facture'} aria-describedby="invoice-number-hint"/><small id="invoice-number-hint">{format === 'complete' ? 'Saisissez le numéro de votre séquence comptable. Cet outil n’enregistre pas de registre de factures.' : 'Vous pouvez laisser la référence vide.'}</small></label>
            <label className="invoice-field"><span>Date d’émission <span aria-hidden="true">*</span></span><input name="invoiceIssueDate" type="date" value={draft.issueDate} onChange={event => changeField('issueDate', event.target.value)} required min="1900-01-01" max="9999-12-31"/></label>
            {format === 'complete' && <label className="invoice-field"><span>Date d’échéance <span aria-hidden="true">*</span></span><input name="invoiceDueDate" type="date" value={draft.dueDate} onChange={event => changeField('dueDate', event.target.value)} required min={draft.issueDate || '1900-01-01'} max="9999-12-31"/></label>}
          </div>
          {format === 'simple' ? <div className="invoice-simple-fields"><dl className="invoice-simple-names"><div><dt>Atelier</dt><dd>{data.settings.workshop}</dd></div><div><dt>Client</dt><dd>{data.clients.find(client => client.id === clientId)?.name || 'Choisissez un client'}</dd></div></dl><label className="invoice-field"><span>Informations complémentaires <small>Facultatif</small></span><textarea name="invoiceNotes" value={draft.notes} onChange={event => changeField('notes', event.target.value)} maxLength={3000} rows={3} placeholder="Une précision à faire figurer sur la facture…"/></label></div> : <>
          <div className="invoice-parties-form"><fieldset><legend><Icon name="wrench" size={17}/>Émetteur</legend><PartyFields party={draft.seller} seller onChange={(field, value) => changeParty('seller', field, value)}/></fieldset><fieldset><legend><Icon name="user" size={17}/>Destinataire</legend><p className="invoice-field-note">Coordonnées du client préremplies et modifiables pour cette facture.</p><PartyFields party={draft.customer} onChange={(field, value) => changeParty('customer', field, value)}/></fieldset></div>
          <fieldset className="invoice-tax-fields"><legend><Icon name="euro" size={17}/>TVA et informations complémentaires</legend><div className="invoice-fields-grid"><label className="invoice-field"><span>Présentation de la TVA</span><select name="invoiceTaxMode" value={draft.taxMode} onChange={event => {const mode = event.target.value as InvoiceFields['taxMode']; setDraft(previous => ({...previous, taxMode: mode, taxRate: mode === 'none' ? 0 : previous.taxRate || 20})); invalidate();}}><option value="none">Sans TVA</option><option value="included">TVA comprise dans les montants</option></select></label>{draft.taxMode === 'included' && <label className="invoice-field"><span>Taux de TVA (%) <span aria-hidden="true">*</span></span><input name="invoiceTaxRate" type="number" min="0" max="100" step="0.01" value={Number.isFinite(draft.taxRate) ? draft.taxRate : ''} onChange={event => changeField('taxRate', event.target.value === '' ? NaN : Number(event.target.value))} required/></label>}<label className="invoice-field"><span>Numéro de TVA de l’émetteur{draft.taxMode === 'included' && draft.taxRate > 0 ? <span aria-hidden="true"> *</span> : <small>Facultatif</small>}</span><input name="sellerVatNumber" value={draft.seller.vatNumber} onChange={event => changeParty('seller', 'vatNumber', event.target.value)} maxLength={80} required={draft.taxMode === 'included' && draft.taxRate > 0}/></label><label className="invoice-field invoice-field-wide"><span>Mention de TVA <small>À renseigner selon votre situation</small></span><textarea name="invoiceTaxNote" value={draft.taxNote} onChange={event => changeField('taxNote', event.target.value)} maxLength={1000} rows={2} placeholder="Votre mention applicable, si nécessaire"/></label><label className="invoice-field invoice-field-wide"><span>Informations complémentaires <small>Facultatif</small></span><textarea name="invoiceNotes" value={draft.notes} onChange={event => changeField('notes', event.target.value)} maxLength={3000} rows={3} placeholder="Conditions de règlement, coordonnées bancaires ou autre information à faire figurer…"/></label></div><p className="invoice-field-note"><Icon name="info" size={15}/>Les montants des réparations sont repris tels quels. La TVA comprise est détaillée dans ce total, sans supplément.</p></fieldset>
          </>}
        </div>
      </section>
      </fieldset>
      {error && <p ref={errorRef} className="invoice-error" role="alert" tabIndex={-1}><Icon name="alert" size={18}/>{error}</p>}
      {previewNotice && <p className="invoice-preview-notice" role="status"><Icon name="info" size={18}/>{previewNotice}</p>}
      <div className="invoice-generate-bar"><p role={busy === 'generate' ? 'status' : undefined}><Icon name={busy === 'generate' ? 'clock' : 'note'} size={16}/>{busy === 'generate' ? 'Vérification des dossiers et des montants actuels…' : 'L’aperçu reprend les informations au moment de sa génération.'}</p><button type="submit" className="btn primary" disabled={!!busy}><Icon name="note" size={18}/>{busy === 'generate' ? 'Vérification…' : 'Générer l’aperçu'}<Icon name="arrow" size={16}/></button></div>
      {format === 'complete' && <p className="invoice-reference-help"><a href="https://entreprendre.service-public.gouv.fr/vosdroits/F31808" target="_blank" rel="noreferrer">Mentions de facturation<Icon name="arrow" size={13}/></a><span>Les coordonnées et mentions restent à renseigner pour votre activité.</span></p>}
    </form>

    {invoice && <div ref={previewRef} className="invoice-preview" tabIndex={-1} aria-label={invoice.format === 'simple' ? 'Aperçu de la facture simple' : 'Aperçu de la facture'}>
      <div className="invoice-preview-heading screen-only"><div><span className="invoice-preview-ready"><Icon name={busy === 'print' ? 'clock' : 'check'} size={14}/>{busy === 'print' ? 'Vérification des montants…' : 'Aperçu prêt'}</span><h2>{invoice.format === 'simple' ? 'Votre facture simple' : 'Votre facture'}</h2><p role={busy === 'print' ? 'status' : undefined}>{busy === 'print' ? 'Les données sont vérifiées avant l’ouverture du dialogue d’impression.' : 'Pour obtenir un PDF, choisissez « Enregistrer au format PDF » dans le dialogue d’impression.'}</p></div><button type="button" className="btn primary" disabled={!!busy} onClick={() => void printInvoice()}><Icon name="print" size={18}/>{busy === 'print' ? 'Vérification…' : 'Imprimer / Enregistrer en PDF'}</button></div>
      <InvoiceDocument invoice={invoice}/>
      <p className="invoice-preview-footnote screen-only">Modifier un champ ou la sélection masque cet aperçu jusqu’à sa prochaine génération.</p>
    </div>}
  </div>;
}
