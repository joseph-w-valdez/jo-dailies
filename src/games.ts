import type { GameDef, GameId } from './types'

export const GAMES: GameDef[] = [
  {
    id: 'connections',
    label: 'Connections',
    url: 'https://connectionsgame.org/',
    accent: '#a78bfa',
    embeddable: true,
    darkEmbed: true,
  },
  {
    id: 'stackdown',
    label: 'Stackdown',
    url: 'https://puzzlist.com/stackdown/',
    accent: '#34d399',
    embeddable: true,
  },
  {
    id: 'chess',
    label: 'Chess Daily',
    url: 'https://www.chess.com/daily',
    accent: '#60a5fa',
    embeddable: false,
  },
  {
    id: 'waffle',
    label: 'Waffle',
    url: 'https://wafflegame.net/daily',
    accent: '#fbbf24',
    embeddable: false,
  },
]

export const GAME_IDS: GameId[] = GAMES.map((g) => g.id)

export const GAME_COUNT = GAMES.length

export function getGame(id: GameId): GameDef | undefined {
  return GAMES.find((g) => g.id === id)
}
