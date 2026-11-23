import React, {useState} from 'react';
import {useApp} from './store';
import {addEvent,validateBankTransferSettings} from './domain';
import {Field,Icon,Panel} from './ui';
import './bank-transfer-settings.css';

export function BankTransferSettingsPanel() {
  const {data,transact}=useApp();
  const [error,setError]=useState('');
  const settings=data.settings.bankTransfer;
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setError('');
    const form=new FormData(event.currentTarget);
    const value={beneficiary:String(form.get('beneficiary')||''),iban:String(form.get('iban')||''),
      bic:String(form.get('bic')||''),bankName:String(form.get('bankName')||''),instructions:String(form.get('instructions')||'')};
    try {
      const next=Object.values(value).every(text=>!text.trim())?null:validateBankTransferSettings(value);
      transact(store=>{store.settings.bankTransfer=next;addEvent(store,'Coordonnées de virement du magasin mises à jour.','system');},'Coordonnées de virement enregistrées.');
    }catch(failure){setError(failure instanceof Error?failure.message:'Vérifiez les coordonnées bancaires.');}
  }
  return <Panel title="Virements bancaires des clients" aside={<span className="form-hint">{settings?'Coordonnées enregistrées':'À renseigner'}</span>}>
    <form key={JSON.stringify(settings)} onSubmit={save}>
      <div className="panel-body form-stack">
        <p className="settings-text">Renseignez le compte du magasin qui recevra le règlement des réparations et les frais de retour. Ces coordonnées sont reprises dans les diagnostics et affichées au client concerné après l’acceptation du devis ou sa demande de retour payant.</p>
        <Field label="Bénéficiaire du virement" hint="Recopiez le nom exact du titulaire indiqué sur le RIB."><input name="beneficiary" maxLength={140} defaultValue={settings?.beneficiary||''} autoComplete="off"/></Field>
        <Field label="IBAN" hint="Les espaces sont acceptés. Le format et la clé de contrôle sont vérifiés."><input name="iban" maxLength={60} defaultValue={settings?.iban||''} autoComplete="off" autoCapitalize="characters" spellCheck={false}/></Field>
        <Field label="BIC / SWIFT" hint="Facultatif · 8 ou 11 caractères."><input name="bic" maxLength={20} defaultValue={settings?.bic||''} autoComplete="off" autoCapitalize="characters" spellCheck={false}/></Field>
        <Field label="Nom de la banque" hint="Facultatif."><input name="bankName" maxLength={120} defaultValue={settings?.bankName||''} autoComplete="off"/></Field>
        <Field label="Consignes complémentaires" hint="Facultatif. Le montant et le libellé du dossier sont ajoutés par l’application."><textarea name="instructions" rows={3} maxLength={1000} defaultValue={settings?.instructions||''}/></Field>
        <p className="form-hint">Chaque dossier reçoit son propre libellé de virement. Les coordonnées déjà transmises dans une proposition sont conservées si vous changez de compte ensuite. Pour retirer les coordonnées par défaut, videz tous les champs puis enregistrez.</p>
        {error&&<p className="auth-error" role="alert">{error}</p>}
      </div>
      <div className="panel-footer"><button className="btn primary" type="submit"><Icon name="check" size={17}/>Enregistrer les coordonnées de virement</button></div>
    </form>
  </Panel>;
}
