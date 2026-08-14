import {
  bothSeatsReady,
  hostSeatUid,
  JENGA_PLAYER_UIDS,
  nextTurnUid,
  otherPlayerUid,
  pickTwoJengaCats,
} from './jenga'
import {
  isValidSecretWord,
  pickSharedWord,
  type SharedWordLengthMode,
} from './wordBank'

export const HANGMAN_MAX_MISSES = 6

export type HangmanMode = 'coop' | 'versus'
export type HangmanLengthMode = Extract<SharedWordLengthMode, 'standard' | 'variable'>
export type HangmanPhase =
  | 'pickMode'
  | 'pickLength'
  | 'versusSetup'
  | 'playing'
  | 'finished'

export type HangmanSeat = {
  /** Word this player must guess (set by opponent in versus; shared in coop). */
  word: string
  guessed: string[]
  misses: number
  solved: boolean
}

export type HangmanState = {
  mode: HangmanMode | null
  lengthMode: HangmanLengthMode | null
  phase: HangmanPhase
  /** Co-op shared word. */
  word: string | null
  guessed: string[]
  misses: number
  seats: Record<string, HangmanSeat>
  submittedFor: Record<string, boolean>
  turnUid: string
  status: 'playing' | 'won' | 'lost' | 'draw'
  winnerUid: string | null
  hotseat: boolean
  cats: [string, string]
  version: number
  roundId: string
  updatedAt: number
}

function newRoundId(): string {
  return `hng-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`
}

export function pickHangmanWord(
  random: () => number = Math.random,
  lengthMode: HangmanLengthMode = 'standard',
): string {
  return pickSharedWord(random, lengthMode)
}

function emptySeats(): Record<string, HangmanSeat> {
  const out: Record<string, HangmanSeat> = {}
  for (const uid of JENGA_PLAYER_UIDS) {
    out[uid] = { word: '', guessed: [], misses: 0, solved: false }
  }
  return out
}

export function createInitialHangman(
  turnUid: string,
  opts?: { hotseat?: boolean },
): HangmanState {
  return {
    mode: null,
    lengthMode: null,
    phase: 'pickMode',
    word: null,
    guessed: [],
    misses: 0,
    seats: emptySeats(),
    submittedFor: {},
    turnUid: turnUid || hostSeatUid(),
    status: 'playing',
    winnerUid: null,
    hotseat: Boolean(opts?.hotseat),
    cats: pickTwoJengaCats(),
    version: 1,
    roundId: newRoundId(),
    updatedAt: Date.now(),
  }
}

export function selectHangmanMode(
  prev: HangmanState,
  mode: HangmanMode,
): HangmanState {
  return {
    ...createInitialHangman(prev.turnUid || hostSeatUid(), {
      hotseat: prev.hotseat,
    }),
    mode,
    phase: 'pickLength',
    version: prev.version,
  }
}

export function selectHangmanLength(
  prev: HangmanState,
  lengthMode: HangmanLengthMode,
  random: () => number = Math.random,
): HangmanState | null {
  if (prev.phase !== 'pickLength' || !prev.mode) return null
  if (prev.mode === 'coop') {
    return {
      ...prev,
      lengthMode,
      phase: 'playing',
      word: pickHangmanWord(random, lengthMode),
      updatedAt: Date.now(),
    }
  }
  return {
    ...prev,
    lengthMode,
    phase: 'versusSetup',
    updatedAt: Date.now(),
  }
}

/** @deprecated Prefer selectHangmanMode + selectHangmanLength. */
export function startHangmanCoop(
  prev: HangmanState,
  random: () => number = Math.random,
): HangmanState {
  const withMode = selectHangmanMode(prev, 'coop')
  return selectHangmanLength(withMode, 'standard', random) ?? withMode
}

/** @deprecated Prefer selectHangmanMode + selectHangmanLength. */
export function startHangmanVersus(prev: HangmanState): HangmanState {
  const withMode = selectHangmanMode(prev, 'versus')
  return selectHangmanLength(withMode, 'standard') ?? withMode
}

export function submitHangmanWord(
  state: HangmanState,
  setterUid: string,
  word: string,
): HangmanState | null {
  if (state.mode !== 'versus' || state.phase !== 'versusSetup') return null
  const lengthMode = state.lengthMode ?? 'standard'
  const w = word.trim().toLowerCase().replace(/[^a-z]/g, '')
  if (!isValidSecretWord(w, lengthMode)) return null
  if (state.submittedFor[setterUid]) return null
  const guesserUid = otherPlayerUid(setterUid)

  const seats = {
    ...state.seats,
    [guesserUid]: {
      word: w,
      guessed: [],
      misses: 0,
      solved: false,
    },
  }
  const submittedFor = { ...state.submittedFor, [setterUid]: true }
  const bothReady = bothSeatsReady(submittedFor)

  return {
    ...state,
    seats,
    submittedFor,
    phase: bothReady ? 'playing' : 'versusSetup',
    turnUid: bothReady ? hostSeatUid() : state.turnUid,
    updatedAt: Date.now(),
  }
}

export function applyHangmanGuess(
  state: HangmanState,
  uid: string,
  letterRaw: string,
): HangmanState | null {
  if (state.phase !== 'playing' || state.status !== 'playing') return null
  if (state.turnUid !== uid) return null
  const letter = letterRaw.trim().toLowerCase()
  if (!/^[a-z]$/.test(letter)) return null

  if (state.mode === 'coop') {
    const word = state.word
    if (!word) return null
    if (state.guessed.includes(letter)) return null
    const hit = word.includes(letter)
    const guessed = [...state.guessed, letter]
    const misses = hit ? state.misses : state.misses + 1
    const letters = new Set(word.split(''))
    const solved = [...letters].every((ch) => guessed.includes(ch))
    const lost = !solved && misses >= HANGMAN_MAX_MISSES
    return {
      ...state,
      guessed,
      misses,
      turnUid: nextTurnUid(uid),
      status: solved ? 'won' : lost ? 'lost' : 'playing',
      phase: solved || lost ? 'finished' : 'playing',
      updatedAt: Date.now(),
    }
  }

  const seat = state.seats[uid]
  if (!seat || !seat.word || seat.solved) return null
  if (seat.guessed.includes(letter)) return null
  const hit = seat.word.includes(letter)
  const guessed = [...seat.guessed, letter]
  const misses = hit ? seat.misses : seat.misses + 1
  const unique = new Set(seat.word.split(''))
  const solved = [...unique].every((ch) => guessed.includes(ch))
  const seats = {
    ...state.seats,
    [uid]: { ...seat, guessed, misses, solved },
  }

  if (solved) {
    return {
      ...state,
      seats,
      status: 'won',
      phase: 'finished',
      winnerUid: uid,
      updatedAt: Date.now(),
    }
  }

  if (misses >= HANGMAN_MAX_MISSES) {
    const other = nextTurnUid(uid)
    const otherSeat = seats[other]
    if (otherSeat && otherSeat.misses >= HANGMAN_MAX_MISSES && !otherSeat.solved) {
      return {
        ...state,
        seats,
        status: 'draw',
        phase: 'finished',
        winnerUid: null,
        updatedAt: Date.now(),
      }
    }
    return {
      ...state,
      seats,
      turnUid: other,
      updatedAt: Date.now(),
    }
  }

  return {
    ...state,
    seats,
    turnUid: nextTurnUid(uid),
    updatedAt: Date.now(),
  }
}

export function hangmanMask(word: string, guessed: string[]): string {
  return word
    .split('')
    .map((ch) => (guessed.includes(ch) ? ch : '_'))
    .join(' ')
}

function clampNum(n: unknown, fallback = 0): number {
  const x = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(x) ? x : fallback
}

export function normalizeHangman(
  raw: unknown,
  fallbackUid: string,
): HangmanState {
  if (!raw || typeof raw !== 'object') return createInitialHangman(fallbackUid)
  const s = raw as Record<string, unknown>
  const base = createInitialHangman(
    typeof s.turnUid === 'string' ? s.turnUid : fallbackUid,
    { hotseat: Boolean(s.hotseat) },
  )
  const seats = emptySeats()
  if (s.seats && typeof s.seats === 'object') {
    for (const uid of JENGA_PLAYER_UIDS) {
      const row = (s.seats as Record<string, unknown>)[uid]
      if (!row || typeof row !== 'object') continue
      const r = row as Record<string, unknown>
      seats[uid] = {
        word: typeof r.word === 'string' ? r.word.toLowerCase() : '',
        guessed: Array.isArray(r.guessed)
          ? r.guessed
              .filter((g): g is string => typeof g === 'string')
              .map((g) => g.toLowerCase())
          : [],
        misses: Math.max(0, Math.floor(clampNum(r.misses, 0))),
        solved: Boolean(r.solved),
      }
    }
  }
  const submittedFor: Record<string, boolean> = {}
  if (s.submittedFor && typeof s.submittedFor === 'object') {
    for (const [k, v] of Object.entries(s.submittedFor as Record<string, unknown>)) {
      submittedFor[k] = Boolean(v)
    }
  }
  const lengthMode =
    s.lengthMode === 'standard' || s.lengthMode === 'variable'
      ? s.lengthMode
      : null
  return {
    ...base,
    mode: s.mode === 'coop' || s.mode === 'versus' ? s.mode : null,
    lengthMode,
    phase:
      s.phase === 'pickMode' ||
      s.phase === 'pickLength' ||
      s.phase === 'versusSetup' ||
      s.phase === 'playing' ||
      s.phase === 'finished'
        ? s.phase
        : 'pickMode',
    word: typeof s.word === 'string' ? s.word.toLowerCase() : null,
    guessed: Array.isArray(s.guessed)
      ? s.guessed
          .filter((g): g is string => typeof g === 'string')
          .map((g) => g.toLowerCase())
      : [],
    misses: Math.max(0, Math.floor(clampNum(s.misses, 0))),
    seats,
    submittedFor,
    turnUid:
      typeof s.turnUid === 'string' && s.turnUid ? s.turnUid : base.turnUid,
    status:
      s.status === 'won' || s.status === 'lost' || s.status === 'draw'
        ? s.status
        : 'playing',
    winnerUid: typeof s.winnerUid === 'string' ? s.winnerUid : null,
    hotseat: Boolean(s.hotseat),
    version: Math.max(1, Math.floor(clampNum(s.version, 1))),
    roundId: typeof s.roundId === 'string' ? s.roundId : base.roundId,
    updatedAt: Math.floor(clampNum(s.updatedAt, Date.now())),
  }
}
