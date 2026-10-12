import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {type Store,validateStore,now,csvCell,consoleInvestment,STATES} from './domain';
import {emptyStore} from './domain';
import {api, ApiError} from './api';
export type Toast={id:number;message:string;error:boolean};
export type EditModal={type:'console'|'repair'|'part';id?:string;consoleId?:string}|null;
export type Confirm={title:string;body:string;label?:string;destructive?:boolean;verify?:string;run:()=>boolean|void}|null;
export type SaveMode='edit'|'restore'|'reset';
interface AppContextValue {
 data:Store; transact:(fn:(draft:Store)=>void,message?:string,mode?:SaveMode)=>boolean;
 notify:(message:string,error?:boolean)=>void; go:(path:string)=>void;
 edit:(value:EditModal)=>void; ask:(value:Confirm)=>void;
 exportData:()=>void; exportInventory:()=>void; storageError:string;
}
const AppContext=createContext<AppContextValue|null>(null);
export const useApp=()=>{const c=useContext(AppContext);if(!c)throw Error('Application non initialisée.');return c;};
export function downloadFile(content:string,name:string,type='application/json'){
 const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export function useHash(){const [path,setPath]=useState(()=>location.hash.slice(1)||'/dashboard');useEffect(()=>{const h=()=>{setPath(location.hash.slice(1)||'/dashboard');window.scrollTo({top:0});};addEventListener('hashchange',h);return()=>removeEventListener('hashchange',h);},[]);return path;}
export function Provider({children,showToast,edit,ask}:{children:React.ReactNode;showToast:(t:Toast)=>void;edit:(m:EditModal)=>void;ask:(c:Confirm)=>void}){
 const [data,setData]=useState<Store>(()=>emptyStore()),[loading,setLoading]=useState(true),[fatal,setFatal]=useState('');
 const [pending,setPending]=useState(false),[failure,setFailure]=useState('');
 const ref=useRef(data),busy=useRef(false),mounted=useRef(true),generation=useRef(0),requests=useRef(new Set<AbortController>());ref.current=data;
 const notify=(message:string,error=false)=>showToast({id:Date.now()+Math.random(),message:message.replace(/localement/g,'sur le serveur'),error});
 async function load(){
  const version=++generation.current,controller=new AbortController();requests.current.add(controller);
  const current=()=>mounted.current&&generation.current===version;
  setLoading(true);setFatal('');
  try{const next=validateStore(await api<Store>('/api/store',{signal:controller.signal}));if(current()){ref.current=next;setData(next);setFailure('');}}
  catch(e){if(current())setFatal(e instanceof Error?e.message:'Lecture impossible.');}
  finally{requests.current.delete(controller);if(current())setLoading(false);}
 }
 useEffect(()=>{mounted.current=true;void load();return()=>{mounted.current=false;generation.current++;for(const request of requests.current)request.abort();requests.current.clear();ref.current=emptyStore();busy.current=false;};},[]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(busy.current||failure){e.preventDefault();e.returnValue='';}};addEventListener('beforeunload',warn);return()=>removeEventListener('beforeunload',warn);},[failure]);
 // Compatibility with existing forms: true means accepted for submission, not saved.
 // Only one write can be in flight. The overlay prevents edits until server acknowledgement.
 function transact(fn:(d:Store)=>void,message?:string,mode:SaveMode='edit'):boolean{
  if(!mounted.current)return false;
  if(busy.current||failure||loading){notify('Une sauvegarde doit être terminée avant de continuer.',true);return false;}
  try{
   const revision=ref.current.revision,draft=structuredClone(ref.current);fn(draft);draft.revision=revision+1;
   const valid=validateStore(draft);busy.current=true;setPending(true);ref.current=valid;setData(valid);
   const version=generation.current,controller=new AbortController();requests.current.add(controller);
   const current=()=>mounted.current&&generation.current===version;
   // Cancelling the browser request does not undo a submitted server write. Re-entry reloads the server; it never resubmits it.
   void api<Store>('/api/store',{method:'PUT',body:{revision,data:valid,mode},signal:controller.signal}).then(raw=>{
    const saved=validateStore(raw);if(!current())return;ref.current=saved;setData(saved);if(message)notify(message);
   }).catch(e=>{if(!current())return;setFailure(e instanceof ApiError&&e.status===409?'Une autre session a modifié l’atelier. Votre brouillon n’a pas remplacé ses données.':e instanceof Error?e.message:'Enregistrement non confirmé.');})
   .finally(()=>{requests.current.delete(controller);if(current()){busy.current=false;setPending(false);}});
   return true;
  }catch(e){notify(e instanceof Error?e.message:'Modification invalide.',true);return false;}
 }
 const go=(path:string)=>{location.hash=path;};
 function exportData(){const at=now();downloadFile(JSON.stringify({...ref.current,exportedAt:at},null,2),`clinique-retro-sauvegarde-${at.slice(0,10)}.json`);if(!failure&&!busy.current)transact(s=>{s.settings.lastExportAt=at;},'Sauvegarde JSON exportée. Conservez-la dans un endroit sûr.');}
 function exportInventory(){const s=ref.current;const rows=[['Référence','Client','Marque','Modèle','Variante','Numéro de série','État','État esthétique','Date d’acquisition','Achat EUR','Valeur estimée EUR','Investissement hors temps EUR','Emplacement','Provenance','Accessoires','Notes','Archivée'],...s.consoles.map(c=>[c.code,s.clients.find(client=>client.id===c.clientId)?.name||'Collection de l’atelier',c.brand,c.model,c.variant,c.serial,STATES[c.state],c.condition,c.acquiredAt,c.purchasePrice.toFixed(2).replace('.',','),c.estimatedValue.toFixed(2).replace('.',','),consoleInvestment(s,c).toFixed(2).replace('.',','),c.location,c.source,c.accessories,c.notes,c.archived?'Oui':'Non'])];downloadFile('\uFEFF'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n'),`inventaire-clinique-retro-${now().slice(0,10)}.csv`,'text/csv;charset=utf-8');notify('Inventaire complet exporté au format CSV.');}
 if(loading||fatal)return <div className="recovery" role="status"><h1>{loading?'Ouverture de l’atelier…':'L’atelier est indisponible.'}</h1><p>{loading?'Lecture des données protégées sur le serveur.':fatal}</p>{!loading&&<button className="btn primary" onClick={()=>void load()}>Réessayer</button>}</div>;
 return <AppContext.Provider value={{data,transact,notify,go,edit,ask,exportData,exportInventory,storageError:failure}}><div inert={pending||!!failure}>{children}</div>{(pending||failure)&&<div className="auth-operation" role="dialog" aria-modal="true" aria-label="Sauvegarde serveur"><section className="auth-card"><h2>{pending?'Enregistrement sur le serveur…':'Enregistrement non confirmé'}</h2><p>{pending?'La modification est en cours de validation.':failure}</p>{!pending&&<><p>Votre brouillon reste disponible dans cette page. Exportez-le avant de recharger les données du serveur. Aucun remplacement automatique ne sera effectué.</p><div className="button-row"><button className="btn primary" onClick={()=>downloadFile(JSON.stringify(ref.current,null,2),'clinique-retro-brouillon.json')}>Exporter le brouillon</button><button className="btn secondary" onClick={()=>{if(window.confirm('Recharger les données du serveur ? Le brouillon de cette page sera abandonné.'))void load();}}>Recharger le serveur</button></div></>}</section></div>}</AppContext.Provider>;
}
