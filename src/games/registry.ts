import type { ComponentType } from 'react'
import type { GameType } from '../engine/types'
import { PupPost } from './pupPost/PupPost'
import { TreasureHunt } from './treasureHunt/TreasureHunt'
import type { GameProps } from './types'
import { UnitCheck } from './unitCheck/UnitCheck'
import { Workshop } from './workshop/Workshop'

/** Each game task adds its component here. The SessionRunner skips activities whose game is not registered yet. */
export const GAME_COMPONENTS: Partial<Record<GameType, ComponentType<GameProps>>> = {
  pupPost: PupPost,
  workshop: Workshop,
  treasureHunt: TreasureHunt,
  unitCheck: UnitCheck,
}
