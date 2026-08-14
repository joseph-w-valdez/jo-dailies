import { JENGA_PLAYER_UIDS, nextTurnUid } from './jenga'

/** Fallback if Sweaty is started without a preset (5+0 blitz). */
export const CHESS_CLOCK_MS = 5 * 60 * 1000

/** Fallback if Sweaty is started without a preset (5 min). */
export const SCRABBLE_CLOCK_MS = 5 * 60 * 1000

export type ClockMode = 'off' | 'timed'

export type ClockControl = {
  initialMs: number
  incrementMs: number
}

export type ClockPreset = ClockControl & {
  label: string
  blurb: string
}

/** Bullet / blitz: 1+0, 3+2, 5+0. */
export const CHESS_CLOCK_PRESETS: ClockPreset[] = [
  {
    label: '1+0',
    blurb: 'Bullet — no increment.',
    initialMs: 1 * 60 * 1000,
    incrementMs: 0,
  },
  {
    label: '3+2',
    blurb: 'Blitz — Fischer increment.',
    initialMs: 3 * 60 * 1000,
    incrementMs: 2_000,
  },
  {
    label: '5+0',
    blurb: 'Blitz — no increment.',
    initialMs: CHESS_CLOCK_MS,
    incrementMs: 0,
  },
]

/** Speed clocks — not tournament 25. */
export const SCRABBLE_CLOCK_PRESETS: ClockPreset[] = [
  {
    label: '3 min',
    blurb: 'Bullet — type fast.',
    initialMs: 3 * 60 * 1000,
    incrementMs: 0,
  },
  {
    label: '5 min',
    blurb: 'Blitz.',
    initialMs: SCRABBLE_CLOCK_MS,
    incrementMs: 0,
  },
  {
    label: '10 min',
    blurb: 'Still sweaty.',
    initialMs: 10 * 60 * 1000,
    incrementMs: 0,
  },
]

export type ClockFields = {
  clockMode: ClockMode | null
  clockMs: Record<string, number>
  clockTurnStartedAt: number | null
  clockIncrementMs: number
}

export function emptyClockMs(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const uid of JENGA_PLAYER_UIDS) out[uid] = 0
  return out
}

export function filledClockMs(ms: number): Record<string, number> {
  const out: Record<string, number> = {}
  for (const uid of JENGA_PLAYER_UIDS) out[uid] = ms
  return out
}

export function parseClockMode(raw: unknown): ClockMode | null {
  if (raw === 'off' || raw === 'timed') return raw
  if (raw === null) return null
  return 'off'
}

export function parseClockMs(raw: unknown): Record<string, number> {
  const out = emptyClockMs()
  if (!raw || typeof raw !== 'object') return out
  const o = raw as Record<string, unknown>
  for (const uid of JENGA_PLAYER_UIDS) {
    const n = typeof o[uid] === 'number' ? o[uid] : Number(o[uid])
    out[uid] = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
  }
  return out
}

export function parseClockIncrementMs(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.floor(n))
}

const MAX_INITIAL_MIN = 180
const MAX_INCREMENT_SEC = 120

/**
 * Minutes, or chess-style minutes+increment-seconds.
 * `10`, `10+0`, `3+2`, `25 min`.
 */
export function parseClockControl(raw: string): ClockControl | null {
  let t = raw.trim().toLowerCase().replace(/\s+/g, '')
  t = t.replace(/minutes?$/, '').replace(/mins?$/, '').replace(/m$/, '')
  if (!t) return null
  const m = t.match(/^(\d+(?:\.\d+)?)\+(\d+)$/) ?? t.match(/^(\d+(?:\.\d+)?)$/)
  if (!m) return null
  const minutes = Number(m[1])
  const incSec = m[2] != null ? Number(m[2]) : 0
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > MAX_INITIAL_MIN) {
    return null
  }
  if (!Number.isFinite(incSec) || incSec < 0 || incSec > MAX_INCREMENT_SEC) {
    return null
  }
  const initialMs = Math.round(minutes * 60 * 1000)
  if (initialMs < 1_000) return null
  return { initialMs, incrementMs: Math.round(incSec * 1000) }
}

export function startClockFields(
  mode: ClockMode,
  initialMs: number,
  now = Date.now(),
  incrementMs = 0,
): ClockFields {
  if (mode === 'off') {
    return {
      clockMode: 'off',
      clockMs: emptyClockMs(),
      clockTurnStartedAt: null,
      clockIncrementMs: 0,
    }
  }
  return {
    clockMode: 'timed',
    clockMs: filledClockMs(initialMs),
    clockTurnStartedAt: now,
    clockIncrementMs: Math.max(0, Math.floor(incrementMs)),
  }
}

/** Remaining time for a seat. Current player counts down from turn start. */
export function liveClockMs(
  clock: ClockFields,
  uid: string,
  turnUid: string,
  playing: boolean,
  now = Date.now(),
): number {
  const stored = clock.clockMs[uid] ?? 0
  if (clock.clockMode !== 'timed' || !playing) return stored
  if (uid !== turnUid || clock.clockTurnStartedAt == null) return stored
  return Math.max(0, stored - (now - clock.clockTurnStartedAt))
}

export function formatClockMs(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function opponentOf(uid: string): string {
  return nextTurnUid(uid)
}

/**
 * After an action: if the turn changed, deduct the mover's elapsed time
 * and add Fischer increment (if any). Returns timedOutUid when they flagged
 * (caller should reject the action only if the game is otherwise still playing).
 */
export function applyClockAfterTurn<T extends ClockFields & { turnUid: string }>(
  prev: T,
  next: T,
  now = Date.now(),
): { next: T; timedOutUid: string | null } {
  if (prev.clockMode !== 'timed') {
    return {
      next: {
        ...next,
        clockMode: prev.clockMode,
        clockMs: prev.clockMs,
        clockTurnStartedAt: null,
        clockIncrementMs: 0,
      },
      timedOutUid: null,
    }
  }

  const elapsed =
    prev.clockTurnStartedAt == null
      ? 0
      : Math.max(0, now - prev.clockTurnStartedAt)
  const left = Math.max(0, (prev.clockMs[prev.turnUid] ?? 0) - elapsed)
  const timedOutUid = left <= 0 ? prev.turnUid : null
  const increment =
    timedOutUid || next.turnUid === prev.turnUid
      ? 0
      : Math.max(0, prev.clockIncrementMs ?? 0)
  const clockMs = { ...prev.clockMs, [prev.turnUid]: left + increment }

  if (next.turnUid === prev.turnUid) {
    return {
      next: {
        ...next,
        clockMode: 'timed',
        clockMs,
        clockTurnStartedAt: prev.clockTurnStartedAt,
        clockIncrementMs: prev.clockIncrementMs ?? 0,
      },
      timedOutUid,
    }
  }

  return {
    next: {
      ...next,
      clockMode: 'timed',
      clockMs,
      clockTurnStartedAt: now,
      clockIncrementMs: prev.clockIncrementMs ?? 0,
    },
    timedOutUid,
  }
}
