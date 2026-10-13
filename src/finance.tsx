import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useApp} from './store';
import {PageHeader} from './pages';
import {Empty, Icon, Panel} from './ui';
import {dateFmt, emptyStore, money} from './domain';
import {buildFinanceReport, financeToday, shiftFinanceAnchor, type FinanceBucket, type FinanceGranularity} from './finance-domain';

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;
const shortDate = (date: string) => dateFmt(date).replace(/\s\d{4}$/, '');

function supportedAnchor(anchor: string, granularity: FinanceGranularity) {
  if (anchor < '1900-01-01' || anchor > '9999-12-31') return false;
  try {buildFinanceReport(emptyStore(), {granularity, anchor}); return true;}
  catch {return false;}
}

function adjacentAnchor(anchor: string, granularity: FinanceGranularity, steps: number) {
  try {
    const result = shiftFinanceAnchor(anchor, granularity, steps);
    return supportedAnchor(result, granularity) ? result : null;
  } catch {return null;}
}

function FinanceMetric({label, amount, detail, icon, tone = ''}: {label: string; amount: number; detail: string; icon: string; tone?: string}) {
  return <div className={`finance-metric ${tone}${amount < 0 ? ' is-negative' : ''}`}>
    <dt><span>{label}</span><span className="finance-metric-icon"><Icon name={icon} size={18}/></span></dt>
    <dd>{money(amount)}</dd><p>{detail}</p>
  </div>;
}

function FinanceChart({buckets, granularity, selected, onSelect}: {buckets: FinanceBucket[]; granularity: FinanceGranularity; selected: string; onSelect: (id: string) => void}) {
  const scroll = useRef<HTMLDivElement>(null);
  const firstPeriod = buckets[0]?.id, lastPeriod = buckets[buckets.length - 1]?.id;
  useEffect(() => {
    const showLatest = () => {if (scroll.current) scroll.current.scrollLeft = scroll.current.scrollWidth;};
    showLatest(); window.addEventListener('resize', showLatest);
    return () => window.removeEventListener('resize', showLatest);
  }, [firstPeriod, lastPeriod]);
  const positive = Math.max(0, ...buckets.map(bucket => Math.max(bucket.received, bucket.estimatedGain)));
  const negative = Math.max(0, ...buckets.map(bucket => -bucket.estimatedGain));
  const range = positive + negative || 1, baseline = negative / range * 100;
  return <figure className="finance-chart">
    <figcaption><p>Sélectionnez une période pour retrouver ses paiements.</p><div className="finance-chart-legend"><span><i className="received"/>Encaissé</span><span><i className="gain"/>Gain estimé</span>{negative > 0 && <span><i className="negative"/>Gain négatif</span>}</div></figcaption>
    <div ref={scroll} className="finance-chart-scroll" tabIndex={0} role="region" aria-label={`Diagramme des ${buckets.length} ${granularity === 'week' ? 'semaines' : 'mois'}`}>
      <div className="finance-chart-columns" style={{gridTemplateColumns: `repeat(${buckets.length}, minmax(76px, 1fr))`}}>
        {buckets.map(bucket => <button type="button" key={bucket.id} className="finance-chart-period" aria-pressed={selected === bucket.id} onClick={() => onSelect(bucket.id)} aria-label={`${bucket.label}. Encaissé : ${money(bucket.received)}. Gain estimé : ${money(bucket.estimatedGain)}. Afficher les paiements.`}>
          <span className="finance-chart-bars" aria-hidden="true">
            <span className="finance-chart-zero" style={{bottom: `${baseline}%`}}/>
            <span className="finance-chart-bar received" style={{bottom: `${baseline}%`, height: `${bucket.received / range * 100}%`}}/>
            <span className={`finance-chart-bar gain${bucket.estimatedGain < 0 ? ' negative' : ''}`} style={bucket.estimatedGain < 0 ? {top: `${100 - baseline}%`, height: `${-bucket.estimatedGain / range * 100}%`} : {bottom: `${baseline}%`, height: `${bucket.estimatedGain / range * 100}%`}}/>
          </span>
          <span className="finance-chart-date">{granularity === 'month' ? bucket.label : <>{shortDate(bucket.start)}<span>– {shortDate(bucket.end)}</span></>}</span>
          <strong className="finance-chart-received">{money(bucket.received)}</strong>
          <span className={`finance-chart-gain${bucket.estimatedGain < 0 ? ' is-negative' : ''}`}>Gain {money(bucket.estimatedGain)}</span>
        </button>)}
      </div>
    </div>
    <p className="finance-chart-note">La ligne pointillée représente zéro. Les gains négatifs apparaissent sous cette ligne.</p>
  </figure>;
}

export function Finance() {
  const {data, go} = useApp();
  const [granularity, setGranularity] = useState<FinanceGranularity>('week');
  const [anchor, setAnchor] = useState(() => financeToday()), [selected, setSelected] = useState('');
  const [limit, setLimit] = useState(50), [dateError, setDateError] = useState('');
  const report = useMemo(() => buildFinanceReport(data, {granularity, anchor}), [data, granularity, anchor]);
  const adjacent = useMemo(() => ({previous: adjacentAnchor(anchor, granularity, -1), next: adjacentAnchor(anchor, granularity, 1)}), [anchor, granularity]);
  const bucket = report.buckets.find(item => item.id === selected);
  const payments = bucket ? report.payments.filter(payment => payment.bucketId === bucket.id) : report.payments;
  const totals = report.totals;

  function changePeriod(nextAnchor: string, nextGranularity = granularity) {
    if (!supportedAnchor(nextAnchor, nextGranularity)) {setDateError('Choisissez une date valide entre 1900 et 9999 pour afficher cette période.'); return;}
    setAnchor(nextAnchor); setGranularity(nextGranularity); setSelected(''); setLimit(50); setDateError('');
  }
  function selectBucket(id: string) {setSelected(previous => previous === id ? '' : id); setLimit(50);}

  return <div className="finance-page">
    <PageHeader eyebrow="LE SUIVI DE VOTRE ACTIVITÉ" title="Les finances de l’atelier" description="Retrouvez vos encaissements et vos gains estimés, semaine après semaine ou mois après mois."><button type="button" className="btn secondary" onClick={() => go('/invoices')}><Icon name="note" size={17}/>Créer une facture</button></PageHeader>
    <div className="finance-controls">
      <div className="finance-granularity" role="group" aria-label="Regrouper les finances"><button type="button" aria-pressed={granularity === 'week'} onClick={() => changePeriod(anchor, 'week')}>Semaine</button><button type="button" aria-pressed={granularity === 'month'} onClick={() => changePeriod(anchor, 'month')}>Mois</button></div>
      <div className="finance-anchor-controls"><button type="button" className="icon-btn" aria-label={`Afficher ${granularity === 'week' ? 'la semaine précédente' : 'le mois précédent'}`} disabled={!adjacent.previous} onClick={() => {if (adjacent.previous) changePeriod(adjacent.previous);}}><Icon name="back" size={18}/></button><label className="finance-anchor"><span>Date de référence</span><input type="date" value={anchor} min="1900-01-01" max="9999-12-31" aria-label="Date de référence" onChange={event => {if (event.target.value) changePeriod(event.target.value);}}/></label><button type="button" className="icon-btn" aria-label={`Afficher ${granularity === 'week' ? 'la semaine suivante' : 'le mois suivant'}`} disabled={!adjacent.next} onClick={() => {if (adjacent.next) changePeriod(adjacent.next);}}><Icon name="arrow" size={18}/></button><button type="button" className="btn secondary small" onClick={() => changePeriod(financeToday())}>Aujourd’hui</button></div>
    </div>
    {dateError && <p className="finance-date-error" role="alert">{dateError}</p>}
    <div className="finance-window"><Icon name="calendar" size={16}/><span>{report.buckets.length} {granularity === 'week' ? 'semaines' : 'mois'} · du {dateFmt(report.start)} au {dateFmt(report.end)}</span></div>
    <dl className="finance-metrics">
      <FinanceMetric label="Encaissé" amount={totals.received} detail={`${plural(totals.paidCount, 'paiement')} enregistré${totals.paidCount === 1 ? '' : 's'}`} icon="check" tone="received"/>
      <FinanceMetric label="Pièces des dossiers payés" amount={totals.parts} detail="Coût actuel des pièces utilisées" icon="package" tone="parts"/>
      <FinanceMetric label="Gain estimé" amount={totals.estimatedGain} detail="Encaissé moins les pièces" icon="trend" tone="gain"/>
      <FinanceMetric label="À encaisser" amount={totals.outstanding} detail={`${plural(totals.unpaidCompletedCount, 'dossier')} terminé${totals.unpaidCompletedCount === 1 ? '' : 's'}, non payé${totals.unpaidCompletedCount === 1 ? '' : 's'}`} icon="clock" tone="outstanding"/>
    </dl>
    <p className="finance-method"><Icon name="info" size={16}/><span>Encaissé à la date du paiement. Pièces des dossiers payés déduites. Hors charges et temps de travail.</span></p>
    <Panel title="Encaissé et gain estimé" className="finance-chart-panel" aside={<span className="finance-panel-caption">{granularity === 'week' ? 'Par semaine · lundi à dimanche' : 'Par mois calendaire'}</span>}>
      <FinanceChart buckets={report.buckets} granularity={granularity} selected={selected} onSelect={selectBucket}/>
      <details className="finance-periods"><summary>Comparer les périodes en détail</summary><div className="finance-period-table-scroll"><table className="finance-period-table"><caption>Les périodes les plus récentes sont affichées en premier.</caption><thead><tr><th scope="col">Période</th><th scope="col">Paiements</th><th scope="col">Encaissé</th><th scope="col">Pièces</th><th scope="col">Gain estimé</th><th scope="col">À encaisser</th></tr></thead><tbody>{[...report.buckets].reverse().map(period => <tr key={period.id} className={period.id === selected ? 'is-selected' : ''}><th scope="row"><button type="button" className="text-link" aria-pressed={period.id === selected} onClick={() => selectBucket(period.id)} aria-label={`Voir les paiements de ${period.label}`}>{period.label}</button></th><td>{period.paidCount}</td><td>{money(period.received)}</td><td>{money(period.parts)}</td><td className={period.estimatedGain < 0 ? 'is-negative' : 'finance-gain-value'}>{money(period.estimatedGain)}</td><td>{money(period.outstanding)}</td></tr>)}</tbody></table></div></details>
    </Panel>
    <Panel title={bucket ? `Paiements · ${bucket.label}` : 'Les paiements de la période'} className="finance-payments-panel" aside={bucket ? <button type="button" className="text-link" onClick={() => {setSelected(''); setLimit(50);}}>Toute la période<Icon name="close" size={14}/></button> : <span className="finance-panel-caption">{plural(payments.length, 'paiement')}</span>}>
      {payments.length ? <>
        <div className="finance-payments-head" aria-hidden="true"><span>Date du paiement</span><span>Client</span><span>Console / dossier</span><span>Montants</span></div>
        <ul className="finance-payments-list">{payments.slice(0, limit).map(payment => <li key={payment.repairId} className="finance-payment-row">
          <div className="finance-payment-date"><span className="finance-mobile-label">Date du paiement</span><time dateTime={payment.paymentDate}>{dateFmt(payment.paymentDate)}</time></div>
          <div className="finance-payment-client"><span className="finance-mobile-label">Client</span><button type="button" className="text-link" onClick={() => go(`/clients/${payment.clientId}`)}>{payment.clientName}</button></div>
          <div className="finance-payment-dossier"><button type="button" className="finance-payment-open" onClick={() => go(`/repairs/${payment.repairId}`)} aria-label={`Ouvrir ${payment.repairCode} : ${payment.consoleName}`}>{payment.consoleName}<Icon name="right" size={14}/></button><span className="mono">{payment.repairCode}</span><p>{payment.repairTitle}</p></div>
          <dl className="finance-payment-values"><div><dt>Encaissé</dt><dd>{money(payment.amount)}</dd></div><div><dt>Pièces</dt><dd>{money(payment.parts)}</dd></div><div><dt>Gain estimé</dt><dd className={payment.estimatedGain < 0 ? 'is-negative' : 'finance-gain-value'}>{money(payment.estimatedGain)}</dd></div></dl>
        </li>)}</ul>
        {payments.length > limit && <div className="panel-footer"><span className="finance-panel-caption">{limit} paiements affichés sur {payments.length}</span><button type="button" className="btn secondary small" onClick={() => setLimit(previous => previous + 50)}>Afficher plus de paiements</button></div>}
      </> : <Empty icon="euro" title={bucket ? 'Aucun paiement sur cette période' : 'Aucun paiement enregistré dans cette fenêtre'}>{bucket ? 'Choisissez une autre période ou affichez toute la fenêtre.' : 'Les paiements enregistrés sur les réparations de vos clients apparaîtront ici.'}</Empty>}
    </Panel>
    <p className="finance-scope">Consoles client archivées incluses · Collection de l’atelier exclue · Calendrier de Paris</p>
  </div>;
}
