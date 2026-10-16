import type { ReactElement } from 'react'
import type { AccessorySlot } from '../content/rewards'

const g = (id: string, children: ReactElement) => <g data-accessory={id}>{children}</g>

export const ACCESSORY_ART: Record<string, (slot: AccessorySlot) => ReactElement> = {
  'party-hat': () => g('party-hat', <>
    <path d="M100 6 L80 50 L120 50 Z" fill="#f4978e" stroke="#00000018" strokeWidth="2" />
    <path d="M90 28 L110 28 M85 40 L115 40" stroke="#ffd166" strokeWidth="5" />
    <circle cx="100" cy="6" r="7" fill="#ffd166" />
  </>),
  bow: () => g('bow', <>
    <path d="M128 44 L146 34 L146 56 Z M128 44 L110 34 L110 56 Z" fill="#f48fb1" />
    <circle cx="128" cy="45" r="6" fill="#ec6f9a" />
  </>),
  'flower-crown': () => g('flower-crown', <>
    {[66, 83, 100, 117, 134].map((x, i) => <circle key={x} cx={x} cy={i % 2 ? 46 : 50} r="8" fill={['#f4978e', '#ffd166', '#c3b1e1', '#8ecae6', '#f4978e'][i]} />)}
  </>),
  'wizard-hat': () => g('wizard-hat', <>
    <path d="M100 0 L76 52 L124 52 Z" fill="#7b6cc4" />
    <path d="M70 52 L130 52" stroke="#5b4ea3" strokeWidth="8" strokeLinecap="round" />
    <path d="M100 20 l3 6 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 z" fill="#ffd166" />
  </>),
  crown: () => g('crown', <>
    <path d="M72 52 L76 24 L88 40 L100 18 L112 40 L124 24 L128 52 Z" fill="#ffd166" stroke="#e0a800" strokeWidth="2" />
    <circle cx="100" cy="42" r="4" fill="#f4978e" />
  </>),
  bandana: () => g('bandana', <path d="M66 126 Q100 140 134 126 L100 152 Z" fill="#5fb88f" stroke="#3f8f6b" strokeWidth="2" />),
  'bow-tie': () => g('bow-tie', <>
    <path d="M100 134 L82 124 L82 144 Z M100 134 L118 124 L118 144 Z" fill="#8ecae6" stroke="#4f97b8" strokeWidth="2" />
    <circle cx="100" cy="134" r="5" fill="#4f97b8" />
  </>),
  scarf: () => g('scarf', <>
    <rect x="66" y="124" width="68" height="14" rx="7" fill="#f4978e" />
    <rect x="112" y="130" width="12" height="30" rx="5" fill="#f4978e" />
  </>),
  glasses: () => g('glasses', <>
    <circle cx="83" cy="92" r="13" fill="none" stroke="#2d2a32" strokeWidth="3" />
    <circle cx="117" cy="92" r="13" fill="none" stroke="#2d2a32" strokeWidth="3" />
    <path d="M96 92 L104 92" stroke="#2d2a32" strokeWidth="3" />
  </>),
  sunglasses: () => g('sunglasses', <>
    <rect x="68" y="82" width="28" height="18" rx="7" fill="#2d2a32" />
    <rect x="104" y="82" width="28" height="18" rx="7" fill="#2d2a32" />
    <path d="M96 88 L104 88" stroke="#2d2a32" strokeWidth="3" />
  </>),
}
