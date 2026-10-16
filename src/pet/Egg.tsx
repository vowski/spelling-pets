import { motion } from 'motion/react'
import type { PetSpecies } from '../storage/db'
import { SPECIES } from './species'

export function Egg({ species, size = 140, wobble = false }: { species: PetSpecies; size?: number; wobble?: boolean }) {
  const s = SPECIES[species]
  return (
    <motion.svg width={size} height={size * 1.25} viewBox="0 0 100 125" aria-hidden="true"
      animate={wobble ? { rotate: [0, -6, 6, -3, 0] } : undefined}
      transition={wobble ? { repeat: Infinity, duration: 2.4, repeatDelay: 1.2 } : undefined}>
      <ellipse cx="50" cy="68" rx="40" ry="52" fill="#fffaf2" stroke={s.accent} strokeWidth="3" />
      <circle cx="35" cy="50" r="8" fill={s.body} />
      <circle cx="62" cy="38" r="6" fill={s.accent} opacity=".6" />
      <circle cx="60" cy="80" r="10" fill={s.body} />
      <circle cx="32" cy="92" r="5" fill={s.accent} opacity=".6" />
    </motion.svg>
  )
}
