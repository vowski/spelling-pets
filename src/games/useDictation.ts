import { useEffect, useState } from 'react'
import { useServices } from '../app/services'
import type { Word } from '../content/types'
import { sayWord } from '../speech/voice'
import { useSpeechAvailable } from '../speech/useSpeech'

/** Speaks the word (word → sentence → word) or, with no voice, shows it for `delays.peek` ms first. */
export function useDictation(word: Word | undefined) {
  const { speaker, delays } = useServices()
  const voiceAtStart = useSpeechAvailable()
  // Set when every voice failed while speaking (e.g. offline), so the game switches to Look-and-Cover.
  const [lost, setLost] = useState(false)
  const canSpeak = voiceAtStart === null ? null : voiceAtStart && !lost
  const [peeking, setPeeking] = useState(true)
  useEffect(() => {
    if (!word || canSpeak === null) return
    let live = true
    if (canSpeak) {
      setPeeking(false)
      void sayWord(speaker, word, delays.gap).then(() => { if (live && !speaker.available()) setLost(true) })
      return () => { live = false }
    }
    setPeeking(true)
    const t = setTimeout(() => setPeeking(false), delays.peek)
    return () => clearTimeout(t)
  }, [word, canSpeak, speaker, delays.peek, delays.gap])
  return { canSpeak, peeking, replay: () => word && void sayWord(speaker, word, delays.gap) }
}
