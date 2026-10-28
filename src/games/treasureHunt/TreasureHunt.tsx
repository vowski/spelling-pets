import { useEffect, useState } from 'react'
import type { Word } from '../../content/types'
import { checkWord } from '../../engine/checker'
import { Button } from '../../ui/Button'
import { LetterDiff } from '../../ui/LetterDiff'
import { TypeAndCheck } from '../../ui/TypeAndCheck'
import { WordDisplay } from '../../ui/WordDisplay'
import { GameFrame } from '../GameFrame'
import type { GameProps } from '../types'
import { useDictation } from '../useDictation'

interface Answer { word: Word; typed: string; correct: boolean }

/**
 * The hunt stays neutral while she types (it's a placement check); at the end she sees every answer next to the right
 * spelling, which helps her remember the right one (feedback after a test), in the app's errorless style.
 */
function HuntAnswers({ answers, onDone }: { answers: Answer[]; onDone: () => void }) {
  return (
    <GameFrame title="Treasure Hunt" emoji="💎" done={answers.length} total={answers.length}>
      <h2>Your Treasure Hunt answers</h2>
      <p>Here are the words you wrote, next to the right spellings.</p>
      <ul aria-label="Your answers" className="hunt-answers">
        {answers.map((a, k) => (
          <li key={`${a.word.id}-${k}`}>
            {a.correct
              ? <span className="hunt-right">✓ {a.word.text}</span>
              : <LetterDiff ops={checkWord(a.word, a.typed).ops} />}
          </li>
        ))}
      </ul>
      <Button size="big" onClick={onDone}>Carry on</Button>
    </GameFrame>
  )
}

export function TreasureHunt({ words, onAttempt, onDone, onComplete }: GameProps) {
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [finished, setFinished] = useState(false)
  const word = words[i]
  const { canSpeak, peeking, replay } = useDictation(finished ? undefined : word)
  // Saved as done as soon as her answers show, so pausing on them never makes her do the hunt again.
  useEffect(() => { if (finished) onComplete?.() }, [finished]) // eslint-disable-line react-hooks/exhaustive-deps
  if (finished) return <HuntAnswers answers={answers} onDone={onDone} />
  if (!word) return null
  if (canSpeak === null) return <p>Getting ready…</p>
  const found = answers.length
  return (
    <GameFrame title="Treasure Hunt" emoji="💎" done={i} total={words.length}>
      <div aria-label={`${found} of ${words.length} treasures found`} style={{ fontSize: 34 }}>
        {words.map((_, k) => (k < found ? '💎' : '🪨')).join(' ')}
      </div>
      <p>Type each word you hear. Every word digs up treasure!</p>
      {canSpeak && <Button variant="secondary" onClick={replay}>🔊 Hear it again</Button>}
      {!canSpeak && peeking && <><p>Look carefully…</p><WordDisplay word={word} /></>}
      {!peeking && (
        <TypeAndCheck key={`${word.id}-${i}`} word={word} feedback="neutral"
          onFirstResult={r => {
            setAnswers(prev => [...prev, { word, typed: r.typed, correct: r.correct }])
            onAttempt({ wordId: word.id, correct: r.correct, firstTry: true, hint: false, typed: r.typed })
          }}
          onFinished={() => (i + 1 < words.length ? setI(i + 1) : setFinished(true))} />
      )}
    </GameFrame>
  )
}
