import type { Bank } from '../content'
import type { PatternUnit, StorySentence } from '../content/types'
import { dayNumber } from './dates'
import { buildPlacementPlan, isPlacementDone, nextPlacementChunk } from './placement'
import { learningWords, practiceTestList, reviewCandidates, winWord } from './priority'
import { makeRng, pick, sample, shuffle, type Rng } from './rng'
import { chooseNewMaterial, type NewMaterial } from './streams'
import { getProgress, type GameType, type LearnerState, type PlacementLevelState, type Role } from './types'

export interface GameMeta { role: Role; secondsPerItem: number; label: string; emoji: string; intro: string }

export const GAME_META: Record<GameType, GameMeta> = {
  workshop: { role: 'teach', secondsPerItem: 45, label: 'Word Workshop', emoji: '🛠️', intro: "Let's learn some new words!" },
  pupPost: { role: 'recall', secondsPerItem: 15, label: 'Pup Post', emoji: '✉️', intro: 'Listen carefully, then type the word.' },
  storyTime: { role: 'recall', secondsPerItem: 35, label: 'Story Time', emoji: '📖', intro: 'Listen to the sentence, then type it. Remember your capital letter and full stop!' },
  wheel: { role: 'build', secondsPerItem: 150, label: 'Word Wheel', emoji: '🎡', intro: 'Join the letters to make words and fill the puzzle.' },
  wombat: { role: 'recognise', secondsPerItem: 8, label: 'Which Way Wombat?', emoji: '🐾', intro: 'Which one is spelt the right way?' },
  bunnyHop: { role: 'build', secondsPerItem: 15, label: 'Bunny Hop', emoji: '🐰', intro: 'Put the letters in the right order.' },
  burrow: { role: 'build', secondsPerItem: 12, label: 'Fill the Burrow', emoji: '🕳️', intro: 'Fill in the missing letters.' },
  sortPen: { role: 'pattern', secondsPerItem: 8, label: 'Sort the Pen', emoji: '🐑', intro: 'Drag each word into the right pen.' },
  builder: { role: 'pattern', secondsPerItem: 15, label: 'Word Builder', emoji: '🧱', intro: 'Join the parts to build a new word.' },
  hedgehog: { role: 'pattern', secondsPerItem: 12, label: 'Homophone Hedgehog', emoji: '🦔', intro: 'Pick the word that fits the sentence.' },
  bubblePop: { role: 'build', secondsPerItem: 20, label: 'Bubble Pop', emoji: '🫧', intro: 'Pop the letters in the right order!' },
  treasureHunt: { role: 'placement', secondsPerItem: 15, label: 'Treasure Hunt', emoji: '💎', intro: 'Type each word you hear to dig up treasure!' },
  unitCheck: { role: 'recall', secondsPerItem: 15, label: 'Quick Check', emoji: '⭐', intro: "Let's see what you already know!" },
}

export const PLAY_GAMES: readonly GameType[] = ['wombat', 'bunnyHop', 'burrow', 'bubblePop', 'wheel']

export interface Activity {
  id: string
  gameType: GameType
  wordIds: string[]
  unitId?: string
  unitDay?: 1 | 2
  sentenceIds?: string[]
  practiceTest?: boolean
  onlyIfUnitNotKnown?: boolean
  finale?: boolean
  practiceOnly?: boolean
}

export interface SessionPlan {
  kind: 'placement' | 'normal' | 'extra'
  activities: Activity[]
  newMaterial: NewMaterial
  placementInit?: PlacementLevelState[]
}

export interface PlannerOptions {
  seed: number
  wheelAnchors: ReadonlySet<string>
  extra?: boolean
}

const PLAY_SECONDS = 180

export function itemCount(game: GameType, sessionMinutes: number): number {
  const seconds = PLAY_SECONDS * (sessionMinutes / 10)
  return Math.min(10, Math.max(3, Math.round(seconds / GAME_META[game].secondsPerItem)))
}

export function unitGameType(unit: PatternUnit): GameType {
  switch (unit.game.kind) {
    case 'sort': return 'sortPen'
    case 'builder': return 'builder'
    case 'homophone': return 'hedgehog'
    case 'spell': return 'bunnyHop'
  }
}

export function choosePlayGame(
  bank: Bank, state: LearnerState, pool: readonly string[], last: GameType | null,
  wheelAnchors: ReadonlySet<string>, rng: Rng,
): GameType | null {
  if (!pool.length) return null
  const eligible = PLAY_GAMES.filter(g =>
    g !== last &&
    (g !== 'wheel' || pool.some(id => wheelAnchors.has(id))) &&
    (g !== 'burrow' || pool.some(id => (bank.words.get(id)?.tricky.length ?? 0) > 0)))
  if (!eligible.length) return null
  const age = (g: GameType) => {
    const i = state.recentGames.indexOf(g)
    return i === -1 ? Number.MAX_SAFE_INTEGER : i
  }
  const oldest = Math.max(...eligible.map(age))
  return pick(eligible.filter(g => age(g) === oldest), rng) ?? null
}

function playWords(bank: Bank, game: GameType, pool: readonly string[], anchors: ReadonlySet<string>, minutes: number): string[] {
  if (game === 'wheel') return pool.filter(id => anchors.has(id)).slice(0, 1)
  const usable = game === 'burrow' ? pool.filter(id => (bank.words.get(id)?.tricky.length ?? 0) > 0) : pool
  return usable.slice(0, itemCount(game, minutes))
}

function pickSentences(bank: Bank, state: LearnerState, reviewIds: readonly string[], n: number, rng: Rng): StorySentence[] {
  const wanted = new Set(reviewIds)
  const eligible = bank.sentences.filter(s =>
    s.wordIds.some(id => wanted.has(id)) && s.wordIds.every(id => getProgress(state, id).box >= 1))
  return shuffle(eligible, rng)
    .sort((a, b) => b.wordIds.filter(id => wanted.has(id)).length - a.wordIds.filter(id => wanted.has(id)).length)
    .slice(0, n)
}

export function planSession(bank: Bank, state: LearnerState, opts: PlannerOptions): SessionPlan {
  const rng = makeRng(opts.seed)
  const minutes = state.settings.sessionMinutes
  const acts: Activity[] = []
  const push = (a: Omit<Activity, 'id'>) => {
    if (a.wordIds.length) acts.push({ id: `a${acts.length + 1}`, ...a })
  }
  const lastGame = () => acts.at(-1)?.gameType ?? null

  // Placement
  const placementInit = state.placement.length === 0 ? buildPlacementPlan(bank, opts.seed) : undefined
  const levels = placementInit ?? state.placement
  if (!isPlacementDone(levels)) {
    const chunk = nextPlacementChunk(levels)
    if (chunk.length) {
      push({ gameType: 'treasureHunt', wordIds: chunk })
      push({ gameType: dayNumber(state.today) % 2 ? 'bubblePop' : 'wombat', wordIds: chunk.slice(0, 5), practiceOnly: true })
      return { kind: 'placement', activities: acts, newMaterial: { kind: 'none' }, placementInit }
    }
  }

  const extra = opts.extra === true

  // 1. Warm-up
  const practice = extra ? null : practiceTestList(state)
  if (practice) {
    push({ gameType: 'pupPost', wordIds: [...new Set(practice.items.map(i => i.wordId))].filter(id => bank.words.has(id)), practiceTest: true })
  } else {
    const review = reviewCandidates(bank, state, Math.max(3, Math.round(6 * (minutes / 10))))
    const sentences = dayNumber(state.today) % 2 === 1 ? pickSentences(bank, state, review, 3, rng) : []
    if (sentences.length) {
      push({ gameType: 'storyTime', wordIds: [...new Set(sentences.flatMap(s => s.wordIds))], sentenceIds: sentences.map(s => s.id) })
    } else {
      push({ gameType: 'pupPost', wordIds: review })
    }
  }

  // 2. Learn
  const nm: NewMaterial = extra ? { kind: 'none' } : chooseNewMaterial(bank, state, state.settings.newWordsPerDay)
  let taught: string[] = []
  if (nm.kind === 'unit') {
    const unit = bank.unitById.get(nm.unitId)!
    const conditional = nm.day === 1
    if (nm.day === 1) push({ gameType: 'unitCheck', wordIds: sample(unit.wordIds, 3, rng), unitId: unit.id, unitDay: 1 })
    push({ gameType: 'workshop', wordIds: nm.wordIds, unitId: unit.id, unitDay: nm.day, onlyIfUnitNotKnown: conditional })
    push({ gameType: unitGameType(unit), wordIds: [...unit.wordIds], unitId: unit.id, unitDay: nm.day, onlyIfUnitNotKnown: conditional })
    taught = nm.wordIds
  } else if (nm.kind === 'words') {
    push({ gameType: 'workshop', wordIds: nm.wordIds })
    taught = nm.wordIds
  }

  // 3. Play (words days)
  if (nm.kind !== 'unit') {
    const pool = [...new Set([...taught, ...learningWords(state, 10)])]
    const game = choosePlayGame(bank, state, pool, lastGame(), opts.wheelAnchors, rng)
    if (game) push({ gameType: game, wordIds: playWords(bank, game, pool, opts.wheelAnchors, minutes) })
  }

  // 4. Quick check
  if (taught.length) {
    push({
      gameType: 'pupPost', wordIds: [...taught], onlyIfUnitNotKnown: nm.kind === 'unit' && nm.day === 1,
      ...(nm.kind === 'unit' ? { unitId: nm.unitId } : {}),
    })
  }

  // 5. Finale
  const used = new Set(acts.flatMap(a => a.wordIds))
  const win = winWord(state, used)
  const last = acts.at(-1)
  if (win) {
    if (last && last.gameType === 'pupPost' && !last.onlyIfUnitNotKnown && !last.practiceTest) last.wordIds.push(win)
    else push({ gameType: lastGame() === 'wombat' ? 'bunnyHop' : 'wombat', wordIds: [win], finale: true })
  }

  if (!acts.length) push({ gameType: 'bubblePop', wordIds: bank.setIds.y1cew.slice(0, 5), practiceOnly: true })

  return { kind: extra ? 'extra' : 'normal', activities: acts, newMaterial: nm }
}
