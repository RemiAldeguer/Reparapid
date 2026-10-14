import React, {useState} from 'react';
import {useApp} from './store';
import {useAuth} from './auth';
import {addEvent, money, uid, validatePublicRepairPackages} from './domain';
import type {RepairPackage} from './domain';
import {INTAKE_MODELS, faultSuggestions} from './repair-intake-domain';
import {Field, Icon, Panel} from './ui';
import './public-repair-package-settings.css';

type PackageDraft = Omit<RepairPackage, 'id' | 'amount' | 'priceMode'> & {
  id?: string;
  amount: string;
  priceMode: RepairPackage['priceMode'] | '';
};
const models = INTAKE_MODELS.filter(model => model.id !== 'other');
const families = [...new Set(models.map(model => model.family))];
const emptyDraft = (): PackageDraft => ({modelId: '', fault: '', label: '', amount: '', priceMode: '', includes: '', published: false});
const draftOf = (item: RepairPackage): PackageDraft => ({...item, amount: String(item.amount)});
const modelName = (id: string) => models.find(model => model.id === id)?.model || '';
const priceText = (amount: number, mode: RepairPackage['priceMode']) => `${mode === 'from' ? 'À partir de ' : ''}${money(amount)} TTC`;
function packageFromDraft(draft: PackageDraft, id: string): RepairPackage {
  if (!draft.amount.trim()) throw Error('Renseignez le montant du forfait.');
  return validatePublicRepairPackages([{id, modelId: draft.modelId, fault: draft.fault, label: draft.label.trim(), amount: Number(draft.amount), priceMode: draft.priceMode, includes: draft.includes.trim(), published: draft.published}])[0];
}
function previewOf(draft: PackageDraft | null): RepairPackage | null {
  if (!draft) return null;
  try { return packageFromDraft(draft, draft.id || 'preview'); }
  catch { return null; }
}

export function PublicRepairPackageSettingsPanel() {
  const {data, transact} = useApp();
  const {user} = useAuth();
  const packages = data.settings.publicRepairPackages || [];
  const [draft, setDraft] = useState<PackageDraft | null>(() => packages.length ? null : emptyDraft());
  if (user.role !== 'super_admin') return null;

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const editing = !!draft.id, id = draft.id || uid();
    const accepted = transact(store => {
      const next = structuredClone(store.settings.publicRepairPackages || []);
      const item = packageFromDraft(draft, id);
      if (editing) {
        const index = next.findIndex(value => value.id === id);
        if (index < 0) throw Error('Ce forfait a changé. Consultez le catalogue avant de le modifier.');
        next[index] = item;
      } else next.push(item);
      store.settings.publicRepairPackages = validatePublicRepairPackages(next);
      addEvent(store, `${editing ? 'Forfait de réparation modifié' : 'Forfait de réparation ajouté'} : ${item.label}.`, 'system');
    }, 'Forfait de réparation enregistré.');
    // Acceptance starts the server save. Keep the form until the user closes it;
    // the Provider blocks interaction and reports the confirmed result.
    if (accepted) setDraft({...draft, id});
  }

  function hide(item: RepairPackage) {
    transact(store => {
      const next = structuredClone(store.settings.publicRepairPackages || []);
      const current = next.find(value => value.id === item.id);
      if (!current || !current.published) throw Error('Ce forfait a changé. Consultez le catalogue avant de le modifier.');
      current.published = false;
      store.settings.publicRepairPackages = validatePublicRepairPackages(next);
      addEvent(store, `Forfait retiré de la vitrine : ${current.label}.`, 'system');
    }, 'Forfait masqué sur le site. Vous pouvez le réafficher en le modifiant.');
  }

  const preview = previewOf(draft), publishedCount = packages.filter(item => item.published).length;
  return <Panel title="Forfaits de réparation du site" className="repair-package-settings" aside={
    <button type="button" className="btn secondary small" disabled={!!draft || packages.length >= 200} onClick={() => setDraft(emptyDraft())}><Icon name="plus" size={15}/>Ajouter</button>
  }>
    <div className="panel-body repair-package-body">
      <p className="settings-text">Associez chaque tarif à un modèle, un symptôme et une intervention précise. Seuls les forfaits marqués « Afficher sur le site » sont proposés aux clients.</p>
      {packages.length ? <>
        <p className="repair-package-count">{packages.length} forfait{packages.length > 1 ? 's' : ''} · {publishedCount} affiché{publishedCount > 1 ? 's' : ''} sur le site</p>
        <ul className="repair-package-list" tabIndex={0} aria-label="Catalogue des forfaits de réparation">
          {packages.map(item => <li key={item.id}>
            <div className="repair-package-copy">
              <span className="repair-package-model">{modelName(item.modelId)}</span>
              <strong>{item.label}</strong>
              <p>{item.fault}</p>
              <span className="repair-package-price">{priceText(item.amount, item.priceMode)}</span>
              <span className={`repair-package-status ${item.published ? 'is-published' : ''}`}>{item.published ? 'Affiché sur le site' : 'Non affiché sur le site'}</span>
              <details><summary>Ce qui est inclus</summary><p>{item.includes}</p></details>
            </div>
            <div className="repair-package-actions">
              <button type="button" className="btn secondary small" disabled={!!draft} onClick={() => setDraft(draftOf(item))} aria-label={`Modifier le forfait ${item.label} pour ${modelName(item.modelId)}`}><Icon name="edit" size={14}/>Modifier</button>
              {item.published && <button type="button" className="text-link" disabled={!!draft} onClick={() => hide(item)} aria-label={`Masquer le forfait ${item.label} pour ${modelName(item.modelId)} sur le site`}>Masquer du site</button>}
            </div>
          </li>)}
        </ul>
      </> : <p className="repair-package-empty">Aucun forfait enregistré. Renseignez un tarif du magasin et ce qu’il comprend pour le proposer sur le site.</p>}
      {packages.length >= 200 && !draft && <p className="form-hint">Le catalogue contient 200 forfaits. Modifiez un forfait existant pour actualiser vos tarifs.</p>}
    </div>
    {draft && <form className="repair-package-form" onSubmit={save}>
      <div className="panel-body form-stack">
        <h3>{draft.id ? 'Modifier le forfait' : 'Ajouter un forfait'}</h3>
        <Field label="Modèle de console"><select name="packageModel" required value={draft.modelId} onChange={event => setDraft({...draft, modelId: event.target.value, fault: ''})}>
          <option value="">Choisir un modèle</option>
          {families.map(family => <optgroup key={family} label={family}>{models.filter(model => model.family === family).map(model => <option key={model.id} value={model.id}>{model.model}</option>)}</optgroup>)}
        </select></Field>
        <Field label="Symptôme concerné"><select name="packageFault" required disabled={!draft.modelId} value={draft.fault} onChange={event => setDraft({...draft, fault: event.target.value})}>
          <option value="">{draft.modelId ? 'Choisir un symptôme' : 'Choisir d’abord un modèle'}</option>
          {faultSuggestions(draft.modelId).map(fault => <option key={fault} value={fault}>{fault}</option>)}
        </select></Field>
        <Field label="Intervention proposée" hint="Indiquez précisément l’intervention couverte par ce tarif."><input name="packageLabel" required maxLength={160} value={draft.label} onChange={event => setDraft({...draft, label: event.target.value})}/></Field>
        <div className="repair-package-price-fields">
          <Field label="Montant (€ TTC)"><input name="packageAmount" type="number" inputMode="decimal" required min="0" max="100000" step="0.01" value={draft.amount} onChange={event => setDraft({...draft, amount: event.target.value})}/></Field>
          <Field label="Présentation du prix"><select name="packagePriceMode" required value={draft.priceMode} onChange={event => {const mode = event.target.value; setDraft({...draft, priceMode: mode === 'fixed' || mode === 'from' ? mode : ''});}}>
            <option value="">Choisir</option><option value="fixed">Prix fixe</option><option value="from">À partir de</option>
          </select></Field>
        </div>
        <Field label="Ce qui est inclus" hint="Précisez les pièces, opérations et contrôles compris dans le montant."><textarea name="packageIncludes" required rows={3} maxLength={1000} value={draft.includes} onChange={event => setDraft({...draft, includes: event.target.value})}/></Field>
        <label className="repair-package-publication"><input name="packagePublished" type="checkbox" checked={draft.published} onChange={event => setDraft({...draft, published: event.target.checked})}/><span>Afficher sur le site</span></label>
        <div className="repair-package-preview" aria-label="Aperçu du forfait sur le site">
          <h4>Aperçu du site</h4>
          {preview ? <><span className="repair-package-model">{modelName(preview.modelId)}</span><strong>{preview.label}</strong><p>{preview.fault}</p><span className="repair-package-price">{priceText(preview.amount, preview.priceMode)}</span><p className="repair-package-includes">{preview.includes}</p><small>{preview.published ? 'Prévu pour être affiché après enregistrement.' : 'Ce forfait restera masqué sur le site.'}</small></> : <p>Complétez le forfait pour voir son aperçu.</p>}
        </div>
      </div>
      <div className="panel-footer wrap"><button type="submit" className="btn primary"><Icon name="check" size={16}/>Enregistrer le forfait</button><button type="button" className="btn secondary" onClick={() => setDraft(null)}>Fermer le formulaire</button></div>
    </form>}
  </Panel>;
}
