export interface HomeLink { to: string; label: string; emoji: string; needsTodayDone?: boolean }
/** Later tasks add Free Play, Shop, Stickers, Pet Park and Rewards here. */
export const HOME_LINKS: HomeLink[] = [
  { to: '/play', label: 'Free Play', emoji: '🎮', needsTodayDone: true },
  { to: '/pet', label: 'My Pet', emoji: '🏠' },
  { to: '/shop', label: 'Pet Shop', emoji: '🛍️' },
  { to: '/stickers', label: 'Stickers', emoji: '📒' },
  { to: '/park', label: 'Pet Park', emoji: '🌳' },
  { to: '/trophies', label: 'Trophies', emoji: '🏆' },
  { to: '/rewards', label: 'Rewards', emoji: '🎁' },
]
