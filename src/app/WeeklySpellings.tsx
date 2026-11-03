import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toDateStr } from '../engine/dates'
import { weekLists } from '../engine/priority'
import { COINS } from '../engine/rewards'
import { makeRng, shuffle } from '../engine/rng'
import type { SchoolList } from '../engine/types'
import { SpellingPractice, type PracticeResult } from '../games/practice/SpellingPractice'
import type { GameAttempt } from '../games/types'
import type { SessionRow } from '../storage/db'
import { Button } from '../ui/Button'
import { ErrorBoundary } from './ErrorBoundary'
import { useServices, useToday } from './services'

const listName = (l: SchoolList) => l.name ?? "This week's spellings"
const longDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

/** This week's school spellings and her best go at each (design of 2026-11-03). Not part of the daily adventure. */
export function WeeklySpellings() {
  const { repo, bank, clock } = useServices()
  const today = useToday()
  const navigate = useNavigate()
  const lists = useLiveQuery(async () => weekLists({ schoolLists: await repo.getSchoolLists(), today }), [repo, today])
  const bests = useLiveQuery(async () => (lists ? Promise.all(lists.map(l => repo.practiceBest(l.id))) : undefined), [repo, lists])
  const [practising, setPractising] = useState<{ list: SchoolList; row: SessionRow; bestBefore: number | null } | null>(null)
  const [earned, setEarned] = useState(0)
  const chain = useRef<Promise<unknown>>(Promise.resolve())
  const now = () => clock.now().getTime()
  if (!lists || !bests) return <main className="screen"><p>Loading…</p></main>

  const start = async (list: SchoolList, bestBefore: number | null) => {
    // Recorded like Free Play: her answers count for learning, but not towards the day's adventure.
    const row: SessionRow = {
      id: `${today}-spellings-${now()}`, date: today, kind: 'free', startedAt: now(), endedAt: null, doneActivityIds: [], complete: false, coins: 0,
      plan: { kind: 'extra', newMaterial: { kind: 'none' }, activities: [{ id: 'spellings', gameType: 'pupPost', wordIds: list.items.map(i => i.wordId) }] },
    }
    await repo.saveSession(row)
    setEarned(0)
    setPractising({ list, row, bestBefore })
  }

  if (practising) {
    const { list, row, bestBefore } = practising
    const words = list.items.map(i => bank.words.get(i.wordId)).filter(w => w !== undefined)
    const logError = (e: unknown) => repo.logError('spellings', e instanceof Error ? e.message : String(e), now())
    const onAttempt = (a: GameAttempt, go: number) => {
      // Go 1 is her own recall. A new word she misses stays new (pretest), so the adventure still teaches it. Later
      // goes come straight after seeing the right spellings, so they are recorded without moving any word on.
      chain.current = chain.current.then(async () => {
        const box = (await repo.db.progress.get(a.wordId))?.box ?? 0
        const role = go > 1 ? 'placement' : box === 0 ? 'pretest' : 'recall'
        await repo.recordAttempt({
          sessionId: row.id, activityId: 'spellings', game: 'pupPost', coinRole: 'recall', noCoins: true, today, nowMs: now(),
          attempt: { wordId: a.wordId, role, correct: a.correct, firstTry: a.firstTry, hint: a.hint, typed: a.typed },
        })
      }).catch(logError)
    }
    const onFinished = (r: PracticeResult) => {
      chain.current = chain.current.then(async () => {
        // Coins for her first-go words, once a day for each list, so another go can't be played for coins.
        const paidToday = (await repo.db.practice.where('listId').equals(list.id).toArray()).some(p => toDateStr(new Date(p.at)) === today)
        const coins = paidToday ? 0 : COINS.recallCorrect * r.firstScore
        if (coins) { await repo.addCoins(coins, 'Weekly spellings', now()); setEarned(e => e + coins) }
        await repo.savePractice({ listId: list.id, testDate: list.testDate, at: now(), ...r })
        await repo.completeSession(row.id, now())
      }).catch(logError)
    }
    return (
      <main className="screen">
        <header className="row" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button variant="ghost" onClick={() => setPractising(null)}>← This week's spellings</Button>
          <span>{earned ? `🐾 +${earned} for this practice` : '🐾'}</span>
        </header>
        <ErrorBoundary key={row.id} onError={e => void repo.logError('spellings', e.message, now())}
          fallback={<section className="card"><p>Oops, that tripped over! Let's go back.</p><Button onClick={() => setPractising(null)}>Back</Button></section>}>
          <SpellingPractice title={listName(list)} words={words} bestBefore={bestBefore}
            order={ws => shuffle(ws, makeRng(now()))} onAttempt={onAttempt} onFinished={onFinished} onClose={() => setPractising(null)} />
        </ErrorBoundary>
      </main>
    )
  }

  return (
    <main className="screen">
      <header className="row" style={{ width: '100%', justifyContent: 'space-between' }}>
        <Button variant="ghost" onClick={() => navigate('/')}>← Home</Button>
        <h1>📝 This week's spellings</h1>
        <span />
      </header>
      {lists.length === 0 && <p className="card">There are no spellings to practise yet. Ask a grown-up to add this week's list.</p>}
      {lists.map((l, k) => {
        const best = bests[k]
        const ready = l.items.some(i => bank.words.has(i.wordId))
        return (
          <section key={l.id} className="card">
            <h2>{listName(l)}</h2>
            <p>Test on {longDate(l.testDate)} · {l.items.length === 1 ? '1 word' : `${l.items.length} words`}</p>
            <p className="praise">{!best ? 'Not practised yet' : best.goes === 1 ? 'Best this week: all right first go! 🏆' : `Best this week: ${best.goes} goes`}</p>
            {!ready && <p>Ask a grown-up to add this list again.</p>}
            <Button size="big" disabled={!ready} aria-label={`Practise ${listName(l)}`} onClick={() => void start(l, best?.goes ?? null)}>Practise</Button>
          </section>
        )
      })}
    </main>
  )
}
