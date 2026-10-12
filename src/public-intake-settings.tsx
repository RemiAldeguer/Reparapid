import React from 'react';
import {useApp} from './store';
import {useAuth} from './auth';
import {addEvent} from './domain';
import {publicIntakeSettings} from './repair-intake-domain';
import {Field, Icon, Panel} from './ui';

export function PublicIntakeSettingsPanel() {
  const {data, transact} = useApp();
  const {user} = useAuth();
  if (user.role !== 'super_admin') return null;
  const settings = publicIntakeSettings(data);
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const value = {
      shopName: String(fields.get('shopName') || '').trim(),
      address: String(fields.get('address') || '').trim(),
      postalCode: String(fields.get('postalCode') || '').trim(),
      city: String(fields.get('city') || '').trim(),
      phone: String(fields.get('phone') || '').trim(),
      email: String(fields.get('email') || '').trim(),
      addressConfirmed: fields.get('addressConfirmed') === 'on',
    };
    transact(store => {
      store.settings.publicIntake = value;
      addEvent(store, 'Coordonnées de la vitrine et de la fiche d’envoi mises à jour.', 'system');
    }, 'Coordonnées publiques enregistrées.');
  }
  return <Panel title="Vitrine Reparapid et adresse d’envoi">
    <form key={JSON.stringify(settings)} onSubmit={save}>
      <div className="panel-body form-stack">
        <p className="settings-text">Ces coordonnées sont visibles sur le site et les fiches des clients. Vérifiez l’adresse du magasin qui doit recevoir les consoles.</p>
        <Field label="Nom du destinataire"><input name="shopName" required maxLength={120} defaultValue={settings.shopName}/></Field>
        <Field label="Adresse d’expédition"><textarea name="address" rows={2} maxLength={500} defaultValue={settings.address}/></Field>
        <Field label="Code postal"><input name="postalCode" autoComplete="postal-code" maxLength={5} pattern="[0-9]{5}" defaultValue={settings.postalCode}/></Field>
        <Field label="Ville"><input name="city" autoComplete="address-level2" maxLength={120} defaultValue={settings.city}/></Field>
        <Field label="Téléphone public"><input name="phone" type="tel" maxLength={80} defaultValue={settings.phone}/></Field>
        <Field label="Adresse e-mail publique"><input name="email" type="email" maxLength={254} defaultValue={settings.email}/></Field>
        <label className="settings-text"><input name="addressConfirmed" type="checkbox" defaultChecked={settings.addressConfirmed}/> Cette adresse peut recevoir les consoles des clients.</label>
        <p className="form-hint">Si cette confirmation est désactivée, les clients peuvent enregistrer leur demande ; la fiche d’envoi leur demande de contacter le magasin avant toute expédition.</p>
      </div>
      <div className="panel-footer"><button type="submit" className="btn primary"><Icon name="check" size={17}/>Enregistrer les coordonnées</button></div>
    </form>
  </Panel>;
}
