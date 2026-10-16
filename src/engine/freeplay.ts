import type { Bank } from '../content'
import { itemCount, type Activity } from './planner'
import { makeRng, sample } from './rng'
import { isDue } from './scheduler'
import { getProgress, type GameType, type LearnerState } from './types'

export const FREE_PLAY_GAMES: readonly GameType[] = ['pupPost', 'storyTime', 'wheel', 'wombat', 'bunnyHop', 'burrow', 'bubblePop', 'sortPen', 'builder', 'hedgehog']
export interface FreePlayOption { game: GameType; available: boolean; reason?: string }

const UNIT_KIND: Partial<Record<GameType, 'sort' | 'builder' | 'homophone'>> = { sortPen: 'sort', builder: 'builder', hedgehog: 'homophone' }

function metWords(bank: Bank, state: LearnerState): string[] {
  const rank = (p: ReturnType<typeof getProgress>) => (isDue(p, state.today) ? 0 : p.box <= 2 ? 1 : 2)
  return [...state.progress.values()]
    .filter(p => p.box >= 1 && bank.words.has(p.wordId))
    .sort((a, b) => rank(a) - rank(b) || (a.lastSeenAt ?? 0) - (b.lastSeenAt ?? 0) || a.wordId.localeCompare(b.wordId))
    .map(p => p.wordId)
}

export function planFreePlay(bank: Bank, state: LearnerState, game: GameType, opts: { seed: number; wheelAnchors: ReadonlySet<string> }): Activity | null {
  const id = `free-${game}-${opts.seed}`
  const kind = UNIT_KIND[game]
  if (kind) {
    const unit = [...state.units.values()]
      .filter(u => u.status !== 'checking' && bank.unitById.get(u.unitId)?.game.kind === kind)
      .sort((a, b) => b.startedOn.localeCompare(a.startedOn))[0]
    return unit ? { id, gameType: game, wordIds: [...bank.unitById.get(unit.unitId)!.wordIds], unitId: unit.unitId } : null
  }
  const met = metWords(bank, state)
  if (game === 'storyTime') {
    const ok = bank.sentences.filter(s => s.wordIds.every(w => getProgress(state, w).box >= 1))
    const picked = sample(ok, 3, makeRng(opts.seed))
    return picked.length ? { id, gameType: game, wordIds: [...new Set(picked.flatMap(s => s.wordIds))], sentenceIds: picked.map(s => s.id) } : null
  }
  if (game === 'wheel') {
    const anchor = met.find(w => opts.wheelAnchors.has(w))
    return anchor ? { id, gameType: game, wordIds: [anchor] } : null
  }
  const pool = game === 'burrow' ? met.filter(w => (bank.words.get(w)?.tricky.length ?? 0) > 0) : met
  const words = pool.slice(0, itemCount(game, 10))
  return words.length ? { id, gameType: game, wordIds: words } : null
}

export function freePlayOptions(bank: Bank, state: LearnerState, wheelAnchors: ReadonlySet<string>): FreePlayOption[] {
  return FREE_PLAY_GAMES.map(game => {
    if (planFreePlay(bank, state, game, { seed: 1, wheelAnchors })) return { game, available: true }
    const reason = UNIT_KIND[game] ? 'Finish a spelling pattern first' : game === 'wheel' && [...state.progress.values()].some(p => p.box >= 1) ? 'No puzzle for your words yet' : 'Learn some words first'
    return { game, available: false, reason }
  })
}
