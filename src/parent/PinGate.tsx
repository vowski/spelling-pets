import { useState, type FormEvent } from 'react'
import { hashPin, isValidPin, newSalt, checkPin } from '../app/pin'
import { useServices } from '../app/services'
import { Button } from '../ui/Button'

export function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const { repo } = useServices()
  const [mode, setMode] = useState<'pin' | 'question' | 'reset'>('pin')
  const [pin, setPin] = useState('')
  const [answer, setAnswer] = useState('')
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [error, setError] = useState('')
  const [q] = useState(() => ({ a: 11 + Math.floor(Math.random() * 30), b: 11 + Math.floor(Math.random() * 20) }))

  const submitPin = async (e: FormEvent) => {
    e.preventDefault()
    if (await checkPin(pin, await repo.getSettings())) onUnlock()
    else setError("That PIN isn't right.")
  }
  const submitAnswer = (e: FormEvent) => {
    e.preventDefault()
    if (Number(answer) === q.a * q.b) { setError(''); setMode('reset') } else setError("That's not right. Try again.")
  }
  const reset = async () => {
    if (!isValidPin(p1)) return setError('The PIN needs exactly 4 numbers.')
    if (p1 !== p2) return setError("Those PINs don't match.")
    const pinSalt = newSalt()
    await repo.updateSettings({ pinSalt, pinHash: await hashPin(p1, pinSalt) })
    onUnlock()
  }

  return (
    <div className="parent panel" style={{ maxWidth: 420, margin: '60px auto' }}>
      <h1>Grown-ups only 🔒</h1>
      {mode === 'pin' && (
        <form onSubmit={e => void submitPin(e)}>
          <label>Grown-up PIN <input type="password" inputMode="numeric" maxLength={4} aria-label="Grown-up PIN" value={pin} onChange={e => setPin(e.target.value)} autoFocus /></label>
          <div className="row" style={{ justifyContent: 'flex-start', marginTop: 12 }}>
            <Button type="submit">Open dashboard</Button>
            <Button variant="ghost" onClick={() => { setMode('question'); setError('') }}>Forgot PIN?</Button>
          </div>
        </form>
      )}
      {mode === 'question' && (
        <form onSubmit={submitAnswer}>
          <p>What is {q.a} × {q.b}?</p>
          <input aria-label="Answer" inputMode="numeric" value={answer} onChange={e => setAnswer(e.target.value)} autoFocus />
          <Button type="submit">Check</Button>
        </form>
      )}
      {mode === 'reset' && (
        <div>
          <input type="password" inputMode="numeric" maxLength={4} aria-label="New PIN" value={p1} onChange={e => setP1(e.target.value)} />
          <input type="password" inputMode="numeric" maxLength={4} aria-label="Type the PIN again" value={p2} onChange={e => setP2(e.target.value)} />
          <Button onClick={() => void reset()}>Set a new PIN</Button>
        </div>
      )}
      <p role="alert" style={{ color: '#b3261e' }}>{error}</p>
    </div>
  )
}
