import type { ReactElement } from 'react'
import { Overview } from './Overview'
import { PrintSheet } from './PrintSheet'
import { SchoolWordsTab } from './SchoolWordsTab'
import { SettingsTab } from './SettingsTab'
import { StandardsTab } from './StandardsTab'
import { WordsTab } from './WordsTab'

export interface ParentTab { path: string; label: string; order: number; element: ReactElement; hidden?: boolean }

/** Tabs register here; ParentArea sorts by `order`. */
export const PARENT_TABS: ParentTab[] = [
  { path: 'overview', label: 'Overview', order: 1, element: <Overview /> },
  { path: 'standards', label: 'School Standards', order: 2, element: <StandardsTab /> },
  { path: 'words', label: 'Words', order: 3, element: <WordsTab /> },
  { path: 'school', label: 'School Words', order: 4, element: <SchoolWordsTab /> },
  { path: 'settings', label: 'Settings', order: 6, element: <SettingsTab /> },
  { path: 'print', label: 'Print', order: 99, hidden: true, element: <PrintSheet /> },
]
