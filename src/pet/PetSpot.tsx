import type { SettingsRow } from '../storage/db'
import { Egg } from './Egg'
import { SPECIES } from './species'

export function PetSpot({ settings, placementDone }: { settings: SettingsRow; placementDone: boolean }) {
  return (
    <div className="card" style={{ minHeight: 260 }}>
      {placementDone ? <span style={{ fontSize: 120 }} role="img" aria-label={settings.petName}>{SPECIES[settings.petSpecies].emoji}</span> : <Egg species={settings.petSpecies} wobble />}
      <p><strong>{settings.petName}</strong>{placementDone ? '' : ' is still in the egg. Finish the Treasure Hunt to hatch it!'}</p>
    </div>
  )
}
