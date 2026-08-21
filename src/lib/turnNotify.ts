/** Arcade games that fire in-app / browser turn pings. */
export type TurnNotifyGame = 'scrabble' | 'wordle'

/** Fields we read off arcade current-game docs for turn pings. */
export type TurnSnapshot = {
  turnUid?: unknown
  status?: unknown
  hotseat?: unknown
  /** Wordle (and similar) setup phases — only ping when `playing`. */
  phase?: unknown
}

const GAME_LABEL: Record<TurnNotifyGame, string> = {
  scrabble: 'Scrabble',
  wordle: 'Wordle',
}

/**
 * Who should get a "your turn" ping after this write.
 * Null if nothing changed, the game is idle, or it's hotseat (same device).
 */
export function arcadeTurnNotifyUid(
  before: TurnSnapshot | null | undefined,
  after: TurnSnapshot | null | undefined,
): string | null {
  if (!after || after.hotseat) return null
  if (after.status !== 'playing') return null
  if (typeof after.phase === 'string' && after.phase !== 'playing') return null
  if (typeof after.turnUid !== 'string' || !after.turnUid) return null
  if (before && before.status === 'playing') {
    const beforePhaseOk =
      typeof before.phase !== 'string' || before.phase === 'playing'
    if (beforePhaseOk && before.turnUid === after.turnUid) return null
  }
  return after.turnUid
}

/** @deprecated Prefer arcadeTurnNotifyUid — kept for existing call sites/tests. */
export const scrabbleTurnNotifyUid = arcadeTurnNotifyUid

export function turnNotifyPath(game: TurnNotifyGame): string {
  return `/arcade?game=${game}`
}

export function turnNotifyPayload(game: TurnNotifyGame): {
  title: string
  body: string
  tag: string
} {
  return {
    title: GAME_LABEL[game],
    body: "It's your turn.",
    tag: `${game}-turn`,
  }
}

export function turnNotifyGameLabel(game: TurnNotifyGame): string {
  return GAME_LABEL[game]
}
