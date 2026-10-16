import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router'
import { useServices, useToday } from '../app/services'
import { nextFriday, parseSchoolWords, resolveSchoolWords } from '../engine/schoolWords'
import { newProgress, type SchoolList } from '../engine/types'
import { Button } from '../ui/Button'
import { BOX_NAMES } from './WordsTab'

export function SchoolWordsTab() {
  const { repo, bank, clock } = useServices()
  const today = useToday()
  const lists = useLiveQuery(() => repo.getSchoolLists(), [repo])
  const progress = useLiveQuery(async () => new Map((await repo.getAllProgress()).map(p => [p.wordId, p])), [repo])
  const [raw, setRaw] = useState('')
  const [testDate, setTestDate] = useState(() => nextFriday(today))
  const [preview, setPreview] = useState<ReturnType<typeof resolveSchoolWords> | null>(null)
  const [sentences, setSentences] = useState<Record<string, string>>({})
  const [scores, setScores] = useState<Record<string, { score: string; outOf: string }>>({})
  if (!lists || !progress) return <p>Loading…</p>

  const save = async () => {
    if (!preview?.length) return
    const list: SchoolList = { id: `list-${clock.now().getTime()}`, createdAt: today, testDate, items: preview.map(p => ({ text: p.text, wordId: p.wordId, ...(sentences[p.wordId] ? { sentence: sentences[p.wordId] } : {}) })) }
    const custom = preview.filter(p => !p.inBank).map(p => ({ wordId: p.wordId, text: p.text, ...(sentences[p.wordId]?.trim() ? { sentence: sentences[p.wordId].trim() } : {}) }))
    await repo.saveSchoolList(list, custom)
    setRaw(''); setPreview(null); setSentences({})
  }
  const status = (id: string) => BOX_NAMES[(progress.get(id) ?? newProgress(id)).box]
  const upcoming = lists.filter(l => l.testDate >= today)
  const past = lists.filter(l => l.testDate < today).reverse()

  const listView = (l: SchoolList, isPast: boolean) => (
    <div key={l.id} className="panel">
      <h3>Test on {new Date(`${l.testDate}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
      <p>{l.items.map(i => <span key={i.wordId} className="chip" style={{ marginRight: 6 }}>{i.text} · {status(i.wordId)}</span>)}</p>
      <div className="row" style={{ justifyContent: 'flex-start' }}>
        <Link className="btn ghost" to={`/parent/print/${l.id}`}>Print practice sheet</Link>
        {isPast && (
          <>
            <label>Score <input aria-label={`Score for ${l.testDate}`} style={{ width: 60 }} value={scores[l.id]?.score ?? l.score ?? ''} onChange={e => setScores({ ...scores, [l.id]: { score: e.target.value, outOf: scores[l.id]?.outOf ?? String(l.outOf ?? l.items.length) } })} /></label>
            <label>out of <input aria-label={`Out of for ${l.testDate}`} style={{ width: 60 }} value={scores[l.id]?.outOf ?? l.outOf ?? l.items.length} onChange={e => setScores({ ...scores, [l.id]: { score: scores[l.id]?.score ?? String(l.score ?? ''), outOf: e.target.value } })} /></label>
            <Button variant="secondary" onClick={() => void repo.saveSchoolList({ ...l, score: Number(scores[l.id]?.score), outOf: Number(scores[l.id]?.outOf ?? l.items.length) }, [])}>Save score</Button>
          </>
        )}
        <Button variant="ghost" onClick={() => { if (window.confirm('Delete this list?')) void repo.deleteSchoolList(l.id) }}>Delete list</Button>
      </div>
    </div>
  )

  return (
    <section>
      <div className="panel">
        <h2>Add this week's spelling list</h2>
        <label>Paste or type this week's words<br />
          <textarea aria-label="Paste or type this week's words" rows={6} cols={40} value={raw} onChange={e => { setRaw(e.target.value); setPreview(null) }} />
        </label>
        <p><label>Test date <input type="date" aria-label="Test date" value={testDate} onChange={e => setTestDate(e.target.value)} /></label></p>
        <Button onClick={() => setPreview(resolveSchoolWords(parseSchoolWords(raw), bank))}>Check words</Button>
        {preview && (
          <div>
            {preview.length === 0 ? <p>No words found. Put one word per line.</p> : (
              <ul>{preview.map(p => (
                <li key={p.wordId}><strong>{p.text}</strong> {p.inBank ? <span className="chip good">✓ in our word bank</span> : (
                  <><span className="chip warn">New word</span> <input aria-label={`Example sentence for ${p.text}`} placeholder="Example sentence (optional)" value={sentences[p.wordId] ?? ''} onChange={e => setSentences({ ...sentences, [p.wordId]: e.target.value })} size={40} /></>
                )}</li>
              ))}</ul>
            )}
            {preview.length > 0 && <Button onClick={() => void save()}>Save list</Button>}
          </div>
        )}
      </div>
      <h2>Upcoming tests</h2>
      {upcoming.length ? upcoming.map(l => listView(l, false)) : <p className="muted">None yet.</p>}
      <h2>Past tests</h2>
      {past.length ? past.map(l => listView(l, true)) : <p className="muted">None yet.</p>}
    </section>
  )
}
