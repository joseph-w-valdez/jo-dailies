/** Abcrelax — shared letter race (type answers, timer, challenge). */

import {
  JENGA_PLAYER_UIDS,
  isRoomUid,
  nextTurnUid,
  parseOptionalSeatUid,
} from './jenga'

export const ABCRELAX_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export const ABCRELAX_TIMER_OPTIONS_MS = [10_000, 15_000, 20_000] as const
export type AbcrelaxTimerMs = (typeof ABCRELAX_TIMER_OPTIONS_MS)[number]

export const ABCRELAX_THEMES: readonly string[] = [
  'Animals',
  'Foods',
  'Movies',
  'Countries',
  'Cities',
  'Sports',
  'Jobs',
  'Things in a kitchen',
  'Video games',
  'TV shows',
  'Car brands',
  'Valorant agents',
  'Things that are cold',
  'Things that fly',
  'Boy names',
  'Girl names',
  'Desserts',
  'Drinks',
  'Holidays',
  'Apps on your phone',
  'Things Joseph likes',
  'Things Joha likes',
]

export type AbcrelaxPhase =
  | 'pickTheme'
  | 'pickTimer'
  | 'playing'
  | 'finished'

export type AbcrelaxStatus = 'playing' | 'won' | 'draw'

export type AbcrelaxAnswer = {
  uid: string
  letter: string
  word: string
}

export interface AbcrelaxState {
  version: number
  updatedAt: number
  roundId: string
  hotseat: boolean
  /** null until who-goes-first is picked. */
  firstUid: string | null
  status: AbcrelaxStatus
  phase: AbcrelaxPhase
  /** Whose turn to answer. */
  turnUid: string
  theme: string | null
  /** Per-turn budget once the round starts. */
  turnMs: number
  usedLetters: string[]
  deadlineAt: number | null
  lastAnswer: AbcrelaxAnswer | null
  winnerUid: string | null
}

function clampNum(n: unknown, fallback = 0): number {
  const v = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(v) ? v : fallback
}

function newRoundId(): string {
  return `abc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeLetter(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim().toUpperCase()
  if (trimmed.length !== 1) return null
  return ABCRELAX_LETTERS.includes(trimmed) ? trimmed : null
}

function normalizeWord(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().slice(0, 64)
}

function normalizeAnswer(raw: unknown): AbcrelaxAnswer | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const uid = typeof o.uid === 'string' && isRoomUid(o.uid) ? o.uid : null
  const letter = normalizeLetter(o.letter)
  const word = normalizeWord(o.word)
  if (!uid || !letter || !word) return null
  return { uid, letter, word }
}

function normalizeUsedLetters(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of raw) {
    const letter = normalizeLetter(item)
    if (!letter || seen.has(letter)) continue
    seen.add(letter)
    out.push(letter)
  }
  return out
}

function parsePhase(raw: unknown): AbcrelaxPhase {
  if (raw === 'roundOver' || raw === 'gameOver' || raw === 'pending') {
    return raw === 'pending' ? 'playing' : 'finished'
  }
  if (
    raw === 'pickTheme' ||
    raw === 'pickTimer' ||
    raw === 'playing' ||
    raw === 'finished'
  ) {
    return raw
  }
  if (raw === 'pickCategory') return 'pickTheme'
  return 'pickTheme'
}

function parseStatus(raw: unknown): AbcrelaxStatus {
  if (raw === 'won' || raw === 'draw') return raw
  return 'playing'
}

function parseTurnMs(raw: unknown): number {
  const n = Math.floor(clampNum(raw, 10_000))
  if ((ABCRELAX_TIMER_OPTIONS_MS as readonly number[]).includes(n)) return n
  return 10_000
}

function bump(state: AbcrelaxState, patch: Partial<AbcrelaxState>): AbcrelaxState {
  return { ...state, ...patch, updatedAt: Date.now() }
}

function finishWin(state: AbcrelaxState, winnerUid: string): AbcrelaxState {
  return bump(state, {
    status: 'won',
    phase: 'finished',
    winnerUid,
    turnUid: winnerUid,
    deadlineAt: null,
  })
}

function finishDraw(state: AbcrelaxState): AbcrelaxState {
  return bump(state, {
    status: 'draw',
    phase: 'finished',
    winnerUid: null,
    deadlineAt: null,
  })
}

export function createInitialAbcrelax(
  turnUid: string,
  opts?: { hotseat?: boolean },
): AbcrelaxState {
  const starter = isRoomUid(turnUid) ? turnUid : JENGA_PLAYER_UIDS[0]!
  return {
    version: 1,
    updatedAt: Date.now(),
    roundId: newRoundId(),
    hotseat: Boolean(opts?.hotseat),
    firstUid: null,
    status: 'playing',
    phase: 'pickTheme',
    turnUid: starter,
    theme: null,
    turnMs: 10_000,
    usedLetters: [],
    deadlineAt: null,
    lastAnswer: null,
    winnerUid: null,
  }
}

export function normalizeAbcrelax(raw: unknown, uid: string): AbcrelaxState {
  const fallback = createInitialAbcrelax(uid)
  if (!raw || typeof raw !== 'object') return fallback
  const s = raw as Record<string, unknown>
  const firstUid = parseOptionalSeatUid(
    s.firstUid,
    Object.prototype.hasOwnProperty.call(s, 'firstUid'),
    null,
  )
  const turnUid =
    typeof s.turnUid === 'string' && isRoomUid(s.turnUid)
      ? s.turnUid
      : fallback.turnUid
  let status = parseStatus(s.status)
  let phase = parsePhase(s.phase)
  if (status === 'won' || status === 'draw') phase = 'finished'
  if (firstUid == null && phase !== 'finished') phase = 'pickTheme'

  return {
    version: Math.max(1, Math.floor(clampNum(s.version, 1))),
    updatedAt: Math.floor(clampNum(s.updatedAt, Date.now())),
    roundId:
      typeof s.roundId === 'string' && s.roundId.trim()
        ? s.roundId.trim()
        : fallback.roundId,
    hotseat: Boolean(s.hotseat),
    firstUid,
    status,
    phase,
    turnUid,
    theme:
      typeof s.theme === 'string' && s.theme.trim()
        ? s.theme.trim().slice(0, 80)
        : typeof s.category === 'string' && s.category.trim()
          ? s.category.trim().slice(0, 80)
          : null,
    turnMs: parseTurnMs(s.turnMs),
    usedLetters: normalizeUsedLetters(s.usedLetters),
    deadlineAt:
      typeof s.deadlineAt === 'number' && Number.isFinite(s.deadlineAt)
        ? s.deadlineAt
        : null,
    lastAnswer: normalizeAnswer(s.lastAnswer) ?? normalizeAnswer(s.pending),
    winnerUid:
      typeof s.winnerUid === 'string' && isRoomUid(s.winnerUid)
        ? s.winnerUid
        : null,
  }
}

export function selectAbcrelaxFirst(
  state: AbcrelaxState,
  uid: string,
): AbcrelaxState | null {
  if (state.firstUid !== null) return null
  if (state.status !== 'playing') return null
  if (!isRoomUid(uid)) return null
  return bump(state, {
    firstUid: uid,
    turnUid: uid,
    phase: 'pickTheme',
    theme: null,
    usedLetters: [],
    deadlineAt: null,
    lastAnswer: null,
    winnerUid: null,
  })
}

export function pickAbcrelaxTheme(
  state: AbcrelaxState,
  uid: string,
  theme: string,
): AbcrelaxState | null {
  if (state.firstUid == null) return null
  if (state.status !== 'playing' || state.phase !== 'pickTheme') return null
  if (!isRoomUid(uid)) return null
  const trimmed = theme.trim().slice(0, 80)
  if (!trimmed) return null
  return bump(state, {
    theme: trimmed,
    phase: 'pickTimer',
    turnUid: state.firstUid,
  })
}

export function pickAbcrelaxTimer(
  state: AbcrelaxState,
  uid: string,
  turnMs: number,
): AbcrelaxState | null {
  if (state.firstUid == null || !state.theme) return null
  if (state.status !== 'playing' || state.phase !== 'pickTimer') return null
  if (!isRoomUid(uid)) return null
  if (!(ABCRELAX_TIMER_OPTIONS_MS as readonly number[]).includes(turnMs)) {
    return null
  }
  const starter = state.firstUid
  return bump(state, {
    turnMs,
    phase: 'playing',
    turnUid: starter,
    usedLetters: [],
    lastAnswer: null,
    deadlineAt: Date.now() + turnMs,
  })
}

export function wordMatchesLetter(word: string, letter: string): boolean {
  const w = word.trim()
  const L = letter.trim().toUpperCase()
  if (!w || !L) return false
  return w.charAt(0).toUpperCase() === L
}

/** Lock the letter, pass the turn, start the next clock. Challenge is optional. */
export function submitAbcrelaxAnswer(
  state: AbcrelaxState,
  uid: string,
  letterRaw: string,
  wordRaw: string,
): AbcrelaxState | null {
  if (state.firstUid == null || !state.theme) return null
  if (state.status !== 'playing' || state.phase !== 'playing') return null
  if (!isRoomUid(uid) || state.turnUid !== uid) return null
  if (state.deadlineAt != null && Date.now() > state.deadlineAt) return null

  const letter = normalizeLetter(letterRaw)
  const word = normalizeWord(wordRaw)
  if (!letter || !word) return null
  if (!wordMatchesLetter(word, letter)) return null
  if (state.usedLetters.includes(letter)) return null

  const answer: AbcrelaxAnswer = { uid, letter, word }
  const usedLetters = [...state.usedLetters, letter]

  if (usedLetters.length >= ABCRELAX_LETTERS.length) {
    return finishDraw(
      bump(state, {
        usedLetters,
        lastAnswer: answer,
      }),
    )
  }

  const next = nextTurnUid(uid)
  return bump(state, {
    usedLetters,
    lastAnswer: answer,
    phase: 'playing',
    turnUid: next,
    deadlineAt: Date.now() + state.turnMs,
  })
}

/**
 * Optional: on your turn, challenge the previous player's word.
 * Challenger wins if the answer was bunk.
 */
export function challengeAbcrelaxLast(
  state: AbcrelaxState,
  uid: string,
): AbcrelaxState | null {
  if (state.status !== 'playing' || state.phase !== 'playing') return null
  if (!isRoomUid(uid) || state.turnUid !== uid) return null
  if (!state.lastAnswer || state.lastAnswer.uid === uid) return null
  return finishWin(state, uid)
}

/** Either seat may resolve an expired timer — current player loses. */
export function resolveAbcrelaxTimeout(
  state: AbcrelaxState,
  _uid?: string,
): AbcrelaxState | null {
  if (state.status !== 'playing' || state.phase !== 'playing') return null
  if (state.deadlineAt == null || Date.now() < state.deadlineAt) return null
  const loser = state.turnUid
  return finishWin(
    bump(state, { deadlineAt: null }),
    nextTurnUid(loser),
  )
}

export function surrenderAbcrelax(
  state: AbcrelaxState,
  loserUid: string,
): AbcrelaxState | null {
  if (state.firstUid == null) return null
  if (state.status !== 'playing') return null
  if (state.phase === 'finished') return null
  if (!isRoomUid(loserUid)) return null
  return finishWin(state, nextTurnUid(loserUid))
}

export function letterIsUsed(state: AbcrelaxState, letter: string): boolean {
  const L = normalizeLetter(letter)
  if (!L) return false
  return state.usedLetters.includes(L)
}

export function msLeft(state: AbcrelaxState, now = Date.now()): number | null {
  if (state.phase !== 'playing' || state.deadlineAt == null) return null
  return Math.max(0, state.deadlineAt - now)
}
