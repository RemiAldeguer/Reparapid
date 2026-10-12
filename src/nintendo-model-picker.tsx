import React from 'react';
import {Field} from './ui';

const families = [
  {name: 'Game Boy', models: ['Game Boy', 'Game Boy Pocket', 'Game Boy Light', 'Game Boy Color', 'Game Boy Advance', 'Game Boy Advance SP', 'Game Boy Micro']},
  {name: 'Nintendo DS', models: ['DS', 'DS Lite', 'DSi', 'DSi XL']},
  {name: 'Nintendo 3DS', models: ['3DS', '3DS XL', '2DS', 'New 3DS', 'New 3DS XL', 'New 2DS XL']},
  {name: 'Consoles de salon Nintendo', models: ['NES', 'Super Nintendo', 'Nintendo 64', 'GameCube', 'Wii', 'Wii U']},
  {name: 'Nintendo Switch', models: ['Switch', 'Switch OLED', 'Switch Lite', 'Switch 2']},
  {name: 'Manettes NES et Super Nintendo', models: ['Manette NES', 'Manette Super Nintendo']},
  {name: 'Manettes Nintendo 64 et GameCube', models: ['Manette Nintendo 64', 'Manette GameCube']},
  {name: 'Manettes Wii', models: ['Wii Remote', 'Nunchuk Wii', 'Manette classique Wii', 'Manette classique Pro Wii']},
  {name: 'Manettes Wii U', models: ['Wii U GamePad', 'Manette Pro Wii U']},
  {name: 'Manettes Nintendo Switch', models: ['Joy-Con gauche', 'Joy-Con droit', 'Paire de Joy-Con', 'Manette Pro Switch']},
  {name: 'Manettes Nintendo Switch 2', models: ['Joy-Con 2 gauche', 'Joy-Con 2 droit', 'Paire de Joy-Con 2', 'Manette Pro Switch 2']},
];

export function NintendoModelPicker({brand, model, onSelect}: {brand: string; model: string; onSelect: (model: string) => void}) {
  const selected = brand.trim().toLowerCase() === 'nintendo' && families.some(family => family.models.includes(model)) ? model : '';
  return <Field label="Consoles et manettes Nintendo" className="span-2" hint="Choisissez un appareil Nintendo ou saisissez librement une autre marque et un autre modèle ci-dessous.">
    <select value={selected} onChange={event => onSelect(event.target.value)}>
      <option value="">Autre modèle / saisie libre</option>
      {families.map(family => <optgroup key={family.name} label={family.name}>{family.models.map(name => <option key={name} value={name}>{name}</option>)}</optgroup>)}
    </select>
  </Field>;
}
