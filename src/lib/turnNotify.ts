/** Fields we read off arcade current-game docs for turn pings. */
export type TurnSnapshot = {
  turnUid?: unknown
  status?: unknown
  hotseat?: unknown
}

/**
 * Who should get a "your turn" ping after this write.
 * Null if nothing changed, the game is idle, or it's hotseat (same device).
 */
export function scrabbleTurnNotifyUid(
  before: TurnSnapshot | null | undefined,
  after: TurnSnapshot | null | undefined,
): string | null {
  if (!after || after.hotseat) return null
  if (after.status !== 'playing') return null
  if (typeof after.turnUid !== 'string' || !after.turnUid) return null
  if (before && before.status === 'playing' && before.turnUid === after.turnUid) {
    return null
  }
  return after.turnUid
}

export const TURN_NOTIFY_TAG = 'scrabble-turn'

export function turnNotifyPayload(): { title: string; body: string; tag: string } {
  return {
    title: 'Scrabble',
    body: "It's your turn.",
    tag: TURN_NOTIFY_TAG,
  }
}
