/** Statutory lists, verbatim. Source: DfE English Appendix 1 (OGL v3.0) and DfES Letters and Sounds (2007). */
export const Y1CEW_LIST = [
  'the', 'a', 'do', 'to', 'today', 'of', 'said', 'says', 'are', 'were', 'was', 'is', 'his', 'has', 'I', 'you',
  'your', 'they', 'be', 'he', 'me', 'she', 'we', 'no', 'go', 'so', 'by', 'my', 'here', 'there', 'where', 'love',
  'come', 'some', 'one', 'once', 'ask', 'friend', 'school', 'put', 'push', 'pull', 'full', 'house', 'our',
] as const

export const DAYS_LIST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

export const Y2CEW_LIST = [
  'door', 'floor', 'poor', 'because', 'find', 'kind', 'mind', 'behind', 'child', 'children', 'wild', 'climb',
  'most', 'only', 'both', 'old', 'cold', 'gold', 'hold', 'told', 'every', 'everybody', 'even', 'great', 'break',
  'steak', 'pretty', 'beautiful', 'after', 'fast', 'last', 'past', 'father', 'class', 'grass', 'pass', 'plant',
  'path', 'bath', 'hour', 'move', 'prove', 'improve', 'sure', 'sugar', 'eye', 'could', 'should', 'would', 'who',
  'whole', 'any', 'many', 'clothes', 'busy', 'people', 'water', 'again', 'half', 'money', 'Mr', 'Mrs', 'parents',
  'Christmas',
] as const

export const HFW_LIST = [
  'the', 'and', 'a', 'to', 'said', 'in', 'he', 'I', 'of', 'it', 'was', 'you', 'they', 'on', 'she', 'is', 'for', 'at',
  'his', 'but', 'that', 'with', 'all', 'we', 'can', 'are', 'up', 'had', 'my', 'her', 'what', 'there', 'out', 'this',
  'have', 'went', 'be', 'like', 'some', 'so', 'not', 'then', 'were', 'go', 'little', 'as', 'no', 'mum', 'one', 'them',
  'do', 'me', 'down', 'dad', 'big', 'when', "it's", 'see', 'looked', 'very', 'look', "don't", 'come', 'will', 'into',
  'back', 'from', 'children', 'him', 'Mr', 'get', 'just', 'now', 'came', 'oh', 'about', 'got', 'their', 'people',
  'your', 'put', 'could', 'house', 'old', 'too', 'by', 'day', 'made', 'time', "I'm", 'if', 'help', 'Mrs', 'called',
  'here', 'off', 'asked', 'saw', 'make', 'an',
] as const

export const Y34_HEADWORDS = [
  'accident', 'actual', 'address', 'answer', 'appear', 'arrive', 'believe', 'bicycle', 'breath', 'breathe', 'build',
  'busy', 'calendar', 'caught', 'centre', 'century', 'certain', 'circle', 'complete', 'consider', 'continue',
  'decide', 'describe', 'different', 'difficult', 'disappear', 'early', 'earth', 'eight', 'enough', 'exercise',
  'experience', 'experiment', 'extreme', 'famous', 'favourite', 'February', 'forward', 'fruit', 'grammar', 'group',
  'guard', 'guide', 'heard', 'heart', 'height', 'history', 'imagine', 'increase', 'important', 'interest', 'island',
  'knowledge', 'learn', 'length', 'library', 'material', 'medicine', 'mention', 'minute', 'natural', 'naughty',
  'notice', 'occasion', 'often', 'opposite', 'ordinary', 'particular', 'peculiar', 'perhaps', 'popular', 'position',
  'possess', 'possible', 'potatoes', 'pressure', 'probably', 'promise', 'purpose', 'quarter', 'question', 'recent',
  'regular', 'reign', 'remember', 'sentence', 'separate', 'special', 'straight', 'strange', 'strength', 'suppose',
  'surprise', 'therefore', 'though', 'thought', 'through', 'various', 'weight', 'woman',
] as const

/** Follow-on form → headword (from 'accident(ally)', 'busy/business' etc.). */
export const Y34_FOLLOW_ONS: Record<string, string> = {
  accidentally: 'accident', actually: 'actual', business: 'busy', eighth: 'eight', forwards: 'forward',
  occasionally: 'occasion', possession: 'possess', although: 'though', women: 'woman',
}
