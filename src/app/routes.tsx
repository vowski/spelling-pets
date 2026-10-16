import type { ReactElement } from 'react'
import { Home } from './Home'

export interface AppRoute { path: string; element: ReactElement }

/** Child-side routes. Later tasks append: /session, /extra, /play, /shop, /stickers, /park, /rewards, /parent/*. */
export const CHILD_ROUTES: AppRoute[] = [{ path: '/', element: <Home /> }]
