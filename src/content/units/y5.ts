import type { PatternUnitDef } from '../types'

const sort = (...buckets: [string, string, string[]][]) =>
  ({ kind: 'sort', buckets: buckets.map(([id, label, words]) => ({ id, label, words })) }) as const
const spell = { kind: 'spell' } as const
const homo = (...items: [string, string, string[]][]) =>
  ({ kind: 'homophone', items: items.map(([sentence, answer, options]) => ({ sentence, answer, options })) }) as const

/** Year 5: the first half of the DfE Years 5–6 rules (English Appendix 1); the split between the years is the builder's. */
export const Y5_UNITS: PatternUnitDef[] = [
  { id: 'y5-cious-tious', year: 5, title: 'cious and tious',
    rule: 'The "shus" ending is spelt cious or tious. If the root word ends in ce, use cious: space → spacious.',
    words: ['vicious', 'precious', 'delicious', 'suspicious', 'spacious', 'gracious', 'ambitious', 'cautious', 'infectious', 'nutritious'],
    game: sort(['cious', 'cious', ['vicious', 'precious', 'delicious', 'suspicious', 'spacious', 'gracious']], ['tious', 'tious', ['ambitious', 'cautious', 'infectious', 'nutritious']]) },
  { id: 'y5-cial-tial', year: 5, title: 'cial and tial',
    rule: 'The "shul" ending is usually cial after a vowel (special) and tial after a consonant (partial). Initial is an exception.',
    words: ['official', 'special', 'artificial', 'social', 'crucial', 'partial', 'confidential', 'essential', 'initial', 'potential'],
    game: sort(['cial', 'cial', ['official', 'special', 'artificial', 'social', 'crucial']], ['tial', 'tial', ['partial', 'confidential', 'essential', 'initial', 'potential']]) },
  { id: 'y5-ant-ent', year: 5, title: 'ant and ent',
    rule: 'Use ant if a related word ends in ation: hesitation → hesitant. Use ent after a soft c or g, after qu (frequent), or if a related word has a clear "e" sound: confidential → confident. Some, like assistant and obedient, just have to be learnt.',
    words: ['observant', 'hesitant', 'tolerant', 'assistant', 'innocent', 'decent', 'frequent', 'confident', 'obedient', 'independent'],
    game: sort(['ant', 'ant', ['observant', 'hesitant', 'tolerant', 'assistant']], ['ent', 'ent', ['innocent', 'decent', 'frequent', 'confident', 'obedient', 'independent']]) },
  { id: 'y5-ance-ence', year: 5, title: 'ance, ancy, ence and ency',
    rule: 'The noun follows its partner word: hesitant → hesitancy, innocent → innocence. ance and ancy go with ant; ence and ency go with ent.',
    words: ['observance', 'tolerance', 'substance', 'assistance', 'hesitancy', 'innocence', 'decency', 'frequency', 'confidence', 'obedience', 'independence'],
    game: sort(['ance', 'ance or ancy', ['observance', 'tolerance', 'substance', 'assistance', 'hesitancy']], ['ence', 'ence or ency', ['innocence', 'decency', 'frequency', 'confidence', 'obedience', 'independence']]) },
  { id: 'y5-able-ible', year: 5, title: 'able and ible',
    rule: 'able is more common. Use it when you can hear a whole word before it (enjoy → enjoyable) or there is an ation word. Keep the e after c or g: noticeable. ible usually comes when you cannot hear a whole word (possible, horrible); sensible is an exception.',
    words: ['adorable', 'considerable', 'changeable', 'noticeable', 'dependable', 'comfortable', 'reasonable', 'enjoyable', 'reliable', 'possible', 'horrible', 'terrible', 'visible', 'incredible', 'sensible', 'legible'],
    game: sort(['able', 'able', ['adorable', 'considerable', 'changeable', 'noticeable', 'dependable', 'comfortable', 'reasonable', 'enjoyable', 'reliable']], ['ible', 'ible', ['possible', 'horrible', 'terrible', 'visible', 'incredible', 'sensible', 'legible']]) },
  { id: 'y5-ably-ibly', year: 5, title: 'ably and ibly',
    rule: 'Words ending in able change to ably, and ible changes to ibly: reasonable → reasonably, possible → possibly.',
    words: ['adorably', 'considerably', 'reasonably', 'comfortably', 'reliably', 'possibly', 'horribly', 'terribly', 'visibly', 'incredibly', 'sensibly'],
    game: sort(['ably', 'ably', ['adorably', 'considerably', 'reasonably', 'comfortably', 'reliably']], ['ibly', 'ibly', ['possibly', 'horribly', 'terribly', 'visibly', 'incredibly', 'sensibly']]) },
  { id: 'y5-silent-letters', year: 5, title: 'Silent letters',
    rule: 'Some letters are not sounded any more, but we still write them: the b in doubt and lamb, the s in island, the n in solemn.',
    words: ['doubt', 'island', 'lamb', 'solemn', 'thistle', 'knight'], game: spell },
  { id: 'y5-ce-se', year: 5, title: 'advice and advise',
    rule: 'In these pairs the noun ends in ce and the verb ends in se: give advice, but advise someone. Advise has a "z" sound, which c cannot make.',
    words: ['advice', 'advise', 'device', 'devise', 'licence', 'license', 'practice', 'practise'],
    game: homo(
      ['Can you give me some ___ about my project?', 'advice', ['advice', 'advise']],
      ['I ___ you to bring a coat.', 'advise', ['advice', 'advise']],
      ['A phone is a clever ___.', 'device', ['device', 'devise']],
      ['Let us ___ a plan to win the game.', 'devise', ['device', 'devise']],
      ['Grandad needs a ___ to drive a bus.', 'licence', ['licence', 'license']],
      ['I ___ the piano every day.', 'practise', ['practice', 'practise']],
      ['Football ___ is on Tuesday after school.', 'practice', ['practice', 'practise']],
    ) },
]
