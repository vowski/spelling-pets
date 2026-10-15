import type { WordEntry } from '../types'

/** The statutory Years 3–4 word list, grouped into teaching families (spec §3.4). Follow-on forms carry their headword. */
export const Y34_FAMILIES: { name: string; entries: WordEntry[] }[] = [
  {
    name: 'ough-augh',
    entries: [
      ['th[ough]', 'It was cold, though the sun was out.'],
      ['al|th[ough]', 'Although it rained, we played outside.', 'though'],
      ['th[ough]t', 'I thought it was Friday today.'],
      ['thr[ough]', 'The dog ran through the gate.'],
      ['e|n[ough]', 'Have you had enough to eat?'],
      ['c[augh]t', 'Sam caught the ball with one hand.'],
      ['n[augh]|ty', 'The naughty puppy chewed my shoe.'],
    ],
  },
  {
    name: 'ear',
    entries: [
      ['h[ear]d', 'I heard a bird singing.'],
      ['h[ear]t', 'My heart beats fast when I run.'],
      ['[ear]th', 'We planted seeds in the earth.'],
      ['[ear]|ly', 'We got up early for the trip.'],
      ['l[ear]n', 'I want to learn to swim.'],
    ],
  },
  {
    name: 'eigh',
    entries: [
      ['[eigh]t', 'My sister is eight years old.'],
      ['[eigh]th', 'It is my eighth birthday today.', 'eight'],
      ['w[eigh]t', 'The baker checked the weight of the flour.'],
      ['he[igh]t', 'We measured my height on the wall.'],
      ['re[ig]n', 'The queen had a long reign.'],
      ['str[aigh]t', 'Draw a straight line with a ruler.'],
    ],
  },
  {
    name: 'soft-c-1',
    entries: [
      ['cen|t[re]', 'The ball is in the centre of the field.'],
      ['[c]en|tu|ry', 'This castle is nearly a century old.'],
      ['[c]er|t[ai]n', 'Are you certain it is your turn?'],
      ['[c]ir|[cle]', 'We sat in a circle on the carpet.'],
      ['bi|[cy]|cle', 'I ride my bicycle to the park.'],
    ],
  },
  {
    name: 'soft-c-2',
    entries: [
      ['de|[c]ide', 'I cannot decide which cake to have.'],
      ['me|di|[c]ine', 'The medicine helped my cough.'],
      ['no|ti[ce]', 'Did you notice the new sign?'],
      ['sen|ten[ce]', 'Write a sentence about your pet.'],
      ['ex|er|[c]ise', 'Running is good exercise.'],
      ['re|[c]ent', 'This is a recent photo of me.'],
      ['in|crea[se]', 'Please increase the volume a little.'],
    ],
  },
  {
    name: 'silent-u',
    entries: [
      ['b[ui]ld', 'We will build a den in the garden.'],
      ['fr[ui]t', 'An apple is my favourite fruit.'],
      ['g[u]ard', 'A dog can guard the house.'],
      ['g[ui]de', 'Our guide showed us the castle.'],
      ['gr[ou]p', 'We worked in a group of four.'],
    ],
  },
  {
    name: 'double-1',
    entries: [
      ['a[dd]|re[ss]', 'Write your address on the envelope.'],
      ['a[pp]|ear', 'Stars appear when it gets dark.'],
      ['a[rr]|ive', 'When will the bus arrive?'],
      ['dis|a[pp]|ear', 'The magician made the coin disappear.'],
      ['su[pp]|ose', 'I suppose we could share it.'],
    ],
  },
  {
    name: 'double-2',
    entries: [
      ['di[ff]|er|ent', 'Each snowflake is different.'],
      ['di[ff]|i|cult', 'This puzzle is quite difficult.'],
      ['po[ss]|i|ble', 'Is it possible to touch the sky?'],
      ['o[pp]|o|site', 'The shop is opposite the park.'],
      ['pre[ss]|ure', 'Press with gentle pressure.'],
      ['gram|m[ar]', 'We are learning about grammar.'],
    ],
  },
  {
    name: 'double-3',
    entries: [
      ['po[ss]|e[ss]', 'Dragons possess magic powers in stories.'],
      ['po[ss]|e[ss]|ion', 'My best possession is my bike.', 'possess'],
      ['a[cc]|i|dent', 'Spilling the paint was an accident.'],
      ['a[cc]|i|den|t[ally]', 'I accidentally dropped my sandwich.', 'accident'],
      ['o[cc]|a|sion', 'A birthday is a special occasion.'],
      ['o[cc]|a|sion|a[lly]', 'We occasionally have pizza for tea.', 'occasion'],
    ],
  },
  {
    name: 'al-endings',
    entries: [
      ['ac|tu|[al]', 'This is the actual size of a mouse.'],
      ['ac|tu|a[lly]', 'I actually like spiders!', 'actual'],
      ['na|tu|r[al]', 'Honey is a natural food.'],
      ['ma|te|ri|[al]', 'Wool is a soft material.'],
      ['spe|[ci]al', 'Today is a special day.'],
    ],
  },
  {
    name: 'ar-endings',
    entries: [
      ['par|tic|u|l[ar]', 'I like this particular book best.'],
      ['pe|cu|li[ar]', 'What a peculiar noise!'],
      ['pop|u|l[ar]', 'Football is a popular game.'],
      ['reg|u|l[ar]', 'We have a regular spelling test.'],
      ['cal|en|d[ar]', 'Mum wrote it on the calendar.'],
      ['or|di|n[ar]y', 'It was just an ordinary day.'],
    ],
  },
  {
    name: 'big-words',
    entries: [
      ['men|[tion]', 'Did I mention my new kitten?'],
      ['po|si|[tion]', 'Get into position for the race.'],
      ['ques|[tion]', 'Can I ask a question?'],
      ['i|ma|[g]ine', 'Imagine you could fly!'],
      ['in|t[er]|est', 'I have an interest in dinosaurs.'],
      ['im|por|t[a]nt', 'It is important to be kind.'],
    ],
  },
  {
    name: 'tricky-vowels-1',
    entries: [
      ['b[u]|sy', 'The shop was very busy.'],
      ['b[u]si|n[e]ss', 'My aunt runs a cake business.', 'busy'],
      ['wom|[a]n', 'The woman walked her dog.'],
      ['w[o]m|[e]n', 'Two women sang a song.', 'woman'],
      ['min|[u]te', 'Wait a minute, please.'],
    ],
  },
  {
    name: 'tricky-vowels-2',
    entries: [
      ['i[s]|land', 'We sailed to a small island.'],
      ['an|s[w]er', 'I know the answer!'],
      ['of|[t]en', 'We often go to the library.'],
      ['[k]now|le[dge]', 'Books give us knowledge.'],
      ['len[g]th', 'Measure the length of the table.'],
      ['stren[g]th', 'An ant has great strength.'],
    ],
  },
  {
    name: 'calendar-and-direction',
    entries: [
      ['Feb|[ru]|ar|y', 'My birthday is in February.'],
      ['fa|v[ou]r|ite', 'Blue is my favourite colour.'],
      ['for|w[ar]d', 'Take one step forward.'],
      ['for|w[ar]ds', 'The car rolled forwards slowly.', 'forward'],
      ['q[u]ar|t[er]', 'I ate a quarter of the pizza.'],
    ],
  },
  {
    name: 'long-e',
    entries: [
      ['com|pl[e]te', 'I can complete the puzzle.'],
      ['ex|tr[e]me', 'The heat was extreme today.'],
      ['de|scr[i]be', 'Describe your favourite toy.'],
      ['con|sid|[er]', 'Please consider my idea.'],
      ['con|tin|[ue]', 'We will continue the story tomorrow.'],
    ],
  },
  {
    name: 'ex-and-y',
    entries: [
      ['ex|pe|ri|en[ce]', 'The trip was a fun experience.'],
      ['ex|per|i|m[e]nt', 'We did a science experiment.'],
      ['his|t[o]|ry', 'We are learning about history.'],
      ['li|br[ar]|y', 'I borrowed a book from the library.'],
      ['po|ta|t[oes]', 'We had roast potatoes for dinner.'],
    ],
  },
  {
    name: 'breath',
    entries: [
      ['br[ea]th', 'Take a deep breath.'],
      ['br[ea]the', 'Fish breathe under water.'],
      ['be|l[ie]ve', 'I believe in fairies.'],
      ['s[ur]|prise', 'We planned a surprise party.'],
      ['stran[ge]', 'We heard a strange noise.'],
    ],
  },
  {
    name: 'purpose',
    entries: [
      ['prom|i[se]', 'I promise to tidy my room.'],
      ['pur|p[o]se', 'What is the purpose of this button?'],
      ['fa|m[ous]', 'She wants to be a famous singer.'],
      ['var|i|[ous]', 'We saw various animals at the zoo.'],
      ['per|[h]aps', 'Perhaps it will snow tomorrow.'],
    ],
  },
  {
    name: 'last-ones',
    entries: [
      ['prob|a|b[ly]', 'It will probably rain today.'],
      ['th[ere]|f[ore]', 'It was late, therefore we went home.'],
      ['sep|[a]|rate', 'Keep the red and blue pens separate.'],
      ['re|mem|b[er]', 'I remember my first day at school.'],
    ],
  },
]
