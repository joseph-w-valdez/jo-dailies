import { type ComponentType, lazy, type LazyExoticComponent } from 'react'

export type ArcadeGameId =
  | 'jenga'
  | 'suika'
  | 'connect4'
  | 'battleship'
  | 'scrabble'
  | 'chess'
  | 'wordle'
  | 'hangman'
  | 'codenames'
  | 'guesswho'
  | 'globle'
  | 'notes'
  | 'spike'
  | 'abcrelax'

export type ArcadeTileAccent =
  | 'amber'
  | 'rose'
  | 'sky'
  | 'emerald'
  | 'violet'
  | 'orange'
  | 'teal'
  | 'fuchsia'
  | 'lime'
  | 'indigo'
  | 'cyan'
  | 'pink'
  | 'yellow'
  | 'slate'

export type ArcadeTile = {
  id: ArcadeGameId
  title: string
  blurb: string
  wide?: boolean
  /** Soft wash + left rail color for the picker tile. */
  accent: ArcadeTileAccent
}

/** Candidate cover URLs for `public/arcade/{id}.{ext}` (no Vite glob — avoids Windows watch crashes). */
export function arcadeTileImageCandidates(id: ArcadeGameId): string[] {
  return [
    `/arcade/${id}.jpg`,
    `/arcade/${id}.jpeg`,
    `/arcade/${id}.png`,
    `/arcade/${id}.webp`,
  ]
}

/** Tailwind class bundles — keep full strings so JIT can see them. */
export const ARCADE_TILE_ACCENTS: Record<
  ArcadeTileAccent,
  {
    wash: string
    rail: string
    hoverBorder: string
    chipBorder: string
    chipBorderSoft: string
  }
> = {
  amber: {
    wash: 'bg-amber-500/12 hover:bg-amber-500/18',
    rail: 'bg-amber-400/80',
    hoverBorder: 'hover:border-amber-400/45',
    chipBorder: 'border-amber-400/55',
    chipBorderSoft: 'border-amber-400/35',
  },
  rose: {
    wash: 'bg-rose-500/12 hover:bg-rose-500/18',
    rail: 'bg-rose-400/80',
    hoverBorder: 'hover:border-rose-400/45',
    chipBorder: 'border-rose-400/55',
    chipBorderSoft: 'border-rose-400/35',
  },
  sky: {
    wash: 'bg-sky-500/12 hover:bg-sky-500/18',
    rail: 'bg-sky-400/80',
    hoverBorder: 'hover:border-sky-400/45',
    chipBorder: 'border-sky-400/55',
    chipBorderSoft: 'border-sky-400/35',
  },
  emerald: {
    wash: 'bg-emerald-500/12 hover:bg-emerald-500/18',
    rail: 'bg-emerald-400/80',
    hoverBorder: 'hover:border-emerald-400/45',
    chipBorder: 'border-emerald-400/55',
    chipBorderSoft: 'border-emerald-400/35',
  },
  violet: {
    wash: 'bg-violet-500/12 hover:bg-violet-500/18',
    rail: 'bg-violet-400/80',
    hoverBorder: 'hover:border-violet-400/45',
    chipBorder: 'border-violet-400/55',
    chipBorderSoft: 'border-violet-400/35',
  },
  orange: {
    wash: 'bg-orange-500/12 hover:bg-orange-500/18',
    rail: 'bg-orange-400/80',
    hoverBorder: 'hover:border-orange-400/45',
    chipBorder: 'border-orange-400/55',
    chipBorderSoft: 'border-orange-400/35',
  },
  teal: {
    wash: 'bg-teal-500/12 hover:bg-teal-500/18',
    rail: 'bg-teal-400/80',
    hoverBorder: 'hover:border-teal-400/45',
    chipBorder: 'border-teal-400/55',
    chipBorderSoft: 'border-teal-400/35',
  },
  fuchsia: {
    wash: 'bg-fuchsia-500/12 hover:bg-fuchsia-500/18',
    rail: 'bg-fuchsia-400/80',
    hoverBorder: 'hover:border-fuchsia-400/45',
    chipBorder: 'border-fuchsia-400/55',
    chipBorderSoft: 'border-fuchsia-400/35',
  },
  lime: {
    wash: 'bg-lime-500/12 hover:bg-lime-500/18',
    rail: 'bg-lime-400/80',
    hoverBorder: 'hover:border-lime-400/45',
    chipBorder: 'border-lime-400/55',
    chipBorderSoft: 'border-lime-400/35',
  },
  indigo: {
    wash: 'bg-indigo-500/12 hover:bg-indigo-500/18',
    rail: 'bg-indigo-400/80',
    hoverBorder: 'hover:border-indigo-400/45',
    chipBorder: 'border-indigo-400/55',
    chipBorderSoft: 'border-indigo-400/35',
  },
  cyan: {
    wash: 'bg-cyan-500/12 hover:bg-cyan-500/18',
    rail: 'bg-cyan-400/80',
    hoverBorder: 'hover:border-cyan-400/45',
    chipBorder: 'border-cyan-400/55',
    chipBorderSoft: 'border-cyan-400/35',
  },
  pink: {
    wash: 'bg-pink-500/12 hover:bg-pink-500/18',
    rail: 'bg-pink-400/80',
    hoverBorder: 'hover:border-pink-400/45',
    chipBorder: 'border-pink-400/55',
    chipBorderSoft: 'border-pink-400/35',
  },
  yellow: {
    wash: 'bg-yellow-500/12 hover:bg-yellow-500/18',
    rail: 'bg-yellow-400/80',
    hoverBorder: 'hover:border-yellow-400/45',
    chipBorder: 'border-yellow-400/55',
    chipBorderSoft: 'border-yellow-400/35',
  },
  slate: {
    wash: 'bg-slate-400/10 hover:bg-slate-400/16',
    rail: 'bg-slate-300/70',
    hoverBorder: 'hover:border-slate-300/40',
    chipBorder: 'border-slate-400/55',
    chipBorderSoft: 'border-slate-400/35',
  },
}

export const ARCADE_TILES: ArcadeTile[] = [
  { id: 'jenga', title: 'Jenga', blurb: 'Shared tower', accent: 'amber' },
  { id: 'suika', title: 'Suika', blurb: 'Cat merge', accent: 'rose' },
  { id: 'connect4', title: 'Connect Four', blurb: 'Shared drops', accent: 'sky' },
  { id: 'battleship', title: 'Cattleship', blurb: 'Fog duel', accent: 'teal' },
  {
    id: 'scrabble',
    title: 'Scrabble',
    blurb: 'Shared board',
    wide: true,
    accent: 'emerald',
  },
  {
    id: 'chess',
    title: 'Chess',
    blurb: 'Shared board',
    wide: true,
    accent: 'slate',
  },
  {
    id: 'wordle',
    title: 'Wordle',
    blurb: 'Co-op or versus',
    wide: true,
    accent: 'lime',
  },
  { id: 'hangman', title: 'Hangman', blurb: 'Co-op or versus', accent: 'orange' },
  {
    id: 'codenames',
    title: 'Codenames',
    blurb: 'Duet',
    wide: true,
    accent: 'indigo',
  },
  {
    id: 'guesswho',
    title: 'Guess Who',
    blurb: 'Valorant agents',
    wide: true,
    accent: 'fuchsia',
  },
  {
    id: 'globle',
    title: 'Globle',
    blurb: 'Guess the country',
    wide: true,
    accent: 'cyan',
  },
  { id: 'notes', title: 'Notes', blurb: 'Staff flashcards', accent: 'violet' },
  {
    id: 'spike',
    title: 'Spike',
    blurb: 'Valorant card duel',
    wide: true,
    accent: 'pink',
  },
  {
    id: 'abcrelax',
    title: 'Abcrelax',
    blurb: 'Theme letter race',
    wide: true,
    accent: 'yellow',
  },
]

type GameProps = { onClose: () => void }

function lazyNamed<M, K extends keyof M>(
  loader: () => Promise<M>,
  exportName: K,
): LazyExoticComponent<ComponentType<GameProps>> {
  return lazy(async () => {
    const mod = await loader()
    return { default: mod[exportName] as ComponentType<GameProps> }
  })
}

export const ARCADE_COMPONENTS: Record<
  ArcadeGameId,
  LazyExoticComponent<ComponentType<GameProps>>
> = {
  jenga: lazyNamed(() => import('./components/Jenga'), 'Jenga'),
  suika: lazyNamed(() => import('./components/CatSuika'), 'CatSuika'),
  connect4: lazyNamed(() => import('./components/CatConnect4'), 'CatConnect4'),
  battleship: lazyNamed(
    () => import('./components/CatBattleship'),
    'CatBattleship',
  ),
  scrabble: lazyNamed(() => import('./components/CatScrabble'), 'CatScrabble'),
  chess: lazyNamed(() => import('./components/CatChess'), 'CatChess'),
  wordle: lazyNamed(() => import('./components/CatWordle'), 'CatWordle'),
  hangman: lazyNamed(() => import('./components/CatHangman'), 'CatHangman'),
  codenames: lazyNamed(
    () => import('./components/CatCodenames'),
    'CatCodenames',
  ),
  guesswho: lazyNamed(() => import('./components/CatGuessWho'), 'CatGuessWho'),
  globle: lazyNamed(() => import('./components/CatGloble'), 'CatGloble'),
  notes: lazyNamed(() => import('./components/CatNotes'), 'CatNotes'),
  spike: lazyNamed(() => import('./components/CatSpike'), 'CatSpike'),
  abcrelax: lazyNamed(() => import('./components/CatAbcrelax'), 'CatAbcrelax'),
}

export function isArcadeWide(id: ArcadeGameId | null): boolean {
  if (!id) return false
  return Boolean(ARCADE_TILES.find((t) => t.id === id)?.wide)
}
