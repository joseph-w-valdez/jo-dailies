/** Cat Connect Four — turn-based shared board. */

import {
  JENGA_PLAYER_UIDS,
  isRoomUid,
  nextTurnUid,
  normalizeJengaCats,
  parseOptionalSeatUid,
  pickTwoJengaCats,
} from './jenga'

export { themeForCatIcon } from './jenga'

export const C4_COLS = 7
export const C4_ROWS = 6
export const C4_CELLS = C4_COLS * C4_ROWS

export type C4Status = 'playing' | 'won' | 'draw'

/** -1 empty, 0 / 1 = seat index. */
export type C4Cell = -1 | 0 | 1

export interface Connect4State {
  grid: C4Cell[]
  cats: [string, string]
  turnUid: string
  status: C4Status
  winnerUid: string | null
  /** Debug: one human plays both seats. */
  hotseat: boolean
  version: number
  roundId: string
  updatedAt: number
  /** Cell index of the most recent drop, or null before the first move. */
  lastDropIndex: number | null
  /** null = who-goes-first picker. */
  firstUid: string | null
}

function clampNum(n: unknown, fallback = 0): number {
  const v = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(v) ? v : fallback
}

function newRoundId(): string {
  return `c4-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function emptyC4Grid(): C4Cell[] {
  return Array.from({ length: C4_CELLS }, () => -1 as C4Cell)
}

export function createInitialConnect4(
  turnUid: string,
  opts?: { hotseat?: boolean },
): Connect4State {
  return {
    grid: emptyC4Grid(),
    cats: pickTwoJengaCats(),
    turnUid: turnUid || JENGA_PLAYER_UIDS[0]!,
    status: 'playing',
    winnerUid: null,
    hotseat: Boolean(opts?.hotseat),
    version: 1,
    roundId: newRoundId(),
    updatedAt: Date.now(),
    lastDropIndex: null,
    firstUid: null,
  }
}

export function selectConnect4First(
  state: Connect4State,
  uid: string,
): Connect4State | null {
  if (state.firstUid !== null) return null
  if (!isRoomUid(uid)) return null
  return {
    ...state,
    firstUid: uid,
    turnUid: uid,
    updatedAt: Date.now(),
  }
}

/** Loser concedes — opponent wins. */
export function surrenderConnect4(
  state: Connect4State,
  loserUid: string,
): Connect4State | null {
  if (state.status !== 'playing' || state.firstUid == null) return null
  if (!isRoomUid(loserUid)) return null
  return {
    ...state,
    status: 'won',
    winnerUid: nextTurnUid(loserUid),
    updatedAt: Date.now(),
  }
}

export function seatForUid(uid: string | null): 0 | 1 | null {
  if (!uid) return null
  const idx = JENGA_PLAYER_UIDS.findIndex((id) => id === uid)
  if (idx === 0 || idx === 1) return idx
  // Offline / unknown — seat 0 for solo testing.
  if (uid === 'local') return 0
  return null
}

export function colRowToIndex(col: number, row: number): number {
  return row * C4_COLS + col
}

/** Lowest empty row in column, or -1 if full. */
export function dropRow(grid: C4Cell[], col: number): number {
  if (col < 0 || col >= C4_COLS) return -1
  for (let row = C4_ROWS - 1; row >= 0; row -= 1) {
    if (grid[colRowToIndex(col, row)] === -1) return row
  }
  return -1
}

function cellAt(grid: C4Cell[], col: number, row: number): C4Cell {
  if (col < 0 || col >= C4_COLS || row < 0 || row >= C4_ROWS) return -1
  return grid[colRowToIndex(col, row)] ?? -1
}

export function findWinner(grid: C4Cell[]): 0 | 1 | null {
  const dirs: [number, number][] = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ]
  for (let row = 0; row < C4_ROWS; row += 1) {
    for (let col = 0; col < C4_COLS; col += 1) {
      const seat = cellAt(grid, col, row)
      if (seat !== 0 && seat !== 1) continue
      for (const [dc, dr] of dirs) {
        let n = 1
        for (let k = 1; k < 4; k += 1) {
          if (cellAt(grid, col + dc * k, row + dr * k) !== seat) break
          n += 1
        }
        if (n >= 4) return seat
      }
    }
  }
  return null
}

export function isBoardFull(grid: C4Cell[]): boolean {
  return grid.every((c) => c !== -1)
}

/** Apply a legal drop; returns null if illegal. */
export function applyConnect4Drop(
  state: Connect4State,
  uid: string,
  col: number,
): Connect4State | null {
  if (state.firstUid == null) return null
  if (state.status !== 'playing') return null
  if (state.turnUid !== uid) return null
  const seat = seatForUid(uid)
  if (seat === null) return null
  const row = dropRow(state.grid, col)
  if (row < 0) return null
  const grid = state.grid.slice() as C4Cell[]
  const lastDropIndex = colRowToIndex(col, row)
  grid[lastDropIndex] = seat
  const winner = findWinner(grid)
  if (winner !== null) {
    const winnerUid = JENGA_PLAYER_UIDS[winner] ?? uid
    return {
      ...state,
      grid,
      status: 'won',
      winnerUid,
      lastDropIndex,
      updatedAt: Date.now(),
    }
  }
  if (isBoardFull(grid)) {
    return {
      ...state,
      grid,
      status: 'draw',
      winnerUid: null,
      lastDropIndex,
      updatedAt: Date.now(),
    }
  }
  return {
    ...state,
    grid,
    turnUid: nextTurnUid(uid),
    lastDropIndex,
    updatedAt: Date.now(),
  }
}

export function normalizeConnect4(
  raw: unknown,
  fallbackTurnUid: string,
): Connect4State {
  if (!raw || typeof raw !== 'object') {
    return createInitialConnect4(fallbackTurnUid)
  }
  const s = raw as Record<string, unknown>
  const gridRaw = Array.isArray(s.grid) ? s.grid : []
  const grid: C4Cell[] = emptyC4Grid()
  for (let i = 0; i < C4_CELLS; i += 1) {
    const v = gridRaw[i]
    grid[i] = v === 0 || v === 1 ? v : -1
  }
  const status: C4Status =
    s.status === 'won' || s.status === 'draw' || s.status === 'playing'
      ? s.status
      : 'playing'
  return {
    grid,
    cats: normalizeJengaCats(
      s.cats,
      clampNum(s.version, 1) * 1009 + clampNum(s.updatedAt, 1),
    ),
    turnUid:
      typeof s.turnUid === 'string' && s.turnUid
        ? s.turnUid
        : fallbackTurnUid || JENGA_PLAYER_UIDS[0]!,
    status,
    winnerUid: typeof s.winnerUid === 'string' ? s.winnerUid : null,
    hotseat: Boolean(s.hotseat),
    version: Math.max(1, Math.floor(clampNum(s.version, 1))),
    roundId:
      typeof s.roundId === 'string' && s.roundId ? s.roundId : newRoundId(),
    updatedAt: Math.floor(clampNum(s.updatedAt, Date.now())),
    lastDropIndex: (() => {
      const i = Math.floor(clampNum(s.lastDropIndex, -1))
      return i >= 0 && i < C4_CELLS ? i : null
    })(),
    firstUid: parseOptionalSeatUid(
      s.firstUid,
      'firstUid' in s,
      typeof s.turnUid === 'string' && s.turnUid
        ? s.turnUid
        : fallbackTurnUid || JENGA_PLAYER_UIDS[0]!,
    ),
  }
}
