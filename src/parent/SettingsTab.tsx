import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { checkPin, hashPin, isValidPin, newSalt } from '../app/pin'
import { useServices } from '../app/services'
import type { TipService } from '../app/tips'
import { UNLOCK_YEARS, type UnlockYear } from '../engine/types'
import type { SettingsRow } from '../storage/db'
import { Button } from '../ui/Button'

const TIPS_NOTICE = 'Downloads about 0.9 GB once from Hugging Face. After that the AI works offline on this laptop. Tips you play aloud use the voice chosen above. Online voices send the words to Google or Microsoft, just like the spelling words.'
const UNSUPPORTED = "This computer can't run AI tips; she'll keep getting the plain tips."

/** Switch, status and removal for AI spelling tips. Off by default; turning on shows the download notice first. */
function AiTipsPanel({ tips }: { tips: TipService }) {
  const status = useSyncExternalStore(tips.subscribe, tips.status)
  const [confirming, setConfirming] = useState(false)
  useEffect(() => { tips.warmUp() }, [tips])
  const busy = status.kind === 'downloading' || status.kind === 'loading'
  const on = status.kind === 'ready' || busy
  const remove = () => { if (window.confirm('Remove the AI model from this laptop? AI tips will turn off.')) void tips.remove() }
  return (
    <div className="panel">
      <h2>AI spelling tips</h2>
      <p className="muted">After a wrong spelling she sees one short tip explaining the mistake. With AI tips on, a small AI model on this laptop writes the tip from what she actually typed; every AI tip is checked, and a plain tip is shown if a check fails.</p>
      <p>Status:{' '}
        {status.kind === 'off' && <strong>Off</strong>}
        {status.kind === 'downloading' && <><strong>Downloading… {status.percent}%</strong> <progress max={100} value={status.percent} /></>}
        {status.kind === 'loading' && <strong>Getting ready…</strong>}
        {status.kind === 'ready' && <strong>On</strong>}
        {status.kind === 'unsupported' && <><strong>{UNSUPPORTED}</strong> <span className="muted">({status.reason})</span></>}
        {status.kind === 'error' && <strong>Something went wrong: {status.message}</strong>}
      </p>
      {confirming ? (
        <div>
          <p>{TIPS_NOTICE}</p>
          <Button onClick={() => { setConfirming(false); void tips.enable() }}>Download and turn on</Button>{' '}
          <Button variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
        </div>
      ) : (
        <p>
          {on ? <Button variant="secondary" disabled={busy} onClick={() => void tips.disable()}>Turn off</Button>
            : <Button onClick={() => setConfirming(true)}>Turn on AI tips</Button>}{' '}
          <Button variant="ghost" disabled={busy} onClick={remove}>Remove the AI model</Button>
        </p>
      )}
    </div>
  )
}

export function SettingsTab() {
  const { repo, speaker, tips } = useServices()
  const stored = useLiveQuery(() => repo.getSettings(), [repo])
  const [form, setForm] = useState<SettingsRow | null>(null)
  const [saved, setSaved] = useState('')
  const [pins, setPins] = useState({ current: '', next: '', confirm: '' })
  const [pinMsg, setPinMsg] = useState('')
  useEffect(() => { if (stored && !form) setForm(stored) }, [stored, form])
  if (!form) return <p>Loading…</p>
  const set = <K extends keyof SettingsRow>(k: K, v: SettingsRow[K]) => { setForm({ ...form, [k]: v }); setSaved('') }

  const save = async () => {
    const { childName, petName, voiceURI, speechRate, sessionMinutes, newWordsPerDay, soundOn, musicOn, dyslexiaFont } = form
    await repo.updateSettings({ childName, petName, voiceURI, speechRate, sessionMinutes, newWordsPerDay, soundOn, musicOn, dyslexiaFont, highestYear: form.highestYear ?? 3 })
    speaker.configure({ voiceURI: form.voiceURI, rate: form.speechRate })
    setSaved('Saved ✓')
  }
  const changePin = async () => {
    if (!(await checkPin(pins.current, await repo.getSettings()))) return setPinMsg("The current PIN isn't right.")
    if (!isValidPin(pins.next) || pins.next !== pins.confirm) return setPinMsg('The new PIN must be 4 numbers, typed the same twice.')
    const pinSalt = newSalt()
    await repo.updateSettings({ pinSalt, pinHash: await hashPin(pins.next, pinSalt) })
    setPins({ current: '', next: '', confirm: '' })
    setPinMsg('PIN changed ✓')
  }

  return (
    <section>
      <div className="panel">
        <h2>Child and pet</h2>
        <label>Child's name <input aria-label="Child's name" value={form.childName} onChange={e => set('childName', e.target.value)} /></label>{' '}
        <label>Pet's name <input aria-label="Pet's name" value={form.petName} onChange={e => set('petName', e.target.value)} /></label>
      </div>
      <div className="panel">
        <h2>Voice</h2>
        <label>Voice{' '}
          <select aria-label="Voice" value={form.voiceURI ?? ''} onChange={e => set('voiceURI', e.target.value || null)}>
            <option value="">Automatic (best British voice)</option>
            {speaker.voices().map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
          </select>
        </label>{' '}
        <Button variant="secondary" onClick={() => { speaker.configure({ voiceURI: form.voiceURI, rate: form.speechRate }); void speaker.speak("Hello! Let's practise our spellings.") }}>Test voice</Button>
        <p><label>Speaking speed <input aria-label="Speaking speed" type="range" min={0.6} max={1.1} step={0.05} value={form.speechRate} onChange={e => set('speechRate', Number(e.target.value))} /> {form.speechRate.toFixed(2)}</label></p>
        <p className="muted">Voices whose names include "Natural" (Edge) or start with "Google" (Chrome) are online voices: the browser sends the words being spoken, including any tip you play aloud, to Microsoft or Google to create the audio. Other voices work offline.</p>
      </div>
      {tips && <AiTipsPanel tips={tips} />}
      <div className="panel">
        <h2>Practice</h2>
        <label>Session length{' '}
          <select aria-label="Session length" value={form.sessionMinutes} onChange={e => set('sessionMinutes', Number(e.target.value))}>
            {[5, 10, 15, 20].map(m => <option key={m} value={m}>{m} minutes</option>)}
          </select>
        </label>{' '}
        <label>New words per day{' '}
          <select aria-label="New words per day" value={form.newWordsPerDay} onChange={e => set('newWordsPerDay', Number(e.target.value))}>
            {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <p>
          <label>Spelling years{' '}
            <select aria-label="Spelling years" value={form.highestYear ?? 3} onChange={e => set('highestYear', Number(e.target.value) as UnlockYear)}>
              {UNLOCK_YEARS.map(y => <option key={y} value={y}>Up to Year {y}</option>)}
            </select>
          </label>
        </p>
        <p className="muted">Choose the highest school year she practises. Year 4 adds the Year 4 spelling patterns. Year 5 adds the Years 5–6 word list and the Year 5 patterns, and her new words then take turns between the Years 3–4 and Years 5–6 lists. Year 6 adds the Year 6 patterns. Anything she has already started stays in her practice if you choose a lower year.</p>
        <p>
          <label><input type="checkbox" aria-label="Sound effects" checked={form.soundOn} onChange={e => set('soundOn', e.target.checked)} /> Sound effects</label>{' '}
          <label><input type="checkbox" aria-label="Gentle music on the home screen" checked={form.musicOn} onChange={e => set('musicOn', e.target.checked)} /> Gentle music on the home screen</label>{' '}
          <label><input type="checkbox" aria-label="Dyslexia-friendly font" checked={form.dyslexiaFont} onChange={e => set('dyslexiaFont', e.target.checked)} /> Dyslexia-friendly font</label>
        </p>
        <Button onClick={() => void save()}>Save settings</Button> <span>{saved}</span>
      </div>
      <div className="panel">
        <h2>Change PIN</h2>
        <input type="password" inputMode="numeric" maxLength={4} aria-label="Current PIN" value={pins.current} onChange={e => setPins({ ...pins, current: e.target.value })} />{' '}
        <input type="password" inputMode="numeric" maxLength={4} aria-label="New PIN" value={pins.next} onChange={e => setPins({ ...pins, next: e.target.value })} />{' '}
        <input type="password" inputMode="numeric" maxLength={4} aria-label="Confirm new PIN" value={pins.confirm} onChange={e => setPins({ ...pins, confirm: e.target.value })} />{' '}
        <Button onClick={() => void changePin()}>Change PIN</Button>
        <p role="status">{pinMsg}</p>
      </div>
      <div className="panel">
        <h2>About Spelling Pets</h2>
        <p className="muted">Word lists and spelling rules: Department for Education, <em>National Curriculum in England: English Appendix 1 – Spelling</em> (© Crown copyright, Open Government Licence v3.0) and DfES <em>Letters and Sounds</em> (2007). Sticker pictures use this device's emoji. Fonts: Andika and OpenDyslexic (SIL Open Font Licence).</p>
        {tips && <p className="muted">AI tips use Gemma 3 1B by Google, under the Gemma Terms of Use (ai.google.dev/gemma/terms) and the Gemma Prohibited Use Policy.</p>}
      </div>
    </section>
  )
}
