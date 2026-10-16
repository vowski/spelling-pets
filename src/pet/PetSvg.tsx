import type { PetMood } from '../app/petMood'
import type { AccessorySlot } from '../content/rewards'
import type { PetStage } from '../engine/rewards'
import type { PetSpecies } from '../storage/db'
import { ACCESSORY_ART } from './accessories'
import { SPECIES } from './species'

export type VisibleStage = Exclude<PetStage, 'egg'>
const SCALE: Record<VisibleStage, number> = { baby: 0.62, young: 0.76, grown: 0.88, super: 0.96, sparkly: 1 }
const INK = '#2d2a32'
const PINK = '#f7b6c2'
const LINE = '#00000018'

function Ears({ species, body, accent }: { species: PetSpecies; body: string; accent: string }) {
  switch (species) {
    case 'puppy': return <>
      <ellipse cx="56" cy="80" rx="16" ry="32" transform="rotate(22 56 80)" fill={accent} />
      <ellipse cx="144" cy="80" rx="16" ry="32" transform="rotate(-22 144 80)" fill={accent} />
    </>
    case 'kitten': return <>
      <path d="M60 66 L68 22 L94 52 Z" fill={body} stroke={LINE} strokeWidth="3" /><path d="M67 56 L71 34 L84 50 Z" fill={PINK} />
      <path d="M140 66 L132 22 L106 52 Z" fill={body} stroke={LINE} strokeWidth="3" /><path d="M133 56 L129 34 L116 50 Z" fill={PINK} />
    </>
    case 'bunny': return <>
      <ellipse cx="80" cy="30" rx="13" ry="38" fill={body} stroke={LINE} strokeWidth="3" /><ellipse cx="80" cy="32" rx="6" ry="27" fill={PINK} />
      <ellipse cx="120" cy="30" rx="13" ry="38" fill={body} stroke={LINE} strokeWidth="3" /><ellipse cx="120" cy="32" rx="6" ry="27" fill={PINK} />
    </>
    case 'fox': return <>
      <path d="M58 68 L64 20 L96 52 Z" fill={body} stroke={LINE} strokeWidth="3" /><path d="M61 42 L64 20 L74 32 Z" fill={INK} />
      <path d="M142 68 L136 20 L104 52 Z" fill={body} stroke={LINE} strokeWidth="3" /><path d="M139 42 L136 20 L126 32 Z" fill={INK} />
    </>
    case 'panda': return <>
      <circle cx="62" cy="52" r="17" fill={INK} /><circle cx="138" cy="52" r="17" fill={INK} />
    </>
  }
}

function Tail({ species, body, accent }: { species: PetSpecies; body: string; accent: string }) {
  switch (species) {
    case 'puppy': return <path d="M142 152 Q168 140 160 118" stroke={accent} strokeWidth="10" fill="none" strokeLinecap="round" className="pet-tail" />
    case 'kitten': return <path d="M142 160 Q182 150 170 112" stroke={body} strokeWidth="11" fill="none" strokeLinecap="round" className="pet-tail" />
    case 'bunny': return <circle cx="146" cy="166" r="13" fill="#fff" stroke={LINE} strokeWidth="3" />
    case 'fox': return <g className="pet-tail"><path d="M138 166 Q192 160 176 112 Q168 140 138 150 Z" fill={body} /><path d="M176 112 Q186 124 180 134 L170 124 Z" fill="#fff" /></g>
    case 'panda': return <circle cx="144" cy="166" r="10" fill={INK} />
  }
}

function Face({ species, mood }: { species: PetSpecies; mood: PetMood }) {
  const shift = mood === 'watch' ? { x: -3, y: 3 } : { x: 0, y: 0 }
  const closed = mood === 'sleep'
  const happy = mood === 'happy' || mood === 'dance'
  return <>
    {species === 'panda' && <><ellipse cx="82" cy="94" rx="15" ry="18" fill={INK} transform="rotate(-20 82 94)" /><ellipse cx="118" cy="94" rx="15" ry="18" fill={INK} transform="rotate(20 118 94)" /></>}
    {species === 'fox' && <><ellipse cx="78" cy="110" rx="18" ry="12" fill="#fff4e6" /><ellipse cx="122" cy="110" rx="18" ry="12" fill="#fff4e6" /></>}
    {closed ? <>
      <path d="M74 94 Q82 100 90 94" stroke={species === 'panda' ? '#fff' : INK} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M110 94 Q118 100 126 94" stroke={species === 'panda' ? '#fff' : INK} strokeWidth="4" fill="none" strokeLinecap="round" />
      <text x="140" y="60" fontSize="20" fill={INK}>z</text>
    </> : happy ? <>
      <path d="M74 96 Q82 86 90 96" stroke={species === 'panda' ? '#fff' : INK} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M110 96 Q118 86 126 96" stroke={species === 'panda' ? '#fff' : INK} strokeWidth="4" fill="none" strokeLinecap="round" />
    </> : <>
      <circle cx={82 + shift.x} cy={94 + shift.y} r="8" fill={species === 'panda' ? '#fff' : INK} />
      <circle cx={118 + shift.x} cy={94 + shift.y} r="8" fill={species === 'panda' ? '#fff' : INK} />
      <circle cx={84 + shift.x} cy={91 + shift.y} r="2.5" fill={species === 'panda' ? INK : '#fff'} />
      <circle cx={120 + shift.x} cy={91 + shift.y} r="2.5" fill={species === 'panda' ? INK : '#fff'} />
    </>}
    {mood === 'encourage' && <><path d="M74 80 L88 78" stroke={INK} strokeWidth="3" strokeLinecap="round" /><path d="M112 78 L126 80" stroke={INK} strokeWidth="3" strokeLinecap="round" /></>}
    <ellipse cx="72" cy="110" rx="9" ry="5" fill={PINK} opacity=".8" />
    <ellipse cx="128" cy="110" rx="9" ry="5" fill={PINK} opacity=".8" />
    <ellipse cx="100" cy="106" rx="6" ry="4" fill={INK} />
    {mood === 'eat' ? <circle cx="100" cy="118" r="6" fill={INK} />
      : happy ? <path d="M90 113 Q100 126 110 113 Z" fill={INK} />
      : <path d="M93 114 Q100 120 107 114" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />}
  </>
}

export function PetSvg({ species, stage, mood = 'idle', equipped = {}, size = 220 }: {
  species: PetSpecies; stage: VisibleStage; mood?: PetMood; equipped?: Partial<Record<AccessorySlot, string>>; size?: number
}) {
  const { body, accent } = SPECIES[species]
  const k = SCALE[stage]
  const headR = stage === 'baby' ? 52 : 46
  const slots: AccessorySlot[] = ['neck', 'face', 'hat']
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
      <style>{'@keyframes twinkle{0%,100%{opacity:.2}50%{opacity:1}} .twinkle{animation:twinkle 1.6s infinite} @media (prefers-reduced-motion: reduce){.twinkle{animation:none}}'}</style>
      <ellipse cx="100" cy="192" rx={60 * k} ry="6" fill="#00000012" />
      <g transform={`translate(0 ${(1 - k) * 90}) translate(100 100) scale(${k}) translate(-100 -100)`}>
        <Tail species={species} body={body} accent={accent} />
        <ellipse cx="100" cy="152" rx="46" ry="38" fill={body} stroke={LINE} strokeWidth="3" />
        <ellipse cx="100" cy="158" rx="26" ry="22" fill="#ffffff" opacity=".45" />
        <ellipse cx="78" cy="186" rx="14" ry="8" fill={species === 'panda' ? INK : body} stroke={LINE} strokeWidth="3" />
        <ellipse cx="122" cy="186" rx="14" ry="8" fill={species === 'panda' ? INK : body} stroke={LINE} strokeWidth="3" />
        <Ears species={species} body={body} accent={accent} />
        <circle cx="100" cy="92" r={headR} fill={body} stroke={LINE} strokeWidth="3" />
        <Face species={species} mood={mood} />
        {stage === 'super' || stage === 'sparkly' ? <path d="M100 140 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1 z" fill="#ffd166" stroke="#e0a800" strokeWidth="1.5" /> : null}
        {slots.map(slot => {
          const id = equipped[slot]
          const art = id ? ACCESSORY_ART[id] : undefined
          return art ? <g key={slot}>{art(slot)}</g> : null
        })}
      </g>
      {stage === 'sparkly' && [[24, 40], [176, 52], [30, 150], [172, 150]].map(([x, y], n) => (
        <text key={n} data-sparkle x={x} y={y} fontSize="22" fill="#ffd166" className="twinkle" style={{ animationDelay: `${n * 0.4}s` }}>✦</text>
      ))}
    </svg>
  )
}
