import { useState } from 'react'
import { useServices } from '../../app/services'
import { Button } from '../../ui/Button'
import { TypeAndCheck } from '../../ui/TypeAndCheck'
import { WordDisplay } from '../../ui/WordDisplay'
import { GameFrame } from '../GameFrame'
import type { GameProps } from '../types'
import { useDictation } from '../useDictation'

export function PupPost({ activity, words, onAttempt, onDone }: GameProps) {
  const { speaker } = useServices()
  const [i, setI] = useState(0)
  const word = words[i]
  const { canSpeak, peeking, replay } = useDictation(word)

  if (!word) return null
  if (canSpeak === null) return <p>Getting ready…</p>

  const next = () => (i + 1 < words.length ? setI(i + 1) : onDone())
  return (
    <GameFrame title={activity.practiceTest ? 'Practice test for tomorrow!' : 'Pup Post'} emoji="✉️" done={i} total={words.length}>
      {canSpeak ? (
        <div className="row">
          <Button variant="secondary" onClick={replay}>🔊 Hear it again</Button>
          {word.sentence && <Button variant="ghost" onClick={() => void speaker.speak(word.sentence)}>Hear the sentence</Button>}
        </div>
      ) : peeking ? (
        <>
          <p>Look carefully…</p>
          <WordDisplay word={word} />
        </>
      ) : (
        <p>Now type it from memory!</p>
      )}
      {!peeking && (
        <TypeAndCheck
          key={`${word.id}-${i}`}
          word={word}
          onFirstResult={r => onAttempt({ wordId: word.id, correct: r.correct, firstTry: true, hint: false, typed: r.typed })}
          onFinished={next}
        />
      )}
    </GameFrame>
  )
}
