/// <reference types="vite/client" />
import {useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject} from 'react';
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
// Inlined by Vite so no external image request or new public asset route is needed.
const brandLogos: Record<string, string> = {Sony: sonyLogo, Nintendo: nintendoLogo, Microsoft: microsoftLogo, Sega: segaLogo};
export function ConsoleBrandLogo({brand}: {brand: string}) {
  const src = brandLogos[brand];
  return src ? <img src={src} alt="" draggable={false}/> : <Icon name="gamepad" size={28}/>;
}

export type HomeConsoleChoice = {value: string; label: string; visual: ReactNode};
type Props = {
  label: string; placeholder: string; value: string; options: HomeConsoleChoice[];
  onChange: (value: string) => void; kind: 'brand' | 'model'; disabled?: boolean;
  invalid?: boolean; errorId?: string; buttonRef: RefObject<HTMLButtonElement | null>;
};

/** Select-only combobox: focus stays on the trigger while its active option changes. */
export function HomeConsoleSelect({label, placeholder, value, options, onChange, kind, disabled = false, invalid = false, errorId, buttonRef}: Props) {
  const id = useId(), rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false), [active, setActive] = useState(0);
  const searchRef = useRef({text: '', time: 0});
  const selected = options.find(option => option.value === value);
  const listId = `${id}-list`, labelId = `${id}-label`;
  const isOpen = open && !disabled;
  function show(fromEnd = false) {
    const index = options.findIndex(option => option.value === value);
    setActive(index >= 0 ? index : fromEnd ? options.length - 1 : 0);
    setOpen(true);
  }
  function choose(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus({preventScroll: true});
  }
  useEffect(() => {
    if (!isOpen) return;
    const outside = (event: Event) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('focusin', outside);
    return () => {document.removeEventListener('pointerdown', outside, true); document.removeEventListener('focusin', outside);};
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const option = rootRef.current?.querySelector<HTMLElement>(`[data-option-index="${active}"]`);
    const list = option?.parentElement;
    if (option && list) {
      if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
      else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
    }
  }, [isOpen, active]);
  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Tab') {setOpen(false); return;}
    if (event.key === 'Escape') {if (isOpen) {event.preventDefault(); event.stopPropagation(); setOpen(false);} return;}
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (isOpen) choose(active); else show();
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (!isOpen) {
        show(event.key === 'ArrowUp' || event.key === 'End');
        if (event.key === 'Home') setActive(0);
        if (event.key === 'End') setActive(options.length - 1);
      } else setActive(index => event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
      return;
    }
    if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      const now = Date.now(), letter = event.key.toLocaleLowerCase('fr');
      const previous = now - searchRef.current.time < 700 ? searchRef.current.text : '';
      const text = previous === letter ? letter : previous + letter;
      searchRef.current = {text, time: now};
      const start = isOpen ? active + 1 : 0;
      const indexes = options.map((_, index) => (start + index) % options.length);
      const index = indexes.find(index => options[index].label.toLocaleLowerCase('fr').startsWith(text));
      if (index !== undefined) {setActive(index); setOpen(true);}
    }
  }
  return <div ref={rootRef} className={`home-console-select home-console-select-${kind}${isOpen ? ' is-open' : ''}`}>
    <label id={labelId} htmlFor={`${id}-trigger`}>{label}</label>
    <button ref={buttonRef} id={`${id}-trigger`} type="button" role="combobox" aria-labelledby={labelId}
      aria-expanded={isOpen} aria-haspopup="listbox" aria-controls={isOpen ? listId : undefined}
      aria-activedescendant={isOpen && options[active] ? `${id}-option-${active}` : undefined}
      aria-required="true" aria-invalid={invalid || undefined} aria-describedby={invalid ? errorId : undefined}
      disabled={disabled} className={`home-console-select-trigger${selected ? ' has-value' : ''}`}
      onClick={() => isOpen ? setOpen(false) : show()} onKeyDown={keyDown}>
      {selected && <span className="home-console-select-visual" aria-hidden="true">{selected.visual}</span>}
      <span className={`home-console-select-value${selected && kind === 'brand' && value !== 'Autre' ? ' home-console-select-brand-name' : ''}`}>{selected?.label || placeholder}</span>
      <span className="home-console-select-chevron" aria-hidden="true"><Icon name="down" size={15}/></span>
    </button>
    {isOpen && <ul id={listId} role="listbox" aria-labelledby={labelId} className="home-console-select-options">
      {options.map((option, index) => <li key={option.value} id={`${id}-option-${index}`} role="option"
        aria-label={option.label} aria-selected={value === option.value} data-option-index={index}
        className={`home-console-select-option${active === index ? ' is-active' : ''}${value === option.value ? ' is-selected' : ''}`}
        onPointerMove={() => setActive(index)} onPointerDown={event => event.preventDefault()} onClick={() => choose(index)}>
        <span className="home-console-select-visual" aria-hidden="true">{option.visual}</span>
        <span className="home-console-select-option-label">{option.label}</span>
        {value === option.value && <span className="home-console-select-check" aria-hidden="true"><Icon name="check" size={15}/></span>}
      </li>)}
    </ul>}
  </div>;
}
