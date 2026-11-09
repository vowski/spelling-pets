import type { Band } from '../content/standards'
import type { GridBand } from '../engine/standards-eval'

export const BAND_LABEL: Record<GridBand, string> = { notYet: 'Not yet', towards: 'Working towards', at: 'Working at', greaterDepth: 'Greater depth' }
export const BANDS: Band[] = ['towards', 'at', 'greaterDepth']
