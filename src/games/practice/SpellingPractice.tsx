import { useEffect, useRef, useState } from 'react'
import type { Word } from '../../content/types'
import { AnswerList, type Answer } from '../../ui/AnswerList'
import { Button } from '../../ui/Button'
import { TypeAndCheck } from '../../ui/TypeAndCheck'
import { WordDisplay } from '../../ui/WordDisplay'
import { GameFrame } from '../GameFrame'
import type { GameAttempt } from '../types'
import { useDictation } from '../useDictation'

export interface PracticeResult { goes: number; firstScore: number; total: number }

const goesText = (goes: number) => (goes === 1 ? '1 go' : `${goes} goes`)

/**
 * This week's school spellings, as a practice test (design of 2026-11-03): every word dictated, as in Pup Post, with no
 * marking while she types; then her score and the right spellings; then only the words she missed, again, until she
 * has spelt them all. The fewer goes it takes, the better; 1 is best.
 */
export function SpellingPractice({ title, words, order, bestBefore, onAttempt, onFinished, onClose }: {
  title: string
  words: readonly Word[]
  /** The order the words come in for each go (shuffled in the app). */
  order: (ws: readonly Word[]) => Word[]
  /** Her best this week before this practice (fewest goes), or null if this is her first. */
  bestBefore: number | null
  onAttempt: (a: GameAttempt, go: number) => void
  onFinished: (r: PracticeResult) => void
  onClose: () => void
}) {
  const [go, setGo] = useState(1)
  const [queue, setQueue] = useState(() => order(words))
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [firstScore, setFirstScore] = useState(0)
  const [best, setBest] = useState(bestBefore)
  const [result, setResult] = useState<{ goes: number; bestBefore: number | null } | null>(null)
  const typing = !result && answers.length < queue.length
  const word = typing ? queue[i] : undefined
  const { canSpeak, peeking, replay } = useDictation(word)
  const reported = useRef(false)

  const roundOver = !typing && !result
  const right = answers.filter(a => a.correct).length
  const allRight = roundOver && right === queue.length
  // A go with every word right finishes the practice: report it once.
  useEffect(() => {
    if (!allRight || reported.current) return
    reported.current = true
    const first = go === 1 ? right : firstScore
    onFinished({ goes: go, firstScore: first, total: words.length })
    setResult({ goes: go, bestBefore: best })
    setBest(b => (b === null ? go : Math.min(b, go)))
  }, [allRight]) // eslint-disable-line react-hooks/exhaustive-deps

  // Each go gets a new number, so a word from an earlier go that finishes late can't move this go on.
  const round = useRef(0)
  const start = (next: readonly Word[], nextGo: number) => {
    round.current++
    setQueue(order(next)); setI(0); setAnswers([]); setGo(nextGo); setResult(null); reported.current = false
    if (nextGo === 1) setFirstScore(0)
  }
  const thisRound = round.current

  if (typing && word) {
    if (canSpeak === null) return <p>Getting ready…</p>
    return (
      <GameFrame title={title} emoji="📝" done={i} total={queue.length}>
        <p className="praise">Go {go}</p>
        {canSpeak && <Button variant="secondary" onClick={replay}>🔊 Hear it again</Button>}
        {!canSpeak && (peeking ? <><p>Look carefully…</p><WordDisplay word={word} /></> : <p>Now type it from memory!</p>)}
        {!peeking && (
          <TypeAndCheck key={`${go}-${word.id}-${i}`} word={word} feedback="neutral" neutralMessage="Next word coming…"
            onFirstResult={r => {
              setAnswers(prev => [...prev, { word, typed: r.typed, correct: r.correct }])
              if (go === 1 && r.correct) setFirstScore(s => s + 1)
              onAttempt({ wordId: word.id, correct: r.correct, firstTry: true, hint: false, typed: r.typed }, go)
            }}
            onFinished={() => { if (thisRound === round.current) setI(n => Math.min(n + 1, queue.length - 1)) }} />
        )}
      </GameFrame>
    )
  }

  const missed = answers.filter(a => !a.correct).map(a => a.word)
  return (
    <GameFrame title={title} emoji="📝" done={queue.length} total={queue.length}>
      <h2>You spelt {right} out of {queue.length} right!</h2>
      <AnswerList answers={answers} />
      {result ? (
        <>
          <p className="praise">
            {words.length === 1 ? 'You spelt it right!' : `All ${words.length} spelt right!`} 🎉 It took you{' '}
            {result.goes === 1 ? `1 go: ${words.length === 1 ? 'right' : 'all right'} first time!` : `${goesText(result.goes)}.`}
          </p>
          <p>{result.bestBefore === null || result.goes < result.bestBefore ? "That's your best this week! 🏆"
            : result.goes === result.bestBefore ? 'You matched your best this week! 🏆'
            : `Your best this week is ${goesText(result.bestBefore)}. Have another go to match it!`}</p>
          <div className="row">
            <Button size="big" onClick={() => start(words, 1)}>Have another go</Button>
            <Button variant="secondary" onClick={onClose}>Finish</Button>
          </div>
        </>
      ) : (
        <>
          <p>Look carefully at the right spellings, then try the ones you missed.</p>
          <Button size="big" onClick={() => start(missed, go + 1)}>Try the {missed.length} you missed</Button>
        </>
      )}
    </GameFrame>
  )
}
