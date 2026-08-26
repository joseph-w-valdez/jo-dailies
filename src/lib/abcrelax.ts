/** Abcrelax — Tapple-style letter wheel for two household seats. */

import {
  JENGA_PLAYER_UIDS,
  isRoomUid,
  nextTurnUid,
  parseOptionalSeatUid,
} from './jenga'

export const ABCRELAX_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export const ABCRELAX_TURN_MS = 10_000
export const ABCRELAX_CARDS_TO_WIN = 3
export const ABCRELAX_MAX_ANSWERS_NEEDED = 3

export type AbcrelaxPhase =
  | 'playing'
  | 'pending'
  | 'roundOver'
  | 'gameOver'

export type AbcrelaxStatus = 'playing' | 'won'

/** How answers are entered — shared so both seats match. */
export type AbcrelaxAnswerMode = 'type' | 'verbal'

export type AbcrelaxPending = {
  uid: string
  letter: string
  word: string
}

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
  /** `type` = typed word + accept/challenge; `verbal` = Discord + letter only. */
  answerMode: AbcrelaxAnswerMode
  status: AbcrelaxStatus
  phase: AbcrelaxPhase
  /** Who must act (answer, or accept/challenge while pending). */
  turnUid: string
  usedLetters: string[]
  alive: Record<string, boolean>
  scores: Record<string, number>
  /** 1 normally; 2–3 in overtime. */
  answersNeeded: number
  /** Locked answers this turn toward answersNeeded. */
  answersThisTurn: AbcrelaxAnswer[]
  deadlineAt: number | null
  pending: AbcrelaxPending | null
  lastAnswer: AbcrelaxAnswer | null
  winnerUid: string | null
  roundWinnerUid: string | null
  /** Who starts the next round (rotates after each card). */
  roundStarterUid: string
}

function clampNum(n: unknown, fallback = 0): number {
  const v = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(v) ? v : fallback
}

function newRoundId(): string {
  return `abc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function emptyAlive(): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const uid of JENGA_PLAYER_UIDS) out[uid] = true
  return out
}

function emptyScores(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const uid of JENGA_PLAYER_UIDS) out[uid] = 0
  return out
}

function normalizeAlive(raw: unknown): Record<string, boolean> {
  const out = emptyAlive()
  if (!raw || typeof raw !== 'object') return out
  const o = raw as Record<string, unknown>
  for (const uid of JENGA_PLAYER_UIDS) {
    if (typeof o[uid] === 'boolean') out[uid] = o[uid]
  }
  return out
}

function normalizeScores(raw: unknown): Record<string, number> {
  const out = emptyScores()
  if (!raw || typeof raw !== 'object') return out
  const o = raw as Record<string, unknown>
  for (const uid of JENGA_PLAYER_UIDS) {
    out[uid] = Math.max(0, Math.floor(clampNum(o[uid], 0)))
  }
  return out
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

function normalizePending(raw: unknown): AbcrelaxPending | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const uid = typeof o.uid === 'string' && isRoomUid(o.uid) ? o.uid : null
  const letter = normalizeLetter(o.letter)
  const word = normalizeWord(o.word)
  if (!uid || !letter || !word) return null
  return { uid, letter, word }
}

function normalizeAnswer(raw: unknown): AbcrelaxAnswer | null {
  return normalizePending(raw)
}

function normalizeAnswers(raw: unknown): AbcrelaxAnswer[] {
  if (!Array.isArray(raw)) return []
  const out: AbcrelaxAnswer[] = []
  for (const item of raw) {
    const a = normalizeAnswer(item)
    if (a) out.push(a)
  }
  return out.slice(0, ABCRELAX_MAX_ANSWERS_NEEDED)
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

function parseAnswerMode(raw: unknown): AbcrelaxAnswerMode {
  return raw === 'verbal' ? 'verbal' : 'type'
}

function parsePhase(raw: unknown): AbcrelaxPhase {
  // Legacy docs used pickCategory — treat as waiting to start a round.
  if (raw === 'pickCategory') return 'roundOver'
  if (
    raw === 'playing' ||
    raw === 'pending' ||
    raw === 'roundOver' ||
    raw === 'gameOver'
  ) {
    return raw
  }
  return 'playing'
}

function aliveCount(alive: Record<string, boolean>): number {
  return JENGA_PLAYER_UIDS.filter((uid) => alive[uid]).length
}

function soleAliveUid(alive: Record<string, boolean>): string | null {
  const left = JENGA_PLAYER_UIDS.filter((uid) => alive[uid])
  return left.length === 1 ? left[0]! : null
}

function bump(state: AbcrelaxState, patch: Partial<AbcrelaxState>): AbcrelaxState {
  return { ...state, ...patch, updatedAt: Date.now() }
}

function beginRound(
  state: AbcrelaxState,
  starterUid: string,
  answersNeeded: number,
): AbcrelaxState {
  return bump(state, {
    usedLetters: [],
    alive: emptyAlive(),
    answersNeeded,
    answersThisTurn: [],
    pending: null,
    lastAnswer: null,
    roundWinnerUid: null,
    roundStarterUid: starterUid,
    phase: 'playing',
    turnUid: starterUid,
    deadlineAt: Date.now() + ABCRELAX_TURN_MS,
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
    answerMode: 'type',
    status: 'playing',
    phase: 'playing',
    turnUid: starter,
    usedLetters: [],
    alive: emptyAlive(),
    scores: emptyScores(),
    answersNeeded: 1,
    answersThisTurn: [],
    deadlineAt: null,
    pending: null,
    lastAnswer: null,
    winnerUid: null,
    roundWinnerUid: null,
    roundStarterUid: starter,
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
  const roundStarterUid =
    typeof s.roundStarterUid === 'string' && isRoomUid(s.roundStarterUid)
      ? s.roundStarterUid
      : turnUid
  const status: AbcrelaxStatus = s.status === 'won' ? 'won' : 'playing'
  let phase = parsePhase(s.phase)
  if (status === 'won') phase = 'gameOver'
  if (firstUid == null && phase !== 'gameOver') phase = 'playing'

  return {
    version: Math.max(1, Math.floor(clampNum(s.version, 1))),
    updatedAt: Math.floor(clampNum(s.updatedAt, Date.now())),
    roundId:
      typeof s.roundId === 'string' && s.roundId.trim()
        ? s.roundId.trim()
        : fallback.roundId,
    hotseat: Boolean(s.hotseat),
    firstUid,
    answerMode: parseAnswerMode(s.answerMode),
    status,
    phase,
    turnUid,
    usedLetters: normalizeUsedLetters(s.usedLetters),
    alive: normalizeAlive(s.alive),
    scores: normalizeScores(s.scores),
    answersNeeded: Math.min(
      ABCRELAX_MAX_ANSWERS_NEEDED,
      Math.max(1, Math.floor(clampNum(s.answersNeeded, 1))),
    ),
    answersThisTurn: normalizeAnswers(s.answersThisTurn),
    deadlineAt:
      typeof s.deadlineAt === 'number' && Number.isFinite(s.deadlineAt)
        ? s.deadlineAt
        : null,
    pending: normalizePending(s.pending),
    lastAnswer: normalizeAnswer(s.lastAnswer),
    winnerUid:
      typeof s.winnerUid === 'string' && isRoomUid(s.winnerUid)
        ? s.winnerUid
        : null,
    roundWinnerUid:
      typeof s.roundWinnerUid === 'string' && isRoomUid(s.roundWinnerUid)
        ? s.roundWinnerUid
        : null,
    roundStarterUid,
  }
}

export function selectAbcrelaxFirst(
  state: AbcrelaxState,
  uid: string,
): AbcrelaxState | null {
  if (state.firstUid !== null) return null
  if (state.status !== 'playing') return null
  if (!isRoomUid(uid)) return null
  return beginRound(
    bump(state, {
      firstUid: uid,
      scores: emptyScores(),
      winnerUid: null,
      answerMode: state.answerMode,
    }),
    uid,
    1,
  )
}

export function setAbcrelaxAnswerMode(
  state: AbcrelaxState,
  uid: string,
  mode: AbcrelaxAnswerMode,
): AbcrelaxState | null {
  if (!isRoomUid(uid)) return null
  if (state.answerMode === mode) return null
  // Don't flip mid-pending typed review.
  if (state.phase === 'pending') return null
  return bump(state, { answerMode: mode })
}

function awardRound(
  state: AbcrelaxState,
  winnerUid: string,
): AbcrelaxState {
  const scores = { ...state.scores }
  scores[winnerUid] = (scores[winnerUid] ?? 0) + 1
  const won = (scores[winnerUid] ?? 0) >= ABCRELAX_CARDS_TO_WIN
  return bump(state, {
    scores,
    phase: won ? 'gameOver' : 'roundOver',
    status: won ? 'won' : 'playing',
    winnerUid: won ? winnerUid : null,
    roundWinnerUid: winnerUid,
    turnUid: winnerUid,
    deadlineAt: null,
    pending: null,
    answersThisTurn: [],
  })
}

function eliminate(
  state: AbcrelaxState,
  loserUid: string,
): AbcrelaxState {
  if (!state.alive[loserUid]) return state
  const alive = { ...state.alive, [loserUid]: false }
  const sole = soleAliveUid(alive)
  if (sole) return awardRound({ ...state, alive }, sole)
  return bump(state, {
    alive,
    phase: 'roundOver',
    roundWinnerUid: null,
    deadlineAt: null,
    pending: null,
    answersThisTurn: [],
  })
}

function startTurnTimer(state: AbcrelaxState, turnUid: string): AbcrelaxState {
  return bump(state, {
    turnUid,
    phase: 'playing',
    pending: null,
    answersThisTurn: [],
    deadlineAt: Date.now() + ABCRELAX_TURN_MS,
  })
}

function enterOvertime(state: AbcrelaxState): AbcrelaxState {
  const nextNeeded = Math.min(
    ABCRELAX_MAX_ANSWERS_NEEDED,
    state.answersNeeded + 1,
  )
  // Same starter; shout a new category out loud, then go.
  return beginRound(state, state.roundStarterUid, nextNeeded)
}

function afterAcceptedAnswer(
  state: AbcrelaxState,
  answer: AbcrelaxAnswer,
): AbcrelaxState {
  const usedLetters = state.usedLetters.includes(answer.letter)
    ? state.usedLetters
    : [...state.usedLetters, answer.letter]
  const answersThisTurn = [...state.answersThisTurn, answer]
  const base = bump(state, {
    usedLetters,
    answersThisTurn,
    pending: null,
    lastAnswer: answer,
  })

  if (answersThisTurn.length < state.answersNeeded) {
    return bump(base, {
      phase: 'playing',
      deadlineAt: Date.now() + ABCRELAX_TURN_MS,
    })
  }

  if (
    usedLetters.length >= ABCRELAX_LETTERS.length &&
    aliveCount(base.alive) > 1
  ) {
    return enterOvertime(base)
  }

  const next = nextTurnUid(answer.uid)
  const nextAlive = base.alive[next] ? next : soleAliveUid(base.alive)
  if (!nextAlive) return awardRound(base, answer.uid)
  if (nextAlive !== next && nextAlive === answer.uid) {
    return awardRound(base, answer.uid)
  }
  return startTurnTimer(base, nextAlive)
}

export function wordMatchesLetter(word: string, letter: string): boolean {
  const w = word.trim()
  const L = letter.trim().toUpperCase()
  if (!w || !L) return false
  return w.charAt(0).toUpperCase() === L
}

export function submitAbcrelaxAnswer(
  state: AbcrelaxState,
  uid: string,
  letterRaw: string,
  wordRaw: string,
): AbcrelaxState | null {
  if (state.answerMode !== 'type') return null
  if (state.firstUid == null) return null
  if (state.status !== 'playing' || state.phase !== 'playing') return null
  if (!isRoomUid(uid) || state.turnUid !== uid) return null
  if (!state.alive[uid]) return null
  if (state.deadlineAt != null && Date.now() > state.deadlineAt) return null

  const letter = normalizeLetter(letterRaw)
  const word = normalizeWord(wordRaw)
  if (!letter || !word) return null
  if (!wordMatchesLetter(word, letter)) return null
  if (state.usedLetters.includes(letter)) return null
  if (state.answersThisTurn.some((a) => a.letter === letter)) return null

  const pending: AbcrelaxPending = { uid, letter, word }
  const responder = nextTurnUid(uid)
  return bump(state, {
    phase: 'pending',
    pending,
    turnUid: responder,
    deadlineAt: null,
  })
}

/**
 * Verbal / Discord mode — shout on voice chat, then press a letter.
 * Locks immediately (no typed word, no accept step).
 */
export function submitAbcrelaxLetter(
  state: AbcrelaxState,
  uid: string,
  letterRaw: string,
): AbcrelaxState | null {
  if (state.answerMode !== 'verbal') return null
  if (state.firstUid == null) return null
  if (state.status !== 'playing' || state.phase !== 'playing') return null
  if (!isRoomUid(uid) || state.turnUid !== uid) return null
  if (!state.alive[uid]) return null
  if (state.deadlineAt != null && Date.now() > state.deadlineAt) return null

  const letter = normalizeLetter(letterRaw)
  if (!letter) return null
  if (state.usedLetters.includes(letter)) return null
  if (state.answersThisTurn.some((a) => a.letter === letter)) return null

  return afterAcceptedAnswer(state, { uid, letter, word: '' })
}

/**
 * Verbal mode: challenge the previous player's letter while it's your turn.
 */
export function challengeAbcrelaxLast(
  state: AbcrelaxState,
  uid: string,
): AbcrelaxState | null {
  if (state.answerMode !== 'verbal') return null
  if (state.phase !== 'playing' || !state.lastAnswer) return null
  if (!isRoomUid(uid) || state.turnUid !== uid) return null
  if (state.lastAnswer.uid === uid) return null
  const loser = state.lastAnswer.uid
  return eliminate(
    bump(state, {
      pending: null,
      deadlineAt: null,
      answersThisTurn: [],
    }),
    loser,
  )
}

export function acceptAbcrelaxAnswer(
  state: AbcrelaxState,
  uid: string,
): AbcrelaxState | null {
  if (state.phase !== 'pending' || !state.pending) return null
  if (!isRoomUid(uid) || state.turnUid !== uid) return null
  if (state.pending.uid === uid) return null
  return afterAcceptedAnswer(state, state.pending)
}

export function challengeAbcrelaxAnswer(
  state: AbcrelaxState,
  uid: string,
): AbcrelaxState | null {
  if (state.phase !== 'pending' || !state.pending) return null
  if (!isRoomUid(uid) || state.turnUid !== uid) return null
  if (state.pending.uid === uid) return null
  const loser = state.pending.uid
  return eliminate(
    bump(state, {
      pending: null,
      lastAnswer: state.pending,
      deadlineAt: null,
      answersThisTurn: [],
    }),
    loser,
  )
}

/** Either seat may resolve an expired timer. */
export function resolveAbcrelaxTimeout(
  state: AbcrelaxState,
  _uid?: string,
): AbcrelaxState | null {
  if (state.status !== 'playing' || state.phase !== 'playing') return null
  if (state.deadlineAt == null || Date.now() < state.deadlineAt) return null
  const loser = state.turnUid
  if (!state.alive[loser]) return null
  return eliminate(
    bump(state, {
      deadlineAt: null,
      pending: null,
      answersThisTurn: [],
    }),
    loser,
  )
}

export function continueAbcrelaxRound(
  state: AbcrelaxState,
  uid: string,
): AbcrelaxState | null {
  if (state.phase !== 'roundOver') return null
  if (state.status !== 'playing') return null
  if (!isRoomUid(uid)) return null
  const nextStarter = state.roundWinnerUid
    ? nextTurnUid(state.roundWinnerUid)
    : nextTurnUid(state.roundStarterUid)
  return beginRound(state, nextStarter, 1)
}

export function surrenderAbcrelax(
  state: AbcrelaxState,
  loserUid: string,
): AbcrelaxState | null {
  if (state.firstUid == null) return null
  if (state.status !== 'playing') return null
  if (state.phase === 'gameOver') return null
  if (!isRoomUid(loserUid)) return null
  const winnerUid = nextTurnUid(loserUid)
  return bump(state, {
    status: 'won',
    phase: 'gameOver',
    winnerUid,
    turnUid: winnerUid,
    deadlineAt: null,
    pending: null,
  })
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
