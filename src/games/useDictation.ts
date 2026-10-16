import { useEffect, useState } from 'react'
import { useServices } from '../app/services'
import type { Word } from '../content/types'
import { sayWord } from '../speech/voice'
import { useSpeechAvailable } from '../speech/useSpeech'

/** Speaks the word (word → sentence → word) or, with no voice, shows it for `delays.peek` ms first. */
export function useDictation(word: Word | undefined) {
  const { speaker, delays } = useServices()
  const canSpeak = useSpeechAvailable()
  const [peeking, setPeeking] = useState(true)
  useEffect(() => {
    if (!word || canSpeak === null) return
    if (canSpeak) { setPeeking(false); void sayWord(speaker, word, delays.gap); return }
    setPeeking(true)
    const t = setTimeout(() => setPeeking(false), delays.peek)
    return () => clearTimeout(t)
  }, [word, canSpeak, speaker, delays.peek, delays.gap])
  return { canSpeak, peeking, replay: () => word && void sayWord(speaker, word, delays.gap) }
}
