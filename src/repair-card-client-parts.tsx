import React, {useState} from 'react';
import {useAuth} from './auth';
import {type Repair, type ClientPartStatus, CLIENT_PART_STATUSES} from './domain';
import {Badge, Icon} from './ui';
import './repair-card-client-parts.css';

const statusOrder: Record<ClientPartStatus, number> = {disponible: 0, 'en-attente': 1, livree: 2, installee: 3};
const statusTone: Record<ClientPartStatus, string> = {'en-attente': 'amber', disponible: 'teal', livree: 'blue', installee: 'green'};

export function RepairCardClientParts({repair}: {repair: Repair}) {
  const [expanded, setExpanded] = useState(false);
  const {user} = useAuth();
  if (!user.workshopId) return null;
  const parts = [...(repair.clientParts || [])].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  if (!parts.length) return null;
  const visible = expanded ? parts : parts.slice(0, 3);
  return <section className="repair-card-client-parts" aria-label={`Pièces demandées au client pour ${repair.code}`}>
    <h3><Icon name="package" size={15}/>Pièces demandées</h3>
    <ul>{visible.map(part => <li key={part.id}>
      <span className="repair-card-part-name"><span>{part.quantity} ×</span><strong>{part.name}</strong></span>
      <Badge tone={statusTone[part.status]} dot={false}>{part.status === 'en-attente' ? 'En attente' : CLIENT_PART_STATUSES[part.status]}</Badge>
    </li>)}</ul>
    {parts.length > 3 && <button type="button" className="repair-card-parts-more" aria-expanded={expanded} aria-label={`${expanded ? 'Réduire' : 'Afficher toutes les pièces demandées pour'} ${repair.code}`} onClick={event => {event.stopPropagation(); setExpanded(value => !value);}}>
      {expanded ? 'Réduire la liste' : `Voir ${parts.length - 3} autre${parts.length - 3 > 1 ? 's' : ''} demande${parts.length - 3 > 1 ? 's' : ''}`}
      <Icon name="down" size={13}/>
    </button>}
  </section>;
}
