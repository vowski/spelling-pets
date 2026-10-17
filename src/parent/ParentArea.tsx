import { useEffect } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import { create } from 'zustand'
import { Button } from '../ui/Button'
import { PinGate } from './PinGate'
import { PARENT_TABS } from './tabs'

export const useParentLock = create<{ unlocked: boolean; set: (v: boolean) => void }>(set => ({ unlocked: false, set: v => set({ unlocked: v }) }))

/** Locks the dashboard whenever the app is anywhere outside it, however it was left (back button, Alt+←). */
export function ParentRelock() {
  const { pathname } = useLocation()
  const set = useParentLock(s => s.set)
  useEffect(() => { if (!pathname.startsWith('/parent')) set(false) }, [pathname, set])
  return null
}

export function ParentArea() {
  const { unlocked, set } = useParentLock()
  const navigate = useNavigate()
  if (!unlocked) return <PinGate onUnlock={() => set(true)} />
  const tabs = [...PARENT_TABS].sort((a, b) => a.order - b.order)
  return (
    <main className="screen" style={{ alignItems: 'stretch' }}>
      <div className="parent" style={{ margin: '0 auto' }}>
        <header className="row no-print" style={{ justifyContent: 'space-between' }}>
          <h1>Grown-ups' dashboard</h1>
          <Button variant="ghost" onClick={() => { set(false); navigate('/') }}>Back to child mode</Button>
        </header>
        <nav className="tabs no-print">
          {tabs.filter(t => !t.hidden).map(t => <NavLink key={t.path} to={`/parent/${t.path}`} className={({ isActive }) => (isActive ? 'active' : '')}>{t.label}</NavLink>)}
        </nav>
        <Routes>
          <Route index element={<Navigate to={`/parent/${tabs[0].path}`} replace />} />
          {tabs.map(t => <Route key={t.path} path={`${t.path}/*`} element={t.element} />)}
        </Routes>
      </div>
    </main>
  )
}
