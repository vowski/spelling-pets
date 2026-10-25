export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

/** Bump whenever the prompt changes: it is part of the tip cache key, so old tips are regenerated. */
export const TIP_PROMPT_VERSION = 1

export const REWORD_SYSTEM = [
  'You reword a short spelling tip for a 7-year-old child in England so it sounds friendly and natural.',
  'Keep every fact exactly as given. Do not add any new fact, rule, letter, sound or example.',
  'Use British English. Speak to the child as "you". Never say "I". Do not praise or flatter.',
  'Keep it under 20 words and keep the correct word in it. Reply with the reworded tip only.',
].join(' ')

const SHOTS: [user: string, assistant: string][] = [
  ['Tip to reword: In "said", the letters "ai" make an "e" sound.', 'In "said", watch out: the letters "ai" make an "e" sound.'],
  ['Tip to reword: "too" means also. The number 2 is spelt "two".', '"too" means also, but the number 2 is spelt "two".'],
]

/** The model only rewords the always-correct template; it is never asked to explain the mistake itself. */
export function rewordMessages(template: string): ChatMessage[] {
  return [
    { role: 'system', content: REWORD_SYSTEM },
    ...SHOTS.flatMap(([user, assistant]): ChatMessage[] => [{ role: 'user', content: user }, { role: 'assistant', content: assistant }]),
    { role: 'user', content: `Tip to reword: ${template}` },
  ]
}
