function USBPort({x, y, width = 10, height = 4, light = false}: {x: number; y: number; width?: number; height?: number; light?: boolean}) {
  return <g><rect x={x} y={y} width={width} height={height} rx=".8" fill="#071019" stroke={light ? '#8394a0' : '#51606d'} strokeWidth=".65"/><path d={`M${x + 2} ${y + height * .62}h${width - 4}`} stroke="#8794a0" strokeWidth=".65" opacity=".7"/></g>;
}

function PowerInset({x, y, radius, light = false}: {x: number; y: number; radius: number; light?: boolean}) {
  return <g><circle cx={x} cy={y} r={radius} fill="none" stroke={light ? '#778b9b' : '#edf2f2'} strokeWidth=".65" opacity=".55"/><path d={`M${x} ${y - radius * .52}v${radius * .7}`} stroke={light ? '#425e70' : '#2c3942'} strokeWidth=".8" strokeLinecap="round"/></g>;
}

function PS5Details({kind}: {kind: string}) {
  const slim = kind === 'ps5-slim', disc = kind !== 'ps5-digital' && kind !== 'ps5-pro';
  return <g transform={`translate(${slim ? 10 : 0} 0)`}>
    <path d="M148 43q-3 69 0 143m36-143q4 70 0 143" stroke="#020811" strokeOpacity=".38" strokeWidth="1.2" fill="none"/>
    <path d="M150 45q-2 62 1 110m30-110q3 61 1 111" stroke="#bcc9d3" strokeOpacity=".12" strokeWidth=".6" fill="none"/>
    <rect x="154.5" y="150.5" width="5" height="8" rx="1.4" fill="none" stroke="#bbc8d0" strokeOpacity=".45" strokeWidth=".65"/>
    <path d="M156.4 152.5v4" stroke="#0c1925" strokeWidth="1.1" strokeLinecap="round"/>
    <USBPort x={167.5} y={151.5} width={10} height={4}/>
    <path d="M159 167.2h7m-7 9h7" stroke="#0b1723" strokeWidth=".7" strokeLinecap="round"/>
    {disc && <><path d="M211 139v23" stroke="#71808d" strokeOpacity=".55" strokeWidth=".65" strokeLinecap="round"/><circle cx="210" cy="172" r="1.1" fill="#52616d"/></>}
    <path d="M132 197h69m-79 4h91" stroke="#83909d" strokeOpacity=".22" strokeWidth=".7" strokeLinecap="round"/>
  </g>;
}

function PS4Details({kind}: {kind: string}) {
  const pro = kind === 'ps4-pro', portY = pro ? 159 : 141;
  return <g transform="translate(13 0)">
    <path d="m131 66 35 31m-77-14 25 27" fill="none" stroke="#cfdae2" strokeOpacity=".13" strokeWidth=".65"/>
    <path d={`M153 ${portY}l11-2v4l-11 2zm20-4 11-2v4l-11 2z`} fill="#070e18" stroke="#667886" strokeWidth=".6"/>
    <path d={`M156 ${portY + 1}l5-1m15-3 5-1`} stroke="#a2adb7" strokeOpacity=".6" strokeWidth=".7"/>
    <path d={`M219 ${pro ? 132 : 114}l18-4m-18 7 18-4m-18 7 18-4`} stroke="#8795a2" strokeOpacity=".23" strokeWidth=".8" strokeLinecap="round"/>
    <path d={`M125 ${pro ? 157 : 138}l88-18`} stroke="#97a8b6" strokeOpacity=".13" strokeWidth=".65"/>
  </g>;
}

function SwitchDetails({kind}: {kind: string}) {
  const light = kind === 'switch-lite' || kind === 'switch-oled', speakerY = kind === 'switch-oled' || kind === 'switch-2' ? 167 : 165;
  return <g transform="rotate(-5 160 110)">
    <path d="M80 59h160M78 165v-105m164 0v105" fill="none" stroke="#f1f6fa" strokeOpacity=".09" strokeWidth=".75"/>
    {[0, 1, 2, 3].map(index => <path key={index} d={`M${91 + index * 3} ${speakerY}v2m${112 + index * 3} -2v2`} stroke="#8d9ca8" strokeOpacity=".65" strokeWidth=".75" strokeLinecap="round"/>)}
    <rect x="52.5" y="151.5" width="6" height="4" rx=".8" fill="none" stroke={light ? '#dbe3e2' : '#84a5bd'} strokeOpacity=".65" strokeWidth=".65"/>
    <circle cx="263" cy="151" r="2.6" fill="none" stroke={light ? '#edf2ef' : '#8eabc0'} strokeOpacity=".45" strokeWidth=".65"/>
    <path d="M54 53q-10 5-13 18m225-18q10 5 13 18M45 162q3 9 12 11m214-11q-3 9-11 11" fill="none" stroke="#ffffff" strokeOpacity={light ? '.25' : '.17'} strokeWidth=".75"/>
  </g>;
}

function XboxDetails({kind}: {kind: string}) {
  if (kind === 'xbox-series-x') return <g>
    <path d="M179 59v141m2 1 55-14" stroke="#98a8ad" strokeOpacity=".14" strokeWidth=".7" fill="none"/>
    <PowerInset x={151} y={70} radius={3.8}/>
    <path d="M213 75v88" stroke="#5c6c78" strokeOpacity=".5" strokeWidth=".7" strokeLinecap="round"/>
    <USBPort x={187} y={180} width={10} height={4}/>
    <circle cx="208" cy="180" r="3.1" fill="none" stroke="#8496a0" strokeOpacity=".4" strokeWidth=".6"/>
  </g>;
  if (kind === 'xbox-series-s') return <g>
    <ellipse cx="168" cy="86" rx="29.5" ry="31.5" fill="none" stroke="#8a9ba8" strokeOpacity=".22" strokeWidth=".65"/>
    <path d="M130 38v145l23 19m51-177v145l22 14" stroke="#ffffff" strokeOpacity=".35" strokeWidth=".75" fill="none"/>
    <PowerInset x={147} y={166} radius={2.9} light/>
    <USBPort x={190} y={170} width={12} height={5} light/>
    <circle cx="182" cy="174" r="1.2" fill="#8196a4"/>
  </g>;
  if (kind === 'xbox-360') return <g>
    <path d="M152 54h47v70h-47z" fill="none" stroke="#eef3f5" strokeOpacity=".35" strokeWidth=".65"/>
    <path d="M151 183h47" stroke="#eaf0f4" strokeOpacity=".5" strokeWidth=".6"/>
    <circle cx="177" cy="154" r="7.8" fill="none" stroke="#eff3ed" strokeOpacity=".35" strokeWidth=".7"/>
  </g>;
  const light = kind === 'xbox-one-s';
  return <g>
    <path d="m100 118 149-31M140 175l107-21" fill="none" stroke={light ? '#ffffff' : '#a7bac7'} strokeOpacity={light ? '.4' : '.17'} strokeWidth=".75"/>
    <PowerInset x={237} y={126} radius={3.7} light={light}/>
    <path d="m140 169 8-2v4l-8 2z" fill="#0d1927" stroke={light ? '#93a7b6' : '#62798b'} strokeWidth=".6"/>
  </g>;
}

function ClassicDetails({kind}: {kind: string}) {
  if (kind === 'ps1') return <g>
    <path d="M123 88q15-16 42-16 27 0 42 16" fill="none" stroke="#f9fbfc" strokeOpacity=".65" strokeWidth=".8"/>
    <path d="M188 160h41m-39 3h3m5 0h3m5 0h3m5 0h3m5 0h3" stroke="#c5d0d8" strokeOpacity=".75" strokeWidth=".7"/>
    <circle cx="93" cy="87" r="6.8" fill="none" stroke="#eef3f4" strokeOpacity=".5" strokeWidth=".7"/>
    <circle cx="239" cy="88" r="5.8" fill="none" stroke="#eef3f4" strokeOpacity=".5" strokeWidth=".7"/>
  </g>;
  if (kind === 'ps2') return <g>
    <path d="m203 28 13 15v143" fill="none" stroke="#9aabba" strokeOpacity=".18" strokeWidth=".7"/>
    <path d="M202.5 140h5v16h-5zm0 23h5v16h-5z" fill="#0c1724" stroke="#65798e" strokeWidth=".6"/>
    <path d="M205 143v10m0 13v10" stroke="#96a9b7" strokeWidth=".65"/>
    <circle cx="205" cy="44" r="3.1" fill="none" stroke="#b8c5c9" strokeOpacity=".3" strokeWidth=".65"/>
  </g>;
  if (kind === 'ps3') return <g>
    <path d="m131 164 110-19" fill="none" stroke="#c7d5df" strokeOpacity=".15" strokeWidth=".65"/>
    <path d="m151 138 64-11" stroke="#cad4dd" strokeOpacity=".4" strokeWidth=".6"/>
    <circle cx="229" cy="140" r="4.2" fill="none" stroke="#bed3cd" strokeOpacity=".3" strokeWidth=".65"/>
  </g>;
  if (kind === 'wii') return <g>
    <path d="M150 162h20v17h-20z" fill="none" stroke="#91a7b7" strokeOpacity=".45" strokeWidth=".7"/>
    <path d="M153 177h14m25-156v148" fill="none" stroke="#ffffff" strokeOpacity=".5" strokeWidth=".7"/>
    <circle cx="159" cy="35" r="1.9" fill="none" stroke="#dfe7ec" strokeWidth=".65"/>
  </g>;
  if (kind === 'gamecube') return <g>
    <path d="M136 62q29-13 61-1" fill="none" stroke="#d4cce6" strokeOpacity=".45" strokeWidth=".7"/>
    {[0, 1, 2, 3].map(index => <g key={index}><circle cx={100 + index * 17} cy={143 + index * 5} r="3.6" fill="none" stroke="#7c729d" strokeWidth=".6"/><path d={`M${98 + index * 17} ${143 + index * 5}h4`} stroke="#bac0cd" strokeOpacity=".6" strokeWidth=".6"/></g>)}
    <path d="m98 164 20 6m13 4 20 5m18-76 75-26" fill="none" stroke="#e1d7ee" strokeOpacity=".25" strokeWidth=".65"/>
  </g>;
  return null;
}

/** Fine surface accents use the same local coordinates and rotations as the shared silhouettes. */
export function ConsoleSurfaceDetails({kind}: {kind: string}) {
  return <g data-console-detail-layer="true">
    {kind.startsWith('ps5') ? <PS5Details kind={kind}/> : kind.startsWith('ps4') ? <PS4Details kind={kind}/> : kind.startsWith('switch') ? <SwitchDetails kind={kind}/> : kind.startsWith('xbox') ? <XboxDetails kind={kind}/> : <ClassicDetails kind={kind}/>}
  </g>;
}
