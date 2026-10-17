export interface HomeLink { to: string; label: string; emoji: string }
/** Everything on Home is always open, Free Play included. */
export const HOME_LINKS: HomeLink[] = [
  { to: '/play', label: 'Free Play', emoji: '🎮' },
  { to: '/pet', label: 'My Pet', emoji: '🏠' },
  { to: '/shop', label: 'Pet Shop', emoji: '🛍️' },
  { to: '/stickers', label: 'Stickers', emoji: '📒' },
  { to: '/park', label: 'Pet Park', emoji: '🌳' },
  { to: '/trophies', label: 'Trophies', emoji: '🏆' },
  { to: '/rewards', label: 'Rewards', emoji: '🎁' },
]
