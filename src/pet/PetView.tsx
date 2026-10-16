import { motion, type TargetAndTransition } from 'motion/react'
import { usePetMood, type PetMood } from '../app/petMood'
import type { AccessorySlot } from '../content/rewards'
import type { PetSpecies } from '../storage/db'
import { PetSvg, type VisibleStage } from './PetSvg'

const ANIM: Record<PetMood, { animate: TargetAndTransition; repeat: number; duration: number }> = {
  idle: { animate: { y: [0, -4, 0] }, repeat: Infinity, duration: 3 },
  happy: { animate: { y: [0, -18, 0], scale: [1, 1.05, 1] }, repeat: 2, duration: 0.45 },
  dance: { animate: { rotate: [-8, 8, -8] }, repeat: Infinity, duration: 0.6 },
  watch: { animate: { y: 0 }, repeat: 0, duration: 0.3 },
  eat: { animate: { scale: [1, 1.04, 1] }, repeat: 4, duration: 0.35 },
  sleep: { animate: { scale: [1, 1.02, 1] }, repeat: Infinity, duration: 2.5 },
  encourage: { animate: { rotate: [0, -4, 4, 0] }, repeat: 1, duration: 0.6 },
}

export function PetView({ species, stage, name, equipped, mood: moodProp, live = false, size = 220 }: {
  species: PetSpecies; stage: VisibleStage; name: string; equipped?: Partial<Record<AccessorySlot, string>>; mood?: PetMood; live?: boolean; size?: number
}) {
  const liveMood = usePetMood(s => s.mood)
  const mood: PetMood = moodProp ?? (live ? liveMood : 'idle')
  const a = ANIM[mood]
  return (
    <motion.div role="img" aria-label={`${name} the ${species}`} data-mood={mood} style={{ display: 'inline-block' }}
      animate={a.animate} transition={{ repeat: a.repeat, duration: a.duration, ease: 'easeInOut' }}>
      <PetSvg species={species} stage={stage} mood={mood} equipped={equipped} size={size} />
    </motion.div>
  )
}
