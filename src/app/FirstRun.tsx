import { useState } from 'react'
import { useServices } from './services'
import { Button } from '../ui/Button'
import { SpeakButton } from '../ui/SpeakButton'
import { Egg } from '../pet/Egg'
import { SPECIES, SPECIES_ORDER } from '../pet/species'
import type { PetSpecies } from '../storage/db'
import { hashPin, isValidPin, newSalt } from './pin'

export function FirstRun() {
  const { repo } = useServices()
  const [step, setStep] = useState<'welcome' | 'pin' | 'egg'>('welcome')
  const [childName, setChildName] = useState('')
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [error, setError] = useState('')
  const [species, setSpecies] = useState<PetSpecies | null>(null)
  const [petName, setPetName] = useState('')

  const savePin = () => {
    if (!isValidPin(pin)) return setError('The PIN needs exactly 4 numbers.')
    if (pin !== pin2) return setError("Those PINs don't match. Try again.")
    setError('')
    setStep('egg')
  }
  const finish = async () => {
    if (!species) return
    const pinSalt = newSalt()
    await repo.updateSettings({
      childName: childName.trim(), pinSalt, pinHash: await hashPin(pin, pinSalt),
      petSpecies: species, petName: petName.trim() || SPECIES[species].defaultName, firstRunDone: true,
    })
  }

  return (
    <main className="screen">
      {step === 'welcome' && (
        <section className="card">
          <h1>Welcome to Spelling Pets! 🐾</h1>
          <p>Grown-up, let's get set up. It takes one minute.</p>
          <label>Child's first name (optional)
            <input className="answer-input" aria-label="Child's first name (optional)" value={childName} onChange={e => setChildName(e.target.value)} />
          </label>
          <Button onClick={() => setStep('pin')}>Next</Button>
        </section>
      )}
      {step === 'pin' && (
        <section className="card">
          <h2>Choose a grown-up PIN</h2>
          <p className="muted">4 numbers. You'll need it to open the grown-ups' dashboard.</p>
          <input className="answer-input" type="password" inputMode="numeric" maxLength={4} aria-label="New PIN" value={pin} onChange={e => setPin(e.target.value)} />
          <input className="answer-input" type="password" inputMode="numeric" maxLength={4} aria-label="Type the PIN again" value={pin2} onChange={e => setPin2(e.target.value)} />
          <p className="nudge" role="alert">{error}</p>
          <Button onClick={savePin}>Next</Button>
        </section>
      )}
      {step === 'egg' && (
        <section className="card">
          <h2>Pick your egg!</h2>
          <SpeakButton text="Pick your egg! Which pet will hatch?" />
          <div className="row">
            {SPECIES_ORDER.map(sp => (
              <button key={sp} type="button" aria-label={`${SPECIES[sp].label} egg`} aria-pressed={species === sp}
                onClick={() => setSpecies(sp)} className="btn ghost" style={{ borderColor: species === sp ? 'var(--meadow)' : undefined, borderWidth: 4 }}>
                <Egg species={sp} size={90} wobble={species === sp} />
                <div>{SPECIES[sp].label}</div>
              </button>
            ))}
          </div>
          {species && (
            <>
              <label>Your pet's name
                <input className="answer-input" aria-label="Your pet's name" placeholder={SPECIES[species].defaultName} value={petName} onChange={e => setPetName(e.target.value)} />
              </label>
              <Button size="big" onClick={() => void finish()}>Let's go!</Button>
            </>
          )}
        </section>
      )}
    </main>
  )
}
