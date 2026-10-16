import type { ReactElement } from 'react'
import { Overview } from './Overview'
import { SettingsTab } from './SettingsTab'

export interface ParentTab { path: string; label: string; order: number; element: ReactElement }

/** Tabs register here; ParentArea sorts by `order`. */
export const PARENT_TABS: ParentTab[] = [
  { path: 'overview', label: 'Overview', order: 1, element: <Overview /> },
  { path: 'settings', label: 'Settings', order: 6, element: <SettingsTab /> },
]
