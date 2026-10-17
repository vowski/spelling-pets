import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useServices } from '../../app/services'
import { useSpeechAvailable } from '../../speech/useSpeech'
import { sayWord } from '../../speech/voice'
import { Button } from '../../ui/Button'
import { TypeAndCheck } from '../../ui/TypeAndCheck'
import { WordDisplay } from '../../ui/WordDisplay'
import { GameFrame } from '../GameFrame'
import type { GameProps } from '../types'

type Step = 'pretest' | 'look' | 'say' | 'write'

export function Workshop({ words, onAttempt, onDone }: GameProps) {
  const { speaker, delays } = useServices()
  const canSpeak = useSpeechAvailable()
  const [i, setI] = useState(0)
  const [step, setStep] = useState<Step>('pretest')
  const [streak, setStreak] = useState(0)
  const [round, setRound] = useState(0)
  const pretestRight = useRef(false)
  const writeRight = useRef(false)
  const word = words[i]

  useEffect(() => {
    if (word) void sayWord(speaker, word, delays.gap)
  }, [word, speaker, delays.gap])

  if (!word) return null
  if (canSpeak === null) return <p>Getting ready…</p>
  // With no voice she can't know the word yet, so skip the pretest and teach it.
  const shown: Step = step === 'pretest' && !canSpeak ? 'look' : step

  const nextWord = () => {
    setStreak(0)
    setRound(r => r + 1)
    setStep('pretest')
    if (i + 1 < words.length) setI(i + 1)
    else onDone()
  }
  const hear = canSpeak ? <Button variant="secondary" onClick={() => void sayWord(speaker, word, delays.gap)}>🔊 Hear it</Button> : null

  return (
    <GameFrame title="Word Workshop" emoji="🛠️" done={i} total={words.length}>
      {shown === 'pretest' && (
        <>
          <p>Have a go first! Can you spell it already?</p>
          {hear}
          <TypeAndCheck key={`pre-${word.id}-${round}`} word={word} feedback="pretest"
            onFirstResult={r => { pretestRight.current = r.correct; onAttempt({ wordId: word.id, correct: r.correct, firstTry: true, hint: false, typed: r.typed, role: 'pretest' }) }}
            onFinished={() => (pretestRight.current ? nextWord() : setStep('look'))} />
        </>
      )}
      {shown === 'look' && (
        <>
          <h3>Look</h3>
          <WordDisplay word={word} syllables />
          {word.tricky.length > 0 && <p>The yellow part is the tricky bit.</p>}
          {word.sentence && <p className="muted">{word.sentence}</p>}
          <div className="row">{hear}<Button onClick={() => setStep('say')}>Next</Button></div>
        </>
      )}
      {shown === 'say' && (
        <>
          <h3>Say</h3>
          <p>Say it out loud, then clap the beats: <strong>{word.syllables.join(' – ')}</strong></p>
          <div className="row">{hear}<Button onClick={() => setStep('write')}>I said it!</Button></div>
        </>
      )}
      {shown === 'write' && (
        <>
          <h3>Cover and write</h3>
          <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ fontSize: 64 }} aria-hidden="true">🐾</motion.div>
          {streak === 1 && <p>Great! Once more from memory.</p>}
          <TypeAndCheck key={`w-${word.id}-${round}`} word={word}
            onFirstResult={r => { writeRight.current = r.correct }}
            onFinished={() => {
              if (writeRight.current && streak + 1 >= 2) {
                onAttempt({ wordId: word.id, correct: true, firstTry: true, hint: false, role: 'teach' })
                nextWord()
                return
              }
              setStreak(writeRight.current ? streak + 1 : 0)
              setRound(r => r + 1)
            }} />
          <Button variant="ghost" onClick={() => { setStreak(0); setStep('look') }}>👀 Peek</Button>
        </>
      )}
    </GameFrame>
  )
}
