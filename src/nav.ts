/** Primary nav + route paths. Keep `App.tsx` `<Route>`s in sync with this list. */
export const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/scrapbook', label: 'Scrapbook', end: false },
  { to: '/arcade', label: 'Arcade', end: false },
  { to: '/gallery', label: 'Gallery', end: false },
  { to: '/cookbook', label: 'Cookbook', end: false },
  { to: '/shopping', label: 'Shopping', end: false },
  { to: '/wheel', label: 'Wheel', end: false },
  { to: '/tracker', label: 'Tracker', end: false },
] as const

export type NavLinkDef = (typeof NAV_LINKS)[number]
