import {useApp} from './store';
import {deleteConsole} from './domain';

export function useDeleteConsole() {
  const {data,ask,transact,go,notify}=useApp();
  return (id:string) => {
    const console=data.consoles.find(item=>item.id===id);
    if(!console){notify('Console introuvable.',true);return;}
    const repairs=data.repairs.filter(repair=>repair.consoleId===id);
    const dossiers=repairs.length===1
      ? ' Son dossier de réparation, ses notes, photos, tests et temps seront également supprimés.'
      : repairs.length>1
        ? ` Ses ${repairs.length} dossiers de réparation, leurs notes, photos, tests et temps seront également supprimés.`
        : '';
    ask({
      title:`Supprimer la console ${console.code} ?`,
      body:`La console « ${console.brand} ${console.model} », ses photos et son historique seront définitivement supprimés.${dossiers} ${console.clientId?'Le client, son accès et ses autres consoles seront conservés.':'Les autres consoles seront conservées.'} Les pièces déjà utilisées resteront déduites du stock.${repairs.some(repair=>repair.payment)?' Les paiements de ces dossiers seront aussi retirés du total encaissé.':''}${repairs.some(repair=>repair.timerStartedAt)?' Le chronomètre en cours sera arrêté.':''}`,
      label:'Supprimer la console',
      destructive:true,
      run:()=>{
        const ok=transact(store=>deleteConsole(store,id),'Console et réparations liées supprimées.');
        if(ok)go('/inventory');
        return ok;
      },
    });
  };
}
