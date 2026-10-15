import type { PatternUnitDef } from '../types'

const sort = (...buckets: [string, string, string[]][]) =>
  ({ kind: 'sort', buckets: buckets.map(([id, label, words]) => ({ id, label, words })) }) as const
const spell = { kind: 'spell' } as const

export const Y4_UNITS: PatternUnitDef[] = [
  { id: 'y4-double-long', year: 4, title: 'Doubling in longer words',
    rule: 'If the last beat is stressed and ends in one vowel and one consonant, double it: begin → beginning. If it is not stressed, do not: garden → gardening.',
    words: ['forgetting', 'forgotten', 'beginning', 'beginner', 'preferred', 'gardening', 'gardener', 'limiting', 'limited', 'limitation'],
    game: sort(['double', 'Double it', ['forgetting', 'forgotten', 'beginning', 'beginner', 'preferred']], ['single', "Don't double", ['gardening', 'gardener', 'limiting', 'limited', 'limitation']]) },
  { id: 'y4-y-i', year: 4, title: 'y saying "i"', rule: 'In some words, y says "i" as in pin: gym, myth.',
    words: ['myth', 'gym', 'Egypt', 'pyramid', 'mystery', 'typical'], game: spell },
  { id: 'y4-ou-u', year: 4, title: 'ou saying "u"', rule: 'In some words, ou says "u" as in cup: young, touch.',
    words: ['young', 'touch', 'double', 'trouble', 'country', 'couple'], game: spell },
  { id: 'y4-sure-ture', year: 4, title: 'sure and ture', rule: 'The "zhuh" ending is spelt sure (treasure). The "chuh" ending is often spelt ture (picture).',
    words: ['measure', 'treasure', 'pleasure', 'enclosure', 'creature', 'furniture', 'picture', 'nature', 'adventure'],
    game: sort(['sure', 'sure', ['measure', 'treasure', 'pleasure', 'enclosure']], ['ture', 'ture', ['creature', 'furniture', 'picture', 'nature', 'adventure']]) },
  { id: 'y4-sion', year: 4, title: 'sion saying "zhun"', rule: 'If the ending sounds like "zhun", it is spelt sion: television.',
    words: ['division', 'invasion', 'confusion', 'decision', 'collision', 'television'], game: spell },
  { id: 'y4-tion-ssion-sion-cian', year: 4, title: 'tion, ssion, sion and cian',
    rule: 'Look at the root word: act → action, discuss → discussion, expand → expansion, music → musician.',
    words: ['invention', 'injection', 'action', 'hesitation', 'completion', 'expression', 'discussion', 'confession', 'permission', 'admission', 'expansion', 'extension', 'comprehension', 'tension', 'musician', 'electrician', 'magician', 'politician'],
    game: sort(['tion', 'tion', ['invention', 'injection', 'action', 'hesitation', 'completion']], ['ssion', 'ssion', ['expression', 'discussion', 'confession', 'permission', 'admission']], ['sion', 'sion', ['expansion', 'extension', 'comprehension', 'tension']], ['cian', 'cian', ['musician', 'electrician', 'magician', 'politician']]) },
  { id: 'y4-ch-k', year: 4, title: 'ch saying "k"', rule: 'In words that come from Greek, ch says "k": chorus, echo.',
    words: ['scheme', 'chorus', 'chemist', 'echo', 'character', 'anchor'], game: spell },
  { id: 'y4-ch-sh', year: 4, title: 'ch saying "sh"', rule: 'In words that come from French, ch says "sh": chef, machine.',
    words: ['chef', 'chalet', 'machine', 'brochure', 'parachute', 'moustache'], game: spell },
  { id: 'y4-gue-que', year: 4, title: 'gue and que', rule: 'In words from French, the "g" sound at the end is spelt gue and the "k" sound is spelt que.',
    words: ['league', 'tongue', 'catalogue', 'antique', 'unique', 'cheque'],
    game: sort(['gue', 'gue', ['league', 'tongue', 'catalogue']], ['que', 'que', ['antique', 'unique', 'cheque']]) },
  { id: 'y4-sc', year: 4, title: 'sc saying "s"', rule: 'In words from Latin, sc can say "s": science, scene.',
    words: ['science', 'scene', 'discipline', 'fascinate', 'crescent', 'scissors'], game: spell },
  { id: 'y4-plural-possessive', year: 4, title: 'Apostrophes with plurals', rule: "If the plural ends in s, put the apostrophe after the s: girls'. If not, add 's: children's.",
    words: ["girls'", "boys'", "babies'", "children's", "men's", "mice's"], game: spell },
]
