import type {ReactNode} from 'react';

type JourneyKind = 'request' | 'shipping' | 'workshop';

const ink = '#382f2d';
const red = '#a32720';
const paper = '#fff';
const warm = '#f0ebe5';
const rose = '#f8e5e1';

function Drawing({children}: {children: ReactNode}) {
  return <svg viewBox="0 0 320 170" aria-hidden="true" focusable="false" fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}

function Check({x, y}: {x: number; y: number}) {
  return <g transform={`translate(${x} ${y})`}><circle r="17" fill={red} stroke={paper} strokeWidth="3"/><path d="m-7 0 5 5 10-11" stroke={paper} strokeWidth="3"/></g>;
}

function RequestDrawing() {
  return <Drawing>
    <ellipse cx="74" cy="150" rx="62" ry="7" fill={warm} stroke="none"/>
    <ellipse cx="248" cy="150" rx="56" ry="7" fill={warm} stroke="none"/>
    <rect x="24" y="16" width="102" height="130" rx="9" fill={paper}/>
    <path d="M24 25a9 9 0 0 1 9-9h84a9 9 0 0 1 9 9v13H24Z" fill={red} stroke="none"/>
    <circle cx="35" cy="27" r="2" fill={paper} stroke="none"/>
    <circle cx="43" cy="27" r="2" fill={paper} stroke="none"/>
    <circle cx="51" cy="27" r="2" fill={paper} stroke="none"/>
    <rect x="40" y="50" width="70" height="39" rx="8" fill={warm}/>
    <rect x="52" y="56" width="46" height="27" rx="2" fill={paper}/>
    <path d="M46 65v9m-4-4h8m54-5v1m0 7v1" stroke={red}/>
    <path d="M41 103h67m-67 12h44" stroke="#a69891"/>
    <rect x="40" y="126" width="13" height="10" rx="2" fill={rose} stroke={red}/>
    <path d="m43 131 2 2 5-5m11 3h35" stroke={red}/>
    <path d="M143 84h43m-9-9 9 9-9 9" stroke={red} strokeWidth="3.5"/>
    <circle cx="246" cy="35" r="11" fill={rose}/>
    <path d="M226 59c2-11 12-15 20-15s18 4 20 15" fill={rose}/>
    <path d="M205 70V59a6 6 0 0 1 6-6h21l10 12h48a6 6 0 0 1 6 6v68a7 7 0 0 1-7 7h-77a7 7 0 0 1-7-7Z" fill={warm}/>
    <rect x="217" y="71" width="62" height="58" rx="4" fill={paper}/>
    <path d="M228 83h37m-37 12h29m-29 12h34" stroke="#a69891"/>
    <path d="M205 90h91v49a7 7 0 0 1-7 7h-77a7 7 0 0 1-7-7Z" fill={rose}/>
    <path d="M222 105h29m-29 11h18" stroke={red}/>
    <Check x={284} y={134}/>
  </Drawing>;
}

function ShippingDrawing() {
  return <Drawing>
    <ellipse cx="56" cy="158" rx="45" ry="6" fill={warm} stroke="none"/>
    <ellipse cx="260" cy="158" rx="49" ry="6" fill={warm} stroke="none"/>
    <rect x="129" y="12" width="64" height="25" rx="3" fill={rose}/>
    <path d="M139 24h41m-41 7h26" stroke={red} strokeWidth="2"/>
    <path d="M129 46h64v48h-64Z" fill={paper}/>
    <path d="M140 59h40m-40 10h31m-31 10h36" stroke="#a69891" strokeWidth="2"/>
    <path d="M119 41h84" stroke={red} strokeWidth="2" strokeDasharray="3 5"/>
    <g stroke={red} strokeWidth="2">
      <circle cx="108" cy="34" r="4"/>
      <circle cx="108" cy="48" r="4"/>
      <path d="m112 36 17 15m-17-5 17-15"/>
    </g>
    <path d="M117 22H69a13 13 0 0 0-13 13v34m-7-8 7 8 7-8" stroke={red} strokeWidth="3"/>
    <path d="M205 66h37a16 16 0 0 1 16 16v11m-7-8 7 8 7-8" stroke={red} strokeWidth="3"/>
    <path d="m14 109 42-30 42 30" strokeWidth="3"/>
    <path d="M25 102v51h62v-51" fill={warm}/>
    <rect x="38" y="113" width="36" height="25" rx="3" fill={paper} stroke={red}/>
    <path d="M45 122h22m-22 8h15" stroke={red} strokeWidth="2"/>
    <path d="m214 119 43-18 47 18-47 19Z" fill="#ead8c4"/>
    <path d="m223 103 3-15 42 7-4 26-43-6Z" fill={warm}/>
    <path d="m233 93-2 12m5-6 8 1m-4-5-1 10m13-8 4 1" stroke="#81716a" strokeWidth="2"/>
    <path d="m270 79 27 4-5 39-27-4Z" fill={paper}/>
    <path d="m276 89 14 2m-15 6 14 2m-15 6 10 2" stroke={red} strokeWidth="2"/>
    <path d="m214 119 43 19v20l-43-20Z" fill="#d8b99a"/>
    <path d="m257 138 47-19v20l-47 19Z" fill="#ead8c4"/>
    <path d="m214 119-10-12 32-14m68 26 9-12-11-5"/>
    <path d="m228 135 13 6" stroke="#81716a"/>
  </Drawing>;
}

function WorkshopDrawing() {
  return <Drawing>
    <ellipse cx="71" cy="153" rx="63" ry="6" fill={warm} stroke="none"/>
    <ellipse cx="253" cy="153" rx="56" ry="6" fill={warm} stroke="none"/>
    <path d="M21 63h101v83H21Z" fill={warm}/>
    <rect x="29" y="71" width="62" height="49" rx="3" fill={paper}/>
    <path d="M101 82h13v64h-13Z" fill={rose}/>
    <path d="M106 109v7" stroke={red}/>
    <path d="M18 31h107v16H18Z" fill={red} stroke="none"/>
    <path d="M18 47h107v12a9 9 0 0 1-18 0 9 9 0 0 1-18 0 9 9 0 0 1-18 0 9 9 0 0 1-18 0 9 9 0 0 1-18 0 8.5 8.5 0 0 1-17 0Z" fill={paper}/>
    <path d="M18 47h17v12a8.5 8.5 0 0 1-17 0Zm35 0h18v12a9 9 0 0 1-18 0Zm36 0h18v12a9 9 0 0 1-18 0Z" fill={red} stroke="none"/>
    <path d="M42 110h37m-32 0v9m27-9v9" strokeWidth="3"/>
    <rect x="43" y="95" width="34" height="10" rx="3" fill={rose} stroke={red} strokeWidth="2"/>
    <path d="m54 82 11 10m-12-17a6 6 0 0 0 7 8l9 9a3 3 0 0 0 4-4l-9-9a6 6 0 0 0-8-7l4 4-4 3Z" fill={warm} strokeWidth="2"/>
    <path d="M142 86h43m-9-9 9 9-9 9" stroke={red} strokeWidth="3.5"/>
    <rect x="201" y="29" width="101" height="117" rx="10" fill={paper}/>
    <path d="M202 54h99" stroke="#d7cdc5"/>
    <circle cx="216" cy="42" r="3" fill={red} stroke="none"/>
    <path d="M226 42h38" stroke={red}/>
    <rect x="214" y="69" width="75" height="43" rx="9" fill={warm}/>
    <rect x="228" y="76" width="47" height="29" rx="2" fill={paper}/>
    <path d="M221 83v13m-5-6h10m56-7v1m0 10v1" stroke={red} strokeWidth="2"/>
    <path d="M219 129h52" stroke={red} strokeWidth="2"/>
    <circle cx="219" cy="129" r="3" fill={red} stroke="none"/>
    <circle cx="236" cy="129" r="3" fill={red} stroke="none"/>
    <circle cx="253" cy="129" r="3" fill={red} stroke="none"/>
    <Check x={290} y={136}/>
  </Drawing>;
}

export function HomeRepairJourneyArt({kind}: {kind: JourneyKind}) {
  if (kind === 'request') return <RequestDrawing/>;
  if (kind === 'shipping') return <ShippingDrawing/>;
  return <WorkshopDrawing/>;
}
