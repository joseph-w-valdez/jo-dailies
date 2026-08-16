import {
  collection,
  doc,
  getDoc,
  setDoc,
  type DocumentData,
} from 'firebase/firestore'
import type { ArcadeGameId } from '../arcade'
import { db, syncRoomId, toFirestoreData } from './firebase'
import { householdName } from './household'
import { JENGA_PLAYER_UIDS } from './jenga'
import { agentById } from './valorantAgents'

export type MatchHistoryGameId = Exclude<ArcadeGameId, 'suika'>

export type ArcadeMatchResult = 'win' | 'draw' | 'loss' | 'collapsed'

/** Per-player Scrabble highlight from one finished round. */
export type ScrabblePlayerBest = {
  highTurn: number
  highTurnWords: string
  longestWord: string
}

/** Snapshot of a finished Scrabble round for fun stats / history. */
export type ScrabbleMatchExtras = {
  bestByUid: Record<string, ScrabblePlayerBest>
  bingos: number
  plays: number
  passes: number
  exchanges: number
  skills: number
  margin: number
}

/** How a Guess Who round ended. */
export type GuessWhoWinKind = 'correct' | 'wrong' | 'surrender'

/** Snapshot of a finished Guess Who round for fun stats / history. */
export type GuessWhoMatchExtras = {
  winKind: GuessWhoWinKind
  /** Secret agent id each seat locked in. */
  secretsByUid: Record<string, string>
}

export function emptyScrabblePlayerBest(): ScrabblePlayerBest {
  return { highTurn: 0, highTurnWords: '', longestWord: '' }
}

/** Highest single-turn score across seats in one match snapshot. */
export function scrabbleMatchTopTurn(extra: ScrabbleMatchExtras): number {
  let top = 0
  for (const best of Object.values(extra.bestByUid)) {
    if (best.highTurn > top) top = best.highTurn
  }
  return top
}

export type ArcadeMatch = {
  id: string
  gameId: MatchHistoryGameId
  roundId: string
  endedAt: number
  winnerUid: string | null
  result: ArcadeMatchResult
  detail?: string
  /** Present on Scrabble finishes when moveLog was available. */
  scrabble?: ScrabbleMatchExtras
  /** Present on Guess Who finishes. */
  guesswho?: GuessWhoMatchExtras
  players: [string, string]
  hotseat: boolean
}

export const ARCADE_MATCHES_COLLECTION = 'arcadeMatches'

const HISTORY_GAME_IDS = new Set<MatchHistoryGameId>([
  'jenga',
  'connect4',
  'battleship',
  'scrabble',
  'chess',
  'wordle',
  'hangman',
  'codenames',
  'guesswho',
])

export function isMatchHistoryGameId(
  id: string | null | undefined,
): id is MatchHistoryGameId {
  return Boolean(id && HISTORY_GAME_IDS.has(id as MatchHistoryGameId))
}

export function arcadeMatchDocId(gameId: MatchHistoryGameId, roundId: string): string {
  const safe = roundId.replace(/[/\\]/g, '-').slice(0, 80)
  return `${gameId}_${safe}`
}

type LooseGame = Record<string, unknown>

function asLoose(raw: unknown): LooseGame | null {
  if (!raw || typeof raw !== 'object') return null
  return raw as LooseGame
}

function isTerminal(collectionId: MatchHistoryGameId, state: LooseGame): boolean {
  const status = typeof state.status === 'string' ? state.status : ''
  const phase = typeof state.phase === 'string' ? state.phase : ''
  switch (collectionId) {
    case 'scrabble':
      return status === 'finished'
    case 'chess':
      return (
        status === 'checkmate' ||
        status === 'stalemate' ||
        status === 'draw' ||
        status === 'timeout' ||
        status === 'resign'
      )
    case 'connect4':
      return status === 'won' || status === 'draw'
    case 'battleship':
      return status === 'won'
    case 'jenga':
      return status === 'collapsed'
    case 'wordle':
    case 'hangman':
      return phase === 'finished'
    case 'codenames':
      return phase === 'finished' || status === 'won' || status === 'lost'
    case 'guesswho':
      return phase === 'finished' || status === 'won'
    default:
      return false
  }
}

function detailFor(collectionId: MatchHistoryGameId, state: LooseGame): string | undefined {
  switch (collectionId) {
    case 'scrabble': {
      const scores = state.scores
      if (!scores || typeof scores !== 'object') return undefined
      const a = JENGA_PLAYER_UIDS[0]!
      const b = JENGA_PLAYER_UIDS[1]!
      const sa = Number((scores as Record<string, unknown>)[a] ?? 0)
      const sb = Number((scores as Record<string, unknown>)[b] ?? 0)
      return `${sa}–${sb}`
    }
    case 'chess': {
      const status = typeof state.status === 'string' ? state.status : ''
      if (status === 'checkmate') return 'Checkmate'
      if (status === 'stalemate') return 'Stalemate'
      if (status === 'timeout') return 'On time'
      if (status === 'resign') return 'Surrender'
      if (status === 'draw') return 'Draw'
      return undefined
    }
    case 'jenga': {
      const removed =
        typeof state.removedCount === 'number' ? state.removedCount : null
      const reason =
        typeof state.endReason === 'string' && state.endReason
          ? state.endReason
          : null
      const bits: string[] = []
      if (reason) bits.push(reason)
      if (removed != null) bits.push(`${removed} pulls`)
      return bits.length ? bits.join(' · ') : undefined
    }
    case 'wordle': {
      const mode = state.mode === 'versus' ? 'Versus' : 'Co-op'
      const status = typeof state.status === 'string' ? state.status : ''
      return status ? `${mode} · ${status}` : mode
    }
    case 'hangman': {
      const mode = state.mode === 'versus' ? 'Versus' : 'Co-op'
      const status = typeof state.status === 'string' ? state.status : ''
      return status ? `${mode} · ${status}` : mode
    }
    case 'codenames': {
      const status = typeof state.status === 'string' ? state.status : ''
      const pack = state.wordPack === 'full' ? 'Full' : 'Standard'
      return status ? `${pack} · ${status}` : pack
    }
    case 'guesswho': {
      const guess = state.lastGuess
      if (guess && typeof guess === 'object') {
        const g = guess as Record<string, unknown>
        if (g.correct === true) return 'Correct guess'
        if (g.correct === false) return 'Wrong guess'
      }
      return 'Surrender'
    }
    default:
      return undefined
  }
}

/** Pull Scrabble fun facts from a finished game doc's moveLog + scores. */
export function scrabbleExtrasFromState(
  state: LooseGame,
): ScrabbleMatchExtras | undefined {
  const scores = state.scores
  const a = JENGA_PLAYER_UIDS[0]!
  const b = JENGA_PLAYER_UIDS[1]!
  let sa = 0
  let sb = 0
  if (scores && typeof scores === 'object') {
    sa = Math.max(0, Math.floor(Number((scores as Record<string, unknown>)[a] ?? 0)))
    sb = Math.max(0, Math.floor(Number((scores as Record<string, unknown>)[b] ?? 0)))
  }
  const margin = Math.abs(sa - sb)

  const bestByUid: Record<string, ScrabblePlayerBest> = {
    [a]: emptyScrabblePlayerBest(),
    [b]: emptyScrabblePlayerBest(),
  }
  const log = Array.isArray(state.moveLog) ? state.moveLog : []
  let bingos = 0
  let plays = 0
  let passes = 0
  let exchanges = 0
  let skills = 0

  for (const raw of log) {
    if (!raw || typeof raw !== 'object') continue
    const entry = raw as Record<string, unknown>
    const kind = typeof entry.kind === 'string' ? entry.kind : ''
    const uid = typeof entry.uid === 'string' ? entry.uid : null
    const score =
      typeof entry.score === 'number' && Number.isFinite(entry.score)
        ? Math.floor(entry.score)
        : 0
    const words = Array.isArray(entry.words)
      ? entry.words.filter((w): w is string => typeof w === 'string')
      : []
    const note = typeof entry.note === 'string' ? entry.note : ''
    const tilesPlayed =
      typeof entry.tilesPlayed === 'number' && Number.isFinite(entry.tilesPlayed)
        ? Math.floor(entry.tilesPlayed)
        : null

    if (kind === 'play') {
      plays += 1
      if (uid && bestByUid[uid]) {
        const seat = bestByUid[uid]!
        if (score > seat.highTurn) {
          seat.highTurn = score
          seat.highTurnWords = words.join(', ')
        }
        for (const word of words) {
          if (word.length > seat.longestWord.length) seat.longestWord = word
        }
      }
      if (tilesPlayed === 7) {
        bingos += 1
      } else if (
        tilesPlayed == null &&
        score >= 50 &&
        !/meowtiply/i.test(note)
      ) {
        bingos += 1
      }
    } else if (kind === 'pass') passes += 1
    else if (kind === 'exchange') exchanges += 1
    else if (kind === 'skill') skills += 1
  }

  if (plays === 0 && margin === 0) {
    const anyTurn = Object.values(bestByUid).some((seat) => seat.highTurn > 0)
    if (!anyTurn) return undefined
  }

  return {
    bestByUid,
    bingos,
    plays,
    passes,
    exchanges,
    skills,
    margin,
  }
}

/** Pull Guess Who finish facts from the shared room doc. */
export function guessWhoExtrasFromState(
  state: LooseGame,
): GuessWhoMatchExtras | undefined {
  const seats = Array.isArray(state.seats) ? state.seats : null
  if (!seats || seats.length < 2) return undefined

  const secretsByUid: Record<string, string> = {}
  for (let i = 0; i < 2; i += 1) {
    const uid = JENGA_PLAYER_UIDS[i]!
    const seat = seats[i]
    if (!seat || typeof seat !== 'object') continue
    const secretId = (seat as Record<string, unknown>).secretId
    if (typeof secretId === 'string' && secretId) {
      secretsByUid[uid] = secretId
    }
  }
  if (Object.keys(secretsByUid).length === 0) return undefined

  let winKind: GuessWhoWinKind = 'surrender'
  const guess = state.lastGuess
  if (guess && typeof guess === 'object') {
    const g = guess as Record<string, unknown>
    if (g.correct === true) winKind = 'correct'
    else if (g.correct === false) winKind = 'wrong'
  }

  return { winKind, secretsByUid }
}

function normalizeGuessWhoExtras(raw: unknown): GuessWhoMatchExtras | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const s = raw as Record<string, unknown>
  const winKind: GuessWhoWinKind =
    s.winKind === 'correct' || s.winKind === 'wrong' || s.winKind === 'surrender'
      ? s.winKind
      : 'surrender'
  const secretsByUid: Record<string, string> = {}
  if (s.secretsByUid && typeof s.secretsByUid === 'object') {
    const bag = s.secretsByUid as Record<string, unknown>
    for (const uid of JENGA_PLAYER_UIDS) {
      const id = bag[uid]
      if (typeof id === 'string' && id) secretsByUid[uid] = id
    }
  }
  if (Object.keys(secretsByUid).length === 0) return undefined
  return { winKind, secretsByUid }
}

function normalizePlayerBest(raw: unknown): ScrabblePlayerBest {
  if (!raw || typeof raw !== 'object') return emptyScrabblePlayerBest()
  const s = raw as Record<string, unknown>
  return {
    highTurn:
      typeof s.highTurn === 'number' && Number.isFinite(s.highTurn)
        ? Math.max(0, Math.floor(s.highTurn))
        : 0,
    highTurnWords: typeof s.highTurnWords === 'string' ? s.highTurnWords : '',
    longestWord: typeof s.longestWord === 'string' ? s.longestWord : '',
  }
}

function normalizeScrabbleExtras(raw: unknown): ScrabbleMatchExtras | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const s = raw as Record<string, unknown>
  const bestByUid: Record<string, ScrabblePlayerBest> = {
    [JENGA_PLAYER_UIDS[0]!]: emptyScrabblePlayerBest(),
    [JENGA_PLAYER_UIDS[1]!]: emptyScrabblePlayerBest(),
  }

  if (s.bestByUid && typeof s.bestByUid === 'object') {
    const bag = s.bestByUid as Record<string, unknown>
    for (const uid of JENGA_PLAYER_UIDS) {
      bestByUid[uid] = normalizePlayerBest(bag[uid])
    }
  } else {
    // Legacy single-winner fields from earlier mocks / docs.
    const highTurn =
      typeof s.highTurn === 'number' && Number.isFinite(s.highTurn)
        ? Math.max(0, Math.floor(s.highTurn))
        : 0
    const highTurnUid =
      typeof s.highTurnUid === 'string' ? s.highTurnUid : null
    const highTurnWords =
      typeof s.highTurnWords === 'string' ? s.highTurnWords : ''
    const longestWord =
      typeof s.longestWord === 'string' ? s.longestWord : ''
    if (highTurnUid && bestByUid[highTurnUid]) {
      bestByUid[highTurnUid] = {
        highTurn,
        highTurnWords,
        longestWord,
      }
    }
  }

  return {
    bestByUid,
    bingos:
      typeof s.bingos === 'number' && Number.isFinite(s.bingos)
        ? Math.max(0, Math.floor(s.bingos))
        : 0,
    plays:
      typeof s.plays === 'number' && Number.isFinite(s.plays)
        ? Math.max(0, Math.floor(s.plays))
        : 0,
    passes:
      typeof s.passes === 'number' && Number.isFinite(s.passes)
        ? Math.max(0, Math.floor(s.passes))
        : 0,
    exchanges:
      typeof s.exchanges === 'number' && Number.isFinite(s.exchanges)
        ? Math.max(0, Math.floor(s.exchanges))
        : 0,
    skills:
      typeof s.skills === 'number' && Number.isFinite(s.skills)
        ? Math.max(0, Math.floor(s.skills))
        : 0,
    margin:
      typeof s.margin === 'number' && Number.isFinite(s.margin)
        ? Math.max(0, Math.floor(s.margin))
        : 0,
  }
}

function resultFor(
  collectionId: MatchHistoryGameId,
  state: LooseGame,
): ArcadeMatchResult {
  if (collectionId === 'jenga') return 'collapsed'
  const status = typeof state.status === 'string' ? state.status : ''
  if (status === 'draw' || status === 'stalemate') return 'draw'
  if (status === 'lost') return 'loss'
  if (typeof state.winnerUid === 'string' && state.winnerUid) return 'win'
  if (status === 'won') return 'win'
  if (status === 'checkmate' || status === 'timeout' || status === 'resign')
    return 'win'
  return 'draw'
}

/**
 * Build a match row when `next` newly enters a terminal state.
 * Returns null for hotseat, non-history games, or non-transitions.
 */
export function matchFromGameTransition(
  collectionId: string,
  prevRaw: unknown,
  nextRaw: unknown,
): ArcadeMatch | null {
  if (!isMatchHistoryGameId(collectionId)) return null
  const prev = asLoose(prevRaw)
  const next = asLoose(nextRaw)
  if (!next) return null
  if (Boolean(next.hotseat)) return null
  if (!isTerminal(collectionId, next)) return null
  if (prev && isTerminal(collectionId, prev)) return null

  const roundId =
    typeof next.roundId === 'string' && next.roundId.trim()
      ? next.roundId.trim()
      : ''
  if (!roundId) return null

  const winnerUid =
    typeof next.winnerUid === 'string' && next.winnerUid
      ? next.winnerUid
      : null
  const detail = detailFor(collectionId, next)
  const scrabble =
    collectionId === 'scrabble' ? scrabbleExtrasFromState(next) : undefined
  const guesswho =
    collectionId === 'guesswho' ? guessWhoExtrasFromState(next) : undefined
  const endedAt =
    typeof next.updatedAt === 'number' && Number.isFinite(next.updatedAt)
      ? next.updatedAt
      : Date.now()

  return {
    id: arcadeMatchDocId(collectionId, roundId),
    gameId: collectionId,
    roundId,
    endedAt,
    winnerUid,
    result: resultFor(collectionId, next),
    ...(detail ? { detail } : {}),
    ...(scrabble ? { scrabble } : {}),
    ...(guesswho ? { guesswho } : {}),
    players: [JENGA_PLAYER_UIDS[0]!, JENGA_PLAYER_UIDS[1]!],
    hotseat: false,
  }
}

export function normalizeArcadeMatch(raw: unknown): ArcadeMatch | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  if (!isMatchHistoryGameId(typeof s.gameId === 'string' ? s.gameId : '')) {
    return null
  }
  const gameId = s.gameId as MatchHistoryGameId
  const roundId = typeof s.roundId === 'string' ? s.roundId : ''
  if (!roundId) return null
  const resultRaw = s.result
  const result: ArcadeMatchResult =
    resultRaw === 'win' ||
    resultRaw === 'draw' ||
    resultRaw === 'loss' ||
    resultRaw === 'collapsed'
      ? resultRaw
      : 'draw'
  const players: [string, string] = [
    JENGA_PLAYER_UIDS[0]!,
    JENGA_PLAYER_UIDS[1]!,
  ]
  if (Array.isArray(s.players) && s.players.length >= 2) {
    if (typeof s.players[0] === 'string') players[0] = s.players[0]
    if (typeof s.players[1] === 'string') players[1] = s.players[1]
  }
  return {
    id:
      typeof s.id === 'string' && s.id
        ? s.id
        : arcadeMatchDocId(gameId, roundId),
    gameId,
    roundId,
    endedAt:
      typeof s.endedAt === 'number' && Number.isFinite(s.endedAt)
        ? s.endedAt
        : Date.now(),
    winnerUid: typeof s.winnerUid === 'string' ? s.winnerUid : null,
    result,
    ...(typeof s.detail === 'string' && s.detail ? { detail: s.detail } : {}),
    ...(gameId === 'scrabble'
      ? (() => {
          const scrabble = normalizeScrabbleExtras(s.scrabble)
          return scrabble ? { scrabble } : {}
        })()
      : {}),
    ...(gameId === 'guesswho'
      ? (() => {
          const guesswho = normalizeGuessWhoExtras(s.guesswho)
          return guesswho ? { guesswho } : {}
        })()
      : {}),
    players,
    hotseat: Boolean(s.hotseat),
  }
}

/** Persist a match if that gameId+roundId is not already stored. */
export async function recordArcadeMatch(match: ArcadeMatch): Promise<boolean> {
  const ref = doc(db, 'rooms', syncRoomId, ARCADE_MATCHES_COLLECTION, match.id)
  const existing = await getDoc(ref)
  if (existing.exists()) return false
  await setDoc(ref, toFirestoreData(match as unknown as DocumentData))
  return true
}

/** After a successful game commit — no-op unless a new terminal transition. */
export function maybeRecordArcadeMatch(
  collectionId: string,
  prev: unknown,
  next: unknown,
): void {
  const match = matchFromGameTransition(collectionId, prev, next)
  if (!match) return
  void recordArcadeMatch(match).catch((error: unknown) => {
    console.error('arcade match record', error)
  })
}

export function arcadeGameTitle(gameId: MatchHistoryGameId): string {
  switch (gameId) {
    case 'connect4':
      return 'Connect Four'
    case 'battleship':
      return 'Cattleship'
    case 'jenga':
      return 'Jenga'
    case 'scrabble':
      return 'Scrabble'
    case 'chess':
      return 'Chess'
    case 'wordle':
      return 'Wordle'
    case 'hangman':
      return 'Hangman'
    case 'codenames':
      return 'Codenames'
    case 'guesswho':
      return 'Guess Who'
  }
}

/** Human result line for a history row. */
export function arcadeMatchSummary(match: ArcadeMatch): string {
  if (match.result === 'collapsed') {
    return match.winnerUid
      ? `Collapsed — ${householdName(match.winnerUid)} wins`
      : 'Collapsed'
  }
  if (match.result === 'draw') return 'Draw'
  if (match.result === 'loss') return 'Lost'
  if (match.winnerUid) return `${householdName(match.winnerUid)} won`
  return 'Won'
}

export function arcadeMatchesCollectionRef() {
  return collection(db, 'rooms', syncRoomId, ARCADE_MATCHES_COLLECTION)
}

export type ArcadeHouseholdStats = {
  totalMatches: number
  winsByUid: Record<string, number>
  draws: number
  mostPlayed: { gameId: MatchHistoryGameId; count: number } | null
  leastPlayed: { gameId: MatchHistoryGameId; count: number } | null
  /** Game each seat has the most decisive wins in. */
  bestGameByUid: Record<
    string,
    { gameId: MatchHistoryGameId; wins: number } | null
  >
  winRateByUid: Record<string, number>
  chessCheckmates: number
  chessTimeouts: number
  scrabbleHighScore: number | null
  scrabbleHighScoreUid: string | null
  /** Best single turn (points + words) per seat across all Scrabble matches. */
  scrabbleBestTurnByUid: Record<
    string,
    { score: number; words: string } | null
  >
  /** Longest word played per seat across all Scrabble matches. */
  scrabbleLongestWordByUid: Record<string, string | null>
  scrabbleBingos: number
  scrabbleBiggestMargin: number | null
  scrabbleGames: number
  /** Wins by correctly naming the opponent's agent. */
  guessWhoCorrectGuesses: number
  /** Wins because the opponent's final guess was wrong. */
  guessWhoWrongGuessWins: number
  /** Most-picked secret agent per seat. */
  guessWhoFavoriteSecretByUid: Record<
    string,
    { agentId: string; name: string; count: number } | null
  >
  matchesThisWeek: number
  daysSinceLastMatch: number | null
  flavor: string
}

function emptyUidRecord<T>(fill: T): Record<string, T> {
  return {
    [JENGA_PLAYER_UIDS[0]!]: fill,
    [JENGA_PLAYER_UIDS[1]!]: fill,
  }
}

function parseScrabbleScores(
  detail: string | undefined,
): [number, number] | null {
  if (!detail) return null
  const m = /^(\d+)–(\d+)$/.exec(detail.trim())
  if (!m) return null
  return [Number(m[1]), Number(m[2])]
}

function pickFlavor(stats: Omit<ArcadeHouseholdStats, 'flavor'>): string {
  const a = JENGA_PLAYER_UIDS[0]!
  const b = JENGA_PLAYER_UIDS[1]!
  const aWins = stats.winsByUid[a] ?? 0
  const bWins = stats.winsByUid[b] ?? 0
  if (stats.totalMatches === 0) return 'The arcade awaits its first legend.'
  if (Math.abs(aWins - bWins) <= 1 && aWins + bWins >= 4) {
    return 'Dead even. The cats are taking notes.'
  }
  const aTurn = stats.scrabbleBestTurnByUid[a]?.score ?? 0
  const bTurn = stats.scrabbleBestTurnByUid[b]?.score ?? 0
  const topTurn = Math.max(aTurn, bTurn)
  if (topTurn >= 60) {
    return `A ${topTurn}-point Scrabble turn entered the chat.`
  }
  if (stats.scrabbleBingos >= 2) {
    return 'Bingo energy. The bag is shook.'
  }
  if (stats.scrabbleHighScore != null && stats.scrabbleHighScore >= 200) {
    return `Someone dropped a ${stats.scrabbleHighScore}-point Scrabble bomb.`
  }
  if (stats.guessWhoWrongGuessWins >= 2) {
    return 'Wrong-guess energy. Someone keep baiting.'
  }
  if (stats.guessWhoCorrectGuesses >= 3) {
    return 'Sharpshooter season in Guess Who.'
  }
  if (aWins > bWins) return `${householdName(a)} is slightly unbearable right now.`
  if (bWins > aWins) return `${householdName(b)} is collecting bragging rights.`
  return 'Play more. The spreadsheet demands tribute.'
}

/** Fun aggregate stats from finished matches (newest-first or any order). */
export function computeArcadeStats(matches: ArcadeMatch[]): ArcadeHouseholdStats {
  const winsByUid = emptyUidRecord(0)
  const lossesByUid = emptyUidRecord(0)
  const bestGameByUid = emptyUidRecord(null as {
    gameId: MatchHistoryGameId
    wins: number
  } | null)
  const winRateByUid = emptyUidRecord(0)
  const scrabbleBestTurnByUid = emptyUidRecord(null as {
    score: number
    words: string
  } | null)
  const scrabbleLongestWordByUid = emptyUidRecord(null as string | null)
  const perGameWins: Record<string, Partial<Record<MatchHistoryGameId, number>>> =
    emptyUidRecord({})
  const played: Partial<Record<MatchHistoryGameId, number>> = {}

  let draws = 0
  let chessCheckmates = 0
  let chessTimeouts = 0
  let scrabbleHighScore: number | null = null
  let scrabbleHighScoreUid: string | null = null
  let scrabbleBingos = 0
  let scrabbleBiggestMargin: number | null = null
  let scrabbleGames = 0
  let guessWhoCorrectGuesses = 0
  let guessWhoWrongGuessWins = 0
  const secretCountsByUid: Record<string, Record<string, number>> = {
    [JENGA_PLAYER_UIDS[0]!]: {},
    [JENGA_PLAYER_UIDS[1]!]: {},
  }
  let matchesThisWeek = 0

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const newestFirst = [...matches].sort((a, b) => b.endedAt - a.endedAt)

  for (const match of matches) {
    played[match.gameId] = (played[match.gameId] ?? 0) + 1
    if (match.endedAt >= weekAgo) matchesThisWeek += 1
    if (match.gameId === 'chess') {
      if (match.detail === 'Checkmate') chessCheckmates += 1
      if (match.detail === 'On time') chessTimeouts += 1
    }
    if (match.gameId === 'guesswho') {
      const kind =
        match.guesswho?.winKind ??
        (match.detail === 'Correct guess'
          ? 'correct'
          : match.detail === 'Wrong guess'
            ? 'wrong'
            : null)
      if (kind === 'correct') guessWhoCorrectGuesses += 1
      if (kind === 'wrong') guessWhoWrongGuessWins += 1
      const secrets = match.guesswho?.secretsByUid
      if (secrets) {
        for (const uid of JENGA_PLAYER_UIDS) {
          const agentId = secrets[uid]
          if (!agentId) continue
          const bag = secretCountsByUid[uid]!
          bag[agentId] = (bag[agentId] ?? 0) + 1
        }
      }
    }
    if (match.gameId === 'scrabble') {
      scrabbleGames += 1
      const scores = parseScrabbleScores(match.detail)
      if (scores) {
        const [sa, sb] = scores
        const hi = Math.max(sa, sb)
        if (scrabbleHighScore == null || hi > scrabbleHighScore) {
          scrabbleHighScore = hi
          scrabbleHighScoreUid =
            sa === sb
              ? match.winnerUid
              : sa > sb
                ? JENGA_PLAYER_UIDS[0]!
                : JENGA_PLAYER_UIDS[1]!
        }
      }
      const extra = match.scrabble
      if (extra) {
        scrabbleBingos += extra.bingos
        if (
          scrabbleBiggestMargin == null ||
          extra.margin > scrabbleBiggestMargin
        ) {
          scrabbleBiggestMargin = extra.margin
        }
        for (const uid of JENGA_PLAYER_UIDS) {
          const seat = extra.bestByUid[uid]
          if (!seat) continue
          const prevTurn = scrabbleBestTurnByUid[uid]
          if (!prevTurn || seat.highTurn > prevTurn.score) {
            scrabbleBestTurnByUid[uid] =
              seat.highTurn > 0
                ? { score: seat.highTurn, words: seat.highTurnWords }
                : null
          }
          const prevWord = scrabbleLongestWordByUid[uid]
          if (
            seat.longestWord &&
            (!prevWord || seat.longestWord.length > prevWord.length)
          ) {
            scrabbleLongestWordByUid[uid] = seat.longestWord
          }
        }
      }
    }

    if (match.result === 'draw') {
      draws += 1
      continue
    }
    if (match.result === 'loss') continue
    if (match.result === 'win' && !match.winnerUid) continue
    if (match.winnerUid && winsByUid[match.winnerUid] != null) {
      winsByUid[match.winnerUid] += 1
      const bag = perGameWins[match.winnerUid]!
      bag[match.gameId] = (bag[match.gameId] ?? 0) + 1

      const loser = JENGA_PLAYER_UIDS.find((id) => id !== match.winnerUid)
      if (loser) lossesByUid[loser] += 1
    }
  }

  for (const uid of JENGA_PLAYER_UIDS) {
    const bag = perGameWins[uid]!
    let best: { gameId: MatchHistoryGameId; wins: number } | null = null
    for (const [gameId, wins] of Object.entries(bag) as [
      MatchHistoryGameId,
      number,
    ][]) {
      if (!best || wins > best.wins) best = { gameId, wins }
    }
    bestGameByUid[uid] = best

    const decided = (winsByUid[uid] ?? 0) + (lossesByUid[uid] ?? 0)
    winRateByUid[uid] =
      decided === 0 ? 0 : Math.round(((winsByUid[uid] ?? 0) / decided) * 100)
  }

  const guessWhoFavoriteSecretByUid = emptyUidRecord(null as {
    agentId: string
    name: string
    count: number
  } | null)
  for (const uid of JENGA_PLAYER_UIDS) {
    const bag = secretCountsByUid[uid]!
    let favorite: { agentId: string; name: string; count: number } | null = null
    for (const [agentId, count] of Object.entries(bag)) {
      const agent = agentById(agentId)
      if (!agent) continue
      if (
        !favorite ||
        count > favorite.count ||
        (count === favorite.count && agent.name.localeCompare(favorite.name) < 0)
      ) {
        favorite = { agentId, name: agent.name, count }
      }
    }
    guessWhoFavoriteSecretByUid[uid] = favorite
  }

  let mostPlayed: ArcadeHouseholdStats['mostPlayed'] = null
  let leastPlayed: ArcadeHouseholdStats['leastPlayed'] = null
  for (const [gameId, count] of Object.entries(played) as [
    MatchHistoryGameId,
    number,
  ][]) {
    if (!mostPlayed || count > mostPlayed.count) {
      mostPlayed = { gameId, count }
    }
    if (!leastPlayed || count < leastPlayed.count) {
      leastPlayed = { gameId, count }
    }
  }

  const daysSinceLastMatch =
    newestFirst[0] != null
      ? Math.max(
          0,
          Math.floor((Date.now() - newestFirst[0].endedAt) / (24 * 60 * 60 * 1000)),
        )
      : null

  const base = {
    totalMatches: matches.length,
    winsByUid,
    draws,
    mostPlayed,
    leastPlayed,
    bestGameByUid,
    winRateByUid,
    chessCheckmates,
    chessTimeouts,
    scrabbleHighScore,
    scrabbleHighScoreUid,
    scrabbleBestTurnByUid,
    scrabbleLongestWordByUid,
    scrabbleBingos,
    scrabbleBiggestMargin,
    scrabbleGames,
    guessWhoCorrectGuesses,
    guessWhoWrongGuessWins,
    guessWhoFavoriteSecretByUid,
    matchesThisWeek,
    daysSinceLastMatch,
  }

  return { ...base, flavor: pickFlavor(base) }
}

/** Aggregate Scrabble-only fun stats for the per-game history panel. */
export function computeScrabbleGameStats(matches: ArcadeMatch[]) {
  const scrabble = matches.filter((m) => m.gameId === 'scrabble')
  const household = computeArcadeStats(scrabble)
  let totalPlays = 0
  let totalPasses = 0
  let totalExchanges = 0
  let totalSkills = 0
  for (const match of scrabble) {
    if (!match.scrabble) continue
    totalPlays += match.scrabble.plays
    totalPasses += match.scrabble.passes
    totalExchanges += match.scrabble.exchanges
    totalSkills += match.scrabble.skills
  }
  return {
    games: scrabble.length,
    winsByUid: household.winsByUid,
    highScore: household.scrabbleHighScore,
    highScoreUid: household.scrabbleHighScoreUid,
    bestTurnByUid: household.scrabbleBestTurnByUid,
    longestWordByUid: household.scrabbleLongestWordByUid,
    bingos: household.scrabbleBingos,
    biggestMargin: household.scrabbleBiggestMargin,
    totalPlays,
    totalPasses,
    totalExchanges,
    totalSkills,
  }
}
