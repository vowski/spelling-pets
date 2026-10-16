import { petStage } from '../engine/rewards'
import type { SettingsRow } from '../storage/db'
import { Egg } from './Egg'
import { PetView } from './PetView'
import { useIdleSleep } from './useIdleSleep'

export function PetSpot({ settings, placementDone, secureTotal, missedYou = false }: { settings: SettingsRow; placementDone: boolean; secureTotal: number; missedYou?: boolean }) {
  const stage = petStage(secureTotal, placementDone)
  useIdleSleep()
  return (
    <div className="card" style={{ minHeight: 280 }}>
      {missedYou && stage !== 'egg' && <p className="praise" style={{ background: '#fff', border: '3px solid var(--line)', borderRadius: 20, padding: '6px 16px' }}>I missed you! 💛</p>}
      {stage === 'egg'
        ? <Egg species={settings.petSpecies} wobble />
        : <PetView species={settings.petSpecies} stage={stage} name={settings.petName} equipped={settings.equipped} live />}
      <p><strong>{settings.petName}</strong>{stage === 'egg' ? ' is still in the egg. Finish the Treasure Hunt to hatch it!' : ''}</p>
    </div>
  )
}
