import type { ReactElement } from 'react'
import { Home } from './Home'
import { SessionRunner } from './SessionRunner'

export interface AppRoute { path: string; element: ReactElement }

/** Child-side routes. Later tasks append: /play, /shop, /stickers, /park, /rewards, /parent/*. */
export const CHILD_ROUTES: AppRoute[] = [
  { path: '/', element: <Home /> },
  { path: '/session', element: <SessionRunner kind="main" /> },
  { path: '/extra', element: <SessionRunner kind="extra" /> },
]
