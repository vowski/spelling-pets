import type { ReactElement } from 'react'
import { DataTab } from './DataTab'
import { Overview } from './Overview'
import { PrintSheet } from './PrintSheet'
import { RewardsTab } from './RewardsTab'
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
  { path: 'rewards', label: 'Rewards', order: 5, element: <RewardsTab /> },
  { path: 'settings', label: 'Settings', order: 6, element: <SettingsTab /> },
  { path: 'data', label: 'Data', order: 7, element: <DataTab /> },
  { path: 'print', label: 'Print', order: 99, hidden: true, element: <PrintSheet /> },
]
