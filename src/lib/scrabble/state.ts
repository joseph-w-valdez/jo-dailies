/** Shared Scrabble game state. */

import {
  JENGA_PLAYER_UIDS,
  nextTurnUid,
  pickTwoJengaCats,
  normalizeJengaCats,
} from '../jenga'
import { SCRABBLE_SIZE } from './board'
import {
  applyPlacementsToBoard,
  emptyBoard,
  extractFormedWords,
  scorePlay,
  validatePlacementGeometry,
  type Placement,
  type ScrabbleBoard,
} from './rules'
import {
  createFullBag,
  drawTiles,
  normalizeTile,
  rackTilePoints,
  type ScrabbleTile,
} from './tiles'

export type ScrabbleStatus = 'playing' | 'finished'

export type ScrabbleMoveKind =
  | 'play'
  | 'pass'
  | 'exchange'
  | 'bust'
  | 'newGame'

/** One turn in the shared move history panel. */
export interface ScrabbleMoveLogEntry {
  uid: string
  kind: ScrabbleMoveKind
  words: string[]
  score: number
  /** That player's score after this move. */
  total: number
  /** Primary definitions for played words (when available). */
  definitions: { word: string; definition: string }[]
  /** Optional roast / flavor (invalid attempts). */
  note?: string
  /** For newGame: both players' scores when the previous round ended. */
  finals?: Record<string, number>
  at: number
}

export interface ScrabbleState {
  board: ScrabbleBoard
  bag: ScrabbleTile[]
  racks: Record<string, ScrabbleTile[]>
  scores: Record<string, number>
  turnUid: string
  passStreak: number
  status: ScrabbleStatus
  winnerUid: string | null
  lastPlayScore: number
  lastPlayWords: string[]
  /** Chronological turns for the scoreboard panel. */
  moveLog: ScrabbleMoveLogEntry[]
  cats: [string, string]
  /** Debug: one human plays both seats. */
  hotseat: boolean
  version: number
  roundId: string
  updatedAt: number
}

function clampNum(n: unknown, fallback = 0): number {
  const v = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(v) ? v : fallback
}

function newRoundId(): string {
  return `sc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const RACK_SIZE = 7
const MOVE_LOG_MAX = 200

function pushMove(
  log: ScrabbleMoveLogEntry[],
  entry: Omit<ScrabbleMoveLogEntry, 'at'>,
): ScrabbleMoveLogEntry[] {
  return [...log, { ...entry, at: Date.now() }].slice(-MOVE_LOG_MAX)
}

function pickBustRoast(words: string[]): string {
  const list = words.join(', ')
  const lines = [
    `Tried ${list}. The dictionary coughed politely and looked away.`,
    `${list}? Creative spelling. The tiles disagree.`,
    `Played ${list} with confidence. Reality had notes.`,
    `${list} is not a word — but we respect the audacity.`,
    `Attempted ${list}. Even the bag refused eye contact.`,
    `${list}… bold strategy. Zero dictionary support.`,
    `Submitted ${list}. Scrabble called; it wants its dignity back.`,
    `${list} rejected. The board remains unimpressed.`,
  ]
  return lines[Math.floor(Math.random() * lines.length)]!
}

/** Log a failed dictionary attempt — turn stays put, shame does not. */
export function applyBust(
  state: ScrabbleState,
  uid: string,
  invalidWords: string[],
): ScrabbleState | null {
  if (state.status !== 'playing') return null
  if (state.turnUid !== uid) return null
  const words = [
    ...new Set(
      invalidWords
        .map((w) => w.trim().toUpperCase())
        .filter((w) => /^[A-Z]+$/.test(w)),
    ),
  ]
  if (words.length === 0) return null
  return {
    ...state,
    moveLog: pushMove(state.moveLog, {
      uid,
      kind: 'bust',
      words,
      score: 0,
      total: state.scores[uid] ?? 0,
      definitions: [],
      note: pickBustRoast(words),
    }),
    updatedAt: Date.now(),
  }
}

function dealOpening(
  bag: ScrabbleTile[],
): { racks: Record<string, ScrabbleTile[]>; bag: ScrabbleTile[] } {
  let rest = bag
  const racks: Record<string, ScrabbleTile[]> = {}
  for (const uid of JENGA_PLAYER_UIDS) {
    const { drawn, bag: next } = drawTiles(rest, RACK_SIZE)
    racks[uid] = drawn
    rest = next
  }
  return { racks, bag: rest }
}

export function createInitialScrabble(
  turnUid: string,
  opts?: { hotseat?: boolean },
): ScrabbleState {
  const full = createFullBag()
  const { racks, bag } = dealOpening(full)
  const scores: Record<string, number> = {}
  for (const uid of JENGA_PLAYER_UIDS) scores[uid] = 0
  return {
    board: emptyBoard(),
    bag,
    racks,
    scores,
    turnUid: turnUid || JENGA_PLAYER_UIDS[0]!,
    passStreak: 0,
    status: 'playing',
    winnerUid: null,
    lastPlayScore: 0,
    lastPlayWords: [],
    moveLog: [],
    cats: pickTwoJengaCats(),
    hotseat: Boolean(opts?.hotseat),
    version: 1,
    roundId: newRoundId(),
    updatedAt: Date.now(),
  }
}

/** Fresh board/racks, keep move history, log previous round scores. */
export function startNewScrabble(
  prev: ScrabbleState,
  turnUid: string,
  opts?: { hotseat?: boolean },
): ScrabbleState {
  const next = createInitialScrabble(turnUid, opts)
  const finals: Record<string, number> = {}
  for (const uid of JENGA_PLAYER_UIDS) {
    finals[uid] = prev.scores[uid] ?? 0
  }
  return {
    ...next,
    moveLog: pushMove(prev.moveLog, {
      uid: '',
      kind: 'newGame',
      words: [],
      score: 0,
      total: 0,
      definitions: [],
      finals,
    }),
  }
}

function finishIfNeeded(state: ScrabbleState, actorUid: string): ScrabbleState {
  const actorRack = state.racks[actorUid] ?? []
  if (state.bag.length === 0 && actorRack.length === 0) {
    return settleEndgame(state, actorUid)
  }
  return state
}

/** Subtract remaining rack values; empty-rack player gets opponents' leftover. */
export function settleEndgame(
  state: ScrabbleState,
  emptiedUid: string | null,
): ScrabbleState {
  const scores = { ...state.scores }
  let emptiedBonus = 0
  for (const uid of JENGA_PLAYER_UIDS) {
    const rack = state.racks[uid] ?? []
    const pts = rackTilePoints(rack)
    scores[uid] = (scores[uid] ?? 0) - pts
    if (emptiedUid && uid !== emptiedUid) emptiedBonus += pts
  }
  if (emptiedUid) {
    scores[emptiedUid] = (scores[emptiedUid] ?? 0) + emptiedBonus
  }
  let winnerUid: string | null = null
  let best = -Infinity
  for (const uid of JENGA_PLAYER_UIDS) {
    const s = scores[uid] ?? 0
    if (s > best) {
      best = s
      winnerUid = uid
    } else if (s === best) {
      winnerUid = null // draw
    }
  }
  return {
    ...state,
    scores,
    status: 'finished',
    winnerUid,
    updatedAt: Date.now(),
  }
}

export function applyPass(
  state: ScrabbleState,
  uid: string,
): ScrabbleState | null {
  if (state.status !== 'playing') return null
  if (state.turnUid !== uid) return null
  const passStreak = state.passStreak + 1
  const moveLog = pushMove(state.moveLog, {
    uid,
    kind: 'pass',
    words: [],
    score: 0,
    total: state.scores[uid] ?? 0,
    definitions: [],
  })
  if (passStreak >= 2) {
    return settleEndgame({ ...state, passStreak, moveLog }, null)
  }
  return {
    ...state,
    passStreak,
    turnUid: nextTurnUid(uid),
    lastPlayScore: 0,
    lastPlayWords: [],
    moveLog,
    updatedAt: Date.now(),
  }
}

export function applyExchange(
  state: ScrabbleState,
  uid: string,
  tileIds: string[],
): ScrabbleState | null {
  if (state.status !== 'playing') return null
  if (state.turnUid !== uid) return null
  if (state.bag.length === 0) return null
  if (tileIds.length === 0) return null
  const rack = state.racks[uid] ?? []
  const idSet = new Set(tileIds)
  if (idSet.size !== tileIds.length) return null
  const returning: ScrabbleTile[] = []
  const keeping: ScrabbleTile[] = []
  for (const t of rack) {
    if (idSet.has(t.id)) returning.push(t)
    else keeping.push(t)
  }
  if (returning.length !== tileIds.length) return null
  if (returning.length > state.bag.length) return null

  let bag = state.bag.slice()
  // Draw replacements first from current bag, then shuffle returns back in.
  const { drawn, bag: afterDraw } = drawTiles(bag, returning.length)
  bag = afterDraw.concat(returning)
  // Light reshuffle of returned tiles into bag
  for (let i = bag.length - 1; i > bag.length - returning.length - 1 && i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = bag[i]!
    bag[i] = bag[j]!
    bag[j] = tmp
  }

  return {
    ...state,
    bag,
    racks: {
      ...state.racks,
      [uid]: [...keeping, ...drawn],
    },
    turnUid: nextTurnUid(uid),
    passStreak: 0,
    lastPlayScore: 0,
    lastPlayWords: [],
    moveLog: pushMove(state.moveLog, {
      uid,
      kind: 'exchange',
      words: [],
      score: 0,
      total: state.scores[uid] ?? 0,
      definitions: [],
    }),
    updatedAt: Date.now(),
  }
}

/**
 * Commit a play. Caller must already have validated words via dictionary.
 * Returns null if geometry/rack illegal.
 */
export function applyPlay(
  state: ScrabbleState,
  uid: string,
  placements: Placement[],
  opts?: { definitions?: { word: string; definition: string }[] },
): ScrabbleState | null {
  if (state.status !== 'playing') return null
  if (state.turnUid !== uid) return null
  const geo = validatePlacementGeometry(state.board, placements)
  if (geo) return null

  const rack = state.racks[uid] ?? []
  const rackById = new Map(rack.map((t) => [t.id, t]))
  for (const p of placements) {
    const tile = rackById.get(p.tileId)
    if (!tile) return null
    if (tile.blank !== p.blank) return null
    if (!tile.blank && tile.letter !== p.letter) return null
  }
  if (new Set(placements.map((p) => p.tileId)).size !== placements.length) {
    return null
  }

  const words = extractFormedWords(state.board, placements)
  if (words.length === 0) return null

  const playScore = scorePlay(state.board, placements, words)
  const board = applyPlacementsToBoard(state.board, placements)
  const usedIds = new Set(placements.map((p) => p.tileId))
  const remaining = rack.filter((t) => !usedIds.has(t.id))
  const need = RACK_SIZE - remaining.length
  const { drawn, bag } = drawTiles(state.bag, need)
  const nextRack = [...remaining, ...drawn]
  const nextTotal = (state.scores[uid] ?? 0) + playScore
  const formedWords = words.map((w) => w.word)
  const definitions = (opts?.definitions ?? [])
    .filter(
      (d) =>
        typeof d.word === 'string' &&
        typeof d.definition === 'string' &&
        d.definition.trim().length > 0,
    )
    .map((d) => ({
      word: d.word.toUpperCase(),
      definition: d.definition.trim(),
    }))

  let next: ScrabbleState = {
    ...state,
    board,
    bag,
    racks: { ...state.racks, [uid]: nextRack },
    scores: {
      ...state.scores,
      [uid]: nextTotal,
    },
    turnUid: nextTurnUid(uid),
    passStreak: 0,
    lastPlayScore: playScore,
    lastPlayWords: formedWords,
    moveLog: pushMove(state.moveLog, {
      uid,
      kind: 'play',
      words: formedWords,
      score: playScore,
      total: nextTotal,
      definitions,
    }),
    updatedAt: Date.now(),
  }

  next = finishIfNeeded(next, uid)
  // If emptied rack with empty bag, finishIfNeeded already settled and
  // shouldn't advance turn — settleEndgame sets finished.
  if (next.status === 'finished') {
    return { ...next, turnUid: uid }
  }
  return next
}

/** Words that would be formed — for dictionary check before commit. */
export function previewPlayWords(
  state: ScrabbleState,
  placements: Placement[],
): { words: string[]; error: string | null } {
  const geo = validatePlacementGeometry(state.board, placements)
  if (geo) return { words: [], error: geo }
  const formed = extractFormedWords(state.board, placements)
  if (formed.length === 0) {
    return { words: [], error: 'Play must form at least one word' }
  }
  return { words: formed.map((w) => w.word), error: null }
}

function normalizeBoard(raw: unknown): ScrabbleBoard {
  const board = emptyBoard()
  if (!Array.isArray(raw)) return board
  for (let i = 0; i < SCRABBLE_SIZE * SCRABBLE_SIZE && i < raw.length; i += 1) {
    const cell = raw[i]
    if (!cell || typeof cell !== 'object') continue
    const c = cell as Record<string, unknown>
    const letter =
      typeof c.letter === 'string' ? c.letter.toUpperCase() : ''
    if (!/^[A-Z]$/.test(letter)) continue
    board[i] = { letter, blank: Boolean(c.blank) }
  }
  return board
}

function normalizeRack(raw: unknown): ScrabbleTile[] {
  if (!Array.isArray(raw)) return []
  const out: ScrabbleTile[] = []
  for (const item of raw) {
    const t = normalizeTile(item)
    if (t) out.push(t)
  }
  return out
}

export function normalizeScrabble(
  raw: unknown,
  fallbackTurnUid: string,
): ScrabbleState {
  if (!raw || typeof raw !== 'object') {
    return createInitialScrabble(fallbackTurnUid)
  }
  const s = raw as Record<string, unknown>
  const racks: Record<string, ScrabbleTile[]> = {}
  const scores: Record<string, number> = {}
  const racksRaw =
    s.racks && typeof s.racks === 'object'
      ? (s.racks as Record<string, unknown>)
      : {}
  const scoresRaw =
    s.scores && typeof s.scores === 'object'
      ? (s.scores as Record<string, unknown>)
      : {}
  for (const uid of JENGA_PLAYER_UIDS) {
    racks[uid] = normalizeRack(racksRaw[uid])
    scores[uid] = Math.floor(clampNum(scoresRaw[uid], 0))
  }
  const bagRaw = Array.isArray(s.bag) ? s.bag : []
  const bag: ScrabbleTile[] = []
  for (const item of bagRaw) {
    const t = normalizeTile(item)
    if (t) bag.push(t)
  }
  const status: ScrabbleStatus =
    s.status === 'finished' || s.status === 'playing' ? s.status : 'playing'
  const lastPlayWords = Array.isArray(s.lastPlayWords)
    ? s.lastPlayWords.filter((w): w is string => typeof w === 'string')
    : []
  const moveLog: ScrabbleMoveLogEntry[] = []
  if (Array.isArray(s.moveLog)) {
    for (const raw of s.moveLog) {
      if (!raw || typeof raw !== 'object') continue
      const m = raw as Record<string, unknown>
      const kind =
        m.kind === 'play' ||
        m.kind === 'pass' ||
        m.kind === 'exchange' ||
        m.kind === 'bust' ||
        m.kind === 'newGame'
          ? m.kind
          : null
      if (!kind) continue
      const uid = typeof m.uid === 'string' ? m.uid : ''
      if (!uid && kind !== 'newGame') continue
      const words = Array.isArray(m.words)
        ? m.words.filter((w): w is string => typeof w === 'string')
        : []
      const definitions: { word: string; definition: string }[] = []
      if (Array.isArray(m.definitions)) {
        for (const rawDef of m.definitions) {
          if (!rawDef || typeof rawDef !== 'object') continue
          const d = rawDef as Record<string, unknown>
          if (typeof d.word !== 'string' || typeof d.definition !== 'string') {
            continue
          }
          const word = d.word.trim().toUpperCase()
          const definition = d.definition.trim()
          if (!word || !definition) continue
          definitions.push({ word, definition })
        }
      }
      const note =
        typeof m.note === 'string' && m.note.trim() ? m.note.trim() : undefined
      let finals: Record<string, number> | undefined
      if (kind === 'newGame' && m.finals && typeof m.finals === 'object') {
        finals = {}
        const finalsRaw = m.finals as Record<string, unknown>
        for (const id of JENGA_PLAYER_UIDS) {
          finals[id] = Math.floor(clampNum(finalsRaw[id], 0))
        }
      }
      moveLog.push({
        uid,
        kind,
        words,
        score: Math.floor(clampNum(m.score, 0)),
        total: Math.floor(clampNum(m.total, 0)),
        definitions,
        note,
        finals,
        at: Math.floor(clampNum(m.at, Date.now())),
      })
      if (moveLog.length >= MOVE_LOG_MAX) break
    }
  }
  return {
    board: normalizeBoard(s.board),
    bag,
    racks,
    scores,
    turnUid:
      typeof s.turnUid === 'string' && s.turnUid
        ? s.turnUid
        : fallbackTurnUid || JENGA_PLAYER_UIDS[0]!,
    passStreak: Math.max(0, Math.floor(clampNum(s.passStreak, 0))),
    status,
    winnerUid: typeof s.winnerUid === 'string' ? s.winnerUid : null,
    lastPlayScore: Math.floor(clampNum(s.lastPlayScore, 0)),
    lastPlayWords,
    moveLog,
    cats: normalizeJengaCats(
      s.cats,
      clampNum(s.version, 1) * 1009 + clampNum(s.updatedAt, 1),
    ),
    hotseat: Boolean(s.hotseat),
    version: Math.max(1, Math.floor(clampNum(s.version, 1))),
    roundId:
      typeof s.roundId === 'string' && s.roundId ? s.roundId : newRoundId(),
    updatedAt: Math.floor(clampNum(s.updatedAt, Date.now())),
  }
}
