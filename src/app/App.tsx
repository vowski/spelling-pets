import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { HashRouter, Route, Routes } from 'react-router'
import { buildBank } from '../content'
import { createAppServices } from './bootstrap'
import { FirstRun } from './FirstRun'
import { ParentRelock } from '../parent/ParentArea'
import { CHILD_ROUTES } from './routes'
import { ServicesProvider, useServices, type Services } from './services'
import { UpdatePrompt } from './UpdatePrompt'

export default function App({ services }: { services?: Services }) {
  const [base] = useState(() => services ?? createAppServices())
  return (
    <ServicesProvider value={base}>
      <WithLiveBank />
      {!services && <UpdatePrompt />}
    </ServicesProvider>
  )
}

function WithLiveBank() {
  const base = useServices()
  const settings = useLiveQuery(() => base.repo.getSettings(), [base.repo])
  const custom = useLiveQuery(() => base.repo.getCustomWords(), [base.repo])
  const bank = useMemo(() => (custom && custom.length ? buildBank(custom) : base.bank), [custom, base.bank])
  const services = useMemo(() => ({ ...base, bank }), [base, bank])

  useEffect(() => {
    if (!settings) return
    base.speaker.configure({ voiceURI: settings.voiceURI, rate: settings.speechRate })
    base.sfx.setEnabled(settings.soundOn)
  }, [settings, base])

  if (!settings || !custom) return <main className="screen"><p>Loading…</p></main>
  return (
    <ServicesProvider value={services}>
      <div data-font={settings.dyslexiaFont ? 'dyslexic' : undefined} style={{ minHeight: '100%' }}>
        {!settings.firstRunDone ? <FirstRun /> : (
          <HashRouter>
            <ParentRelock />
            <Routes>
              {CHILD_ROUTES.map(r => <Route key={r.path} path={r.path} element={r.element} />)}
            </Routes>
          </HashRouter>
        )}
      </div>
    </ServicesProvider>
  )
}
