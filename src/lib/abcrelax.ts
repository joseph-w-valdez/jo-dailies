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
  // More ideas
  'Board games',
  'Musical instruments',
  'Flowers',
  'Trees',
  'Insects',
  'Birds',
  'Dog breeds',
  'Cat breeds',
  'Pokemon',
  'Disney characters',
  'Cartoon characters',
  'Superheroes',
  'League of Legends champions',
  'Fast food',
  'Pizza toppings',
  'Ice cream flavors',
  'Candy',
  'Breakfast foods',
  'Vegetables',
  'Fruits',
  'Spices',
  'Clothing',
  'Shoes',
  'Things you wear on your head',
  'Furniture',
  'Things in a bathroom',
  'Things in a bedroom',
  'Things in a fridge',
  'Cleaning supplies',
  'Tools',
  'Things with wheels',
  'Things that are round',
  'Things that are soft',
  'Things that are sticky',
  'Things that smell good',
  'Things that make noise',
  'Things in the ocean',
  'Things in outer space',
  'Things at the beach',
  'Things at a park',
  'Airport things',
  'Road trip snacks',
  'School subjects',
  'Languages',
  'Body parts',
  'Emotions',
  'Compliments',
  'Excuses for being late',
  'Pet peeves',
  'Date night ideas',
  'Things you do on vacation',
  'Things you do in the morning',
  'Things in a backpack',
  'Website names',
  'Brands',
  'Stores',
  'Restaurants',
  'Things at Target',
  'Things at Costco',
  'Kitchen gadgets',
  'Board game pieces',
  'Things that rhyme with cat',
  'Spanish words',
  'Words with double letters',
  'Things you say when you win',
  'Things you say when you lose',
  'Internet slang',
  'Emoji (describe one)',
  'Song titles',
  'Band names',
  'Book titles',
  'Comic book characters',
  'Horror movie villains',
  'Rom-com tropes',
  'Things in a toolbox',
  'Things under the bed',
  'Things that glow',
  'Things that bounce',
  'Things that melt',
  'Things you recycle',
  'Things that start wars at home',
  'Things Joseph would buy',
  'Things Joha would buy',
  'Things Calcifer would eat',
  'Valorant maps',
  'Valorant guns',
  'Anime',
  'K-pop groups',
  'TikTok trends',
  'Memes',
  'Things in a hospital',
  'Things at a wedding',
  'Things at a birthday party',
  'Costume ideas',
  'Halloween things',
  'Christmas things',
  'Summer things',
  'Winter things',
  'Rainy day things',
  'Camping gear',
  'Gym things',
  'Yoga poses (name one)',
  'Dance moves',
  'Card games',
  'Casino games',
  'Things in a casino',
  'Things in Vegas',
  'Things in Japan',
  'Things in Mexico',
  'Things in Italy',
  'Things in France',
  'Things in Korea',
  'Things in a dorm',
  'Things in a office',
  'Things on a desk',
  'Things in a junk drawer',
  'Things you find in pockets',
  'Things you lose constantly',
  'Things that are overrated',
  'Things that are underrated',
  'Things that are cringe',
  'Things that are cozy',
  'Things that are scary',
  'Things that are cute',
  'Things that are expensive',
  'Things that are free',
  'Things that are illegal (don’t do them)',
  'Things that are green',
  'Things that are red',
  'Things that are blue',
  'Two-word phrases',
  'Compound words',
  'Things with “cat” in the name',
  'Things with “dog” in the name',
  'Things that come in pairs',
  'Things you hoard',
  'Things you impulse-buy',
  'Things in a care package',
  'Things in a gift bag',
  'Things you wrap as presents',
  'Things that need batteries',
  'Things that need Wi‑Fi',
  'Things you forgot to charge',
  'Things in a junk email folder',
  'Things in your camera roll',
  'Things in your notes app',
  'Things you Google at 2am',
  'Things you whisper',
  'Things you shout',
  'Things you never admit you like',
  'Things that are mid',
  'Things that slap',
  'Things that go hard',
  'Things that are canon',
  'Things that are fanon',
  'Ship names (fandom)',
  'Fanfic tags',
  'Things in a Discord server',
  'Things in a group chat',
  'Reply-all disasters',
  'Things that break on moving day',
  'Things in a moving box',
  'Things in a storage unit',
  'Things in a time capsule',
  'Things you’d take to a desert island',
  'Things you’d ban from the house',
  'Things you’d put on a billboard',
  'Things you’d tattoo',
  'Things you’d never tattoo',
  'Things that need an apology',
  'Things that need a sequel',
  'Things that need to be discontinued',
  'Things that peaked in the 90s',
  'Things that peaked in the 2000s',
  'Things that peaked in the 2010s',
  'Things that are so back',
  'Things that are cooked',
  'Things that are lowkey fire',
  'Things that are highkey sus',
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
  /** Wall-clock start of the current turn (writer's clock). */
  turnStartedAt: number | null
  /** Denormalized: turnStartedAt + turnMs (legacy + sync convenience). */
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

/** Absolute end time for the active turn clock. */
export function turnDeadlineAt(state: AbcrelaxState): number | null {
  if (state.phase !== 'playing') return null
  if (
    typeof state.turnStartedAt === 'number' &&
    Number.isFinite(state.turnStartedAt)
  ) {
    return state.turnStartedAt + state.turnMs
  }
  if (typeof state.deadlineAt === 'number' && Number.isFinite(state.deadlineAt)) {
    return state.deadlineAt
  }
  return null
}

function beginTurnClock(
  turnMs: number,
  turnUid: string,
): Pick<AbcrelaxState, 'turnUid' | 'phase' | 'turnStartedAt' | 'deadlineAt'> {
  const started = Date.now()
  return {
    turnUid,
    phase: 'playing',
    turnStartedAt: started,
    deadlineAt: started + turnMs,
  }
}

function clearTurnClock(): Pick<
  AbcrelaxState,
  'turnStartedAt' | 'deadlineAt'
> {
  return { turnStartedAt: null, deadlineAt: null }
}

function finishWin(state: AbcrelaxState, winnerUid: string): AbcrelaxState {
  return bump(state, {
    status: 'won',
    phase: 'finished',
    winnerUid,
    turnUid: winnerUid,
    ...clearTurnClock(),
  })
}

function finishDraw(state: AbcrelaxState): AbcrelaxState {
  return bump(state, {
    status: 'draw',
    phase: 'finished',
    winnerUid: null,
    ...clearTurnClock(),
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
    turnStartedAt: null,
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
    turnStartedAt:
      typeof s.turnStartedAt === 'number' && Number.isFinite(s.turnStartedAt)
        ? s.turnStartedAt
        : null,
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
    lastAnswer: null,
    winnerUid: null,
    ...clearTurnClock(),
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
    ...clearTurnClock(),
  })
}

/** Pick a random theme from the built-in list. */
export function pickAbcrelaxThemeRandom(
  state: AbcrelaxState,
  uid: string,
  rand: () => number = Math.random,
): AbcrelaxState | null {
  if (ABCRELAX_THEMES.length === 0) return null
  const theme =
    ABCRELAX_THEMES[Math.floor(rand() * ABCRELAX_THEMES.length)] ??
    ABCRELAX_THEMES[0]!
  return pickAbcrelaxTheme(state, uid, theme)
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
    usedLetters: [],
    lastAnswer: null,
    ...beginTurnClock(turnMs, starter),
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
  const deadline = turnDeadlineAt(state)
  if (deadline != null && Date.now() > deadline) return null

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
    ...beginTurnClock(state.turnMs, next),
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

/** Grace before the opponent may claim a timeout (clock skew cushion). */
const OPPONENT_TIMEOUT_GRACE_MS = 2_500

/**
 * Resolve an expired turn clock.
 * Prefer the current player’s client; opponent only after a short grace
 * so a skewed clock cannot end a 20s turn in a few seconds.
 */
export function resolveAbcrelaxTimeout(
  state: AbcrelaxState,
  uid?: string,
): AbcrelaxState | null {
  if (state.status !== 'playing' || state.phase !== 'playing') return null
  const deadline = turnDeadlineAt(state)
  if (deadline == null) return null
  const now = Date.now()
  if (now < deadline) return null
  if (uid && isRoomUid(uid) && uid !== state.turnUid && !state.hotseat) {
    if (now < deadline + OPPONENT_TIMEOUT_GRACE_MS) return null
  }
  const loser = state.turnUid
  return finishWin(bump(state, clearTurnClock()), nextTurnUid(loser))
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
  const deadline = turnDeadlineAt(state)
  if (deadline == null) return null
  return Math.max(0, deadline - now)
}
