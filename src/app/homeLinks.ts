export interface HomeLink { to: string; label: string; emoji: string; needsTodayDone?: boolean }
/** Later tasks add Free Play, Shop, Stickers, Pet Park and Rewards here. */
export const HOME_LINKS: HomeLink[] = [
  { to: '/play', label: 'Free Play', emoji: '🎮', needsTodayDone: true },
  { to: '/pet', label: 'My Pet', emoji: '🏠' },
  { to: '/shop', label: 'Pet Shop', emoji: '🛍️' },
]
