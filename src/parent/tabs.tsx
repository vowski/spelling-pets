import type { ReactElement } from 'react'
import { SettingsTab } from './SettingsTab'

export interface ParentTab { path: string; label: string; order: number; element: ReactElement }

/** Tabs register here; ParentArea sorts by `order`. */
export const PARENT_TABS: ParentTab[] = [{ path: 'settings', label: 'Settings', order: 6, element: <SettingsTab /> }]
