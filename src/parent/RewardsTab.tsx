import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useServices, useToday } from '../app/services'
import { useRewardStats } from '../app/useRewardStats'
import type { SetId } from '../content/types'
import { rewardProgress, type RealReward } from '../engine/rewards'
import { Button } from '../ui/Button'

const EMOJI = ['🛝', '📚', '🍦', '🎬', '🧸', '🎨', '🏊', '🍕', '🎁']
const GOALS: [RealReward['goal']['type'], string][] = [['sessions', 'Practice sessions'], ['secureWords', 'Words made Secure'], ['weeklyGoals', 'Weeks hitting the weekly goal'], ['daysPractised', 'Days practised'], ['levelComplete', 'Finish a whole word set']]
const LEVELS: [SetId, string][] = [['y1cew', 'Year 1 tricky words'], ['days', 'Days of the week'], ['hfw', '100 high-frequency words'], ['y2cew', 'Year 2 tricky words'], ['y34', 'Year 3/4 word list']]

export function RewardsTab() {
  const { repo, clock } = useServices()
  const today = useToday()
  const settings = useLiveQuery(() => repo.getSettings(), [repo])
  const rewards = useLiveQuery(() => repo.getRealRewards(), [repo])
  const stats = useRewardStats()
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState(EMOJI[0])
  const [type, setType] = useState<RealReward['goal']['type']>('sessions')
  const [target, setTarget] = useState('5')
  const [level, setLevel] = useState<SetId>('y34')
  const [countFrom, setCountFrom] = useState<'creation' | 'allTime'>('creation')
  if (!settings || !rewards || !stats) return <p>Loading…</p>

  const add = async () => {
    if (!title.trim()) return
    const goal: RealReward['goal'] = type === 'levelComplete' ? { type, target: 1, levelId: level, countFrom } : { type, target: Math.max(1, Number(target) || 1), countFrom }
    await repo.saveRealReward({ id: `rw-${clock.now().getTime()}`, title: title.trim(), emoji, goal, status: 'active', createdAt: today })
    setTitle('')
  }
  const statusText = (r: RealReward) => (r.status === 'active' ? 'Working towards it' : r.status === 'earned' ? 'Earned: give it!' : 'Given ✓')

  return (
    <section>
      <div className="panel">
        <h2>Weekly goal</h2>
        <label>Weekly goal (days){' '}
          <select aria-label="Weekly goal (days)" value={settings.weeklyGoalDays} onChange={e => void repo.updateSettings({ weeklyGoalDays: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <div className="panel">
        <h2>Add a real-world reward</h2>
        <p className="row" style={{ justifyContent: 'flex-start' }}>
          <label>Reward <input aria-label="Reward" value={title} onChange={e => setTitle(e.target.value)} placeholder="Trip to the park" /></label>
          <label>Emoji <select aria-label="Emoji" value={emoji} onChange={e => setEmoji(e.target.value)}>{EMOJI.map(e => <option key={e}>{e}</option>)}</select></label>
          <label>Goal <select aria-label="Goal" value={type} onChange={e => setType(e.target.value as RealReward['goal']['type'])}>{GOALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          {type === 'levelComplete'
            ? <label>Word set <select aria-label="Word set" value={level} onChange={e => setLevel(e.target.value as SetId)}>{LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            : <label>Target <input aria-label="Target" type="number" min={1} value={target} onChange={e => setTarget(e.target.value)} style={{ width: 70 }} /></label>}
        </p>
        <p>
          <label><input type="radio" name="from" checked={countFrom === 'creation'} onChange={() => setCountFrom('creation')} /> From today</label>{' '}
          <label><input type="radio" name="from" checked={countFrom === 'allTime'} onChange={() => setCountFrom('allTime')} /> Include past progress</label>
        </p>
        <Button onClick={() => void add()}>Add reward</Button>
      </div>
      <div className="panel">
        <h2>Rewards</h2>
        {rewards.length === 0 ? <p className="muted">No rewards yet.</p> : (
          <table><tbody>{rewards.map(r => {
            const p = rewardProgress(r, stats)
            return (
              <tr key={r.id}>
                <td style={{ fontSize: 24 }}>{r.emoji}</td>
                <td><strong>{r.title}</strong></td>
                <td>{Math.min(p.current, p.target)} of {p.target}</td>
                <td><span className={`chip ${r.status === 'active' ? '' : 'good'}`}>{statusText(r)}</span></td>
                <td className="row" style={{ justifyContent: 'flex-start', gap: 6 }}>
                  {r.status === 'earned' && <Button variant="secondary" onClick={() => void repo.saveRealReward({ ...r, status: 'given', givenAt: today })}>Mark as given</Button>}
                  <Button variant="ghost" onClick={() => { if (window.confirm(`Delete "${r.title}"?`)) void repo.deleteRealReward(r.id) }}>Delete</Button>
                </td>
              </tr>
            )
          })}</tbody></table>
        )}
      </div>
    </section>
  )
}
