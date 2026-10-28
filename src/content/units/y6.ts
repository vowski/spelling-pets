import type { PatternUnitDef } from '../types'

const sort = (...buckets: [string, string, string[]][]) =>
  ({ kind: 'sort', buckets: buckets.map(([id, label, words]) => ({ id, label, words })) }) as const
const spell = { kind: 'spell' } as const
const homo = (...items: [string, string, string[]][]) =>
  ({ kind: 'homophone', items: items.map(([sentence, answer, options]) => ({ sentence, answer, options })) }) as const

/**
 * Year 6: the second half of the DfE Years 5–6 rules (English Appendix 1); the split between the years is the builder's.
 * The -fer unit is a sorting game, not the word builder, whose doubling tip ("has a short sound") would be wrong for refer.
 * morning/mourning is left out: grief is a heavy theme for a young child's game.
 */
export const Y6_UNITS: PatternUnitDef[] = [
  { id: 'y6-fer', year: 6, title: 'Adding endings to fer words',
    rule: 'Double the r if fer is still stressed when you add the ending: refer → referring. If the stress moves, keep one r: refer → reference.',
    words: ['referring', 'referred', 'referral', 'preferring', 'preferred', 'transferring', 'transferred', 'reference', 'referee', 'preference', 'transference'],
    game: sort(['double', 'Double the r', ['referring', 'referred', 'referral', 'preferring', 'preferred', 'transferring', 'transferred']], ['single', 'One r', ['reference', 'referee', 'preference', 'transference']]) },
  { id: 'y6-hyphens', year: 6, title: 'Hyphens',
    rule: 'A hyphen can join a prefix to a word, especially when the prefix ends in a vowel and the word starts with one: co-operate, re-enter.',
    words: ['co-ordinate', 're-enter', 'co-operate', 'co-own', 're-elect', 're-examine'], game: spell },
  { id: 'y6-ei-after-c', year: 6, title: 'ei after c',
    rule: '"i before e except after c" works when the sound is "ee": receive, ceiling. Watch out for protein and seize.',
    words: ['deceive', 'conceive', 'receive', 'perceive', 'ceiling', 'receipt'], game: spell },
  { id: 'y6-ough', year: 6, title: 'The letters ough',
    rule: 'ough can spell lots of sounds: "or" in bought, "uff" in rough, "oh" in though and "ow" in plough. Learn which is which.',
    words: ['ought', 'bought', 'brought', 'fought', 'rough', 'tough', 'enough', 'though', 'although', 'dough', 'plough', 'bough'],
    game: sort(['or', 'ough says "or"', ['ought', 'bought', 'brought', 'fought']], ['uff', 'ough says "uff"', ['rough', 'tough', 'enough']], ['oh', 'ough says "oh"', ['though', 'although', 'dough']], ['ow', 'ough says "ow"', ['plough', 'bough']]) },
  { id: 'y6-homophones-1', year: 6, title: 'Words that sound the same',
    rule: 'These pairs sound the same but mean different things. Think about the meaning before you write: aloud means out loud, allowed means given permission.',
    words: ['aloud', 'allowed', 'affect', 'effect', 'past', 'passed', 'led', 'lead', 'heard', 'herd', 'guessed', 'guest', 'steal', 'steel'],
    game: homo(
      ['Read the poem ___ to the class.', 'aloud', ['aloud', 'allowed']],
      ['We are not ___ to run in the corridor.', 'allowed', ['aloud', 'allowed']],
      ['Will the rain ___ our picnic?', 'affect', ['affect', 'effect']],
      ['The medicine had a good ___ on my cough.', 'effect', ['affect', 'effect']],
      ['We walked ___ the old church.', 'past', ['past', 'passed']],
      ['She ___ the ball to me.', 'passed', ['past', 'passed']],
      ['Our teacher ___ us into the hall.', 'led', ['led', 'lead']],
      ['Old pipes were made of ___.', 'lead', ['led', 'lead']],
      ['I ___ a strange noise outside.', 'heard', ['heard', 'herd']],
      ['A ___ of cows crossed the field.', 'herd', ['heard', 'herd']],
      ['Sam ___ the answer to the riddle.', 'guessed', ['guessed', 'guest']],
      ['Our ___ stayed for tea.', 'guest', ['guessed', 'guest']],
      ['It is wrong to ___ from a shop.', 'steal', ['steal', 'steel']],
      ['The bridge is made of ___.', 'steel', ['steal', 'steel']],
    ) },
  { id: 'y6-homophones-2', year: 6, title: 'More words that sound the same',
    rule: 'More pairs that sound the same, or nearly the same. The meaning tells you which one to write: stationery is paper and pens.',
    words: ['principal', 'principle', 'stationary', 'stationery', 'profit', 'prophet', 'father', 'farther', 'desert', 'dessert', 'cereal', 'serial', 'aisle', 'isle', 'wary', 'weary'],
    game: homo(
      ['The ___ of the college gave a speech.', 'principal', ['principal', 'principle']],
      ['Telling the truth is an important ___.', 'principle', ['principal', 'principle']],
      ['The bus was ___ at the traffic lights.', 'stationary', ['stationary', 'stationery']],
      ['We bought new ___ for school.', 'stationery', ['stationary', 'stationery']],
      ['The cake stall made a ___ for charity.', 'profit', ['profit', 'prophet']],
      ['In the old story, a ___ told the future.', 'prophet', ['profit', 'prophet']],
      ['My ___ makes the best pancakes.', 'father', ['father', 'farther']],
      ['The castle was ___ away than it looked.', 'farther', ['father', 'farther']],
      ['Camels can cross the hot, dry ___.', 'desert', ['desert', 'dessert']],
      ['We had ice cream for ___.', 'dessert', ['desert', 'dessert']],
      ['I eat ___ with milk for breakfast.', 'cereal', ['cereal', 'serial']],
      ['A new part of the radio ___ comes out each week.', 'serial', ['cereal', 'serial']],
      ['Please walk down the ___ to your seat.', 'aisle', ['aisle', 'isle']],
      ['They sailed to a small ___ with palm trees.', 'isle', ['aisle', 'isle']],
      ['Be ___ of the hot oven.', 'wary', ['wary', 'weary']],
      ['After the long walk we felt ___.', 'weary', ['wary', 'weary']],
    ) },
]
