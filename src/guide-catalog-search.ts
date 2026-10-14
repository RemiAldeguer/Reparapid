// Progressive enhancement for the public catalog only; no network or storage.
export {};
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
const form = document.querySelector<HTMLFormElement>('[data-guide-search-form]');
const input = form?.querySelector<HTMLInputElement>('input[type=search]');
const status = form?.querySelector<HTMLElement>('[data-guide-search-count]');
const cards = [...document.querySelectorAll<HTMLElement>('[data-guide-card]')];
const families = [...document.querySelectorAll<HTMLElement>('[data-guide-family]')];
const empty = document.querySelector<HTMLElement>('[data-guide-no-results]');
if (form && input && status && empty) {
  const searchable = cards.map(card => ({card, text: normalize(card.dataset.search || '')}));
  const filter = () => {
    const terms = normalize(input.value.trim()).split(/\s+/).filter(Boolean);
    let count = 0;
    for (const {card, text} of searchable) {
      card.hidden = !terms.every(term => text.includes(term));
      if (!card.hidden) count++;
    }
    for (const family of families) {
      const visible = family.querySelectorAll('[data-guide-card]:not([hidden])').length;
      family.hidden = visible === 0;
      const counter = family.querySelector<HTMLElement>('.rp-guide-section-heading .rp-eyebrow');
      if (counter) counter.textContent = `${visible} TUTORIEL${visible === 1 ? '' : 'S'}`;
    }
    empty.hidden = count !== 0;
    status.textContent = `${count} tutoriel${count === 1 ? '' : 's'} affiché${count === 1 ? '' : 's'} sur ${cards.length}`;
  };
  form.hidden = false;
  input.addEventListener('input', filter);
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('reset', () => {input.value = ''; filter(); input.focus();});
  for (const link of document.querySelectorAll('.rp-guide-family-nav a')) link.addEventListener('click', () => {input.value = ''; filter();});
  filter();
}
