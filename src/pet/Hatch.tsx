import { motion } from 'motion/react'
import { useEffect } from 'react'
import { useServices } from '../app/services'
import type { PetSpecies } from '../storage/db'
import { Button } from '../ui/Button'
import { Egg } from './Egg'
import { PetView } from './PetView'

export function Hatch({ species, name, onDone }: { species: PetSpecies; name: string; onDone: () => void }) {
  const { sfx, speaker } = useServices()
  useEffect(() => { sfx.fanfare(); void speaker.speak(`${name} is hatching!`) }, [sfx, speaker, name])
  return (
    <section className="card">
      <h1>{name} is hatching! 🥚</h1>
      <motion.div initial={{ scale: 1 }} animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 0] }} transition={{ duration: 1.6 }} style={{ position: 'absolute' }}>
        <Egg species={species} size={120} />
      </motion.div>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.4, type: 'spring' }}>
        <PetView species={species} stage="baby" name={name} mood="happy" />
      </motion.div>
      <Button size="big" onClick={onDone}>Say hello!</Button>
    </section>
  )
}
