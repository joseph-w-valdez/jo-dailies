/** Shared chess — turn-based room board. */

import {
  JENGA_PLAYER_UIDS,
  nextTurnUid,
  normalizeJengaCats,
  pickTwoJengaCats,
} from './jenga'

export { themeForCatIcon } from './jenga'

export const CHESS_SIZE = 8
export const CHESS_SQUARES = 64

export type ChessColor = 'white' | 'black'
export type ChessKind = 'k' | 'q' | 'r' | 'b' | 'n' | 'p'
export type ChessStatus = 'playing' | 'checkmate' | 'stalemate' | 'draw'

export interface ChessPiece {
  color: ChessColor
  kind: ChessKind
}

export interface ChessPromo {
  from: number
  to: number
  /** Piece removed when the pawn arrived (if any). */
  captured: ChessKind | null
}

export interface ChessMoveLogEntry {
  kind: 'move' | 'newGame'
  uid: string
  color: ChessColor
  san: string
  from: number
  to: number
  fullmove: number
  at: number
}

/** Position before a completed (or pending-promo) move — for takebacks. */
export interface ChessUndoSnapshot {
  board: (ChessPiece | null)[]
  turn: ChessColor
  turnUid: string
  status: ChessStatus
  winnerUid: string | null
  castleWK: boolean
  castleWQ: boolean
  castleBK: boolean
  castleBQ: boolean
  epIndex: number | null
  halfmove: number
  fullmove: number
  lastFrom: number | null
  lastTo: number | null
  moveLog: ChessMoveLogEntry[]
  pendingPromo: ChessPromo | null
  inCheck: boolean
}

export interface ChessState {
  board: (ChessPiece | null)[]
  turn: ChessColor
  turnUid: string
  cats: [string, string]
  status: ChessStatus
  winnerUid: string | null
  castleWK: boolean
  castleWQ: boolean
  castleBK: boolean
  castleBQ: boolean
  epIndex: number | null
  halfmove: number
  fullmove: number
  lastFrom: number | null
  lastTo: number | null
  moveLog: ChessMoveLogEntry[]
  /** Snapshots before each half-move; current-to-move player can pop one. */
  undoStack: ChessUndoSnapshot[]
  pendingPromo: ChessPromo | null
  inCheck: boolean
  hotseat: boolean
  version: number
  roundId: string
  updatedAt: number
}

/** Cat placeholders when a theme PNG is missing. */
export const CHESS_KIND_ICON: Record<ChessKind, string> = {
  k: '/cats/cat-1.png',
  q: '/cats/cat-2.png',
  r: '/cats/cat-3.png',
  b: '/cats/cat-4.png',
  n: '/cats/cat-5.png',
  p: '/cats/cat-6.png',
}

export const CHESS_KIND_FILE: Record<ChessKind, string> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
}

/** Extra filenames accepted for a kind, e.g. `white-horse.png` for knights. */
const CHESS_KIND_ALIASES: Partial<Record<ChessKind, readonly string[]>> = {
  n: ['horse'],
  r: ['tower'],
}

/**
 * Theme piece art: `public/chess/{theme}/{color}-{piece}.png`
 * e.g. `/chess/pink/white-queen.png`. Knights also accept `horse`, rooks `tower`.
 * Only files that exist are requested — missing art uses cat placeholders.
 * `__CHESS_SPRITE_FILES__` is injected from `vite.config.ts` (disk scan).
 * Dev also fetches `/chess/manifest.json` so newly dropped PNGs show on refresh.
 */
declare const __CHESS_SPRITE_FILES__: string[]

export const CHESS_SPRITE_FILES = new Set(
  typeof __CHESS_SPRITE_FILES__ === 'undefined' ? [] : __CHESS_SPRITE_FILES__,
)

export function chessPieceSrc(
  color: ChessColor,
  kind: ChessKind,
  theme: string,
  files: ReadonlySet<string> = CHESS_SPRITE_FILES,
): string | null {
  const names = [CHESS_KIND_FILE[kind], ...(CHESS_KIND_ALIASES[kind] ?? [])]
  for (const name of names) {
    const rel = `${theme}/${color}-${name}.png`
    if (files.has(rel)) return `/chess/${rel}`
  }
  return null
}

export function chessSpriteUrlsForTheme(
  theme: string,
  files: ReadonlySet<string> = CHESS_SPRITE_FILES,
): string[] {
  const prefix = `${theme}/`
  return [...files]
    .filter((rel) => rel.startsWith(prefix))
    .map((rel) => `/chess/${rel}`)
}

const FILES = 'abcdefgh'

export function chessIndex(row: number, col: number): number {
  return row * CHESS_SIZE + col
}

export function chessRow(index: number): number {
  return Math.floor(index / CHESS_SIZE)
}

export function chessCol(index: number): number {
  return index % CHESS_SIZE
}

/** a1 = 56 (white's left corner in the stored array). */
export function algToIndex(alg: string): number {
  const file = FILES.indexOf(alg[0] ?? '')
  const rank = Number(alg[1])
  if (file < 0 || rank < 1 || rank > 8) return -1
  return chessIndex(8 - rank, file)
}

export function indexToAlg(index: number): string {
  const col = chessCol(index)
  const row = chessRow(index)
  return `${FILES[col] ?? '?'}${8 - row}`
}

function clampNum(n: unknown, fallback = 0): number {
  const v = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(v) ? v : fallback
}

function newRoundId(): string {
  return `ch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function emptyBoard(): (ChessPiece | null)[] {
  return Array.from({ length: CHESS_SQUARES }, () => null)
}

function piece(color: ChessColor, kind: ChessKind): ChessPiece {
  return { color, kind }
}

export function initialChessBoard(): (ChessPiece | null)[] {
  const board = emptyBoard()
  const back: ChessKind[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']
  for (let col = 0; col < 8; col += 1) {
    board[chessIndex(0, col)] = piece('black', back[col]!)
    board[chessIndex(1, col)] = piece('black', 'p')
    board[chessIndex(6, col)] = piece('white', 'p')
    board[chessIndex(7, col)] = piece('white', back[col]!)
  }
  return board
}

export function colorForUid(uid: string | null): ChessColor | null {
  if (!uid) return null
  if (uid === JENGA_PLAYER_UIDS[0]) return 'white'
  if (uid === JENGA_PLAYER_UIDS[1]) return 'black'
  if (uid === 'local') return 'white'
  return null
}

export function uidForColor(color: ChessColor): string {
  return color === 'white' ? JENGA_PLAYER_UIDS[0]! : JENGA_PLAYER_UIDS[1]!
}

export function opponentColor(color: ChessColor): ChessColor {
  return color === 'white' ? 'black' : 'white'
}

export function createInitialChess(
  turnUid: string,
  opts?: { hotseat?: boolean },
): ChessState {
  void turnUid
  return {
    board: initialChessBoard(),
    turn: 'white',
    turnUid: uidForColor('white'),
    cats: pickTwoJengaCats(),
    status: 'playing',
    winnerUid: null,
    castleWK: true,
    castleWQ: true,
    castleBK: true,
    castleBQ: true,
    epIndex: null,
    halfmove: 0,
    fullmove: 1,
    lastFrom: null,
    lastTo: null,
    moveLog: [],
    undoStack: [],
    pendingPromo: null,
    inCheck: false,
    hotseat: Boolean(opts?.hotseat),
    version: 1,
    roundId: newRoundId(),
    updatedAt: Date.now(),
  }
}

const MOVE_LOG_MAX = 200
const UNDO_STACK_MAX = 40

function captureUndo(state: ChessState): ChessUndoSnapshot {
  return {
    board: cloneBoard(state.board),
    turn: state.turn,
    turnUid: state.turnUid,
    status: state.status,
    winnerUid: state.winnerUid,
    castleWK: state.castleWK,
    castleWQ: state.castleWQ,
    castleBK: state.castleBK,
    castleBQ: state.castleBQ,
    epIndex: state.epIndex,
    halfmove: state.halfmove,
    fullmove: state.fullmove,
    lastFrom: state.lastFrom,
    lastTo: state.lastTo,
    moveLog: state.moveLog.map((entry) => ({ ...entry })),
    pendingPromo: state.pendingPromo ? { ...state.pendingPromo } : null,
    inCheck: state.inCheck,
  }
}

function pushUndo(settled: ChessState, prev: ChessState): ChessState {
  return {
    ...settled,
    undoStack: [...prev.undoStack, captureUndo(prev)].slice(-UNDO_STACK_MAX),
  }
}

/**
 * Current-to-move player takes back the opponent's last half-move
 * (or cancels their own pending promotion).
 */
export function undoChessMove(
  state: ChessState,
  uid: string,
): ChessState | null {
  if (state.turnUid !== uid) return null
  if (state.undoStack.length === 0) return null
  const snap = state.undoStack[state.undoStack.length - 1]!
  return {
    ...state,
    board: cloneBoard(snap.board),
    turn: snap.turn,
    turnUid: snap.turnUid,
    status: snap.status,
    winnerUid: snap.winnerUid,
    castleWK: snap.castleWK,
    castleWQ: snap.castleWQ,
    castleBK: snap.castleBK,
    castleBQ: snap.castleBQ,
    epIndex: snap.epIndex,
    halfmove: snap.halfmove,
    fullmove: snap.fullmove,
    lastFrom: snap.lastFrom,
    lastTo: snap.lastTo,
    moveLog: snap.moveLog.map((entry) => ({ ...entry })),
    pendingPromo: snap.pendingPromo ? { ...snap.pendingPromo } : null,
    inCheck: snap.inCheck,
    undoStack: state.undoStack.slice(0, -1),
    updatedAt: Date.now(),
  }
}

const PIECE_NAME: Record<ChessKind, string> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
}

function sqLabel(index: number): string {
  return indexToAlg(index).toUpperCase()
}

function pushChessMove(
  log: ChessMoveLogEntry[],
  entry: Omit<ChessMoveLogEntry, 'at'>,
): ChessMoveLogEntry[] {
  return [...log, { ...entry, at: Date.now() }].slice(-MOVE_LOG_MAX)
}

/** Fresh board and a cleared move history. */
export function startNewChess(
  prev: ChessState,
  opts?: { hotseat?: boolean },
): ChessState {
  return createInitialChess(prev.turnUid, opts)
}

function cloneBoard(board: (ChessPiece | null)[]): (ChessPiece | null)[] {
  return board.map((p) => (p ? { ...p } : null))
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8
}

export function kingIndex(
  board: (ChessPiece | null)[],
  color: ChessColor,
): number {
  for (let i = 0; i < CHESS_SQUARES; i += 1) {
    const p = board[i]
    if (p && p.color === color && p.kind === 'k') return i
  }
  return -1
}

const KNIGHT = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
] as const

const KING = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const

function attacksSquare(
  board: (ChessPiece | null)[],
  byColor: ChessColor,
  target: number,
): boolean {
  const tRow = chessRow(target)
  const tCol = chessCol(target)
  for (let i = 0; i < CHESS_SQUARES; i += 1) {
    const p = board[i]
    if (!p || p.color !== byColor) continue
    const row = chessRow(i)
    const col = chessCol(i)
    if (p.kind === 'p') {
      const dir = p.color === 'white' ? -1 : 1
      if (row + dir === tRow && (col - 1 === tCol || col + 1 === tCol)) {
        return true
      }
      continue
    }
    if (p.kind === 'n') {
      for (const [dr, dc] of KNIGHT) {
        if (row + dr === tRow && col + dc === tCol) return true
      }
      continue
    }
    if (p.kind === 'k') {
      for (const [dr, dc] of KING) {
        if (row + dr === tRow && col + dc === tCol) return true
      }
      continue
    }
    const slides =
      p.kind === 'q'
        ? ([
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [1, 1],
            [1, -1],
            [-1, 1],
            [-1, -1],
          ] as const)
        : p.kind === 'r'
          ? ([
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ] as const)
          : ([
              [1, 1],
              [1, -1],
              [-1, 1],
              [-1, -1],
            ] as const)
    for (const [dr, dc] of slides) {
      let r = row + dr
      let c = col + dc
      while (inBounds(r, c)) {
        const idx = chessIndex(r, c)
        if (idx === target) return true
        if (board[idx]) break
        r += dr
        c += dc
      }
    }
  }
  return false
}

export function inCheck(
  board: (ChessPiece | null)[],
  color: ChessColor,
): boolean {
  const king = kingIndex(board, color)
  if (king < 0) return true
  return attacksSquare(board, opponentColor(color), king)
}

function pushIfEmptyOrEnemy(
  board: (ChessPiece | null)[],
  color: ChessColor,
  row: number,
  col: number,
  out: number[],
): boolean {
  if (!inBounds(row, col)) return false
  const idx = chessIndex(row, col)
  const occ = board[idx]
  if (!occ) {
    out.push(idx)
    return true
  }
  if (occ.color !== color) out.push(idx)
  return false
}

function pseudoDests(state: ChessState, from: number): number[] {
  const p = state.board[from]
  if (!p) return []
  const row = chessRow(from)
  const col = chessCol(from)
  const out: number[] = []
  if (p.kind === 'p') {
    const dir = p.color === 'white' ? -1 : 1
    const startRow = p.color === 'white' ? 6 : 1
    const fwd = chessIndex(row + dir, col)
    if (inBounds(row + dir, col) && !state.board[fwd]) {
      out.push(fwd)
      const two = chessIndex(row + 2 * dir, col)
      if (row === startRow && inBounds(row + 2 * dir, col) && !state.board[two]) {
        out.push(two)
      }
    }
    for (const dc of [-1, 1]) {
      const rr = row + dir
      const cc = col + dc
      if (!inBounds(rr, cc)) continue
      const idx = chessIndex(rr, cc)
      const occ = state.board[idx]
      if (occ && occ.color !== p.color) out.push(idx)
      else if (state.epIndex === idx) out.push(idx)
    }
    return out
  }
  if (p.kind === 'n') {
    for (const [dr, dc] of KNIGHT) {
      pushIfEmptyOrEnemy(state.board, p.color, row + dr, col + dc, out)
    }
    return out
  }
  if (p.kind === 'k') {
    for (const [dr, dc] of KING) {
      pushIfEmptyOrEnemy(state.board, p.color, row + dr, col + dc, out)
    }
    const castleK = p.color === 'white' ? state.castleWK : state.castleBK
    const castleQ = p.color === 'white' ? state.castleWQ : state.castleBQ
    const home = p.color === 'white' ? 60 : 4
    if (from === home && castleK) {
      const rook = state.board[home + 3]
      const r1 = home + 1
      const r2 = home + 2
      if (
        rook?.kind === 'r' &&
        rook.color === p.color &&
        !state.board[r1] &&
        !state.board[r2]
      ) {
        out.push(r2)
      }
    }
    if (from === home && castleQ) {
      const rook = state.board[home - 4]
      const l1 = home - 1
      const l2 = home - 2
      const l3 = home - 3
      if (
        rook?.kind === 'r' &&
        rook.color === p.color &&
        !state.board[l1] &&
        !state.board[l2] &&
        !state.board[l3]
      ) {
        out.push(l2)
      }
    }
    return out
  }
  const slides =
    p.kind === 'q'
      ? KING
      : p.kind === 'r'
        ? ([
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ] as const)
        : ([
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1],
          ] as const)
  for (const [dr, dc] of slides) {
    let r = row + dr
    let c = col + dc
    while (pushIfEmptyOrEnemy(state.board, p.color, r, c, out)) {
      if (state.board[chessIndex(r, c)]) break
      r += dr
      c += dc
    }
  }
  return out
}

function applyUnchecked(
  state: ChessState,
  from: number,
  to: number,
  promo?: ChessKind,
): ChessState {
  const board = cloneBoard(state.board)
  const moving = board[from]
  if (!moving) return state
  const captured = board[to]
  let epIndex: number | null = null
  let halfmove = moving.kind === 'p' || captured ? 0 : state.halfmove + 1
  let castleWK = state.castleWK
  let castleWQ = state.castleWQ
  let castleBK = state.castleBK
  let castleBQ = state.castleBQ

  if (moving.kind === 'p' && to === state.epIndex && !captured) {
    const capRow = chessRow(from)
    board[chessIndex(capRow, chessCol(to))] = null
    halfmove = 0
  }

  if (moving.kind === 'p' && Math.abs(chessRow(to) - chessRow(from)) === 2) {
    epIndex = chessIndex((chessRow(from) + chessRow(to)) / 2, chessCol(from))
  }

  board[to] = moving
  board[from] = null

  if (moving.kind === 'k') {
    if (moving.color === 'white') {
      castleWK = false
      castleWQ = false
    } else {
      castleBK = false
      castleBQ = false
    }
    if (from === 60 && to === 62) {
      board[61] = board[63]
      board[63] = null
    } else if (from === 60 && to === 58) {
      board[59] = board[56]
      board[56] = null
    } else if (from === 4 && to === 6) {
      board[5] = board[7]
      board[7] = null
    } else if (from === 4 && to === 2) {
      board[3] = board[0]
      board[0] = null
    }
  }
  if (from === 63 || to === 63) castleWK = false
  if (from === 56 || to === 56) castleWQ = false
  if (from === 7 || to === 7) castleBK = false
  if (from === 0 || to === 0) castleBQ = false

  const promoRank = moving.color === 'white' ? 0 : 7
  const needsPromo = moving.kind === 'p' && chessRow(to) === promoRank
  let pendingPromo: ChessPromo | null = null
  const capturedKind = captured?.kind ?? null
  if (needsPromo) {
    if (promo && promo !== 'p' && promo !== 'k') {
      board[to] = { color: moving.color, kind: promo }
    } else {
      pendingPromo = { from, to, captured: capturedKind }
    }
  }

  const nextTurn = pendingPromo ? state.turn : opponentColor(state.turn)
  const nextUid = pendingPromo
    ? state.turnUid
    : state.hotseat
      ? nextTurnUid(state.turnUid)
      : uidForColor(nextTurn)
  const fullmove =
    !pendingPromo && state.turn === 'black' ? state.fullmove + 1 : state.fullmove

  return {
    ...state,
    board,
    turn: nextTurn,
    turnUid: nextUid,
    castleWK,
    castleWQ,
    castleBK,
    castleBQ,
    epIndex,
    halfmove,
    fullmove,
    lastFrom: from,
    lastTo: to,
    pendingPromo,
    inCheck: inCheck(board, nextTurn),
    updatedAt: Date.now(),
  }
}

function castlePathSafe(state: ChessState, color: ChessColor, to: number): boolean {
  const home = color === 'white' ? 60 : 4
  const enemy = opponentColor(color)
  if (attacksSquare(state.board, enemy, home)) return false
  const mid = to > home ? home + 1 : home - 1
  if (attacksSquare(state.board, enemy, mid)) return false
  if (attacksSquare(state.board, enemy, to)) return false
  return true
}

export function legalDests(state: ChessState, from: number): number[] {
  if (state.status !== 'playing') return []
  if (state.pendingPromo) return []
  const p = state.board[from]
  if (!p || p.color !== state.turn) return []
  const dests = pseudoDests(state, from)
  const out: number[] = []
  for (const to of dests) {
    if (p.kind === 'k' && Math.abs(to - from) === 2) {
      if (!castlePathSafe(state, p.color, to)) continue
    }
    const next = applyUnchecked(state, from, to, 'q')
    if (inCheck(next.board, p.color)) continue
    out.push(to)
  }
  return out
}

export function hasLegalMove(state: ChessState): boolean {
  for (let from = 0; from < CHESS_SQUARES; from += 1) {
    const p = state.board[from]
    if (!p || p.color !== state.turn) continue
    if (legalDests(state, from).length > 0) return true
  }
  return false
}

function onlyKingsOrMinor(board: (ChessPiece | null)[]): boolean {
  const pieces: ChessPiece[] = []
  for (const p of board) if (p) pieces.push(p)
  if (pieces.every((p) => p.kind === 'k')) return true
  if (pieces.length === 3) {
    return pieces.some((p) => p.kind === 'b' || p.kind === 'n')
  }
  return false
}

function settleStatus(state: ChessState): ChessState {
  if (state.pendingPromo) return { ...state, status: 'playing', winnerUid: null }
  if (state.halfmove >= 100 || onlyKingsOrMinor(state.board)) {
    return { ...state, status: 'draw', winnerUid: null, inCheck: false }
  }
  if (hasLegalMove(state)) {
    return {
      ...state,
      status: 'playing',
      winnerUid: null,
      inCheck: inCheck(state.board, state.turn),
    }
  }
  if (inCheck(state.board, state.turn)) {
    return {
      ...state,
      status: 'checkmate',
      winnerUid: uidForColor(opponentColor(state.turn)),
      inCheck: true,
    }
  }
  return {
    ...state,
    status: 'stalemate',
    winnerUid: null,
    inCheck: false,
  }
}

export function isPromoDest(state: ChessState, from: number, to: number): boolean {
  const p = state.board[from]
  if (!p || p.kind !== 'p') return false
  const promoRank = p.color === 'white' ? 0 : 7
  return chessRow(to) === promoRank
}

function describeMove(
  state: ChessState,
  from: number,
  to: number,
  promo?: ChessKind,
): string {
  const moving = state.board[from]
  if (!moving) return `Moved to ${sqLabel(to)}`
  if (moving.kind === 'k' && Math.abs(to - from) === 2) {
    return to > from ? 'Castled kingside' : 'Castled queenside'
  }
  const captured = state.board[to]
  const ep = moving.kind === 'p' && to === state.epIndex && !captured
  const epVictim = ep
    ? state.board[chessIndex(chessRow(from), chessCol(to))]
    : null
  const taken = captured ?? epVictim
  const name = PIECE_NAME[moving.kind]
  let line = `Moved ${name} from ${sqLabel(from)} to ${sqLabel(to)}`
  if (taken) {
    line += ` and captured enemy ${PIECE_NAME[taken.kind]}`
    if (ep) line += ' (en passant)'
  }
  if (promo && isPromoDest(state, from, to)) {
    line += `, became a ${PIECE_NAME[promo]}`
  }
  return line
}

function describePromo(
  from: number,
  to: number,
  kind: ChessKind,
  captured: ChessKind | null,
): string {
  let line = `Moved pawn from ${sqLabel(from)} to ${sqLabel(to)}`
  if (captured) line += ` and captured enemy ${PIECE_NAME[captured]}`
  line += `, became a ${PIECE_NAME[kind]}`
  return line
}

function logCompletedMove(
  settled: ChessState,
  prev: ChessState,
  from: number,
  to: number,
  summary: string,
): ChessState {
  const suffix =
    settled.status === 'checkmate'
      ? ' — checkmate'
      : settled.inCheck
        ? ' — check'
        : ''
  return {
    ...settled,
    moveLog: pushChessMove(settled.moveLog, {
      kind: 'move',
      uid: prev.turnUid,
      color: prev.turn,
      san: `${summary}${suffix}`,
      from,
      to,
      fullmove: prev.fullmove,
    }),
  }
}

/** Apply a legal move. Pass promo for pawn promotions (q/r/b/n). */
export function applyChessMove(
  state: ChessState,
  uid: string,
  from: number,
  to: number,
  promo?: ChessKind,
): ChessState | null {
  if (state.status !== 'playing') return null
  if (state.pendingPromo) return null
  if (state.turnUid !== uid) return null
  const color = colorForUid(uid)
  if (!state.hotseat && color !== state.turn) return null
  const dests = legalDests(state, from)
  if (!dests.includes(to)) return null
  if (isPromoDest(state, from, to) && promo && promo !== 'q' && promo !== 'r' && promo !== 'b' && promo !== 'n') {
    return null
  }
  const next = applyUnchecked(
    state,
    from,
    to,
    isPromoDest(state, from, to) ? promo : undefined,
  )
  const settled = settleStatus(next)
  if (settled.pendingPromo) return pushUndo(settled, state)
  return pushUndo(
    logCompletedMove(
      settled,
      state,
      from,
      to,
      describeMove(state, from, to, promo),
    ),
    state,
  )
}

export function applyChessPromo(
  state: ChessState,
  uid: string,
  kind: ChessKind,
): ChessState | null {
  if (state.status !== 'playing') return null
  if (!state.pendingPromo) return null
  if (state.turnUid !== uid) return null
  if (kind !== 'q' && kind !== 'r' && kind !== 'b' && kind !== 'n') return null
  const { from, to } = state.pendingPromo
  const board = cloneBoard(state.board)
  const pawn = board[to]
  if (!pawn || pawn.kind !== 'p') return null
  board[to] = { color: pawn.color, kind }
  const nextTurn = opponentColor(state.turn)
  const nextUid = state.hotseat ? nextTurnUid(state.turnUid) : uidForColor(nextTurn)
  const fullmove = state.turn === 'black' ? state.fullmove + 1 : state.fullmove
  const settled = settleStatus({
    ...state,
    board,
    turn: nextTurn,
    turnUid: nextUid,
    pendingPromo: null,
    fullmove,
    inCheck: inCheck(board, nextTurn),
    lastFrom: from,
    lastTo: to,
    updatedAt: Date.now(),
  })
  // Undo snapshot was already pushed when the pawn reached the promo square.
  // Undo snapshot was already pushed when the pawn reached the promo square.
  return logCompletedMove(
    settled,
    state,
    from,
    to,
    describePromo(from, to, kind, state.pendingPromo.captured),
  )
}

function parsePiece(raw: unknown): ChessPiece | null {
  if (!raw) return null
  if (typeof raw === 'string') {
    if (raw.length !== 2) return null
    const color = raw[0] === 'w' ? 'white' : raw[0] === 'b' ? 'black' : null
    const kind = raw[1]
    if (!color) return null
    if (kind !== 'k' && kind !== 'q' && kind !== 'r' && kind !== 'b' && kind !== 'n' && kind !== 'p') {
      return null
    }
    return { color, kind }
  }
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    const color = o.color === 'white' || o.color === 'black' ? o.color : null
    const kind = o.kind
    if (!color) return null
    if (kind !== 'k' && kind !== 'q' && kind !== 'r' && kind !== 'b' && kind !== 'n' && kind !== 'p') {
      return null
    }
    return { color, kind }
  }
  return null
}

function encodePiece(p: ChessPiece | null): string {
  if (!p) return ''
  return `${p.color === 'white' ? 'w' : 'b'}${p.kind}`
}

/** Firestore-safe board (strings, no nested undefined). */
export function encodeChessBoard(board: (ChessPiece | null)[]): string[] {
  return board.map(encodePiece)
}

function parsePromo(raw: unknown): ChessPromo | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const from = Math.floor(clampNum(o.from, -1))
  const to = Math.floor(clampNum(o.to, -1))
  if (from < 0 || to < 0 || from >= CHESS_SQUARES || to >= CHESS_SQUARES) {
    return null
  }
  const cap = o.captured
  const captured: ChessKind | null =
    cap === 'k' ||
    cap === 'q' ||
    cap === 'r' ||
    cap === 'b' ||
    cap === 'n' ||
    cap === 'p'
      ? cap
      : null
  return { from, to, captured }
}

function parseUndoSnapshot(raw: unknown): ChessUndoSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  const boardRaw = Array.isArray(s.board) ? s.board : null
  if (!boardRaw || boardRaw.length < CHESS_SQUARES) return null
  const board = emptyBoard()
  for (let i = 0; i < CHESS_SQUARES; i += 1) {
    board[i] = parsePiece(boardRaw[i])
  }
  const turn: ChessColor = s.turn === 'black' ? 'black' : 'white'
  const status: ChessStatus =
    s.status === 'checkmate' || s.status === 'stalemate' || s.status === 'draw'
      ? s.status
      : 'playing'
  const ep =
    s.epIndex == null ? -1 : Math.floor(clampNum(s.epIndex, -1))
  const lastFrom =
    s.lastFrom == null ? -1 : Math.floor(clampNum(s.lastFrom, -1))
  const lastTo =
    s.lastTo == null ? -1 : Math.floor(clampNum(s.lastTo, -1))
  return {
    board,
    turn,
    turnUid:
      typeof s.turnUid === 'string' && s.turnUid
        ? s.turnUid
        : uidForColor(turn),
    status,
    winnerUid: typeof s.winnerUid === 'string' ? s.winnerUid : null,
    castleWK: s.castleWK !== false,
    castleWQ: s.castleWQ !== false,
    castleBK: s.castleBK !== false,
    castleBQ: s.castleBQ !== false,
    epIndex: ep >= 0 && ep < CHESS_SQUARES ? ep : null,
    halfmove: Math.max(0, Math.floor(clampNum(s.halfmove, 0))),
    fullmove: Math.max(1, Math.floor(clampNum(s.fullmove, 1))),
    lastFrom: lastFrom >= 0 && lastFrom < CHESS_SQUARES ? lastFrom : null,
    lastTo: lastTo >= 0 && lastTo < CHESS_SQUARES ? lastTo : null,
    moveLog: parseMoveLog(s.moveLog),
    pendingPromo: parsePromo(s.pendingPromo),
    inCheck: Boolean(s.inCheck),
  }
}

function parseUndoStack(raw: unknown): ChessUndoSnapshot[] {
  if (!Array.isArray(raw)) return []
  const out: ChessUndoSnapshot[] = []
  for (const item of raw) {
    const snap = parseUndoSnapshot(item)
    if (snap) out.push(snap)
    if (out.length >= UNDO_STACK_MAX) break
  }
  return out
}

function encodeUndoSnapshot(snap: ChessUndoSnapshot): Record<string, unknown> {
  return {
    ...snap,
    board: encodeChessBoard(snap.board),
  }
}

function parseMoveLog(raw: unknown): ChessMoveLogEntry[] {
  if (!Array.isArray(raw)) return []
  const out: ChessMoveLogEntry[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const at = Math.floor(clampNum(o.at, 0))
    if (o.kind === 'newGame') {
      out.push({
        kind: 'newGame',
        uid: '',
        color: 'white',
        san: '',
        from: 0,
        to: 0,
        fullmove: 1,
        at,
      })
    } else if (o.kind === 'move' && typeof o.san === 'string' && o.san) {
      const color: ChessColor = o.color === 'black' ? 'black' : 'white'
      const from = Math.floor(clampNum(o.from, 0))
      const to = Math.floor(clampNum(o.to, 0))
      out.push({
        kind: 'move',
        uid: typeof o.uid === 'string' ? o.uid : uidForColor(color),
        color,
        san: o.san,
        from: from >= 0 && from < CHESS_SQUARES ? from : 0,
        to: to >= 0 && to < CHESS_SQUARES ? to : 0,
        fullmove: Math.max(1, Math.floor(clampNum(o.fullmove, 1))),
        at,
      })
    }
    if (out.length >= MOVE_LOG_MAX) break
  }
  return out
}

export function normalizeChess(raw: unknown, fallbackTurnUid: string): ChessState {
  if (!raw || typeof raw !== 'object') {
    return createInitialChess(fallbackTurnUid)
  }
  const s = raw as Record<string, unknown>
  const boardRaw = Array.isArray(s.board) ? s.board : []
  const board = emptyBoard()
  for (let i = 0; i < CHESS_SQUARES; i += 1) {
    board[i] = parsePiece(boardRaw[i])
  }
  if (!board.some((p) => p && p.kind === 'k')) {
    return createInitialChess(fallbackTurnUid)
  }
  const turn: ChessColor = s.turn === 'black' ? 'black' : 'white'
  const status: ChessStatus =
    s.status === 'checkmate' || s.status === 'stalemate' || s.status === 'draw'
      ? s.status
      : 'playing'
  const ep =
    s.epIndex == null ? -1 : Math.floor(clampNum(s.epIndex, -1))
  const lastFrom =
    s.lastFrom == null ? -1 : Math.floor(clampNum(s.lastFrom, -1))
  const lastTo =
    s.lastTo == null ? -1 : Math.floor(clampNum(s.lastTo, -1))
  return {
    board,
    turn,
    turnUid:
      typeof s.turnUid === 'string' && s.turnUid
        ? s.turnUid
        : fallbackTurnUid || uidForColor(turn),
    cats: normalizeJengaCats(
      s.cats,
      clampNum(s.version, 1) * 1009 + clampNum(s.updatedAt, 1),
    ),
    status,
    winnerUid: typeof s.winnerUid === 'string' ? s.winnerUid : null,
    castleWK: s.castleWK !== false,
    castleWQ: s.castleWQ !== false,
    castleBK: s.castleBK !== false,
    castleBQ: s.castleBQ !== false,
    epIndex: ep >= 0 && ep < CHESS_SQUARES ? ep : null,
    halfmove: Math.max(0, Math.floor(clampNum(s.halfmove, 0))),
    fullmove: Math.max(1, Math.floor(clampNum(s.fullmove, 1))),
    lastFrom: lastFrom >= 0 && lastFrom < CHESS_SQUARES ? lastFrom : null,
    lastTo: lastTo >= 0 && lastTo < CHESS_SQUARES ? lastTo : null,
    moveLog: parseMoveLog(s.moveLog),
    undoStack: parseUndoStack(s.undoStack),
    pendingPromo: parsePromo(s.pendingPromo),
    inCheck: Boolean(s.inCheck),
    hotseat: Boolean(s.hotseat),
    version: Math.max(1, Math.floor(clampNum(s.version, 1))),
    roundId:
      typeof s.roundId === 'string' && s.roundId ? s.roundId : newRoundId(),
    updatedAt: Math.floor(clampNum(s.updatedAt, Date.now())),
  }
}

/** Strip nested objects to Firestore-safe data. */
export function chessToDoc(state: ChessState): Record<string, unknown> {
  return {
    ...state,
    board: encodeChessBoard(state.board),
    undoStack: state.undoStack.map(encodeUndoSnapshot),
    pendingPromo: state.pendingPromo,
  }
}
