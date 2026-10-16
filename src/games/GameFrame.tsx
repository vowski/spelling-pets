import type { ReactNode } from 'react'
import { ProgressDots } from '../ui/ProgressDots'

export function GameFrame({ title, emoji, done, total, children }: { title: string; emoji: string; done: number; total: number; children: ReactNode }) {
  return (
    <section className="card">
      <header className="row" style={{ width: '100%', justifyContent: 'space-between' }}>
        <h2>{emoji} {title}</h2>
        <ProgressDots done={done} total={total} />
      </header>
      {children}
    </section>
  )
}
