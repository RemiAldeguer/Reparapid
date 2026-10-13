import React, {useEffect,useRef,useId} from 'react';
import {consoleAppearance,workshopConsoleArtItem,type ConsoleVisualItem} from './console-appearance';
import {HandheldConsoleArt} from './console-handheld-art';
import {ShopConsoleArt} from './shop-console-art';
import './workshop-console-art.css';
import {STATES,PRIORITIES,stageInfo,dateFmt,timeFmt,type ConsoleItem,type Stage,type Priority,type Activity,type ConsoleState} from './domain';
const paths:Record<string,string[]>={
  users:['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2','M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0','M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'],
  user:['M20 21v-2a7 7 0 0 0-14 0v2','M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0'],
  phone:['M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.84.58 2.8.7A2 2 0 0 1 22 16.92z'],
  mail:['M3 4h18v16H3z','m3 5 9 7 9-7'],
  dashboard:['M3 3h7v7H3z','M14 3h7v4h-7z','M14 11h7v10h-7z','M3 14h7v7H3z'],
  gamepad:['M6 8h12a3 3 0 0 1 3 2.4l1 7.2a2.5 2.5 0 0 1-4.3 2l-3-3.1H9.3l-3 3.1a2.5 2.5 0 0 1-4.3-2l1-7.2A3 3 0 0 1 6 8Z','M6 12v4m-2-2h4','M16 12h.01M19 15h.01','M12 8V5l2-2'],
  wrench:['m14 6 4 4 3-3a6 6 0 0 1-8 8l-7 7-4-4 7-7a6 6 0 0 1 8-8z'],
  package:['m12 3 9 5-9 5-9-5z','M3 8v9l9 5 9-5V8','M12 13v9M7.5 5.5l9 5V15'],
  activity:['M3 12h4l3-8 4 16 3-8h4'],
  settings:['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8','m9 3 1 2h4l1-2 3 2-1 2 2 3h2v4h-2l-2 3 1 2-3 2-1-2h-4l-1 2-3-2 1-2-2-3H3v-4h2l2-3-1-2z'],
  plus:['M12 5v14M5 12h14'],search:['m21 21-5-5','M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0'],
  arrow:['M4 12h16m-6-6 6 6-6 6'],back:['M20 12H4m6-6-6 6 6 6'],down:['m6 9 6 6 6-6'],right:['m9 6 6 6-6 6'],
  close:['m6 6 12 12M6 18 18 6'],check:['m5 12 4 4L19 6'],checklist:['m3 6 1 1 2-3M9 5h12m-18 7 1 1 2-3M9 12h12m-18 7 1 1 2-3M9 19h12'],
  clock:['M12 8v4l3 2','M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0'],calendar:['M4 5h16v16H4z','M8 3v4m8-4v4M4 11h16'],
  euro:['M20 5.5C18.5 4.5 16.8 4 15 4C10.2 4 7 7.5 7 12C7 16.5 10.2 20 15 20C16.8 20 18.5 19.5 20 18.5','M4 10h11','M4 14h9'],trend:['m3 17 6-6 4 4 8-10','M15 5h6v6'],
  more:['M5 12h.01M12 12h.01M19 12h.01'],filter:['M4 7h16M7 12h10M10 17h4'],grid:['M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'],list:['M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'],
  download:['M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5'],upload:['M12 16V4m-4 4 4-4 4 4M5 16v5h14v-5'],
  shield:['m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z','m8 12 3 3 5-6'],database:['M20 6c0 2-4 3-8 3S4 8 4 6s4-3 8-3 8 1 8 3','M4 6v12c0 4 16 4 16 0V6M4 12c0 4 16 4 16 0'],
  alert:['m12 3 10 18H2z','M12 9v4m0 4h.01'],info:['M12 11v6m0-10h.01','M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0'],
  location:['M12 22s8-8 8-14a8 8 0 1 0-16 0c0 6 8 14 8 14z','M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],
  edit:['m16 3 5 5-13 13H3v-5z','m14 5 5 5'],trash:['M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7'],
  archive:['M3 3h18v5H3zM5 8v13h14V8M9 12h6'],restore:['M3 10a9 9 0 1 1 1 8M3 4v6h6'],camera:['M8 5h8l2 3h4v13H2V8h4z','M16 14a4 4 0 1 1-8 0 4 4 0 0 1 8 0'],
  note:['M4 3h16v18H4zM8 8h8M8 12h8M8 16h4'],print:['M6 8V3h12v5M6 17H3V8h18v9h-3M6 14h12v7H6z'],
  play:['m7 3 14 9-14 9z'],pause:['M6 4h4v16H6zM14 4h4v16h-4z'],stop:['M5 5h14v14H5z'],
  inbox:['M4 3h16l2 13v5H2v-5z','M2 15h6l2 3h4l2-3h6'],cart:['M2 3h3l3 13h11l3-10H6','M9 21h.01M18 21h.01'],
  stethoscope:['M4 3v6a5 5 0 0 0 10 0V3M3 3h3m6 0h3M9 14v3a5 5 0 0 0 10 0v-3','M21 11a2 2 0 1 1-4 0 2 2 0 0 1 4 0'],
  heart:['M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z'],
  logout:['M10 3H3v18h7M8 12h13m-5-5 5 5-5 5'],menu:['M3 6h18M3 12h18M3 18h18'],bolt:['m13 2-9 12h7l-1 8 10-12h-7z'],
  box:['M4 4h16v16H4zM4 9h16M9 4v5M9 14h6'],tools:['m14 4 6 6M3 21l9-9M2 5l5-3 5 6-4 4zM15 14l6 6-3 3-6-6'],
};
export function Icon({name,size=20,className=''}:{name:string;size?:number;className?:string}) {return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{(paths[name]||paths.gamepad).map((d,i)=><path key={i} d={d}/>)}</svg>;}
export function Logo(){return <div className="brand-mark" aria-hidden="true"><img src="/reparapid-logo-original.webp" width="80" height="80" alt=""/></div>;}
export function ConsoleArt({item,small=false}:{item:ConsoleVisualItem;small?:boolean}){
  const grad=useId().replace(/:/g,'');
  const palette=consoleAppearance(item);
  const shopItem=workshopConsoleArtItem(item);
  if(shopItem)return <ShopConsoleArt item={shopItem} small={small} className="workshop-console-art" label={[item.model,item.variant].filter(Boolean).join(' · ')}/>;
  if(!['snes','playstation','dreamcast','gamegear','megadrive'].includes(palette.kind))return <HandheldConsoleArt item={item} small={small} palette={palette}/>;
  let art:React.ReactNode;
  if(palette.kind==='snes')art=<g transform="rotate(-6 160 112)"><path d="M75 77 93 46h139l21 39v69q0 15-17 15H89q-17 0-17-15z" fill={palette.shellDark} stroke="#9da1b2" strokeWidth="2"/><rect x="84" y="57" width="155" height="83" rx="12" fill={palette.shell}/><path d="M113 72h97v28h-97z" fill={palette.shellDark}/><path d="M127 79h70v5h-70z" fill="#5e667d"/><path d="M131 111h22v22h-22zM171 111h22v22h-22z" fill="#8c87b5"/><path d="M128 121h28m12 0h28" stroke="#ada8d0" strokeWidth="4"/><rect x="92" y="149" width="48" height="13" rx="4" fill="#6e7586"/><rect x="181" y="149" width="48" height="13" rx="4" fill="#6e7586"/><text x="95" y="118" fontSize="6" fill="#7d8094" fontFamily="monospace">16 BIT</text></g>;
  else if(palette.kind==='playstation')art=<g transform="rotate(-7 165 105)"><path d="M68 66h188v95q0 10-12 10H80q-12 0-12-10z" fill={palette.shellDark} stroke="#8f9da4" strokeWidth="2"/><rect x="70" y="53" width="184" height="103" rx="12" fill={palette.shell}/><ellipse cx="161" cy="104" rx="60" ry="41" fill={palette.shellLight} stroke="#a6b2b7" strokeWidth="2"/><circle cx="91" cy="79" r="9" fill="#b2bfc3" stroke="#98a8ae"/><circle cx="231" cy="79" r="9" fill="#b2bfc3" stroke="#98a8ae"/><circle cx="91" cy="118" r="8" fill="#b2bfc3"/><path d="M154 88v27m0-26q17-4 17 6t-11 8" stroke="#537d77" strokeWidth="6" fill="none"/><rect x="89" y="157" width="49" height="9" rx="3" fill="#677d80"/><rect x="185" y="157" width="49" height="9" rx="3" fill="#677d80"/><path d="M79 139h27m110 0h28" stroke="#a0aeb2" strokeWidth="3"/></g>;
  else if(palette.kind==='dreamcast')art=<g transform="rotate(-8 162 113)"><path d="M79 61h165v97q0 10-11 10H90q-11 0-11-10z" fill={palette.shellDark} stroke="#a8b2aa" strokeWidth="2"/><rect x="79" y="45" width="165" height="108" rx="21" fill={palette.shell}/><ellipse cx="160" cy="96" rx="57" ry="42" fill={palette.shellLight} stroke="#c7cdbf" strokeWidth="2"/><path d="M151 106c-14-2-13-24 3-24s23 23 5 25c-12 1-15-14-5-16 7-1 10 8 3 8" fill="none" stroke="#6d9a99" strokeWidth="4" strokeLinecap="round"/><circle cx="96" cy="76" r="9" fill="#d9ded4"/><circle cx="225" cy="76" r="9" fill="#d9ded4"/>{[95,130,165,200].map(x=><rect key={x} x={x} y="151" width="26" height="12" rx="4" fill="#7a8b87"/>)}</g>;
  else if(palette.kind==='gamegear')art=<g transform="rotate(-8 162 106)"><rect x="47" y="54" width="231" height="118" rx="33" fill={palette.shell} stroke="#343b42" strokeWidth="2"/><path d="M118 70h97v78h-97z" fill="#2f3941"/><rect x="126" y="79" width="81" height="60" fill="#799589"/><path d="M134 90h64v6h-64m0 9h64v6h-64m0 9h40v6h-40" fill="#a2b39a" opacity=".8"/><path d="M77 91h12v13h13v12H89v13H77v-13H64v-12h13z" fill="#2b333c"/><circle cx="251" cy="98" r="9" fill="#648eac"/><circle cx="230" cy="119" r="9" fill="#648eac"/><text x="140" y="159" fontSize="7" fontFamily="monospace" fill="#bec9ce">GAME GEAR</text></g>;
  else art=<g transform="rotate(-7 163 111)"><path d="M64 84 93 45h140l30 39v66q0 16-18 16H81q-18 0-18-16z" fill={palette.shellDark} stroke="#28343e" strokeWidth="2"/><path d="M78 78 98 52h128l22 26v61H78z" fill={palette.shell}/><ellipse cx="164" cy="97" rx="63" ry="40" fill="#26313c" stroke="#5c6166" strokeWidth="2"/><path d="M123 65h85v17h-85z" fill="#182a31"/><text x="146" y="111" fontSize="17" fontFamily="serif" fill="#bdad7b">16-BIT</text><path d="M87 129h29m98-10h24" stroke="#637782" strokeWidth="6"/><rect x="88" y="149" width="48" height="11" rx="4" fill="#152832"/><rect x="190" y="149" width="48" height="11" rx="4" fill="#152832"/><circle cx="92" cy="104" r="4" fill="#b98768"/></g>;
  return <svg viewBox={small?'45 25 235 165':'0 0 330 205'} className={`console-art ${small?'small':''}`} aria-label={`${item.model} · ${palette.colorLabel}`} data-console-model={palette.kind} data-console-color={palette.colorLabel} role="img"><defs><radialGradient id={grad}><stop offset="0%" stopColor="#244d3e" stopOpacity=".20"/><stop offset="100%" stopColor="#244d3e" stopOpacity="0"/></radialGradient></defs><ellipse cx="168" cy="183" rx="110" ry="16" fill={`url(#${grad})`}/>{art}</svg>;
}
export function ConsoleVisual({item,small=false}:{item:ConsoleItem;small?:boolean}){return item.photos.length?<img className="console-photo" src={item.photos[0].data} alt={[item.model,item.variant].filter(Boolean).join(" · ")}/>:<ConsoleArt item={item} small={small}/>;}
export function Badge({children,tone='slate',dot=true}:{children:React.ReactNode;tone?:string;dot?:boolean}){return <span className={`badge ${tone}`}>{dot&&<i/>}{children}</span>;}
const stateTone:Record<ConsoleState,string>={'a-tester':'slate','en-panne':'red','en-reparation':'blue',fonctionnelle:'green','pour-pieces':'orange'};
export function StateBadge({state}:{state:ConsoleState}){return <Badge tone={stateTone[state]}>{STATES[state]}</Badge>;}
export function StageBadge({stage}:{stage:Stage}){const s=stageInfo(stage);return <Badge tone={s.color}>{s.short}</Badge>;}
export function PriorityBadge({priority}:{priority:Priority}){return <span className={`priority ${priority}`}><span>{priority==='urgente'?'↑↑':priority==='haute'?'↑':priority==='basse'?'↓':'='}</span>{PRIORITIES[priority]}</span>;}
export function Empty({icon='inbox',title,children,action}:{icon?:string;title:string;children?:React.ReactNode;action?:React.ReactNode}){return <div className="empty"><span className="empty-icon"><Icon name={icon} size={30}/></span><h3>{title}</h3><p>{children}</p>{action}</div>;}
export function Modal({title,subtitle,children,onClose,wide=false}:{title:string;subtitle?:string;children:React.ReactNode;onClose:()=>void;wide?:boolean}){
 const ref=useRef<HTMLDialogElement>(null);const labelId=useId();
 useEffect(()=>{const d=ref.current!;d.showModal();return()=>d.close();},[]);
 return <dialog ref={ref} aria-labelledby={labelId} className={`modal ${wide?'wide':''}`} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}><div className="modal-shell"><div className="modal-head"><div><h2 id={labelId}>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button type="button" className="icon-btn" onClick={onClose} aria-label="Fermer la fenêtre"><Icon name="close"/></button></div>{children}</div></dialog>;
}
export function Field({label,children,hint,className=''}:{label:string;children:React.ReactNode;hint?:string;className?:string}){return <label className={`field ${className}`}><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>;}
export function Panel({title,aside,children,className=''}:{title:string;aside?:React.ReactNode;children:React.ReactNode;className?:string}){return <section className={`panel ${className}`}><div className="panel-head"><h2>{title}</h2>{aside}</div>{children}</section>;}
export const eventIcon=(kind:Activity['kind'])=>({created:'plus',stage:'arrow',note:'note',part:'package',time:'clock',test:'checklist',edit:'edit',system:'database',photo:'camera'})[kind];
export function Timeline({events,lookup,onOpen,limit}:{events:Activity[];lookup?:(id:string)=>string;onOpen?:(e:Activity)=>void;limit?:number}){return <div className="timeline">{events.slice(0,limit??events.length).map(e=><div className="timeline-item" key={e.id}><span className={`timeline-icon ${e.kind}`}><Icon name={eventIcon(e.kind)} size={15}/></span><div className="timeline-content">{lookup&&e.consoleId&&<button className="text-link timeline-console" onClick={()=>onOpen?.(e)}>{lookup(e.consoleId)}</button>}<p>{e.text}</p><time dateTime={e.createdAt}>{dateFmt(e.createdAt)} à {timeFmt(e.createdAt)}</time></div></div>)}</div>;}
