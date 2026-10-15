import { useServices } from '../app/services'
import { Button } from './Button'

export function SpeakButton({ text, label = 'Read it to me' }: { text: string; label?: string }) {
  const { speaker } = useServices()
  return <Button variant="ghost" aria-label={label} onClick={() => void speaker.speak(text)}>🔊 {label}</Button>
}
