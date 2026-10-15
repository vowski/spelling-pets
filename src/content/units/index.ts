import type { PatternUnitDef } from '../types'
import { Y1_UNITS } from './y1'
import { Y2_UNITS } from './y2'
import { Y3_UNITS } from './y3'
import { Y4_UNITS } from './y4'

export const ALL_UNIT_DEFS: PatternUnitDef[] = [...Y1_UNITS, ...Y2_UNITS, ...Y3_UNITS, ...Y4_UNITS]
