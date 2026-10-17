import { useServices } from '../app/services'
import { useSpeechAvailable } from '../speech/useSpeech'
import { Button } from './Button'

/** Reads an instruction aloud. Hidden with no voice; a click leaves focus where it was (e.g. in the answer box). */
export function SpeakButton({ text, label = 'Read it to me' }: { text: string; label?: string }) {
  const { speaker } = useServices()
  const canSpeak = useSpeechAvailable()
  if (!canSpeak) return null
  return <Button variant="ghost" aria-label={label} onMouseDown={e => e.preventDefault()} onClick={() => void speaker.speak(text)}>🔊 {label}</Button>
}
