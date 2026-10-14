import type {Illustration} from './domain.ts';

export interface IntakeModel {id: string; brand: string; model: string; family: string; illustration: Illustration;}
/** Stable identifiers keep the public form and both server implementations on the same catalogue. */
export const INTAKE_MODELS: readonly IntakeModel[] = [
  {id:'ps5',brand:'Sony',model:'PlayStation 5',family:'PlayStation',illustration:'playstation'},
  {id:'ps5-digital',brand:'Sony',model:'PlayStation 5 Digital Edition',family:'PlayStation',illustration:'playstation'},
  {id:'ps5-slim',brand:'Sony',model:'PlayStation 5 Slim',family:'PlayStation',illustration:'playstation'},
  {id:'ps5-pro',brand:'Sony',model:'PlayStation 5 Pro',family:'PlayStation',illustration:'playstation'},
  {id:'ps4',brand:'Sony',model:'PlayStation 4',family:'PlayStation',illustration:'playstation'},
  {id:'ps4-slim',brand:'Sony',model:'PlayStation 4 Slim',family:'PlayStation',illustration:'playstation'},
  {id:'ps4-pro',brand:'Sony',model:'PlayStation 4 Pro',family:'PlayStation',illustration:'playstation'},
  {id:'ps3',brand:'Sony',model:'PlayStation 3',family:'PlayStation',illustration:'playstation'},
  {id:'ps2',brand:'Sony',model:'PlayStation 2',family:'PlayStation',illustration:'playstation'},
  {id:'ps1',brand:'Sony',model:'PlayStation',family:'PlayStation',illustration:'playstation'},
  {id:'psp',brand:'Sony',model:'PSP',family:'Consoles portables',illustration:'playstation'},
  {id:'ps-vita',brand:'Sony',model:'PS Vita',family:'Consoles portables',illustration:'playstation'},
  {id:'switch-2',brand:'Nintendo',model:'Switch 2',family:'Nintendo Switch',illustration:'switch'},
  {id:'switch',brand:'Nintendo',model:'Switch',family:'Nintendo Switch',illustration:'switch'},
  {id:'switch-oled',brand:'Nintendo',model:'Switch OLED',family:'Nintendo Switch',illustration:'switch'},
  {id:'switch-lite',brand:'Nintendo',model:'Switch Lite',family:'Nintendo Switch',illustration:'switch'},
  {id:'xbox-series-x',brand:'Microsoft',model:'Xbox Series X',family:'Xbox',illustration:'playstation'},
  {id:'xbox-series-s',brand:'Microsoft',model:'Xbox Series S',family:'Xbox',illustration:'playstation'},
  {id:'xbox-one',brand:'Microsoft',model:'Xbox One',family:'Xbox',illustration:'playstation'},
  {id:'xbox-one-s',brand:'Microsoft',model:'Xbox One S',family:'Xbox',illustration:'playstation'},
  {id:'xbox-one-x',brand:'Microsoft',model:'Xbox One X',family:'Xbox',illustration:'playstation'},
  {id:'xbox-360',brand:'Microsoft',model:'Xbox 360',family:'Xbox',illustration:'playstation'},
  {id:'wii-u',brand:'Nintendo',model:'Wii U',family:'Nintendo',illustration:'snes'},
  {id:'wii',brand:'Nintendo',model:'Wii',family:'Nintendo',illustration:'snes'},
  {id:'3ds',brand:'Nintendo',model:'Nintendo 3DS / New 3DS',family:'Consoles portables',illustration:'gameboy'},
  {id:'3ds-xl',brand:'Nintendo',model:'Nintendo 3DS XL / New 3DS XL',family:'Consoles portables',illustration:'gameboy'},
  {id:'2ds',brand:'Nintendo',model:'Nintendo 2DS / New 2DS XL',family:'Consoles portables',illustration:'gameboy'},
  {id:'ds',brand:'Nintendo',model:'Nintendo DS / DS Lite / DSi',family:'Consoles portables',illustration:'gameboy'},
  {id:'game-boy',brand:'Nintendo',model:'Game Boy / Game Boy Color',family:'Consoles rétro',illustration:'gameboy'},
  {id:'game-boy-advance',brand:'Nintendo',model:'Game Boy Advance / Advance SP',family:'Consoles rétro',illustration:'gameboy'},
  {id:'nes',brand:'Nintendo',model:'NES',family:'Consoles rétro',illustration:'snes'},
  {id:'snes',brand:'Nintendo',model:'Super Nintendo',family:'Consoles rétro',illustration:'snes'},
  {id:'n64',brand:'Nintendo',model:'Nintendo 64',family:'Consoles rétro',illustration:'snes'},
  {id:'gamecube',brand:'Nintendo',model:'GameCube',family:'Consoles rétro',illustration:'snes'},
  {id:'megadrive',brand:'Sega',model:'Mega Drive',family:'Consoles rétro',illustration:'megadrive'},
  {id:'dreamcast',brand:'Sega',model:'Dreamcast',family:'Consoles rétro',illustration:'dreamcast'},
  {id:'game-gear',brand:'Sega',model:'Game Gear',family:'Consoles rétro',illustration:'gamegear'},
  {id:'other',brand:'Autre',model:'Autre console',family:'Autre',illustration:'gameboy'},
];

const STARTUP='La console ne s’allume plus';
const DIGITAL_MODELS=new Set(['ps5-digital','ps5-pro','xbox-series-s']);
const RETRO_CARTRIDGES=new Set(['nes','snes','n64','megadrive']);
const OLD_HANDHELDS=new Set(['game-boy','game-boy-advance','game-gear']);
/** Suggestions describe reported symptoms; they never imply an established diagnosis or quote. */
export function faultSuggestions(modelId: string): string[] {
  if(!INTAKE_MODELS.some(model=>model.id===modelId))return [];
  if(modelId.startsWith('switch'))return [STARTUP,'La console ne charge plus / problème USB-C','Écran cassé ou affichage défectueux','Joystick qui bouge seul (drift)','Boutons ou commandes défectueux','Les jeux sur cartouche ne sont plus lus','Surchauffe ou console bruyante',...(modelId==='switch-lite'?[]:['Aucune image sur le téléviseur / problème de dock'])];
  if(['ds','3ds','3ds-xl','2ds'].includes(modelId))return [STARTUP,'La batterie ne charge plus','Écran cassé ou affichage défectueux','Écran tactile défectueux','Boutons ou joystick défectueux','Les jeux sur cartouche ne sont plus lus','Charnière ou coque endommagée'];
  if(OLD_HANDHELDS.has(modelId))return [STARTUP,'Écran ou rétroéclairage défectueux','Absence de son / son défectueux','Boutons défectueux','Les jeux sur cartouche ne sont plus lus','Batterie ou contacts d’alimentation défectueux'];
  if(['psp','ps-vita'].includes(modelId))return [STARTUP,'La batterie ne charge plus','Écran cassé ou affichage défectueux','Joystick ou boutons défectueux','Les jeux ne sont plus lus','Absence de son / son défectueux'];
  if(RETRO_CARTRIDGES.has(modelId))return [STARTUP,'Aucune image / affichage défectueux','Les jeux sur cartouche ne sont plus lus','Absence de son / son défectueux','Connecteur manette défectueux','La console s’éteint toute seule'];
  if(['ps1','ps2','gamecube','dreamcast','wii','wii-u'].includes(modelId))return [STARTUP,'Aucune image / affichage défectueux','Les disques ne sont plus lus','Absence de son / son défectueux','Commandes ou connecteurs défectueux','La console s’éteint toute seule'];
  if(modelId==='other')return [STARTUP,'La console ne charge plus','Aucune image / écran défectueux','Les jeux ne sont plus lus','Commandes défectueuses','Absence de son / son défectueux','Surchauffe ou arrêt inattendu'];
  return [STARTUP,'Aucune image / port HDMI endommagé','Surchauffe ou console bruyante','La console s’éteint toute seule',...(DIGITAL_MODELS.has(modelId)?[]:['Les disques ne sont plus lus']),'Connexion Wi-Fi ou réseau défectueuse','Erreur système / démarrage bloqué'];
}
