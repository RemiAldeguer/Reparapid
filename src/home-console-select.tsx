/// <reference types="vite/client" />
import {useId, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject} from 'react';
import {Icon} from './ui';
import sonyLogo from './assets/console-brands/sony.svg?inline';
import nintendoLogo from './assets/console-brands/nintendo.svg?inline';
import microsoftLogo from './assets/console-brands/microsoft.png?inline';
import segaLogo from './assets/console-brands/sega.svg?inline';
import './home-console-select.css';

// Official marks: https://sonyinteractive.com/en/ (header SVG, black rendition),
// https://www.nintendo.com/en-gb/ (header SVG, Nintendo red),
// https://www.sega.co.jp/common/images/logo-sega.svg and Microsoft header image:
// https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE1Mu3b?ver=5c31
// Inlined by Vite: no external image request is needed.
const brandLogos: Record<string, string> = {Sony: sonyLogo, Nintendo: nintendoLogo, Microsoft: microsoftLogo, Sega: segaLogo};
export function ConsoleBrandLogo({brand}: {brand: string}) {
  const src = brandLogos[brand];
  return src ? <img src={src} alt="" draggable={false}/> : <Icon name="gamepad" size={28}/>;
}

export type HomeConsoleChoice = {value: string; label: string; searchLabel?: string; visual: ReactNode};
type Props = {
  label?: string; placeholder?: string; value: string; options: HomeConsoleChoice[];
  onChange: (value: string) => void; inputRef: RefObject<HTMLInputElement | null>;
  disabled?: boolean; invalid?: boolean; errorId?: string; descriptionId?: string;
};

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** A visible, searchable group of native radios; typing never chooses a console. */
export function ConsolePickerSearch({label = 'Votre console', placeholder = 'PS5, Switch, Xbox…', value, options, onChange, inputRef, disabled = false, invalid = false, errorId, descriptionId}: Props) {
  const id = useId(), groupRef = useRef<HTMLFieldSetElement>(null);
  const [query, setQuery] = useState('');
  const words = normalizeSearch(query).split(' ').filter(Boolean);
  const filtered = options.filter(option => {
    const searchable = normalizeSearch(`${option.label} ${option.searchLabel || ''} ${option.value}`);
    const searchableWords = searchable.split(' ');
    const compact = searchable.replace(/ /g, '');
    return words.every(word => /^[a-z]$/.test(word) ? searchableWords.includes(word) : searchable.includes(word) || compact.includes(word));
  });
  const selected = options.find(option => option.value === value);
  const other = options.find(option => option.value === 'other');
  const searchId = `${id}-search`, countId = `${id}-count`;
  const describedBy = [descriptionId, invalid ? errorId : undefined].filter(Boolean).join(' ') || undefined;
  function clearSearch() {setQuery(''); inputRef.current?.focus({preventScroll: true});}
  function changeConsole() {onChange(''); clearSearch();}
  function searchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const selectedRadio = groupRef.current?.querySelector<HTMLInputElement>('input:checked');
      const firstRadio = groupRef.current?.querySelector<HTMLInputElement>('input[type="radio"]');
      (selectedRadio || firstRadio)?.focus();
    }
    if (event.key === 'Escape' && query) {event.preventDefault(); clearSearch();}
  }
  return <div className={`console-picker-search${invalid ? ' is-invalid' : ''}`}>
    <label className="console-picker-search-label" htmlFor={searchId}>Rechercher une console</label>
    <div className="console-picker-search-field">
      <Icon name="search" size={21}/>
      <input ref={inputRef} id={searchId} type="search" value={query} maxLength={80}
        placeholder={placeholder} autoComplete="off" spellCheck={false} disabled={disabled}
        aria-invalid={invalid || undefined} aria-describedby={describedBy}
        onChange={event => setQuery(event.target.value)} onKeyDown={searchKeyDown}/>
      {query && <button type="button" className="console-picker-clear" onClick={clearSearch} disabled={disabled} aria-label="Effacer la recherche"><Icon name="close" size={18}/></button>}
    </div>
    <fieldset ref={groupRef} className="console-picker-group" disabled={disabled} aria-describedby={describedBy}>
      <legend>{label}</legend>
      <p id={countId} className="console-picker-count" role="status" aria-live="polite" aria-atomic="true">{filtered.length === 0 ? 'Aucune console trouvée' : `${filtered.length} console${filtered.length > 1 ? 's' : ''} proposée${filtered.length > 1 ? 's' : ''}`}</p>
      {filtered.length > 0 ? <div className="console-picker-options" aria-describedby={countId}>
        {filtered.map(option => <label key={option.value} className={`console-picker-option${value === option.value ? ' is-selected' : ''}`}>
          <input type="radio" name={`${id}-console`} value={option.value} checked={value === option.value}
            aria-invalid={invalid || undefined} aria-describedby={invalid ? errorId : undefined}
            onChange={() => onChange(option.value)}/>
          <span className="console-picker-option-visual" aria-hidden="true">{option.visual}</span>
          <span className="console-picker-option-label">{option.label}</span>
        </label>)}
      </div> : <div className="console-picker-empty">
        <p>Aucun modèle ne correspond à « {query.trim()} ».</p>
        <p>Essayez un autre nom ou renseignez votre modèle à l’étape suivante.</p>
        <div><button type="button" onClick={clearSearch}>Voir toutes les consoles</button>
          {other && <button type="button" onClick={() => {onChange(other.value); clearSearch();}}>{other.label}</button>}
        </div>
      </div>}
    </fieldset>
    {selected && <div className="console-picker-selection">
      <span className="console-picker-selection-mark" aria-hidden="true"><Icon name="check" size={17}/></span>
      <span aria-live="polite" aria-atomic="true"><small>Console sélectionnée</small><strong>{selected.label}</strong></span>
      <button type="button" onClick={changeConsole} disabled={disabled} aria-label="Changer de console">Changer</button>
    </div>}
  </div>;
}
