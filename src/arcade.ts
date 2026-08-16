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

export type ArcadeTile = {
  id: ArcadeGameId
  title: string
  blurb: string
  wide?: boolean
}

export const ARCADE_TILES: ArcadeTile[] = [
  { id: 'jenga', title: 'Jenga', blurb: 'Shared tower' },
  { id: 'suika', title: 'Suika', blurb: 'Cat merge' },
  { id: 'connect4', title: 'Connect Four', blurb: 'Shared drops' },
  { id: 'battleship', title: 'Cattleship', blurb: 'Fog duel' },
  { id: 'scrabble', title: 'Scrabble', blurb: 'Shared board', wide: true },
  { id: 'chess', title: 'Chess', blurb: 'Shared board', wide: true },
  { id: 'wordle', title: 'Wordle', blurb: 'Co-op or versus', wide: true },
  { id: 'hangman', title: 'Hangman', blurb: 'Co-op or versus' },
  { id: 'codenames', title: 'Codenames', blurb: 'Duet', wide: true },
  { id: 'guesswho', title: 'Guess Who', blurb: 'Valorant agents', wide: true },
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
}

export function isArcadeWide(id: ArcadeGameId | null): boolean {
  if (!id) return false
  return Boolean(ARCADE_TILES.find((t) => t.id === id)?.wide)
}
