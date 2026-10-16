import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { BADGES, FRIENDS, STICKERS } from '../content/rewards'
import { petStageRank } from '../engine/rewards'
import { Hatch } from '../pet/Hatch'
import { Button } from '../ui/Button'
import { usePetMood } from './petMood'
import { useServices } from './services'
import type { SessionOutcome } from './sessionLogic'

export function Celebration({ outcome, earned, onHome }: { outcome: SessionOutcome; earned: number; onHome: () => void }) {
  const { repo, sfx } = useServices()
  const settings = useLiveQuery(() => repo.getSettings(), [repo])
  const setMood = usePetMood(s => s.setMood)
  const [hatching, setHatching] = useState(outcome.hatched)
  useEffect(() => { if (!hatching) { sfx.fanfare(); setMood('dance', 4000) } }, [hatching, sfx, setMood])
  if (!settings) return null
  if (hatching) {
    return <Hatch species={settings.petSpecies} name={settings.petName} onDone={() => { void repo.updateSettings({ hatched: true }); setHatching(false) }} />
  }
  const grew = outcome.stageBefore !== 'egg' && petStageRank(outcome.stageAfter) > petStageRank(outcome.stageBefore)
  return (
    <section className="card">
      <h1>Adventure complete! 🎉</h1>
      <p className="praise">You earned 🐾 {earned}</p>
      {outcome.weeklyGoalJustMet && <p>🌟 You reached your weekly goal! +50 🐾</p>}
      {grew && <p>{settings.petName} grew bigger! 🌟</p>}
      <ul style={{ listStyle: 'none', padding: 0, textAlign: 'center' }}>
        {outcome.awards.map((a, n) => {
          if (a.kind === 'sticker') { const s = STICKERS.find(x => x.id === a.id)!; return <li key={n}>New sticker: {s.emoji} {s.name}!</li> }
          if (a.kind === 'badge') { const b = BADGES.find(x => x.id === a.id)!; return <li key={n}>New badge: {b.emoji} {b.name}</li> }
          if (a.kind === 'friend') { const f = FRIENDS.find(x => x.id === a.id)!; return <li key={n}>A new friend moved into your Pet Park: {f.emoji} {f.name}!</li> }
          return <li key={n}>+{a.amount} 🐾: {a.reason}</li>
        })}
        {outcome.earnedRewards.map(r => <li key={r.id} className="praise">You've earned: {r.emoji} {r.title}! Tell your grown-up 🎉</li>)}
      </ul>
      <Button size="big" onClick={onHome}>Back home</Button>
    </section>
  )
}
