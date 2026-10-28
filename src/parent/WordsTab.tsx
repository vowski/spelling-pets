import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useServices, useToday } from '../app/services'
import type { SetId } from '../content/types'
import { markKnown, setFocus } from '../engine/scheduler'
import { newProgress, type WordProgress } from '../engine/types'
import type { AttemptRow, TipRow } from '../storage/db'
import { Button } from '../ui/Button'

/** Box 3 is one correct check (a week later) away from Secure; box 5 has passed a retest. */
export const BOX_NAMES = ['New', 'Learning', 'Practising', 'Nearly secure', 'Secure', 'Mastered'] as const
const SETS: [SetId | 'all', string][] = [['all', 'All'], ['y1cew', 'Year 1 tricky words'], ['days', 'Days'], ['hfw', 'High-frequency'], ['y2cew', 'Year 2 tricky words'], ['y34', 'Year 3/4 list'], ['pattern', 'Spelling patterns'], ['school', 'School words']]
const fmt = (ms: number | null) => (ms ? new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '–')

export function WordsTab() {
  const { repo, bank, tips } = useServices()
  const today = useToday()
  const progress = useLiveQuery(async () => new Map((await repo.getAllProgress()).map(p => [p.wordId, p])), [repo])
  const plainTips = useLiveQuery(async () => new Set((await repo.getSettings()).plainTipWordIds ?? []), [repo])
  const [set, setSet] = useState<SetId | 'all'>('all')
  const [status, setStatus] = useState('all')
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(100)
  const [open, setOpen] = useState<{ id: string; rows: AttemptRow[]; tip?: TipRow } | null>(null)
  if (!progress || !plainTips) return <p>Loading…</p>

  const get = (id: string): WordProgress => progress.get(id) ?? newProgress(id)
  const words = [...bank.words.values()].filter(w =>
    (set === 'all' || w.sets.includes(set)) &&
    (status === 'all' || BOX_NAMES[get(w.id).box] === status) &&
    (!q || w.text.toLowerCase().includes(q.toLowerCase())))

  const save = (p: WordProgress) => repo.putProgress([p])
  const history = async (id: string) => setOpen(open?.id === id ? null : { id, rows: await repo.attemptsForWord(id), tip: tips ? await repo.lastTipFor(id) : undefined })

  return (
    <section className="panel">
      <div className="row" style={{ justifyContent: 'flex-start' }}>
        <label>Word set <select aria-label="Word set" value={set} onChange={e => setSet(e.target.value as SetId | 'all')}>{SETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Status <select aria-label="Status" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All</option>{BOX_NAMES.map(b => <option key={b} value={b}>{b}</option>)}</select></label>
        <label>Search <input aria-label="Search" value={q} onChange={e => setQ(e.target.value)} /></label>
        <span className="muted">{words.length} words</span>
      </div>
      <table>
        <thead><tr><th>Word</th><th>Sets</th><th>Status</th><th>Accuracy</th><th>Last seen</th><th>Her misspellings</th><th>Actions</th></tr></thead>
        <tbody>
          {words.slice(0, limit).map(w => {
            const p = get(w.id)
            const miss = Object.entries(p.misspellings).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t)
            return [
              <tr key={w.id}>
                <td><strong>{w.text}</strong>{p.focus && ' ⭐'}</td>
                <td className="muted">{w.sets.join(', ')}</td>
                <td>{BOX_NAMES[p.box]}</td>
                <td>{p.seen ? `${p.correct}/${p.seen}` : '–'}</td>
                <td>{fmt(p.lastSeenAt)}</td>
                <td>{miss.map(m => <span key={m} className="chip" style={{ marginRight: 4 }}>{m}</span>)}</td>
                <td className="row" style={{ justifyContent: 'flex-start', gap: 6 }}>
                  <Button variant="ghost" onClick={() => void save(setFocus(p, !p.focus))}>{p.focus ? 'Remove focus' : '⭐ Focus'}</Button>
                  <Button variant="ghost" onClick={() => { if (window.confirm(`Mark '${w.text}' as Secure?`)) void save(markKnown(p, today)) }}>She knows this</Button>
                  <Button variant="ghost" onClick={() => void history(w.id)}>History</Button>
                  {tips && (plainTips.has(w.id)
                    ? <Button variant="ghost" onClick={() => void repo.setPlainTips(w.id, false)}>Allow AI tips for this word</Button>
                    : <Button variant="ghost" onClick={() => void repo.setPlainTips(w.id, true)}>Use plain tips for this word</Button>)}
                </td>
              </tr>,
              open?.id === w.id && (
                <tr key={`${w.id}-h`}><td colSpan={7}>
                  {tips && <p>{open.tip ? `Last tip (${open.tip.source === 'ai' ? 'AI' : 'plain'}): ${open.tip.text}` : 'No tips yet'}</p>}
                  {open.rows.length === 0 ? <span className="muted">No attempts yet.</span> : (
                    <ul>{open.rows.map(a => <li key={a.id}>{fmt(a.at)} · {a.game} · "{a.typed}" {a.correct ? '✓' : '✗'}</li>)}</ul>
                  )}
                </td></tr>
              ),
            ]
          })}
        </tbody>
      </table>
      {words.length > limit && <Button variant="secondary" onClick={() => setLimit(l => l + 100)}>Show more</Button>}
    </section>
  )
}
