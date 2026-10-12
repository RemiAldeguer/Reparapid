import {useEffect, useRef, useState, type FormEvent} from 'react';
import {api, ApiError} from './api';
import {dateFmt} from './domain';
import {Badge, Empty, Field, Icon, Modal, Panel} from './ui';
import './registration-review.css';

type RegistrationStatus = 'pending' | 'approved' | 'rejected';
type RegistrationFilter = 'all' | RegistrationStatus;
type RegistrationRequest = {
  id: string; name: string; email: string; workshopName: string; message: string;
  status: RegistrationStatus; createdAt: number; updatedAt: number;
  reviewNote: string; reviewedAt: number | null; reviewedBy: string;
};
type RegistrationList = {requests: RegistrationRequest[]; counts: {total: number; pending: number; approved: number; rejected: number}};
const requestDate = (value: number, full = false) => dateFmt(new Date(value).toISOString(), full);
const statusLabels: Record<RegistrationStatus, string> = {pending: 'En attente', approved: 'Acceptée', rejected: 'Refusée'};
const statusTones: Record<RegistrationStatus, string> = {pending: 'amber', approved: 'green', rejected: 'red'};
const filters: {value: RegistrationFilter; label: string; icon: string}[] = [
  {value: 'all', label: 'Toutes les demandes', icon: 'users'},
  {value: 'pending', label: 'À étudier', icon: 'clock'},
  {value: 'approved', label: 'Acceptées', icon: 'check'},
  {value: 'rejected', label: 'Refusées', icon: 'close'},
];

export function RegistrationReview() {
  const [filter, setFilter] = useState<RegistrationFilter>('pending');
  const [data, setData] = useState<RegistrationList>({requests: [], counts: {total: 0, pending: 0, approved: 0, rejected: 0}});
  const [selectedId, select] = useState(''), [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null), [reviewNote, setReviewNote] = useState('');
  const mounted = useRef(false), generation = useRef(0);
  const readController = useRef<AbortController | null>(null), writeController = useRef<AbortController | null>(null);
  const selected = data.requests.find(request => request.id === selectedId);
  const counts = data.counts;
  const total = counts.total;
  const currentCount = filter === 'all' ? total : counts[filter];
  const normalizedSearch = search.trim().toLocaleLowerCase('fr-FR');
  const visibleRequests = data.requests.filter(request => !normalizedSearch || [request.name, request.email, request.workshopName].some(value => value.toLocaleLowerCase('fr-FR').includes(normalizedSearch)));

  async function load(currentFilter: RegistrationFilter, clearError = true) {
    const ticket = ++generation.current;
    readController.current?.abort();
    const controller = new AbortController(); readController.current = controller;
    setLoading(true); if (clearError) setError('');
    try {
      const next = await api<RegistrationList>(`/api/super-admin/registrations?status=${currentFilter}`, {signal: controller.signal});
      if (!mounted.current || ticket !== generation.current || controller.signal.aborted) return;
      setData(next); select(previous => next.requests.some(request => request.id === previous) ? previous : next.requests[0]?.id || '');
    } catch (failure) {
      if (!mounted.current || ticket !== generation.current || controller.signal.aborted) return;
      setData(previous => ({...previous, requests: []})); select('');
      setError(failure instanceof Error ? failure.message : 'Impossible de charger les demandes.');
    } finally {
      if (readController.current === controller) readController.current = null;
      if (mounted.current && ticket === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    return () => {mounted.current = false; generation.current++; readController.current?.abort(); writeController.current?.abort();};
  }, []);
  useEffect(() => {setSearch(''); setDecision(null); setNotice(''); void load(filter);}, [filter]);

  function openDecision(value: 'approve' | 'reject') {
    setReviewNote(''); setError(''); setNotice(''); setDecision(value);
  }
  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !decision || busy) return;
    const reviewedRequest = selected, action = decision;
    const controller = new AbortController(); writeController.current = controller;
    setBusy(true); setError(''); setNotice('');
    try {
      await api(`/api/super-admin/registrations/${encodeURIComponent(reviewedRequest.id)}/review`, {
        method: 'POST', body: {decision: action, note: reviewNote.trim()}, signal: controller.signal,
      });
      if (!mounted.current || controller.signal.aborted) return;
      setDecision(null); setReviewNote('');
      setNotice(action === 'approve' ? `La demande de ${reviewedRequest.workshopName} est acceptée. Son compte et son atelier ont été créés.` : `La demande de ${reviewedRequest.workshopName} est refusée.`);
      await load(filter);
    } catch (failure) {
      if (!mounted.current || controller.signal.aborted) return;
      setDecision(null); setReviewNote('');
      if (failure instanceof ApiError && failure.status === 409) {
        setError('Cette demande a changé depuis son ouverture. La liste a été actualisée ; vérifiez son statut avant toute nouvelle décision.');
        await load(filter, false);
      } else setError(failure instanceof Error ? failure.message : 'La décision n’a pas pu être enregistrée.');
    } finally {
      if (writeController.current === controller) writeController.current = null;
      if (mounted.current) setBusy(false);
    }
  }

  return <div className="registration-review">
    <div className="page-heading"><div><div className="eyebrow">SUPER ADMINISTRATION</div><h1>Demandes d’accès</h1><p>Étudiez les inscriptions avant d’ouvrir un atelier à chaque nouveau membre.</p></div><button type="button" className="btn secondary" disabled={loading || busy} onClick={() => void load(filter)}><Icon name="restore" size={16}/>Actualiser</button></div>
    <div className="registration-counts" aria-label="Filtrer les demandes d’accès">{filters.map(item => <button key={item.value} type="button" className={`registration-count ${item.value}`} aria-pressed={filter === item.value} disabled={busy} onClick={() => setFilter(item.value)}><span><Icon name={item.icon} size={18}/>{item.label}</span><strong>{item.value === 'all' ? total : counts[item.value]}</strong><small>{filter === item.value ? 'Vue sélectionnée' : 'Voir les demandes'}</small></button>)}</div>
    {notice && <p className="registration-notice" role="status"><Icon name="check" size={18}/>{notice}</p>}
    {error && <p className="registration-error" role="alert"><Icon name="alert" size={18}/>{error}</p>}
    <div className="registration-layout">
      <Panel title={filters.find(item => item.value === filter)!.label} aside={<span className="registration-result-count">{loading ? 'Chargement…' : `${visibleRequests.length} demande${visibleRequests.length > 1 ? 's' : ''}`}</span>} className="registration-list-panel">
        <div className="registration-search"><Icon name="search" size={17}/><input type="search" aria-label="Rechercher un atelier ou un candidat" placeholder="Atelier, nom ou e-mail…" value={search} onChange={event => setSearch(event.target.value)} disabled={busy || loading}/></div>
        {loading ? <div className="registration-loading" role="status">Chargement des demandes…</div> : visibleRequests.length ? <ul className="registration-list">{visibleRequests.map(request => <li key={request.id}><button type="button" aria-pressed={selectedId === request.id} disabled={busy} onClick={() => {select(request.id); setDecision(null); setError('');}}><span className="registration-avatar"><Icon name="wrench" size={21}/></span><span className="registration-request-copy"><strong>{request.workshopName}</strong><span>{request.name}</span><small>Reçue le {requestDate(request.createdAt)}</small></span><span className="registration-request-status"><Badge tone={statusTones[request.status]}>{statusLabels[request.status]}</Badge><Icon name="right" size={17}/></span></button></li>)}</ul> : <Empty icon={filter === 'pending' ? 'check' : 'inbox'} title={normalizedSearch ? 'Aucun résultat' : filter === 'pending' ? 'Aucune demande en attente' : 'Aucune demande dans cette vue'}>{normalizedSearch ? 'Essayez un autre nom, atelier ou e-mail.' : filter === 'pending' ? 'Les prochaines inscriptions apparaîtront ici pour validation.' : 'Choisissez une autre vue pour retrouver les inscriptions.'}</Empty>}
        {!loading && currentCount > data.requests.length && <p className="registration-limit-note">Les {data.requests.length} demandes les plus récentes sont affichées sur {currentCount} dans cette vue.</p>}
      </Panel>
      {selected && !loading ? <Panel title="Détail de la demande" className="registration-detail-panel" aside={<Badge tone={statusTones[selected.status]}>{statusLabels[selected.status]}</Badge>}>
        <div className="registration-detail-body"><span className="registration-detail-label">ATELIER</span><h2>{selected.workshopName}</h2><dl className="registration-contact"><div><dt><Icon name="user" size={15}/>Candidat</dt><dd>{selected.name}</dd></div><div><dt><Icon name="mail" size={15}/>E-mail</dt><dd>{selected.email}</dd></div><div><dt><Icon name="calendar" size={15}/>Date de demande</dt><dd>{requestDate(selected.createdAt, true)}</dd></div></dl><section className="registration-message"><h3>Son activité</h3><p className="prewrap">{selected.message || 'Le candidat n’a pas ajouté de précisions.'}</p></section>
        {selected.status === 'pending' ? <div className="registration-pending-info"><Icon name="shield" size={20}/><p>Accepter crée un compte et un atelier séparé. Le nouveau membre utilisera le mot de passe choisi lors de sa demande.</p></div> : <section className="registration-history"><h3>Décision enregistrée</h3>{selected.reviewedAt && <p>{statusLabels[selected.status]} le {requestDate(selected.reviewedAt, true)}{selected.reviewedBy ? ` par ${selected.reviewedBy}` : ''}.</p>}{selected.reviewNote && <div><span>Note interne</span><p className="prewrap">{selected.reviewNote}</p></div>}</section>}
        </div>
        {selected.status === 'pending' && <div className="registration-decision-buttons"><button type="button" className="btn secondary" disabled={busy} onClick={() => openDecision('reject')}><Icon name="close" size={16}/>Refuser</button><button type="button" className="btn primary" disabled={busy} onClick={() => openDecision('approve')}><Icon name="check" size={17}/>Accepter la demande</button></div>}
      </Panel> : <div className="registration-no-selection"><span><Icon name="note" size={28}/></span><h2>{loading ? 'Les demandes arrivent…' : 'Une inscription à étudier.'}</h2><p>{loading ? 'Chargement du détail de la demande.' : 'Sélectionnez une demande pour consulter l’activité du candidat et prendre votre décision.'}</p></div>}
    </div>
    {decision && selected && <Modal title={decision === 'approve' ? 'Accepter cette demande ?' : 'Refuser cette demande ?'} subtitle={selected.workshopName} onClose={() => {if (!busy) {setDecision(null); setReviewNote('');}}}><form onSubmit={review}><div className="modal-body registration-review-confirm"><p>{decision === 'approve' ? `Un compte sera ouvert pour ${selected.name} (${selected.email}) avec un atelier séparé.` : `La demande de ${selected.name} sera refusée. Aucun compte ne sera ouvert.`}</p><Field label="Note interne (facultative)" hint="Cette note est réservée à la super administration."><textarea value={reviewNote} onChange={event => setReviewNote(event.target.value)} maxLength={1000} rows={3} disabled={busy} placeholder="Précisions sur votre décision…"/></Field></div><div className="modal-footer"><button type="button" className="btn secondary" disabled={busy} onClick={() => {setDecision(null); setReviewNote('');}}>Annuler</button><button type="submit" className={`btn ${decision === 'approve' ? 'primary' : 'danger'}`} disabled={busy}>{busy ? 'Enregistrement…' : decision === 'approve' ? 'Accepter et créer l’atelier' : 'Confirmer le refus'}</button></div></form></Modal>}
  </div>;
}
