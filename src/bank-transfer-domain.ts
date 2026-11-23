/** Private workshop bank details. Validation checks structure and checksum, not account ownership. */
export interface BankTransferSettings {
  beneficiary: string; iban: string; bic: string; bankName: string; instructions: string;
}
// National IBAN lengths (ISO 13616 / Swift IBAN Registry).
const ibanLengths: Record<string,number> = {
  AD:24,AE:23,AL:28,AT:20,AZ:28,BA:20,BE:16,BG:22,BH:22,BR:29,BY:28,CH:21,CR:22,CY:28,CZ:24,
  DE:22,DK:18,DO:28,EE:20,EG:29,ES:24,FI:18,FO:18,FR:27,GB:22,GE:22,GI:23,GL:18,GR:27,GT:28,
  HR:21,HU:28,IE:22,IL:23,IQ:23,IS:26,IT:27,JO:30,KW:30,KZ:20,LB:28,LC:32,LI:21,LT:20,LU:20,
  LV:21,MC:27,MD:24,ME:22,MK:19,MR:27,MT:31,MU:30,NL:18,NO:15,PK:24,PL:28,PS:29,PT:25,
  QA:29,RO:24,RS:22,SA:24,SC:31,SE:24,SI:19,SK:24,SM:27,ST:25,SV:28,TL:23,TN:24,TR:26,
  UA:29,VA:22,VG:24,XK:20,
};
function text(value: unknown,max: number): string {
  if(typeof value!=='string'||value.length>max||/[\u0000-\u001f\u007f]/.test(value))throw Error('Coordonnées bancaires : texte invalide ou trop long.');
  return value.trim();
}
export function validateBankTransferSettings(raw: unknown): BankTransferSettings | null {
  if(raw===null)return null;
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Coordonnées bancaires invalides.');
  const value=raw as Record<string,unknown>;
  const fields=['beneficiary','iban','bic','bankName','instructions'];
  if(Object.keys(value).some(key=>!fields.includes(key)))throw Error('Coordonnées bancaires : champ non autorisé.');
  const beneficiary=text(value.beneficiary,140),iban=text(value.iban,60).replace(/\s/g,'').toUpperCase();
  const bic=text(value.bic,20).replace(/\s/g,'').toUpperCase(),bankName=text(value.bankName,120);
  if(typeof value.instructions!=='string'||value.instructions.length>1000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value.instructions))throw Error('Consignes de virement invalides ou trop longues.');
  const instructions=value.instructions.trim();
  if(!beneficiary||!iban)throw Error('Renseignez le bénéficiaire et l’IBAN du compte bancaire.');
  if(!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)||ibanLengths[iban.slice(0,2)]!==iban.length)throw Error('IBAN invalide : vérifiez le pays et le nombre de caractères.');
  let remainder=0;
  for(const char of iban.slice(4)+iban.slice(0,4))for(const digit of /[A-Z]/.test(char)?String(char.charCodeAt(0)-55):char)remainder=(remainder*10+Number(digit))%97;
  if(remainder!==1)throw Error('IBAN invalide : la clé de contrôle ne correspond pas.');
  if(bic&&!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/.test(bic))throw Error('BIC invalide : 8 ou 11 caractères sont attendus.');
  return {beneficiary,iban,bic,bankName,instructions};
}
export function bankTransferInstructions(settings: BankTransferSettings | null | undefined): string {
  if(!settings)return '';
  const value=validateBankTransferSettings(settings)!;
  return [`Bénéficiaire : ${value.beneficiary}`,`IBAN : ${value.iban.match(/.{1,4}/g)!.join(' ')}`,
    ...(value.bic?[`BIC : ${value.bic}`]:[]),...(value.bankName?[`Banque : ${value.bankName}`]:[]),
    ...(value.instructions?['',value.instructions]:[])].join('\n');
}
export function createTransferReference(repairCode: string,proposalId: string): string {
  const code=repairCode.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12)||'DOSSIER';
  const suffix=proposalId.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(-16);
  if(!suffix)throw Error('Impossible de créer le libellé de virement.');
  return `RP-${code}-${suffix}`;
}
