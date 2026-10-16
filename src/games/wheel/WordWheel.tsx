import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useServices } from '../../app/services'
import { wordId } from '../../content/parse'
import { puzzlesForAnchor } from '../../content/wheel'
import { hashString, makeRng, shuffle } from '../../engine/rng'
import { Button } from '../../ui/Button'
import { GameFrame } from '../GameFrame'
import type { GameProps } from '../types'
import { useLater } from '../useAdvance'
import { WheelLetters } from './WheelLetters'

export const HINT_COST = 5

export function WordWheel({ activity, onAttempt, onDone }: GameProps) {
  const { bank, repo, speaker, sfx, clock } = useServices()
  const later = useLater()
  const puzzle = useMemo(() => puzzlesForAnchor(activity.wordIds[0] ?? '')[0], [activity.wordIds])
  const anchor = puzzle ? bank.words.get(puzzle.anchorWordId)?.text ?? '' : ''
  const [letters, setLetters] = useState<string[]>(puzzle?.letters ?? [])
  const [path, setPath] = useState<number[]>([])
  const [found, setFound] = useState<string[]>([])
  const [bonus, setBonus] = useState<string[]>([])
  const [revealed, setRevealed] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const hints = useRef(0)
  const hinted = useRef(new Set<string>())
  const pending = useRef<number | null>(null)
  const finished = useRef(false)
  const started = useRef(false)

  const cells = useMemo(() => {
    const m = new Map<string, { ch: string; words: string[] }>()
    for (const p of puzzle?.grid ?? []) {
      ;[...p.word].forEach((ch, i) => {
        const k = `${p.row + (p.dir === 'down' ? i : 0)},${p.col + (p.dir === 'across' ? i : 0)}`
        const cell = m.get(k) ?? { ch, words: [] }
        cell.words.push(p.word)
        m.set(k, cell)
      })
    }
    return m
  }, [puzzle])

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (!puzzle) { onDone(); return }
    void speaker.speak(`Find the hidden spelling word: ${anchor}`)
  }, [puzzle, anchor, speaker, onDone])

  useEffect(() => {
    if (!puzzle || finished.current || found.length < puzzle.grid.length) return
    finished.current = true
    const stars = hints.current === 0 ? 3 : hints.current <= 2 ? 2 : 1
    sfx.fanfare()
    later(() => onDone({ wheel: { puzzles: 1, threeStars: stars === 3 ? 1 : 0, bonusWords: bonus.length } }))
  }, [found, puzzle, bonus.length, later, onDone, sfx])

  if (!puzzle) return null

  const submit = (w = path.map(i => letters[i]).join('')) => {
    setPath([])
    pending.current = null
    if (w.length < 3) return
    if (found.includes(w) || bonus.includes(w)) { setMessage('You already found that one!'); return }
    if (puzzle.grid.some(p => p.word === w)) {
      setFound(f => [...f, w])
      sfx.correct()
      const bw = bank.words.get(wordId(w))
      if (bw) { onAttempt({ wordId: bw.id, correct: true, firstTry: true, hint: hinted.current.has(w) }); void speaker.speak(bw.text) }
      setMessage(w === anchor ? '🎉 You found the hidden spelling word!' : `✨ ${w}!`)
      return
    }
    if (puzzle.bonus.includes(w)) { setBonus(b => [...b, w]); sfx.coin(); setMessage('Bonus word! +2 🐾'); return }
    sfx.gentle()
    setMessage('Not in this puzzle. Try another!')
  }
  const add = (i: number) => setPath(p => (p.includes(i) ? p : [...p, i]))
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); return }
    if (e.key === 'Backspace') { setPath(p => p.slice(0, -1)); return }
    if (e.key.length !== 1) return
    const idx = letters.findIndex((ch, i) => ch === e.key.toLowerCase() && !path.includes(i))
    if (idx >= 0) add(idx)
  }
  const hint = async () => {
    if (!(await repo.spendCoins(HINT_COST, 'Wheel hint', clock.now().getTime()))) { setMessage(`You need ${HINT_COST} 🐾 for a hint.`); return }
    const unfound = puzzle.grid.filter(p => !found.includes(p.word)).sort((a, b) => Number(a.word === anchor) - Number(b.word === anchor))
    const target = unfound[0]
    if (!target) return
    const k = [...target.word].map((_, i) => `${target.row + (target.dir === 'down' ? i : 0)},${target.col + (target.dir === 'across' ? i : 0)}`).find(key => !revealed.includes(key))
    if (k) setRevealed(r => [...r, k])
    hinted.current.add(target.word)
    hints.current++
    setMessage('💡 A letter has been revealed.')
  }
  const shown = (k: string) => revealed.includes(k) || cells.get(k)!.words.some(w => found.includes(w))

  return (
    <GameFrame title="Word Wheel" emoji="🎡" done={found.length} total={puzzle.grid.length}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${puzzle.cols}, 44px)`, gap: 4 }} aria-label="Puzzle grid">
        {Array.from({ length: puzzle.rows * puzzle.cols }, (_, n) => {
          const k = `${Math.floor(n / puzzle.cols)},${n % puzzle.cols}`
          const cell = cells.get(k)
          if (!cell) return <span key={k} />
          return shown(k)
            ? <span key={k} data-testid="cell-filled" className="diff-fix" style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 26, borderRadius: 8 }}>{cell.ch}</span>
            : <span key={k} data-testid="cell-empty" style={{ width: 44, height: 44, background: '#fff', border: '2px solid var(--line)', borderRadius: 8 }} />
        })}
      </div>
      <p className="big-word" style={{ fontSize: 36, minHeight: 50 }} aria-live="polite">{path.map(i => letters[i]).join('')}</p>
      <p className="nudge" aria-live="polite">{message}</p>
      <div tabIndex={0} aria-label="Letter wheel" onKeyDown={onKey} autoFocus style={{ outline: 'none' }}>
        <WheelLetters letters={letters} path={path}
          onStart={i => { pending.current = i }}
          onEnter={i => { if (pending.current !== null) { add(pending.current); pending.current = null } add(i) }}
          onClickLetter={i => { pending.current = null; add(i) }}
          onRelease={() => submit()} />
      </div>
      <div className="row">
        <Button variant="ghost" onClick={() => { setLetters(shuffle(letters, makeRng(hashString(letters.join('') + found.length)))); setPath([]) }}>🔀 Shuffle</Button>
        <Button onClick={() => submit()}>✔ Enter</Button>
        <Button variant="secondary" onClick={() => void hint()}>💡 Hint ({HINT_COST} 🐾)</Button>
      </div>
      <p className="muted">Bonus words: {bonus.length} 🫙</p>
    </GameFrame>
  )
}
