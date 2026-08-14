import {
  bothSeatsReady,
  hostSeatUid,
  JENGA_PLAYER_UIDS,
  nextTurnUid,
  otherPlayerUid,
  pickTwoJengaCats,
} from './jenga'
import {
  isValidWordleAnswer,
  isValidWordleGuess,
  markWordleGuess,
  pickWordleAnswer,
  wordleAnswerLength,
  type LetterMark,
  type WordleLengthMode,
} from './wordleWords'

export const WORDLE_MAX_GUESSES = 6

export type WordleMode = 'coop' | 'versus'
export type WordlePhase =
  | 'pickMode'
  | 'pickLength'
  | 'versusSetup'
  | 'playing'
  | 'finished'

export type { WordleLengthMode }

export type WordleGuessRow = {
  word: string
  marks: LetterMark[]
}

export type WordleState = {
  mode: WordleMode | null
  lengthMode: WordleLengthMode | null
  phase: WordlePhase
  /** Co-op shared answer. */
  answer: string | null
  /**
   * Versus: answer each player must solve (set by the opponent).
   * Keyed by guesser uid.
   */
  answersByUid: Record<string, string>
  /** Versus: who has submitted the word for the opponent. */
  submittedFor: Record<string, boolean>
  guessesByUid: Record<string, WordleGuessRow[]>
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
  return `wrd-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`
}

function emptyGuesses(): Record<string, WordleGuessRow[]> {
  const out: Record<string, WordleGuessRow[]> = {}
  for (const uid of JENGA_PLAYER_UIDS) out[uid] = []
  return out
}

export function createInitialWordle(
  turnUid: string,
  opts?: { hotseat?: boolean },
): WordleState {
  return {
    mode: null,
    lengthMode: null,
    phase: 'pickMode',
    answer: null,
    answersByUid: {},
    submittedFor: {},
    guessesByUid: emptyGuesses(),
    turnUid: turnUid || JENGA_PLAYER_UIDS[0]!,
    status: 'playing',
    winnerUid: null,
    hotseat: Boolean(opts?.hotseat),
    cats: pickTwoJengaCats(),
    version: 1,
    roundId: newRoundId(),
    updatedAt: Date.now(),
  }
}

/** Step 1: co-op or versus → then pick length. */
export function selectWordleMode(
  prev: WordleState,
  mode: WordleMode,
): WordleState {
  return {
    ...createInitialWordle(prev.turnUid || JENGA_PLAYER_UIDS[0]!, {
      hotseat: prev.hotseat,
    }),
    mode,
    phase: 'pickLength',
    version: prev.version,
  }
}

/** Step 2: standard (5) or variable → start co-op play or versus setup. */
export function selectWordleLength(
  prev: WordleState,
  lengthMode: WordleLengthMode,
  random: () => number = Math.random,
): WordleState | null {
  if (prev.phase !== 'pickLength' || !prev.mode) return null
  if (prev.mode === 'coop') {
    return {
      ...prev,
      lengthMode,
      phase: 'playing',
      answer: pickWordleAnswer(random, lengthMode),
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

/** @deprecated Prefer selectWordleMode + selectWordleLength. */
export function startWordleCoop(
  prev: WordleState,
  random: () => number = Math.random,
): WordleState {
  const withMode = selectWordleMode(prev, 'coop')
  return selectWordleLength(withMode, 'standard', random) ?? withMode
}

/** @deprecated Prefer selectWordleMode + selectWordleLength. */
export function startWordleVersus(prev: WordleState): WordleState {
  const withMode = selectWordleMode(prev, 'versus')
  return selectWordleLength(withMode, 'standard') ?? withMode
}

/** Setter submits a word that the opponent must guess. */
export function submitVersusWord(
  state: WordleState,
  setterUid: string,
  word: string,
): WordleState | null {
  if (state.mode !== 'versus' || state.phase !== 'versusSetup') return null
  const lengthMode = state.lengthMode ?? 'standard'
  const w = word.trim().toLowerCase().replace(/[^a-z]/g, '')
  if (!isValidWordleAnswer(w, lengthMode)) return null
  const guesserUid = otherPlayerUid(setterUid)
  if (state.submittedFor[setterUid]) return null

  const answersByUid = { ...state.answersByUid, [guesserUid]: w }
  const submittedFor = { ...state.submittedFor, [setterUid]: true }
  const bothReady = bothSeatsReady(submittedFor)

  return {
    ...state,
    answersByUid,
    submittedFor,
    phase: bothReady ? 'playing' : 'versusSetup',
    turnUid: bothReady ? hostSeatUid() : state.turnUid,
    updatedAt: Date.now(),
  }
}

export function applyWordleGuess(
  state: WordleState,
  uid: string,
  rawGuess: string,
): WordleState | null {
  if (state.phase !== 'playing' || state.status !== 'playing') return null
  if (state.turnUid !== uid) return null
  const guess = rawGuess.trim().toLowerCase().replace(/[^a-z]/g, '')
  const lengthMode = state.lengthMode ?? 'standard'

  if (state.mode === 'coop') {
    const answer = state.answer
    if (!answer) return null
    const len = wordleAnswerLength(answer)
    if (guess.length !== len) return null
    if (!isValidWordleGuess(guess, len, lengthMode) && guess !== answer) {
      return null
    }
    const host = hostSeatUid()
    const shared = [...(state.guessesByUid[host] ?? [])]
    if (shared.length >= WORDLE_MAX_GUESSES) return null
    if (shared.some((g) => g.word === guess)) return null
    const marks = markWordleGuess(guess, answer)
    shared.push({ word: guess, marks })
    const solved = marks.every((m) => m === 'correct')
    const lost = !solved && shared.length >= WORDLE_MAX_GUESSES
    return {
      ...state,
      guessesByUid: {
        ...state.guessesByUid,
        [host]: shared,
      },
      turnUid: nextTurnUid(uid),
      status: solved ? 'won' : lost ? 'lost' : 'playing',
      phase: solved || lost ? 'finished' : 'playing',
      winnerUid: solved ? null : null, // co-op: no single winner
      updatedAt: Date.now(),
    }
  }

  const answer = state.answersByUid[uid]
  if (!answer) return null
  const len = wordleAnswerLength(answer)
  if (guess.length !== len) return null
  if (!isValidWordleGuess(guess, len, lengthMode) && guess !== answer) {
    return null
  }
  const mine = [...(state.guessesByUid[uid] ?? [])]
  if (mine.length >= WORDLE_MAX_GUESSES) return null
  if (mine.some((g) => g.word === guess)) return null
  const marks = markWordleGuess(guess, answer)
  mine.push({ word: guess, marks })
  const guessesByUid = { ...state.guessesByUid, [uid]: mine }
  const solved = marks.every((m) => m === 'correct')

  if (solved) {
    return {
      ...state,
      guessesByUid,
      status: 'won',
      phase: 'finished',
      winnerUid: uid,
      updatedAt: Date.now(),
    }
  }

  const other = nextTurnUid(uid)
  const otherGuesses = guessesByUid[other] ?? []
  const otherDone = otherGuesses.length >= WORDLE_MAX_GUESSES
  const meDone = mine.length >= WORDLE_MAX_GUESSES

  if (meDone && otherDone) {
    return {
      ...state,
      guessesByUid,
      status: 'draw',
      phase: 'finished',
      winnerUid: null,
      turnUid: other,
      updatedAt: Date.now(),
    }
  }

  // Skip opponent if they already exhausted guesses
  let turnUid = other
  if (otherDone) turnUid = uid

  return {
    ...state,
    guessesByUid,
    turnUid,
    updatedAt: Date.now(),
  }
}

function clampNum(n: unknown, fallback = 0): number {
  const x = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(x) ? x : fallback
}

export function normalizeWordle(raw: unknown, fallbackUid: string): WordleState {
  if (!raw || typeof raw !== 'object') return createInitialWordle(fallbackUid)
  const s = raw as Record<string, unknown>
  const base = createInitialWordle(
    typeof s.turnUid === 'string' ? s.turnUid : fallbackUid,
    { hotseat: Boolean(s.hotseat) },
  )
  const mode =
    s.mode === 'coop' || s.mode === 'versus' ? s.mode : null
  const lengthMode =
    s.lengthMode === 'standard' || s.lengthMode === 'variable'
      ? s.lengthMode
      : null
  const phase =
    s.phase === 'pickMode' ||
    s.phase === 'pickLength' ||
    s.phase === 'versusSetup' ||
    s.phase === 'playing' ||
    s.phase === 'finished'
      ? s.phase
      : 'pickMode'

  const guessesByUid: Record<string, WordleGuessRow[]> = emptyGuesses()
  if (s.guessesByUid && typeof s.guessesByUid === 'object') {
    for (const uid of JENGA_PLAYER_UIDS) {
      const rows = (s.guessesByUid as Record<string, unknown>)[uid]
      if (!Array.isArray(rows)) continue
      guessesByUid[uid] = rows
        .map((r) => {
          if (!r || typeof r !== 'object') return null
          const row = r as Record<string, unknown>
          const word =
            typeof row.word === 'string'
              ? row.word.toLowerCase().replace(/[^a-z]/g, '')
              : ''
          if (word.length < 3 || word.length > 18) return null
          const marks = Array.isArray(row.marks)
            ? row.marks.filter(
                (m): m is LetterMark =>
                  m === 'correct' || m === 'present' || m === 'absent',
              )
            : markWordleGuess(word, word)
          return { word, marks: marks.slice(0, word.length) }
        })
        .filter((r): r is WordleGuessRow => r !== null)
    }
  }

  const answersByUid: Record<string, string> = {}
  if (s.answersByUid && typeof s.answersByUid === 'object') {
    for (const [k, v] of Object.entries(s.answersByUid as Record<string, unknown>)) {
      if (typeof v === 'string') {
        const w = v.toLowerCase().replace(/[^a-z]/g, '')
        if (w.length >= 3 && w.length <= 18) answersByUid[k] = w
      }
    }
  }

  const submittedFor: Record<string, boolean> = {}
  if (s.submittedFor && typeof s.submittedFor === 'object') {
    for (const [k, v] of Object.entries(s.submittedFor as Record<string, unknown>)) {
      submittedFor[k] = Boolean(v)
    }
  }

  const status =
    s.status === 'won' || s.status === 'lost' || s.status === 'draw'
      ? s.status
      : 'playing'

  return {
    ...base,
    mode,
    lengthMode,
    phase,
    answer: (() => {
      if (typeof s.answer !== 'string') return null
      const w = s.answer.toLowerCase().replace(/[^a-z]/g, '')
      return w.length >= 3 && w.length <= 18 ? w : null
    })(),
    answersByUid,
    submittedFor,
    guessesByUid,
    turnUid:
      typeof s.turnUid === 'string' && s.turnUid ? s.turnUid : base.turnUid,
    status,
    winnerUid: typeof s.winnerUid === 'string' ? s.winnerUid : null,
    hotseat: Boolean(s.hotseat),
    version: Math.max(1, Math.floor(clampNum(s.version, 1))),
    roundId: typeof s.roundId === 'string' ? s.roundId : base.roundId,
    updatedAt: Math.floor(clampNum(s.updatedAt, Date.now())),
    cats: Array.isArray(s.cats) && s.cats.length >= 2
      ? [String(s.cats[0]), String(s.cats[1])]
      : base.cats,
  }
}
