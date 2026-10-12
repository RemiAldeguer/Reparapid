import React, {useId} from 'react';
import {consoleAppearance, type ConsoleVisualItem} from './console-appearance';

type Palette = ReturnType<typeof consoleAppearance>;

function Cross({x, y, size=24, fill}: {x:number; y:number; size?:number; fill:string}) {
  return <g transform={`translate(${x-size/2} ${y-size/2}) scale(${size/30})`}><path d="M11 0h8v11h11v8H19v11h-8V19H0v-8h11Z" fill={fill}/></g>;
}

function Buttons({x, y, palette, radius=4, colored=false}: {x:number; y:number; palette:Palette; radius?:number; colored?:boolean}) {
  return <g>{[[x,y-10],[x+10,y],[x,y+10],[x-10,y]].map(([cx,cy],index)=><circle key={index} cx={cx} cy={cy} r={radius} fill={colored?['#7385c6','#d9756d','#d8ad55','#70a484'][index]:palette.buttons}/>)}</g>;
}

function Screen({x,y,width,height,palette,monochrome=false}: {x:number;y:number;width:number;height:number;palette:Palette;monochrome?:boolean}) {
  return <g>
    <rect x={x} y={y} width={width} height={height} rx="4" fill="#28343d"/>
    <rect x={x+5} y={y+5} width={width-10} height={height-10} rx="1.5" fill={palette.screen}/>
    {monochrome?<path d={`M${x+width*.25} ${y+height*.38}h${width*.23}v${height*.10}h${-width*.14}v${height*.28}h${width*.36}v${-height*.15}h${width*.11}v${height*.25}h${-width*.56}Z`} fill="#4e6750" opacity=".48"/>:<g opacity=".5">
      <path d={`M${x+5} ${y+height*.76}l${width*.20} ${-height*.22} ${width*.20} ${height*.12} ${width*.25} ${-height*.30} ${width*.25-10} ${height*.4}v${height*.24-5}H${x+5}Z`} fill="#658c88"/>
      <circle cx={x+width*.72} cy={y+height*.28} r={Math.min(width,height)*.075} fill="#e1edd1"/>
    </g>}
  </g>;
}

function GameBoy({palette}: {palette:Palette}) {
  const compact=palette.kind!=='gameboy',color=palette.kind==='gameboy-color';
  const x=compact?116:110,y=color?27:compact?22:17,width=compact?98:110,height=color?154:compact?160:168;
  return <g transform="rotate(-8 165 103)">
    <path d={`M${x+7} ${y}h${width-14}q7 0 7 7v${height-29}q0 22-22 22H${x+7}q-7 0-7-7V${y+7}q0-7 7-7Z`} fill={palette.shell} stroke={palette.shellDark} strokeWidth="2"/>
    <rect x={x+9} y={y+13} width={width-18} height={compact?65:76} rx="5" fill={color?'#343a43':'#777d79'}/>
    <rect x={x+20} y={y+24} width={width-40} height={compact?44:53} rx="2" fill={palette.screen}/>
    <path d={`M${x+29} ${y+34}h18v5h-13v13h25v-6h7v16H${x+29}Z`} fill="#536d53" opacity=".5"/>
    <circle cx={x+14} cy={y+37} r="2" fill="#d77471"/>
    <Cross x={x+27} y={y+height-48} size={compact?26:29} fill={palette.controls}/>
    <circle cx={x+width-20} cy={y+height-54} r={compact?7:8} fill={palette.buttons}/>
    <circle cx={x+width-37} cy={y+height-41} r={compact?7:8} fill={palette.buttons}/>
    <path d={`M${x+38} ${y+height-19}l9-3m3 7 9-3`} stroke={palette.shellDark} strokeWidth="4" strokeLinecap="round"/>
    <path d={`M${x+width-29} ${y+height-20}v8m6-12v10m6-14v10`} stroke={palette.shellDark} strokeWidth="2.5" strokeLinecap="round"/>
  </g>;
}

function Advance({palette,micro=false}: {palette:Palette;micro?:boolean}) {
  return <g transform="rotate(-8 165 111)">
    {micro?<rect x="72" y="67" width="188" height="90" rx="15" fill={palette.shell} stroke={palette.shellDark} strokeWidth="2"/>:<>
      <path d="M73 65q22-12 45-4h96q23-8 45 4" fill="none" stroke={palette.shellLight} strokeWidth="8" strokeLinecap="round"/>
      <path d="M74 66q15-6 39-4h104q24-2 39 4 24 10 18 61-2 24-24 25-25 1-42-9h-84q-17 10-42 9-22-1-24-25-6-51 16-61Z" fill={palette.shell} stroke={palette.shellDark} strokeWidth="2"/>
    </>}
    <Screen x={micro?118:112} y={micro?76:73} width={micro?98:108} height={micro?69:70} palette={palette}/>
    <Cross x={micro?96:85} y={110} size={micro?23:29} fill={palette.controls}/>
    <circle cx={micro?240:246} cy="98" r={micro?6:7} fill={palette.buttons}/>
    <circle cx={micro?226:229} cy="119" r={micro?6:7} fill={palette.buttons}/>
    {!micro&&<path d="M77 135h7m3 0h7" stroke={palette.controls} strokeWidth="3" strokeLinecap="round"/>}
    {micro&&<path d="M142 151h8m12 0h8" stroke={palette.controls} strokeWidth="2.5" strokeLinecap="round"/>}
  </g>;
}

function AdvanceSP({palette}: {palette:Palette}) {
  return <g transform="rotate(-7 165 104)">
    <rect x="112" y="14" width="106" height="83" rx="7" fill={palette.shell} stroke={palette.shellDark} strokeWidth="2"/>
    <Screen x={120} y={23} width={90} height={65} palette={palette}/>
    <rect x="113" y="101" width="104" height="87" rx="9" fill={palette.shell} stroke={palette.shellDark} strokeWidth="2"/>
    <rect x="119" y="96" width="92" height="9" rx="4" fill={palette.shellDark}/>
    <Cross x={137} y={135} size={26} fill={palette.controls}/>
    <circle cx="194" cy="129" r="7" fill={palette.buttons}/><circle cx="178" cy="143" r="7" fill={palette.buttons}/>
    <circle cx="154" cy="174" r="3" fill={palette.controls}/><circle cx="171" cy="174" r="3" fill={palette.controls}/>
    <path d="M157 150h16m-16 5h16m-16 5h16" stroke={palette.shellDark} strokeWidth="2" strokeLinecap="round"/>
  </g>;
}

function DualScreen({palette}: {palette:Palette}) {
  const threeDS=palette.kind.includes('3ds'),newModel=palette.kind.startsWith('new-'),twoDS=palette.kind==='new-2ds-xl';
  const xl=palette.kind.endsWith('-xl'),original=palette.kind==='ds';
  const width=xl?176:original?166:150,x=165-width/2,topWidth=original?width-18:width,topX=165-topWidth/2;
  const corner=twoDS?14:original?8:5;
  const camera=threeDS||twoDS||palette.kind.startsWith('dsi');
  return <g transform="rotate(-6 165 105)">
    {original&&<rect x={x} y="14" width={width} height="85" rx="10" fill={palette.shellDark}/>}
    <rect x={topX} y="14" width={topWidth} height="84" rx={corner} fill={palette.shell} stroke={twoDS?palette.buttons:palette.shellDark} strokeWidth={twoDS?4:2}/>
    <Screen x={165-(threeDS||twoDS?112:96)/2} y={24} width={threeDS||twoDS?112:96} height={62} palette={palette}/>
    {camera&&<circle cx="165" cy="19" r="2" fill={palette.controls}/>}
    <path d={`M${topX+10} 40v24M${topX+topWidth-10} 40v24`} stroke={palette.shellDark} strokeWidth="2" strokeDasharray="2 4"/>
    <rect x={x} y="103" width={width} height="83" rx={corner} fill={palette.shell} stroke={palette.shellDark} strokeWidth="2"/>
    <rect x={x+8} y="96" width={width-16} height="10" rx="5" fill={twoDS?palette.buttons:palette.shellDark}/>
    <Screen x={125} y={111} width={80} height={63} palette={palette}/>
    {threeDS||twoDS?<><circle cx={x+20} cy="124" r="8" fill={palette.shellLight} stroke={palette.shellDark} strokeWidth="1.5"/><Cross x={x+20} y={155} size={21} fill={palette.controls}/></>:<Cross x={x+20} y={141} size={23} fill={palette.controls}/>}
    <Buttons x={x+width-21} y={135} palette={palette} radius={3.7} colored={newModel&&threeDS}/>
    {newModel&&<circle cx={x+width-27} cy="116" r="3.5" fill={palette.shellLight} stroke={palette.shellDark}/>}
    <path d={`M${x+width-27} 164h9m-9 8h9`} stroke={palette.controls} strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx={x+width-8} cy="109" r="1.8" fill="#86b67a"/>
  </g>;
}

function TwoDS({palette}: {palette:Palette}) {
  return <g transform="rotate(-6 165 102)">
    <path d="M105 17h120q9 0 9 9l-6 151q0 9-9 9H111q-9 0-9-9L96 26q0-9 9-9Z" fill={palette.shell} stroke={palette.shellDark} strokeWidth="2"/>
    <path d="M109 23h112v73H109Z" fill={palette.shellDark}/>
    <Screen x={115} y={28} width={100} height={62} palette={palette}/>
    <Screen x={132} y={106} width={66} height={56} palette={palette}/>
    <circle cx="165" cy="22" r="2" fill={palette.controls}/>
    <circle cx="113" cy="104" r="8" fill={palette.shellLight} stroke={palette.shellDark} strokeWidth="1.5"/>
    <Cross x={113} y={137} size={22} fill={palette.controls}/>
    <Buttons x={216} y={126} palette={palette} radius={3.8}/>
    <path d="M211 155h9m-9 8h9m-89 11h10m6 0h10" stroke={palette.controls} strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M211 175h10" stroke={palette.shellLight} strokeWidth="3" strokeLinecap="round"/>
  </g>;
}

function Switch({palette}: {palette:Palette}) {
  const lite=palette.kind==='switch-lite';
  return <g transform="rotate(-8 165 108)">
    <rect x="48" y="57" width="235" height="108" rx={lite?22:19} fill={palette.shell} stroke={palette.shellDark} strokeWidth="2"/>
    {!lite&&<><path d="M68 57h22v108H68q-20 0-20-20V77q0-20 20-20Z" fill={palette.left}/><path d="M241 57h22q20 0 20 20v68q0 20-20 20h-22Z" fill={palette.right}/></>}
    <Screen x={92} y={65} width={147} height={92} palette={palette}/>
    <circle cx="70" cy="91" r="10" fill={palette.controls}/>
    {lite?<Cross x={70} y={131} size={24} fill={palette.controls}/>:<Buttons x={70} y={131} palette={palette} radius={3.2}/>}
    <Buttons x={260} y={89} palette={palette} radius={3.5}/>
    <circle cx="260" cy="130" r="10" fill={palette.controls}/>
    <path d="M79 69h5m161 0h6m-3-2v4" stroke={palette.controls} strokeWidth="2"/>
    {!lite&&<path d="M89 60v102m153-102v102" stroke={palette.shellDark} strokeWidth="1.5"/>}
  </g>;
}

function PSP({palette}: {palette:Palette}) {
  return <g transform="rotate(-7 165 110)">
    <path d="M81 60h168q27 0 30 30v40q-3 30-30 30H81q-27 0-30-30V90q3-30 30-30Z" fill={palette.shell} stroke={palette.shellDark} strokeWidth="2"/>
    <Screen x={107} y={70} width={117} height={76} palette={palette}/>
    <Cross x={79} y={99} size={27} fill={palette.controls}/>
    <circle cx="79" cy="134" r="8" fill={palette.shellDark}/><Buttons x={251} y={103} palette={palette} radius={4}/>
    <path d="M117 153h7m9 0h5m42 0h5m8 0h5m8 0h5" stroke={palette.shellLight} strokeWidth="2" strokeLinecap="round"/>
  </g>;
}

function Stick({x,y,palette,radius=10}: {x:number;y:number;palette:Palette;radius?:number}) {
  return <g><circle cx={x} cy={y} r={radius+3} fill={palette.shellDark}/><circle cx={x} cy={y} r={radius} fill={palette.controls}/><circle cx={x} cy={y} r={radius-3} fill={palette.shellLight} opacity=".35"/></g>;
}

function RetroController({palette}: {palette:Palette}) {
  const nes=palette.kind==='controller-nes';
  return <g transform="rotate(-7 165 108)">
    {nes?<><rect x="58" y="64" width="214" height="88" rx="6" fill={palette.shell} stroke={palette.shellDark} strokeWidth="2"/><rect x="66" y="78" width="198" height="64" rx="2" fill="#343a3d"/><path d="M126 87h60m-60 8h60m-60 8h60" stroke={palette.shellDark} strokeWidth="5"/></>:<><path d="M100 58h130q43 0 50 48 3 43-31 47-23 3-48-20h-72q-25 23-48 20-34-4-31-47 7-48 50-48Z" fill={palette.shell} stroke={palette.shellDark} strokeWidth="2"/><ellipse cx="89" cy="107" rx="29" ry="31" fill={palette.shellLight}/><ellipse cx="241" cy="107" rx="30" ry="31" fill={palette.shellDark}/></>}
    <Cross x={89} y={110} size={31} fill={nes?'#c4c7c6':palette.controls}/>
    <path d={nes?'M143 127h12m13 0h12':'M143 112l9-5m12 5 9-5'} stroke={palette.controls} strokeWidth="6" strokeLinecap="round"/>
    {nes?<><circle cx="213" cy="123" r="10" fill={palette.buttons}/><circle cx="244" cy="123" r="10" fill={palette.buttons}/></>:<Buttons x={241} y={107} palette={palette} radius={7} colored/>}
    <path d="M165 63v-12" stroke={palette.controls} strokeWidth="3" strokeLinecap="round"/>
  </g>;
}

function ThreeGripController({palette}: {palette:Palette}) {
  return <g transform="rotate(-6 165 105)">
    <path d="M89 54q-18 3-21 30L54 150q-3 25 14 26 10 1 22-30l14-27h31l13 52q4 20 17 20t17-20l13-52h31l14 27q12 31 22 30 17-1 14-26l-14-66q-3-27-21-30-25-6-42 2h-53q-17-8-42-2Z" fill={palette.shell} stroke={palette.shellDark} strokeWidth="2"/>
    <Cross x={92} y={89} size={30} fill={palette.controls}/>
    <Stick x={165} y={129} palette={palette} radius={12}/>
    <circle cx="165" cy="80" r="7" fill="#cf6260"/>
    <circle cx="223" cy="102" r="8" fill="#548bc0"/><circle cx="238" cy="118" r="8" fill="#66a37b"/>
    <g fill="#e2c463"><circle cx="243" cy="78" r="5"/><circle cx="259" cy="89" r="5"/><circle cx="243" cy="100" r="5"/><circle cx="227" cy="89" r="5"/></g>
  </g>;
}

function GripController({palette}: {palette:Palette}) {
  const cube=palette.kind==='controller-gamecube',classic=palette.kind==='controller-classic';
  return <g transform="rotate(-7 165 106)">
    <path d="M91 53q-21-3-29 23l-15 74q-4 28 16 29 12 1 31-35l18-25h106l18 25q19 36 31 35 20-1 16-29l-15-74q-8-26-29-23l-27 6H118Z" fill={palette.shell} stroke={palette.shellDark} strokeWidth="2"/>
    <path d="M83 52h32m104 0h30" stroke={palette.shellDark} strokeWidth="7" strokeLinecap="round"/>
    {classic?<><Cross x={88} y={87} size={29} fill={palette.controls}/><Stick x={124} y={126} palette={palette} radius={9}/></>:<><Stick x={88} y={88} palette={palette} radius={13}/><Cross x={124} y={126} size={26} fill={palette.controls}/></>}
    {cube?<><circle cx="243" cy="88" r="12" fill="#63a989"/><circle cx="219" cy="103" r="7" fill="#d77570"/><ellipse cx="246" cy="64" rx="12" ry="5" fill="#c8cbd0"/><ellipse cx="265" cy="84" rx="5" ry="12" fill="#c8cbd0"/><circle cx="209" cy="132" r="12" fill="#dbc45c"/><circle cx="209" cy="132" r="8" fill="#b79b47"/></>:<><Buttons x={243} y={86} palette={palette} radius={5.5}/><Stick x={207} y={126} palette={palette} radius={10}/></>}
    <circle cx="164" cy="87" r="5" fill={palette.controls}/>
    {!cube&&<path d="M143 75h6m37 0h6m-3-3v6" stroke={palette.controls} strokeWidth="2"/>}
  </g>;
}

function WiiRemote({palette}: {palette:Palette}) {
  return <g transform="rotate(-10 165 106)">
    <rect x="137" y="18" width="56" height="168" rx="10" fill={palette.shell} stroke={palette.shellDark} strokeWidth="2"/>
    <rect x="145" y="20" width="40" height="8" rx="3" fill={palette.controls}/>
    <circle cx="181" cy="38" r="3" fill="#bb6060"/>
    <Cross x={165} y={62} size={27} fill={palette.controls}/>
    <circle cx="165" cy="95" r="10" fill={palette.shellLight} stroke={palette.shellDark} strokeWidth="1.5"/>
    <path d="M148 117h5m24 0h5m-2-3v6" stroke={palette.controls} strokeWidth="2"/>
    <circle cx="165" cy="117" r="3" fill={palette.controls}/>
    <path d="M157 132h16m-16 5h16m-16 5h16" stroke={palette.shellDark} strokeWidth="2"/>
    <circle cx="165" cy="155" r="4" fill={palette.controls}/><circle cx="165" cy="169" r="4" fill={palette.controls}/>
    <path d="M150 179h3m6 0h3m6 0h3m6 0h3" stroke="#588ead" strokeWidth="2"/>
  </g>;
}

function Nunchuk({palette}: {palette:Palette}) {
  return <g transform="rotate(-12 165 110)">
    <path d="M163 48q0-33 34-33 30 0 30 23 0 20-21 20" fill="none" stroke={palette.controls} strokeWidth="3" strokeLinecap="round"/>
    <path d="M141 48q24-17 47 1 14 12 9 39l-15 73q-4 26-19 26-16 0-20-26l-14-73q-6-28 12-40Z" fill={palette.shell} stroke={palette.shellDark} strokeWidth="2"/>
    <Stick x={165} y={75} palette={palette} radius={16}/>
    <path d="M145 112q19 9 37 0" fill="none" stroke={palette.shellLight} strokeWidth="3"/>
  </g>;
}

function WiiUGamePad({palette}: {palette:Palette}) {
  return <g transform="rotate(-7 165 111)">
    <rect x="37" y="49" width="256" height="126" rx="30" fill={palette.shell} stroke={palette.shellDark} strokeWidth="2"/>
    <Screen x={91} y={61} width={148} height={99} palette={palette}/>
    <Stick x={63} y={79} palette={palette} radius={10}/><Stick x={268} y={79} palette={palette} radius={10}/>
    <Cross x={64} y={119} size={26} fill={palette.controls}/><Buttons x={268} y={119} palette={palette} radius={4}/>
    <circle cx="165" cy="55" r="2" fill={palette.controls}/><circle cx="165" cy="166" r="3.5" fill={palette.controls}/>
    <path d="M54 156h16m188 0h6m4 0h6" stroke={palette.shellLight} strokeWidth="2.5" strokeLinecap="round"/>
  </g>;
}

function JoyCon({palette}: {palette:Palette}) {
  const pair=palette.kind==='joy-con-pair';
  const controller=(right:boolean,x:number,fill:string)=><g key={x} transform={`translate(${x} 0)`}>
    <path d={right?'M0 27h29q24 0 24 24v116q0 18-18 18H0Z':'M24 27h29v158H18q-18 0-18-18V51q0-24 24-24Z'} fill={fill} stroke={palette.shellDark} strokeWidth="2"/>
    <rect x={right?-3:50} y="36" width="4" height="140" rx="2" fill={palette.controls}/>
    <Stick x={26} y={right?128:70} palette={palette} radius={10}/>
    <Buttons x={26} y={right?70:127} palette={palette} radius={3.7}/>
    <path d="M21 42h10" stroke={palette.controls} strokeWidth="2.5"/>{right&&<path d="M26 37v10" stroke={palette.controls} strokeWidth="2.5"/>}
    <rect x={right?22:21} y="153" width="9" height="9" rx={right?4.5:1.5} fill={palette.controls}/>
  </g>;
  return <g transform="rotate(-7 165 108)">{pair?<>{controller(false,100,palette.left!)}{controller(true,180,palette.right!)}</>:controller(palette.kind==='joy-con-right',139,palette.shell)}</g>;
}

function NintendoHomeConsole({palette}: {palette:Palette}) {
  const kind=palette.kind;
  return <g transform="rotate(-7 165 111)">
    {kind==='gamecube'?<><path d="M98 58l55-23 80 23-55 26Z" fill={palette.shellLight} stroke={palette.shellDark} strokeWidth="2"/><path d="M98 58l80 26v100l-80-28Z" fill={palette.shellDark}/><path d="M178 84l55-26v98l-55 28Z" fill={palette.shell} stroke={palette.shellDark} strokeWidth="2"/><ellipse cx="166" cy="58" rx="25" ry="10" fill={palette.controls}/><g fill={palette.controls}>{[109,124,139,154].map(x=><ellipse key={x} cx={x} cy={132+(x-109)*.34} rx="4.5" ry="7"/>)}</g></>:
    kind==='wii'?<><path d="M127 27l20-9 66 18-20 10Z" fill={palette.shellLight}/><path d="M127 27l66 19v134l-66-19Z" fill={palette.shell} stroke={palette.shellDark} strokeWidth="2"/><path d="M193 46l20-10v133l-20 11Z" fill={palette.shellDark}/><path d="M152 55v91" stroke="#638eaf" strokeWidth="4"/><circle cx="139" cy="45" r="3" fill={palette.controls}/><path d="M145 163l19 5" stroke={palette.controls} strokeWidth="3"/></>:
    kind==='n64'?<><path d="M70 87q95-48 190 0l17 53q-4 20-26 22H79q-22-2-26-22Z" fill={palette.shell} stroke={palette.shellDark} strokeWidth="2"/><rect x="117" y="70" width="97" height="25" rx="5" fill={palette.shellDark}/><path d="M126 80h79" stroke={palette.controls} strokeWidth="7"/><path d="M83 115h28m108 0h28" stroke={palette.controls} strokeWidth="5"/><g fill={palette.controls}>{[110,146,182,218].map(x=><rect key={x} x={x-9} y="140" width="18" height="12" rx="5"/>)}</g></>:
    <><path d="M64 73h187l26 28H52Z" fill={palette.shellLight} stroke={palette.shellDark} strokeWidth="2"/><path d="M52 101h225v57H52Z" fill={palette.shell} stroke={palette.shellDark} strokeWidth="2"/>
      {kind==='nes'?<><path d="M155 75h58v56h-58Z" fill={palette.shellDark}/><path d="M65 136h26m8 0h20" stroke={palette.controls} strokeWidth="4"/><rect x="233" y="145" width="14" height="7" rx="2" fill={palette.controls}/></>:<><path d="M100 86h126" stroke={palette.controls} strokeWidth="6" strokeLinecap="round"/><path d="M83 128h105" stroke={palette.controls} strokeWidth="4"/><circle cx="247" cy="137" r="3" fill="#75a781"/></>}
    </>}
  </g>;
}

export function HandheldConsoleArt({item,small=false,palette}: {item:ConsoleVisualItem;small?:boolean;palette:Palette}) {
  const shadow=useId().replace(/:/g,'');
  let art:React.ReactNode;
  if(palette.kind.startsWith('gameboy')) art=<GameBoy palette={palette}/>;
  else if(palette.kind==='advance') art=<Advance palette={palette}/>;
  else if(palette.kind==='micro') art=<Advance palette={palette} micro/>;
  else if(palette.kind==='advance-sp') art=<AdvanceSP palette={palette}/>;
  else if(palette.kind==='2ds') art=<TwoDS palette={palette}/>;
  else if(palette.kind==='switch'||palette.kind==='switch-lite') art=<Switch palette={palette}/>;
  else if(palette.kind==='psp') art=<PSP palette={palette}/>;
  else if(palette.kind==='controller-nes'||palette.kind==='controller-snes') art=<RetroController palette={palette}/>;
  else if(palette.kind==='controller-n64') art=<ThreeGripController palette={palette}/>;
  else if(['controller-gamecube','controller-classic','controller-pro'].includes(palette.kind)) art=<GripController palette={palette}/>;
  else if(palette.kind==='wii-remote') art=<WiiRemote palette={palette}/>;
  else if(palette.kind==='nunchuk') art=<Nunchuk palette={palette}/>;
  else if(palette.kind==='wii-u-gamepad') art=<WiiUGamePad palette={palette}/>;
  else if(palette.kind.startsWith('joy-con-')) art=<JoyCon palette={palette}/>;
  else if(['nes','n64','gamecube','wii','wii-u'].includes(palette.kind)) art=<NintendoHomeConsole palette={palette}/>;
  else art=<DualScreen palette={palette}/>;
  const landscape=['advance','micro','switch','switch-lite','psp','controller-nes','controller-snes','controller-n64','controller-gamecube','controller-classic','controller-pro','wii-u-gamepad','nes','n64','wii-u'].includes(palette.kind);
  const clamshell=['ds','ds-lite','dsi','dsi-xl','3ds','3ds-xl','new-3ds','new-3ds-xl','new-2ds-xl'].includes(palette.kind);
  const accessoryLandscape=palette.kind.startsWith('controller-')||palette.kind==='wii-u-gamepad'||['nes','n64','wii-u'].includes(palette.kind);
  const viewBox=small?(accessoryLandscape?'30 20 275 185':landscape?'30 30 275 150':clamshell?'60 0 210 205':'75 0 180 205'):'0 0 330 205';
  return <svg viewBox={viewBox} className={`console-art ${small?'small':''}`} role="img" aria-label={`${item.model} · ${palette.colorLabel}`} data-console-model={palette.kind} data-console-color={palette.colorLabel}>
    <defs><radialGradient id={shadow}><stop offset="0%" stopColor="#244d3e" stopOpacity=".18"/><stop offset="100%" stopColor="#244d3e" stopOpacity="0"/></radialGradient></defs>
    {!small&&<ellipse cx="165" cy="186" rx={landscape?113:72} ry="12" fill={`url(#${shadow})`}/>}
    {art}
  </svg>;
}
