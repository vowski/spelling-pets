import type { HuntProgress } from '../engine/placement'
import { petStage } from '../engine/rewards'
import type { SettingsRow } from '../storage/db'
import { SpeakButton } from '../ui/SpeakButton'
import { Egg } from './Egg'
import { PetView } from './PetView'
import { useIdleSleep } from './useIdleSleep'

/** How far the Treasure Hunt has got, and whether today's adventure is already done. */
export interface HatchInfo extends HuntProgress { todayDone: boolean }

/** What is left before the egg hatches, and what to do next, in words a 7-year-old can follow. */
export function hatchMessage(name: string, h: HatchInfo): { left: string; next: string } {
  const left = h.huntsLeft === 0 ? `Finish today’s adventure and ${name} will hatch!`
    : h.huntsLeft === 1 ? (h.midHunt ? `Finish this Treasure Hunt and ${name} will hatch!` : `1 more Treasure Hunt and ${name} will hatch!`)
      : `${h.huntsLeft} more Treasure Hunts and ${name} will hatch!`
  const next = h.todayDone ? 'Press Extra practice to do another Treasure Hunt today.' : 'There is one Treasure Hunt in each adventure.'
  return { left, next }
}

function HatchProgress({ name, hatch }: { name: string; hatch: HatchInfo }) {
  const { left, next } = hatchMessage(name, hatch)
  const label = `Treasure Hunt: ${hatch.done} of ${hatch.total} words`
  return (
    <div className="hatch-progress">
      <p className="hatch-left">{left}</p>
      <div className="bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={hatch.total} aria-valuenow={hatch.done}>
        <span style={{ width: `${hatch.total ? Math.round((hatch.done / hatch.total) * 100) : 0}%` }} />
      </div>
      <p className="muted">💎 {label}</p>
      <p>{next}</p>
      <SpeakButton text={`${left} ${next}`} />
    </div>
  )
}

export function PetSpot({ settings, placementDone, secureTotal, missedYou = false, hatch }: {
  settings: SettingsRow; placementDone: boolean; secureTotal: number; missedYou?: boolean; hatch?: HatchInfo
}) {
  const stage = petStage(secureTotal, placementDone)
  useIdleSleep()
  return (
    <div className="card" style={{ minHeight: 280 }}>
      {missedYou && stage !== 'egg' && <p className="praise" style={{ background: '#fff', border: '3px solid var(--line)', borderRadius: 20, padding: '6px 16px' }}>I missed you! 💛</p>}
      {stage === 'egg'
        ? <Egg species={settings.petSpecies} wobble />
        : <PetView species={settings.petSpecies} stage={stage} name={settings.petName} equipped={settings.equipped} live />}
      <p><strong>{settings.petName}</strong>{stage === 'egg' ? (hatch ? ' is still in the egg.' : ' is still in the egg. Finish the Treasure Hunt to hatch it!') : ''}</p>
      {stage === 'egg' && hatch && <HatchProgress name={settings.petName} hatch={hatch} />}
    </div>
  )
}
