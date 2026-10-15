import type { SetId } from './types'

export type StickerSetId = 'farm' | 'woodland' | 'ocean' | 'jungle' | 'pets' | 'minibeasts'
export interface StickerDef { id: string; set: StickerSetId; name: string; emoji: string }

export const STICKER_SETS: { id: StickerSetId; name: string }[] = [
  { id: 'farm', name: 'Farm' }, { id: 'woodland', name: 'Woodland' }, { id: 'ocean', name: 'Ocean' },
  { id: 'jungle', name: 'Jungle' }, { id: 'pets', name: 'Pets' }, { id: 'minibeasts', name: 'Minibeasts' },
]

const set = (s: StickerSetId, items: [string, string][]): StickerDef[] =>
  items.map(([name, emoji]) => ({ id: `${s}-${name.toLowerCase().replace(/\s+/g, '-')}`, set: s, name, emoji }))

export const STICKERS: StickerDef[] = [
  ...set('farm', [['Cow', '🐄'], ['Pig', '🐖'], ['Sheep', '🐑'], ['Goat', '🐐'], ['Rooster', '🐓'], ['Horse', '🐴'], ['Duck', '🦆'], ['Turkey', '🦃'], ['Ox', '🐂'], ['Chick', '🐤']]),
  ...set('woodland', [['Fox', '🦊'], ['Hedgehog', '🦔'], ['Owl', '🦉'], ['Squirrel', '🐿️'], ['Deer', '🦌'], ['Bear', '🐻'], ['Badger', '🦡'], ['Wolf', '🐺'], ['Frog', '🐸'], ['Snail', '🐌']]),
  ...set('ocean', [['Dolphin', '🐬'], ['Whale', '🐳'], ['Octopus', '🐙'], ['Crab', '🦀'], ['Tropical Fish', '🐠'], ['Turtle', '🐢'], ['Seal', '🦭'], ['Shark', '🦈'], ['Lobster', '🦞'], ['Squid', '🦑']]),
  ...set('jungle', [['Monkey', '🐒'], ['Lion', '🦁'], ['Tiger', '🐯'], ['Elephant', '🐘'], ['Giraffe', '🦒'], ['Zebra', '🦓'], ['Parrot', '🦜'], ['Snake', '🐍'], ['Hippo', '🦛'], ['Sloth', '🦥']]),
  ...set('pets', [['Puppy', '🐶'], ['Kitten', '🐱'], ['Hamster', '🐹'], ['Bunny', '🐰'], ['Mouse', '🐭'], ['Goldfish', '🐟'], ['Lizard', '🦎'], ['Budgie', '🐦'], ['Poodle', '🐩'], ['Black Cat', '🐈‍⬛']]),
  ...set('minibeasts', [['Bee', '🐝'], ['Ladybird', '🐞'], ['Butterfly', '🦋'], ['Caterpillar', '🐛'], ['Ant', '🐜'], ['Spider', '🕷️'], ['Cricket', '🦗'], ['Beetle', '🪲'], ['Worm', '🪱'], ['Fly', '🪰']]),
]

export type NumericMetric = 'placementDone' | 'secureTotal' | 'weeklyGoalsMet' | 'wheelThreeStars' | 'bonusWords' | 'perfectStoryTimes' | 'punctuationSentences'
export interface BadgeDef { id: string; name: string; emoji: string; description: string; metric?: NumericMetric; atLeast?: number }

export const BADGES: BadgeDef[] = [
  { id: 'hunt-done', name: 'Treasure Hunter', emoji: '💎', description: 'Finished the Treasure Hunt', metric: 'placementDone', atLeast: 1 },
  { id: 'secure-1', name: 'First Word', emoji: '🌱', description: 'Your first Secure word', metric: 'secureTotal', atLeast: 1 },
  { id: 'secure-10', name: 'Ten Words', emoji: '🌿', description: '10 Secure words', metric: 'secureTotal', atLeast: 10 },
  { id: 'secure-50', name: 'Fifty Words', emoji: '🌳', description: '50 Secure words', metric: 'secureTotal', atLeast: 50 },
  { id: 'secure-100', name: 'Hundred Club', emoji: '🏆', description: '100 Secure words', metric: 'secureTotal', atLeast: 100 },
  { id: 'secure-200', name: 'Word Wizard', emoji: '🧙', description: '200 Secure words', metric: 'secureTotal', atLeast: 200 },
  { id: 'week-1', name: 'Great Week', emoji: '📅', description: 'Met your weekly goal', metric: 'weeklyGoalsMet', atLeast: 1 },
  { id: 'week-5', name: 'Super Streak', emoji: '🔥', description: 'Met your weekly goal 5 times', metric: 'weeklyGoalsMet', atLeast: 5 },
  { id: 'week-10', name: 'Unstoppable', emoji: '🚀', description: 'Met your weekly goal 10 times', metric: 'weeklyGoalsMet', atLeast: 10 },
  { id: 'perfect-story', name: 'Perfect Story', emoji: '📖', description: 'A perfect Story Time sentence', metric: 'perfectStoryTimes', atLeast: 1 },
  { id: 'punctuation-pro', name: 'Punctuation Pro', emoji: '✏️', description: '10 sentences with a capital letter and full stop', metric: 'punctuationSentences', atLeast: 10 },
  { id: 'wheel-stars-10', name: 'Wheel Star', emoji: '🎡', description: '3 stars on 10 Word Wheels', metric: 'wheelThreeStars', atLeast: 10 },
  { id: 'bonus-hunter', name: 'Bonus Hunter', emoji: '🔎', description: 'Found 25 bonus words', metric: 'bonusWords', atLeast: 25 },
  ...STICKER_SETS.map(s => ({ id: `album-${s.id}`, name: `${s.name} Collector`, emoji: '📒', description: `Collected every ${s.name} sticker` })),
]

export type FriendCondition = { kind: 'setComplete'; set: SetId } | { kind: 'setSecure'; set: SetId; count: number } | { kind: 'units'; count: number }
export interface FriendDef { id: string; name: string; emoji: string; condition: FriendCondition; reason: string }

const unitFriends: [string, string][] = [
  ['Penny the Penguin', '🐧'], ['Coco the Koala', '🐨'], ['Otto the Otter', '🦦'], ['Splash the Dolphin', '🐬'],
  ['Kiwi the Parrot', '🦜'], ['Ribbit the Frog', '🐸'], ['Flo the Flamingo', '🦩'], ['Buzz the Bee', '🐝'],
  ['Flutter the Butterfly', '🦋'], ['Dotty the Ladybird', '🐞'], ['Bubbles the Whale', '🐳'], ['Snooze the Sloth', '🦥'],
]

export const FRIENDS: FriendDef[] = [
  { id: 'friend-y1cew', name: 'Tilly the Tortoise', emoji: '🐢', condition: { kind: 'setComplete', set: 'y1cew' }, reason: 'all Year 1 tricky words Secure' },
  { id: 'friend-days', name: 'Ollie the Owl', emoji: '🦉', condition: { kind: 'setComplete', set: 'days' }, reason: 'all the days of the week Secure' },
  { id: 'friend-hfw', name: 'Nutmeg the Squirrel', emoji: '🐿️', condition: { kind: 'setComplete', set: 'hfw' }, reason: 'all 100 high-frequency words Secure' },
  { id: 'friend-y2cew', name: 'Hazel the Hedgehog', emoji: '🦔', condition: { kind: 'setComplete', set: 'y2cew' }, reason: 'all Year 2 tricky words Secure' },
  { id: 'friend-y34-25', name: 'Gigi the Giraffe', emoji: '🦒', condition: { kind: 'setSecure', set: 'y34', count: 25 }, reason: '25 Year 3/4 words Secure' },
  { id: 'friend-y34-50', name: 'Ellie the Elephant', emoji: '🐘', condition: { kind: 'setSecure', set: 'y34', count: 50 }, reason: '50 Year 3/4 words Secure' },
  { id: 'friend-y34-70', name: 'Leo the Lion', emoji: '🦁', condition: { kind: 'setSecure', set: 'y34', count: 70 }, reason: '70 Year 3/4 words Secure' },
  { id: 'friend-y34-100', name: 'Sparkle the Unicorn', emoji: '🦄', condition: { kind: 'setSecure', set: 'y34', count: 100 }, reason: 'every Year 3/4 word Secure' },
  ...unitFriends.map(([name, emoji], i) => ({ id: `friend-units-${(i + 1) * 5}`, name, emoji, condition: { kind: 'units' as const, count: (i + 1) * 5 }, reason: `${(i + 1) * 5} spelling patterns finished` })),
]

export type ShopCategory = 'food' | 'toy' | 'accessory' | 'decoration'
export type AccessorySlot = 'hat' | 'neck' | 'face'
export interface ShopItem { id: string; name: string; category: ShopCategory; price: number; emoji: string; slot?: AccessorySlot; position?: { x: number; y: number } }

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'apple', name: 'Apple', category: 'food', price: 5, emoji: '🍎' },
  { id: 'carrot', name: 'Carrot', category: 'food', price: 5, emoji: '🥕' },
  { id: 'strawberry', name: 'Strawberry', category: 'food', price: 6, emoji: '🍓' },
  { id: 'cookie', name: 'Cookie', category: 'food', price: 8, emoji: '🍪' },
  { id: 'cheese', name: 'Cheese', category: 'food', price: 8, emoji: '🧀' },
  { id: 'bone', name: 'Bone', category: 'food', price: 10, emoji: '🦴' },
  { id: 'fish', name: 'Fish', category: 'food', price: 10, emoji: '🐟' },
  { id: 'cupcake', name: 'Cupcake', category: 'food', price: 12, emoji: '🧁' },
  { id: 'watermelon', name: 'Watermelon', category: 'food', price: 15, emoji: '🍉' },
  { id: 'ball', name: 'Ball', category: 'toy', price: 30, emoji: '⚽' },
  { id: 'tennis', name: 'Tennis ball', category: 'toy', price: 30, emoji: '🎾' },
  { id: 'puzzle', name: 'Puzzle', category: 'toy', price: 35, emoji: '🧩' },
  { id: 'yoyo', name: 'Yo-yo', category: 'toy', price: 40, emoji: '🪀' },
  { id: 'teddy', name: 'Teddy', category: 'toy', price: 45, emoji: '🧸' },
  { id: 'kite', name: 'Kite', category: 'toy', price: 60, emoji: '🪁' },
  { id: 'party-hat', name: 'Party hat', category: 'accessory', price: 50, emoji: '🥳', slot: 'hat' },
  { id: 'bow', name: 'Hair bow', category: 'accessory', price: 50, emoji: '🎀', slot: 'hat' },
  { id: 'bandana', name: 'Bandana', category: 'accessory', price: 60, emoji: '🧣', slot: 'neck' },
  { id: 'bow-tie', name: 'Bow tie', category: 'accessory', price: 60, emoji: '🎀', slot: 'neck' },
  { id: 'scarf', name: 'Scarf', category: 'accessory', price: 70, emoji: '🧣', slot: 'neck' },
  { id: 'glasses', name: 'Glasses', category: 'accessory', price: 80, emoji: '👓', slot: 'face' },
  { id: 'flower-crown', name: 'Flower crown', category: 'accessory', price: 90, emoji: '🌸', slot: 'hat' },
  { id: 'sunglasses', name: 'Sunglasses', category: 'accessory', price: 100, emoji: '🕶️', slot: 'face' },
  { id: 'wizard-hat', name: 'Wizard hat', category: 'accessory', price: 120, emoji: '🧙', slot: 'hat' },
  { id: 'crown', name: 'Crown', category: 'accessory', price: 150, emoji: '👑', slot: 'hat' },
  { id: 'plant', name: 'Plant', category: 'decoration', price: 40, emoji: '🪴', position: { x: 8, y: 62 } },
  { id: 'balloon', name: 'Balloon', category: 'decoration', price: 40, emoji: '🎈', position: { x: 85, y: 18 } },
  { id: 'sunflower', name: 'Sunflower', category: 'decoration', price: 50, emoji: '🌻', position: { x: 90, y: 64 } },
  { id: 'bed', name: 'Cosy bed', category: 'decoration', price: 80, emoji: '🛏️', position: { x: 70, y: 74 } },
  { id: 'star-lamp', name: 'Star lamp', category: 'decoration', price: 90, emoji: '🌟', position: { x: 15, y: 15 } },
  { id: 'rainbow', name: 'Rainbow', category: 'decoration', price: 120, emoji: '🌈', position: { x: 50, y: 8 } },
  { id: 'house', name: 'Pet house', category: 'decoration', price: 150, emoji: '🏠', position: { x: 22, y: 70 } },
  { id: 'fountain', name: 'Fountain', category: 'decoration', price: 200, emoji: '⛲', position: { x: 50, y: 80 } },
]
