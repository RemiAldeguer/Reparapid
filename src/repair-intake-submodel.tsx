import {INTAKE_MODELS, type IntakeModelGroup} from './repair-intake-catalog';
import {ShopConsoleArt} from './shop-console-art';

const originalLabels: Record<string, string> = {
  ps5: 'PS5 d’origine', ps4: 'PS4 d’origine', switch: 'Switch classique',
  'xbox-one': 'Xbox One d’origine', '3ds': '3DS / New 3DS (format standard)',
};

export function IntakeSubmodel({group, value, onChange}: {group: IntakeModelGroup; value: string; onChange: (modelId: string) => void}) {
  if (group.modelIds.length < 2) return null;
  const choices = INTAKE_MODELS.filter(model => group.modelIds.includes(model.id) && model.id !== 'xbox-series');
  return <fieldset className="ri-submodels">
    <legend>Quelle version de votre {group.model} ? <span>Facultatif</span></legend>
    <p>Si vous ne la connaissez pas, gardez « Je ne sais pas ». L’atelier l’identifiera.</p>
    <label className={`ri-submodel-unknown${value ? '' : ' selected'}`}>
      <input type="radio" name="submodel" value="" checked={!value} onChange={() => onChange('')}/>
      <span><strong>Je ne sais pas</strong><small>Continuer sans préciser la version</small></span>
    </label>
    <div className="ri-submodel-options">{choices.map(model => <label key={model.id} className={`ri-submodel-card${value === model.id ? ' selected' : ''}`}>
      <input type="radio" name="submodel" value={model.id} checked={value === model.id} onChange={() => onChange(model.id)} aria-label={originalLabels[model.id] || model.model}/>
      <span className="ri-model-art" aria-hidden="true"><ShopConsoleArt item={model} small/></span>
      <strong>{originalLabels[model.id] || model.model}</strong>
    </label>)}</div>
  </fieldset>;
}
