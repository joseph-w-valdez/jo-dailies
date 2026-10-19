/** Arcade tile order: "frecency" — play count weighted by how recent each play was. */

const DAY_MS = 86_400_000
/** A play's weight halves every two weeks. */
export const ARCADE_FRECENCY_HALF_LIFE_DAYS = 14

const OPENS_KEY = 'jo-dailies:arcade-opens:v1'
const MAX_OPENS = 300

export type ArcadePlay = { gameId: string; at: number }

export function playWeight(at: number, now: number): number {
  const ageDays = Math.max(0, now - at) / DAY_MS
  return Math.pow(0.5, ageDays / ARCADE_FRECENCY_HALF_LIFE_DAYS)
}

export function arcadeFrecencyScores(
  plays: readonly ArcadePlay[],
  now = Date.now(),
): Map<string, number> {
  const scores = new Map<string, number>()
  for (const play of plays) {
    scores.set(play.gameId, (scores.get(play.gameId) ?? 0) + playWeight(play.at, now))
  }
  return scores
}

/** Highest frecency first; ties keep the original order. */
export function sortByFrecency<T extends { id: string }>(
  items: readonly T[],
  plays: readonly ArcadePlay[],
  now = Date.now(),
): T[] {
  const scores = arcadeFrecencyScores(plays, now)
  return [...items].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))
}

/** Put `pinnedIndex` items back at their fixed slots; everything else keeps its order. */
export function placePinned<T extends { pinnedIndex?: number }>(items: readonly T[]): T[] {
  const pinned = items
    .filter((item) => item.pinnedIndex != null)
    .sort((a, b) => a.pinnedIndex! - b.pinnedIndex!)
  const out = items.filter((item) => item.pinnedIndex == null)
  for (const item of pinned) {
    out.splice(Math.min(Math.max(0, item.pinnedIndex!), out.length), 0, item)
  }
  return out
}

/** Device-local opens — the only signal for games without match history. */
export function loadArcadeOpens(): ArcadePlay[] {
  try {
    const raw = JSON.parse(localStorage.getItem(OPENS_KEY) ?? '[]') as unknown
    if (!Array.isArray(raw)) return []
    return raw.filter(
      (p): p is ArcadePlay =>
        Boolean(p) &&
        typeof (p as ArcadePlay).gameId === 'string' &&
        typeof (p as ArcadePlay).at === 'number',
    )
  } catch {
    return []
  }
}

export function recordArcadeOpen(gameId: string, now = Date.now()): ArcadePlay[] {
  const next = [...loadArcadeOpens(), { gameId, at: now }].slice(-MAX_OPENS)
  try {
    localStorage.setItem(OPENS_KEY, JSON.stringify(next))
  } catch {
    /* private mode / quota */
  }
  return next
}
