/** Shared Pictionary — 2-player draw & guess, separate scores. */
import {
  isPictionaryDeckId,
  pictionaryCardSlug,
  pictionaryDeckPool,
  pictionaryModifier,
  pictionaryModifierMultiplier,
  PICTIONARY_CHALLENGE_TIERS,
  PICTIONARY_CUSTOM_THEME,
  PICTIONARY_DIFFICULTIES,
  PICTIONARY_DIFFICULTY_POINTS,
  PICTIONARY_MODIFIERS,
  PICTIONARY_THEMES,
  type PictionaryCard,
  type PictionaryDeckId,
  type PictionaryDifficulty,
} from './pictionaryDeck'
import { isRoomUid, JENGA_PLAYER_UIDS, otherPlayerUid, parseOptionalSeatUid } from './jenga'

/** Standard Pictionary sand timer. */
export const PICTIONARY_TURN_MS = 60_000
/** 5 draws each. */
export const PICTIONARY_TOTAL_ROUNDS = 10
/** Rerolls (fresh cards + fresh challenges) the drawer gets each round. */
export const PICTIONARY_REROLLS_PER_ROUND = 2
/** Guesser loses this share of their points after taking a hint. */
export const PICTIONARY_HINT_PENALTY = 0.25
/**
 * The drawer resolves time-ups at the deadline; the guesser waits this long
 * first so a last-second correct guess isn't overwritten.
 */
export const PICTIONARY_TIMEOUT_GRACE_MS = 3_000

const MAX_GUESSES = 60
const MAX_RECENT_CARDS = 300
const MAX_CUSTOM_CARDS = 200
const MAX_WORD_LENGTH = 60

export type PictionaryPhase =
  | 'pickDeck'
  | 'pickCard'
  | 'drawing'
  | 'reveal'
  | 'finished'

export type PictionaryStatus = 'playing' | 'won' | 'draw'

export type PictionaryGuess = {
  uid: string
  text: string
  correct: boolean
  /** One or two letters off — nudges the guesser. */
  close: boolean
  at: number
}

export type PictionaryRound = {
  index: number
  drawerUid: string
  guesserUid: string
  card: PictionaryCard
  modifierId: string | null
  guessed: boolean
  /** Draw start → correct guess (ms). */
  guessMs: number | null
  hintUsed: boolean
  guesserPoints: number
  drawerPoints: number
}

export interface PictionaryState {
  version: number
  updatedAt: number
  roundId: string
  hotseat: boolean
  /** null until who-draws-first is picked. */
  firstUid: string | null
  status: PictionaryStatus
  phase: PictionaryPhase
  deck: PictionaryDeckId | null
  roundIndex: number
  totalRounds: number
  drawerUid: string
  /** Drawer's three options while picking. */
  choices: PictionaryCard[]
  /** One opt-in challenge per tier, offered while picking. */
  challengeOffers: string[]
  card: PictionaryCard | null
  /** Challenge the drawer opted into for this round (null = none). */
  modifierId: string | null
  /** Realtime Database server time (ms). */
  drawStartedAt: number | null
  drawEndsAt: number | null
  hintIndex: number | null
  guesses: PictionaryGuess[]
  rounds: PictionaryRound[]
  scores: Record<string, number>
  /** Rerolls spent this round — reset whenever a new hand is dealt. */
  rerolls: number
  usedCardIds: string[]
  /** Cards from earlier games — skipped while fresh ones remain. */
  recentCardIds: string[]
  customCards: PictionaryCard[]
  winnerUid: string | null
  surrenderUid: string | null
}

type Rand = () => number

function newRoundId(): string {
  return `pic-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function clampNum(n: unknown, fallback = 0): number {
  const v = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(v) ? v : fallback
}

function bump(state: PictionaryState, patch: Partial<PictionaryState>): PictionaryState {
  return { ...state, ...patch, updatedAt: Date.now() }
}

function zeroScores(): Record<string, number> {
  return { [JENGA_PLAYER_UIDS[0]]: 0, [JENGA_PLAYER_UIDS[1]]: 0 }
}

function pickOne<T>(items: readonly T[], rand: Rand): T | null {
  if (items.length === 0) return null
  return items[Math.min(items.length - 1, Math.floor(rand() * items.length))] ?? null
}

export function pictionaryGuesserUid(state: PictionaryState): string {
  return otherPlayerUid(state.drawerUid)
}

export function pictionaryTurnMs(modifierId: string | null): number {
  return pictionaryModifier(modifierId)?.turnMs ?? PICTIONARY_TURN_MS
}

// ── Guess matching ─────────────────────────────────────────────────────────

function normalizeGuessText(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^(a|an|the)\s+/, '')
}

function compact(raw: string): string {
  return normalizeGuessText(raw).replace(/\s+/g, '')
}

export function pictionaryGuessMatches(guess: string, word: string): boolean {
  const g = compact(guess)
  const w = compact(word)
  if (!g || !w) return false
  if (g === w) return true
  // Simple plural / singular slack.
  return g === `${w}s` || g === `${w}es` || w === `${g}s` || w === `${g}es`
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i]
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(cur[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost)
    }
    prev = cur
  }
  return prev[b.length]!
}

export function pictionaryGuessIsClose(guess: string, word: string): boolean {
  const g = compact(guess)
  const w = compact(word)
  if (w.length < 4 || !g || pictionaryGuessMatches(guess, word)) return false
  return levenshtein(g, w) <= (w.length >= 8 ? 2 : 1)
}

/** Word shown to the guesser: letters hidden, spaces + punctuation kept. */
export function pictionaryWordMask(
  word: string,
  revealIndex: number | null,
): { ch: string; hidden: boolean }[] {
  return [...word].map((ch, i) => {
    const letter = /[\p{L}\p{N}]/u.test(ch)
    return { ch, hidden: letter && i !== revealIndex }
  })
}

// ── Scoring ────────────────────────────────────────────────────────────────

function roundTo5(n: number): number {
  return Math.round(n / 5) * 5
}

/**
 * Guesser: card value scaled from 100% (instant) down to 50% (buzzer).
 * Drawer: half of the guesser's points — rewards drawing clearly and fast.
 */
export function pictionaryRoundPoints(opts: {
  difficulty: PictionaryDifficulty
  elapsedMs: number
  turnMs?: number
  hintUsed?: boolean
  multiplier?: number
}): { guesser: number; drawer: number } {
  const turnMs = opts.turnMs ?? PICTIONARY_TURN_MS
  const base = PICTIONARY_DIFFICULTY_POINTS[opts.difficulty]
  const left = 1 - Math.min(1, Math.max(0, opts.elapsedMs / turnMs))
  let guesser = base * (0.5 + 0.5 * left)
  if (opts.hintUsed) guesser *= 1 - PICTIONARY_HINT_PENALTY
  guesser *= opts.multiplier ?? 1
  const g = roundTo5(guesser)
  return { guesser: g, drawer: roundTo5(g / 2) }
}

// ── Dealing ────────────────────────────────────────────────────────────────

/** One card per difficulty, preferring cards not seen recently. */
export function dealPictionaryChoices(
  deck: PictionaryDeckId,
  opts: {
    customCards: readonly PictionaryCard[]
    usedCardIds: readonly string[]
    recentCardIds: readonly string[]
  },
  rand: Rand = Math.random,
): PictionaryCard[] {
  const pool = pictionaryDeckPool(deck, opts.customCards)
  if (pool.length === 0) return []
  const used = new Set(opts.usedCardIds)
  const recent = new Set(opts.recentCardIds)
  const picked: PictionaryCard[] = []
  const taken = new Set<string>()

  for (const difficulty of PICTIONARY_DIFFICULTIES) {
    const tier = pool.filter((c) => c.difficulty === difficulty && !taken.has(c.id))
    const fresh = tier.filter((c) => !used.has(c.id) && !recent.has(c.id))
    const unused = tier.filter((c) => !used.has(c.id))
    const card = pickOne(fresh.length ? fresh : unused.length ? unused : tier, rand)
    if (card) {
      picked.push(card)
      taken.add(card.id)
    }
  }

  // Custom decks may be missing a tier — top up from whatever is left.
  while (picked.length < 3) {
    const rest = pool.filter((c) => !taken.has(c.id))
    const restUnused = rest.filter((c) => !used.has(c.id))
    const card = pickOne(restUnused.length ? restUnused : rest, rand)
    if (!card) break
    picked.push(card)
    taken.add(card.id)
  }
  return picked
}

/** One challenge per tier — a random rule family, then a random variant of it. */
export function dealPictionaryChallenges(rand: Rand = Math.random): string[] {
  const offers: string[] = []
  for (const tier of PICTIONARY_CHALLENGE_TIERS) {
    const inTier = PICTIONARY_MODIFIERS.filter((m) => m.tier === tier)
    const family = pickOne([...new Set(inTier.map((m) => m.family))], rand)
    const variant = pickOne(
      inTier.filter((m) => m.family === family),
      rand,
    )
    if (variant) offers.push(variant.id)
  }
  return offers
}

function dealFor(
  state: PictionaryState,
  deck: PictionaryDeckId,
  rand: Rand,
): Pick<PictionaryState, 'choices' | 'challengeOffers' | 'modifierId' | 'rerolls'> {
  return {
    rerolls: 0,
    choices: dealPictionaryChoices(
      deck,
      {
        customCards: state.customCards,
        usedCardIds: state.usedCardIds,
        recentCardIds: state.recentCardIds,
      },
      rand,
    ),
    challengeOffers: dealPictionaryChallenges(rand),
    modifierId: null,
  }
}

function clearRound(): Pick<
  PictionaryState,
  'card' | 'drawStartedAt' | 'drawEndsAt' | 'hintIndex' | 'guesses'
> {
  return {
    card: null,
    drawStartedAt: null,
    drawEndsAt: null,
    hintIndex: null,
    guesses: [],
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

export function createInitialPictionary(
  uid: string,
  opts?: {
    hotseat?: boolean
    customCards?: PictionaryCard[]
    recentCardIds?: string[]
  },
): PictionaryState {
  const starter = isRoomUid(uid) ? uid : JENGA_PLAYER_UIDS[0]!
  return {
    version: 1,
    updatedAt: Date.now(),
    roundId: newRoundId(),
    hotseat: Boolean(opts?.hotseat),
    firstUid: null,
    status: 'playing',
    phase: 'pickDeck',
    deck: null,
    roundIndex: 0,
    totalRounds: PICTIONARY_TOTAL_ROUNDS,
    drawerUid: starter,
    choices: [],
    challengeOffers: [],
    modifierId: null,
    ...clearRound(),
    rounds: [],
    scores: zeroScores(),
    rerolls: 0,
    usedCardIds: [],
    recentCardIds: opts?.recentCardIds ?? [],
    customCards: opts?.customCards ?? [],
    winnerUid: null,
    surrenderUid: null,
  }
}

function mergeRecent(state: PictionaryState): string[] {
  const merged = [...state.recentCardIds, ...state.usedCardIds]
  return [...new Set(merged.reverse())].reverse().slice(-MAX_RECENT_CARDS)
}

/** New-game reset that keeps the custom deck and card history. */
export function buildPictionaryReset(
  prev: PictionaryState,
  uid: string,
  opts?: { hotseat?: boolean },
): PictionaryState {
  return createInitialPictionary(uid, {
    hotseat: opts?.hotseat,
    customCards: prev.customCards,
    recentCardIds: mergeRecent(prev),
  })
}

export function selectPictionaryFirst(
  state: PictionaryState,
  uid: string,
): PictionaryState | null {
  if (state.firstUid !== null || state.status !== 'playing') return null
  if (!isRoomUid(uid)) return null
  return bump(state, { firstUid: uid, drawerUid: uid, phase: 'pickDeck' })
}

export function pickPictionaryDeck(
  state: PictionaryState,
  deck: PictionaryDeckId,
  rand: Rand = Math.random,
): PictionaryState | null {
  if (state.firstUid == null || state.phase !== 'pickDeck') return null
  if (state.status !== 'playing') return null
  if (pictionaryDeckPool(deck, state.customCards).length === 0) return null
  const fresh: PictionaryState = {
    ...state,
    usedCardIds: [],
    rounds: [],
    scores: zeroScores(),
  }
  const dealt = dealFor(fresh, deck, rand)
  if (dealt.choices.length === 0) return null
  return bump(fresh, {
    deck,
    roundIndex: 0,
    drawerUid: state.firstUid,
    phase: 'pickCard',
    ...clearRound(),
    ...dealt,
  })
}

export function pickPictionaryDeckRandom(
  state: PictionaryState,
  rand: Rand = Math.random,
): PictionaryState | null {
  const theme = pickOne(PICTIONARY_THEMES, rand)
  if (!theme) return null
  return pickPictionaryDeck(state, theme.id, rand)
}

/** Same deck, first drawer swapped — skips setup. */
export function playPictionaryAgain(
  state: PictionaryState,
  rand: Rand = Math.random,
): PictionaryState | null {
  if (state.phase !== 'finished' || !state.deck) return null
  const first = otherPlayerUid(state.firstUid ?? state.drawerUid)
  const base = createInitialPictionary(first, {
    hotseat: state.hotseat,
    customCards: state.customCards,
    recentCardIds: mergeRecent(state),
  })
  const seated: PictionaryState = { ...base, firstUid: first, drawerUid: first }
  const next = pickPictionaryDeck(seated, state.deck, rand)
  return next ? { ...next, version: state.version } : null
}

function canDraw(state: PictionaryState, uid: string): boolean {
  return state.hotseat || uid === state.drawerUid
}

function canGuess(state: PictionaryState, uid: string): boolean {
  return state.hotseat || uid === pictionaryGuesserUid(state)
}

export function pictionaryRerollsLeft(state: PictionaryState): number {
  return Math.max(0, PICTIONARY_REROLLS_PER_ROUND - state.rerolls)
}

/**
 * Fresh three cards and fresh challenge offers. Rerolled cards won't come
 * back this game.
 */
export function rerollPictionaryHand(
  state: PictionaryState,
  uid: string,
  rand: Rand = Math.random,
): PictionaryState | null {
  if (state.phase !== 'pickCard' || !state.deck || !canDraw(state, uid)) return null
  if (pictionaryRerollsLeft(state) <= 0) return null
  const usedCardIds = [...state.usedCardIds, ...state.choices.map((c) => c.id)]
  const choices = dealPictionaryChoices(
    state.deck,
    {
      customCards: state.customCards,
      usedCardIds,
      recentCardIds: state.recentCardIds,
    },
    rand,
  )
  if (choices.length === 0) return null
  return bump(state, {
    usedCardIds,
    choices,
    challengeOffers: dealPictionaryChallenges(rand),
    rerolls: state.rerolls + 1,
  })
}

/** Lock in a card, plus an optional challenge from this round's offers. */
export function pickPictionaryCard(
  state: PictionaryState,
  uid: string,
  cardId: string,
  serverNow: number,
  challengeId: string | null = null,
): PictionaryState | null {
  if (state.phase !== 'pickCard' || !canDraw(state, uid)) return null
  const card = state.choices.find((c) => c.id === cardId)
  if (!card) return null
  if (challengeId != null && !state.challengeOffers.includes(challengeId)) return null
  return bump(state, {
    phase: 'drawing',
    card,
    choices: [],
    challengeOffers: [],
    modifierId: challengeId,
    drawStartedAt: serverNow,
    drawEndsAt: serverNow + pictionaryTurnMs(challengeId),
    hintIndex: null,
    guesses: [],
    usedCardIds: [...state.usedCardIds, card.id],
  })
}

function resolveRound(
  state: PictionaryState,
  guessed: boolean,
  serverNow: number,
): PictionaryState {
  const card = state.card!
  const turnMs = pictionaryTurnMs(state.modifierId)
  const started = state.drawStartedAt ?? serverNow
  const elapsed = Math.min(turnMs, Math.max(0, serverNow - started))
  const hintUsed = state.hintIndex != null
  const points = guessed
    ? pictionaryRoundPoints({
        difficulty: card.difficulty,
        elapsedMs: elapsed,
        turnMs,
        hintUsed,
        multiplier: pictionaryModifierMultiplier(state.modifierId),
      })
    : { guesser: 0, drawer: 0 }
  const guesserUid = pictionaryGuesserUid(state)
  const round: PictionaryRound = {
    index: state.roundIndex,
    drawerUid: state.drawerUid,
    guesserUid,
    card,
    modifierId: state.modifierId,
    guessed,
    guessMs: guessed ? elapsed : null,
    hintUsed,
    guesserPoints: points.guesser,
    drawerPoints: points.drawer,
  }
  return bump(state, {
    phase: 'reveal',
    drawStartedAt: null,
    drawEndsAt: null,
    rounds: [...state.rounds, round],
    scores: {
      ...state.scores,
      [guesserUid]: (state.scores[guesserUid] ?? 0) + points.guesser,
      [state.drawerUid]: (state.scores[state.drawerUid] ?? 0) + points.drawer,
    },
  })
}

export function submitPictionaryGuess(
  state: PictionaryState,
  uid: string,
  text: string,
  serverNow: number,
): PictionaryState | null {
  if (state.phase !== 'drawing' || !state.card || !canGuess(state, uid)) return null
  if (state.drawEndsAt != null && serverNow >= state.drawEndsAt) return null
  const trimmed = text.trim().slice(0, MAX_WORD_LENGTH)
  if (!trimmed) return null
  const correct = pictionaryGuessMatches(trimmed, state.card.word)
  const guess: PictionaryGuess = {
    uid: state.hotseat ? pictionaryGuesserUid(state) : uid,
    text: trimmed,
    correct,
    close: !correct && pictionaryGuessIsClose(trimmed, state.card.word),
    at: serverNow,
  }
  const withGuess = { ...state, guesses: [...state.guesses, guess].slice(-MAX_GUESSES) }
  return correct ? resolveRound(withGuess, true, serverNow) : bump(withGuess, {})
}

/** Drawer confirms a spoken guess. */
export function markPictionaryGotIt(
  state: PictionaryState,
  uid: string,
  serverNow: number,
): PictionaryState | null {
  if (state.phase !== 'drawing' || !state.card || !canDraw(state, uid)) return null
  if (
    state.drawEndsAt != null &&
    serverNow > state.drawEndsAt + PICTIONARY_TIMEOUT_GRACE_MS
  ) {
    return null
  }
  return resolveRound(state, true, Math.min(serverNow, state.drawEndsAt ?? serverNow))
}

/** Hint unlocks at half time. */
export function pictionaryHintAvailableAt(state: PictionaryState): number | null {
  if (state.drawStartedAt == null) return null
  return state.drawStartedAt + pictionaryTurnMs(state.modifierId) / 2
}

export function revealPictionaryHint(
  state: PictionaryState,
  uid: string,
  serverNow: number,
  rand: Rand = Math.random,
): PictionaryState | null {
  if (state.phase !== 'drawing' || !state.card || !canGuess(state, uid)) return null
  if (state.hintIndex != null) return null
  const at = pictionaryHintAvailableAt(state)
  if (at == null || serverNow < at) return null
  const letters = pictionaryWordMask(state.card.word, null)
    .map((cell, i) => (cell.hidden ? i : -1))
    .filter((i) => i >= 0)
  const index = pickOne(letters, rand)
  if (index == null) return null
  return bump(state, { hintIndex: index })
}

export function resolvePictionaryTimeout(
  state: PictionaryState,
  serverNow: number,
): PictionaryState | null {
  if (state.phase !== 'drawing' || !state.card || state.drawEndsAt == null) return null
  if (serverNow < state.drawEndsAt) return null
  return resolveRound(state, false, state.drawEndsAt)
}

function correctGuesses(state: PictionaryState, uid: string): number {
  return state.rounds.filter((r) => r.guessed && r.guesserUid === uid).length
}

function finishPictionary(state: PictionaryState): PictionaryState {
  const [a, b] = JENGA_PLAYER_UIDS
  const sa = state.scores[a] ?? 0
  const sb = state.scores[b] ?? 0
  let winnerUid: string | null = sa > sb ? a : sb > sa ? b : null
  if (winnerUid == null) {
    const ga = correctGuesses(state, a)
    const gb = correctGuesses(state, b)
    winnerUid = ga > gb ? a : gb > ga ? b : null
  }
  return bump(state, {
    phase: 'finished',
    status: winnerUid ? 'won' : 'draw',
    winnerUid,
    choices: [],
    challengeOffers: [],
    modifierId: null,
    ...clearRound(),
    recentCardIds: mergeRecent(state),
  })
}

export function nextPictionaryRound(
  state: PictionaryState,
  rand: Rand = Math.random,
): PictionaryState | null {
  if (state.phase !== 'reveal' || !state.deck) return null
  if (state.roundIndex + 1 >= state.totalRounds) return finishPictionary(state)
  const next: PictionaryState = {
    ...state,
    roundIndex: state.roundIndex + 1,
    drawerUid: otherPlayerUid(state.drawerUid),
  }
  return bump(next, {
    phase: 'pickCard',
    ...clearRound(),
    ...dealFor(next, state.deck, rand),
  })
}

export function surrenderPictionary(
  state: PictionaryState,
  uid: string,
): PictionaryState | null {
  if (state.status !== 'playing' || state.firstUid == null) return null
  if (state.phase === 'finished' || state.phase === 'pickDeck') return null
  if (!isRoomUid(uid)) return null
  return bump(state, {
    phase: 'finished',
    status: 'won',
    winnerUid: otherPlayerUid(uid),
    surrenderUid: uid,
    choices: [],
    challengeOffers: [],
    ...clearRound(),
    recentCardIds: mergeRecent(state),
  })
}

// ── Custom deck ────────────────────────────────────────────────────────────

export function addPictionaryCustomCard(
  state: PictionaryState,
  word: string,
  difficulty: PictionaryDifficulty,
): PictionaryState | null {
  const trimmed = word.trim().replace(/\s+/g, ' ').slice(0, MAX_WORD_LENGTH)
  const slug = pictionaryCardSlug(trimmed)
  if (!slug) return null
  const id = `${PICTIONARY_CUSTOM_THEME}:${slug}`
  if (state.customCards.some((c) => c.id === id)) return null
  if (state.customCards.length >= MAX_CUSTOM_CARDS) return null
  return bump(state, {
    customCards: [
      ...state.customCards,
      { id, word: trimmed, difficulty, theme: PICTIONARY_CUSTOM_THEME },
    ],
  })
}

export function removePictionaryCustomCard(
  state: PictionaryState,
  cardId: string,
): PictionaryState | null {
  if (!state.customCards.some((c) => c.id === cardId)) return null
  return bump(state, {
    customCards: state.customCards.filter((c) => c.id !== cardId),
  })
}

// ── Normalize ──────────────────────────────────────────────────────────────

function parseDifficulty(raw: unknown): PictionaryDifficulty | null {
  return raw === 'easy' || raw === 'medium' || raw === 'hard' ? raw : null
}

function normalizeCard(raw: unknown): PictionaryCard | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const word = typeof o.word === 'string' ? o.word.trim().slice(0, MAX_WORD_LENGTH) : ''
  const difficulty = parseDifficulty(o.difficulty)
  const id = typeof o.id === 'string' ? o.id.trim().slice(0, 120) : ''
  if (!word || !difficulty || !id) return null
  const theme =
    typeof o.theme === 'string' && o.theme.trim() ? o.theme.trim().slice(0, 40) : 'custom'
  return { id, word, difficulty, theme }
}

function normalizeCards(raw: unknown, max: number): PictionaryCard[] {
  if (!Array.isArray(raw)) return []
  const out: PictionaryCard[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const card = normalizeCard(item)
    if (!card || seen.has(card.id)) continue
    seen.add(card.id)
    out.push(card)
    if (out.length >= max) break
  }
  return out
}

function normalizeIds(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
    .slice(-max)
}

function normalizeSeatMap(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const uid of JENGA_PLAYER_UIDS) {
    const v = (raw as Record<string, unknown>)[uid]
    if (v != null) out[uid] = Math.max(0, Math.floor(clampNum(v, 0)))
  }
  return out
}

function normalizeGuesses(raw: unknown): PictionaryGuess[] {
  if (!Array.isArray(raw)) return []
  const out: PictionaryGuess[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    if (typeof o.uid !== 'string' || !isRoomUid(o.uid)) continue
    const text = typeof o.text === 'string' ? o.text.slice(0, MAX_WORD_LENGTH) : ''
    if (!text) continue
    out.push({
      uid: o.uid,
      text,
      correct: o.correct === true,
      close: o.close === true,
      at: clampNum(o.at, 0),
    })
  }
  return out.slice(-MAX_GUESSES)
}

function normalizeRounds(raw: unknown): PictionaryRound[] {
  if (!Array.isArray(raw)) return []
  const out: PictionaryRound[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const card = normalizeCard(o.card)
    if (!card) continue
    if (typeof o.drawerUid !== 'string' || !isRoomUid(o.drawerUid)) continue
    const guesserUid =
      typeof o.guesserUid === 'string' && isRoomUid(o.guesserUid)
        ? o.guesserUid
        : otherPlayerUid(o.drawerUid)
    out.push({
      index: Math.max(0, Math.floor(clampNum(o.index, out.length))),
      drawerUid: o.drawerUid,
      guesserUid,
      card,
      modifierId: pictionaryModifier(o.modifierId as string)?.id ?? null,
      guessed: o.guessed === true,
      guessMs:
        typeof o.guessMs === 'number' && Number.isFinite(o.guessMs) ? o.guessMs : null,
      hintUsed: o.hintUsed === true,
      guesserPoints: Math.max(0, Math.floor(clampNum(o.guesserPoints, 0))),
      drawerPoints: Math.max(0, Math.floor(clampNum(o.drawerPoints, 0))),
    })
  }
  return out
}

function parsePhase(raw: unknown): PictionaryPhase {
  return raw === 'pickCard' ||
    raw === 'drawing' ||
    raw === 'reveal' ||
    raw === 'finished'
    ? raw
    : 'pickDeck'
}

function optionalNum(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
}

export function normalizePictionary(raw: unknown, uid: string): PictionaryState {
  const fallback = createInitialPictionary(uid)
  if (!raw || typeof raw !== 'object') return fallback
  const s = raw as Record<string, unknown>
  const firstUid = parseOptionalSeatUid(
    s.firstUid,
    Object.prototype.hasOwnProperty.call(s, 'firstUid'),
    null,
  )
  const deck = isPictionaryDeckId(s.deck) ? s.deck : null
  const card = normalizeCard(s.card)
  let phase = parsePhase(s.phase)
  const status: PictionaryStatus =
    s.status === 'won' || s.status === 'draw' ? s.status : 'playing'
  if (status !== 'playing') phase = 'finished'
  if (firstUid == null && phase !== 'finished') phase = 'pickDeck'
  if (phase !== 'pickDeck' && phase !== 'finished' && !deck) phase = 'pickDeck'
  if (phase === 'drawing' && !card) phase = 'pickCard'

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
    deck,
    roundIndex: Math.max(0, Math.floor(clampNum(s.roundIndex, 0))),
    totalRounds: Math.max(
      2,
      Math.min(20, Math.floor(clampNum(s.totalRounds, PICTIONARY_TOTAL_ROUNDS))),
    ),
    drawerUid:
      typeof s.drawerUid === 'string' && isRoomUid(s.drawerUid)
        ? s.drawerUid
        : firstUid ?? fallback.drawerUid,
    choices: normalizeCards(s.choices, 3),
    challengeOffers: Array.isArray(s.challengeOffers)
      ? s.challengeOffers
          .filter((id): id is string => typeof id === 'string' && pictionaryModifier(id) != null)
          .slice(0, 3)
      : [],
    card,
    modifierId: pictionaryModifier(s.modifierId as string)?.id ?? null,
    drawStartedAt: optionalNum(s.drawStartedAt),
    drawEndsAt: optionalNum(s.drawEndsAt),
    hintIndex:
      typeof s.hintIndex === 'number' && Number.isInteger(s.hintIndex) && s.hintIndex >= 0
        ? s.hintIndex
        : null,
    guesses: normalizeGuesses(s.guesses),
    rounds: normalizeRounds(s.rounds),
    scores: { ...zeroScores(), ...normalizeSeatMap(s.scores) },
    rerolls: Math.min(
      PICTIONARY_REROLLS_PER_ROUND,
      Math.max(0, Math.floor(clampNum(s.rerolls, 0))),
    ),
    usedCardIds: normalizeIds(s.usedCardIds, 200),
    recentCardIds: normalizeIds(s.recentCardIds, MAX_RECENT_CARDS),
    customCards: normalizeCards(s.customCards, MAX_CUSTOM_CARDS),
    winnerUid:
      typeof s.winnerUid === 'string' && isRoomUid(s.winnerUid) ? s.winnerUid : null,
    surrenderUid:
      typeof s.surrenderUid === 'string' && isRoomUid(s.surrenderUid)
        ? s.surrenderUid
        : null,
  }
}
