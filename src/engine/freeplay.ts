import type { Bank } from '../content'
import { itemCount, type Activity } from './planner'
import { makeRng, sample, shuffle } from './rng'
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

/** Tricky words (3+ letters, Year 1 by default) for games before she has met words of her own. */
function starterWords(bank: Bank, seed: number, sets: readonly ('y1cew' | 'y2cew' | 'hfw')[] = ['y1cew']): string[] {
  const rng = makeRng(seed)
  return sets.flatMap(set => shuffle(bank.setIds[set].filter(id => (bank.words.get(id)?.text.length ?? 0) >= 3), rng))
}

/**
 * Free Play always has something to play. Her own words and patterns come first; until she has any,
 * a game uses a starter set marked practiceOnly, so it earns coins but never changes her learning boxes.
 */
export function planFreePlay(bank: Bank, state: LearnerState, game: GameType, opts: { seed: number; wheelAnchors: ReadonlySet<string> }): Activity | null {
  const id = `free-${game}-${opts.seed}`
  const kind = UNIT_KIND[game]
  if (kind) {
    const unit = [...state.units.values()]
      .filter(u => u.status !== 'checking' && bank.unitById.get(u.unitId)?.game.kind === kind)
      .sort((a, b) => b.startedOn.localeCompare(a.startedOn))[0]
    if (unit) return { id, gameType: game, wordIds: [...bank.unitById.get(unit.unitId)!.wordIds], unitId: unit.unitId }
    const ofKind = bank.units.filter(u => u.game.kind === kind)
    const easiest = ofKind.filter(u => u.year === Math.min(...ofKind.map(x => x.year)))
    const starter = sample(easiest, 1, makeRng(opts.seed))[0]
    return starter ? { id, gameType: game, wordIds: [...starter.wordIds], unitId: starter.id, practiceOnly: true } : null
  }
  const met = metWords(bank, state)
  if (game === 'storyTime') {
    const ok = bank.sentences.filter(s => s.wordIds.every(w => getProgress(state, w).box >= 1))
    const picked = sample(ok, 3, makeRng(opts.seed))
    if (picked.length) return { id, gameType: game, wordIds: [...new Set(picked.flatMap(s => s.wordIds))], sentenceIds: picked.map(s => s.id) }
    const easy = sample(bank.sentences.filter(s => s.level === 1), 3, makeRng(opts.seed))
    return easy.length ? { id, gameType: game, wordIds: [...new Set(easy.flatMap(s => s.wordIds))], sentenceIds: easy.map(s => s.id), practiceOnly: true } : null
  }
  if (game === 'wheel') {
    const anchor = met.find(w => opts.wheelAnchors.has(w))
    if (anchor) return { id, gameType: game, wordIds: [anchor] }
    const starter = starterWords(bank, opts.seed, ['y1cew', 'hfw', 'y2cew']).find(w => opts.wheelAnchors.has(w))
    return starter ? { id, gameType: game, wordIds: [starter], practiceOnly: true } : null
  }
  const usable = (ids: string[]) => (game === 'burrow' ? ids.filter(w => (bank.words.get(w)?.tricky.length ?? 0) > 0) : ids)
  const own = usable(met).slice(0, itemCount(game, 10))
  if (own.length) return { id, gameType: game, wordIds: own }
  const starter = usable(starterWords(bank, opts.seed)).slice(0, itemCount(game, 10))
  return starter.length ? { id, gameType: game, wordIds: starter, practiceOnly: true } : null
}

export function freePlayOptions(bank: Bank, state: LearnerState, wheelAnchors: ReadonlySet<string>): FreePlayOption[] {
  return FREE_PLAY_GAMES.map(game => {
    if (planFreePlay(bank, state, game, { seed: 1, wheelAnchors })) return { game, available: true }
    const reason = UNIT_KIND[game] ? 'Finish a spelling pattern first' : game === 'wheel' && [...state.progress.values()].some(p => p.box >= 1) ? 'No puzzle for your words yet' : 'Learn some words first'
    return { game, available: false, reason }
  })
}
