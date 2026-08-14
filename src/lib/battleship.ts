/** Cat Battleship — fog-of-war turn duel. */

import {
  JENGA_CAT_THEMES,
  JENGA_PLAYER_UIDS,
  isRoomUid,
  nextTurnUid,
  normalizeJengaCats,
  parseOptionalSeatUid,
  pickTwoJengaCats,
} from './jenga'

export { themeForCatIcon } from './jenga'

export const BS_SIZE = 10

export type BsStatus = 'placing' | 'playing' | 'won'
export type BsMark = null | 'hit' | 'miss'

export interface BsShipDef {
  id: string
  name: string
  length: number
}

export const BS_FLEET: readonly BsShipDef[] = [
  { id: 'carrier', name: 'Carrier', length: 5 },
  { id: 'battleship', name: 'Battleship', length: 4 },
  { id: 'cruiser', name: 'Cruiser', length: 3 },
  { id: 'submarine', name: 'Submarine', length: 3 },
  { id: 'destroyer', name: 'Destroyer', length: 2 },
  { id: 'patrol', name: 'Patrol', length: 2 },
]

/** Species key → face for each fleet ship this round. */
export type BsShipCats = Record<string, string>

export interface BsShip {
  id: string
  /** Top-left / start cell. */
  x: number
  y: number
  horizontal: boolean
  length: number
}

export interface BsPlayerBoard {
  ships: BsShip[]
  /** Attacks this player has received (from opponent). */
  received: BsMark[]
  ready: boolean
}

export interface BattleshipState {
  /** Seat / player accent cats (header). */
  cats: [string, string]
  /** One distinct cat face per ship id — every tile of that ship uses it. */
  shipCats: BsShipCats
  boards: Record<string, BsPlayerBoard>
  turnUid: string
  status: BsStatus
  winnerUid: string | null
  /** Debug: one human plays both seats. */
  hotseat: boolean
  version: number
  roundId: string
  updatedAt: number
  /** Most recent shot, on the board that received it. */
  lastShot: { x: number; y: number; boardUid: string } | null
  /** null = who-fires-first picker. */
  firstUid: string | null
}

function clampNum(n: unknown, fallback = 0): number {
  const v = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(v) ? v : fallback
}

function newRoundId(): string {
  return `bs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function emptyMarks(): BsMark[] {
  return Array.from({ length: BS_SIZE * BS_SIZE }, () => null)
}

export function emptyPlayerBoard(): BsPlayerBoard {
  return { ships: [], received: emptyMarks(), ready: false }
}

const JENGA_CAT_ICON_SET = new Set<string>(
  JENGA_CAT_THEMES.map((t) => t.icon),
)

function unitFromSeed(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/** Pick `count` distinct Jenga cat icons (Fisher–Yates). */
export function pickDistinctJengaCats(
  count: number,
  random: () => number = Math.random,
): string[] {
  const icons = JENGA_CAT_THEMES.map((t) => t.icon)
  const n = Math.min(count, icons.length)
  for (let i = icons.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const tmp = icons[i]!
    icons[i] = icons[j]!
    icons[j] = tmp
  }
  return icons.slice(0, n)
}

export function pickShipCats(
  random: () => number = Math.random,
): BsShipCats {
  const icons = pickDistinctJengaCats(BS_FLEET.length, random)
  const out: BsShipCats = {}
  BS_FLEET.forEach((def, i) => {
    out[def.id] = icons[i] ?? JENGA_CAT_THEMES[0]!.icon
  })
  return out
}

export function normalizeShipCats(raw: unknown, seed = 1): BsShipCats {
  const fallback = (() => {
    let n = seed
    return pickShipCats(() => {
      n += 1
      return unitFromSeed(n)
    })
  })()
  if (!raw || typeof raw !== 'object') return fallback
  const obj = raw as Record<string, unknown>
  const out: BsShipCats = {}
  const used = new Set<string>()
  for (const def of BS_FLEET) {
    const v = obj[def.id]
    if (typeof v === 'string' && JENGA_CAT_ICON_SET.has(v) && !used.has(v)) {
      out[def.id] = v
      used.add(v)
    }
  }
  if (Object.keys(out).length === BS_FLEET.length) return out
  // Fill gaps from fallback without colliding.
  for (const def of BS_FLEET) {
    if (out[def.id]) continue
    const pick =
      Object.values(fallback).find((icon) => !used.has(icon)) ??
      fallback[def.id]!
    out[def.id] = pick
    used.add(pick)
  }
  return out
}

export function createInitialBattleship(
  turnUid: string,
  opts?: { hotseat?: boolean },
): BattleshipState {
  const boards: Record<string, BsPlayerBoard> = {}
  for (const uid of JENGA_PLAYER_UIDS) {
    boards[uid] = emptyPlayerBoard()
  }
  return {
    cats: pickTwoJengaCats(),
    shipCats: pickShipCats(),
    boards,
    turnUid: turnUid || JENGA_PLAYER_UIDS[0]!,
    status: 'placing',
    winnerUid: null,
    hotseat: Boolean(opts?.hotseat),
    version: 1,
    roundId: newRoundId(),
    updatedAt: Date.now(),
    lastShot: null,
    firstUid: null,
  }
}

export function selectBattleshipFirst(
  state: BattleshipState,
  uid: string,
): BattleshipState | null {
  if (state.firstUid !== null) return null
  if (!isRoomUid(uid)) return null
  return {
    ...state,
    firstUid: uid,
    turnUid: uid,
    updatedAt: Date.now(),
  }
}

export function seatForUid(uid: string | null): 0 | 1 | null {
  if (!uid) return null
  const idx = JENGA_PLAYER_UIDS.findIndex((id) => id === uid)
  if (idx === 0 || idx === 1) return idx
  if (uid === 'local') return 0
  return null
}

/**
 * Fixed mascots for the couple: seat 0 (first UID) = Joseph / cat-2,
 * seat 1 = Struggle (Joha) / cat-4. Unknown logins fall back to seat 0.
 */
export const CATTLESHIP_PETS = [
  '/cats/cat-2.png',
  '/cats/cat-4.png',
] as const

export function cattleshipPetForUid(uid: string | null): string {
  const seat = seatForUid(uid)
  return CATTLESHIP_PETS[seat === 1 ? 1 : 0]!
}

export type CattleshipShotKind = 'hit' | 'miss' | 'sink'

/** Classify the result of a shot that was already applied. */
export function classifyBattleshipShot(
  before: BattleshipState,
  after: BattleshipState,
  shooterUid: string,
  x: number,
  y: number,
): CattleshipShotKind | null {
  const opponent = nextTurnUid(shooterUid)
  const boardBefore = before.boards[opponent]
  const boardAfter = after.boards[opponent]
  if (!boardBefore || !boardAfter) return null
  const mark = boardAfter.received[cellIndex(x, y)]
  if (mark === 'miss') return 'miss'
  if (mark !== 'hit') return null
  const newlySunk = boardAfter.ships.some(
    (ship) =>
      shipSunk(ship, boardAfter.received) &&
      !shipSunk(ship, boardBefore.received),
  )
  return newlySunk ? 'sink' : 'hit'
}

export function cellIndex(x: number, y: number): number {
  return y * BS_SIZE + x
}

export function shipCells(ship: BsShip): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  for (let i = 0; i < ship.length; i += 1) {
    out.push({
      x: ship.horizontal ? ship.x + i : ship.x,
      y: ship.horizontal ? ship.y : ship.y + i,
    })
  }
  return out
}

export function shipFits(
  ships: BsShip[],
  draft: Omit<BsShip, 'id'> & { id?: string },
): boolean {
  const cells = shipCells({
    id: draft.id ?? 'draft',
    x: draft.x,
    y: draft.y,
    horizontal: draft.horizontal,
    length: draft.length,
  })
  for (const c of cells) {
    if (c.x < 0 || c.y < 0 || c.x >= BS_SIZE || c.y >= BS_SIZE) return false
  }
  const occupied = new Set<string>()
  for (const s of ships) {
    if (draft.id && s.id === draft.id) continue
    for (const c of shipCells(s)) occupied.add(`${c.x},${c.y}`)
  }
  for (const c of cells) {
    if (occupied.has(`${c.x},${c.y}`)) return false
  }
  return true
}

export function isFleetComplete(ships: BsShip[]): boolean {
  if (ships.length !== BS_FLEET.length) return false
  const ids = new Set(ships.map((s) => s.id))
  return BS_FLEET.every((d) => ids.has(d.id))
}

export function cellHasShip(ships: BsShip[], x: number, y: number): boolean {
  return shipAtCell(ships, x, y) !== null
}

export function shipAtCell(
  ships: BsShip[],
  x: number,
  y: number,
): BsShip | null {
  for (const s of ships) {
    for (const c of shipCells(s)) {
      if (c.x === x && c.y === y) return s
    }
  }
  return null
}

/** Lift a placed ship back into the hand during placement. */
export function removeShip(
  state: BattleshipState,
  uid: string,
  shipId: string,
): BattleshipState | null {
  if (state.status !== 'placing') return null
  const board = state.boards[uid]
  if (!board || board.ready) return null
  if (!board.ships.some((s) => s.id === shipId)) return null
  return {
    ...state,
    boards: {
      ...state.boards,
      [uid]: {
        ...board,
        ships: board.ships.filter((s) => s.id !== shipId),
        ready: false,
      },
    },
    updatedAt: Date.now(),
  }
}

export function shipSunk(ship: BsShip, received: BsMark[]): boolean {
  return shipCells(ship).every(
    (c) => received[cellIndex(c.x, c.y)] === 'hit',
  )
}

export function allShipsSunk(ships: BsShip[], received: BsMark[]): boolean {
  return ships.length > 0 && ships.every((s) => shipSunk(s, received))
}

/** Total hittable cells across the standard fleet. */
export function fleetHitCapacity(): number {
  return BS_FLEET.reduce((sum, d) => sum + d.length, 0)
}

export function countHits(received: BsMark[]): number {
  let n = 0
  for (const m of received) {
    if (m === 'hit') n += 1
  }
  return n
}

export function shipsRemaining(ships: BsShip[], received: BsMark[]): number {
  return ships.filter((s) => !shipSunk(s, received)).length
}

export interface BoardVitals {
  hitCapacity: number
  hitsTaken: number
  /** Remaining HP as 0–1. */
  hp: number
  shipsLeft: number
  shipsTotal: number
}

export function boardVitals(board: BsPlayerBoard | undefined): BoardVitals {
  const hitCapacity = fleetHitCapacity()
  const hitsTaken = board ? countHits(board.received) : 0
  const shipsTotal = BS_FLEET.length
  const shipsLeft = board ? shipsRemaining(board.ships, board.received) : shipsTotal
  const hp = hitCapacity <= 0 ? 0 : Math.max(0, 1 - hitsTaken / hitCapacity)
  return { hitCapacity, hitsTaken, hp, shipsLeft, shipsTotal }
}

export function placeShip(
  state: BattleshipState,
  uid: string,
  ship: BsShip,
): BattleshipState | null {
  if (state.status !== 'placing') return null
  const board = state.boards[uid]
  if (!board || board.ready) return null
  const def = BS_FLEET.find((d) => d.id === ship.id)
  if (!def || def.length !== ship.length) return null
  const others = board.ships.filter((s) => s.id !== ship.id)
  if (!shipFits(others, ship)) return null
  const ships = [...others, ship]
  return {
    ...state,
    boards: {
      ...state.boards,
      [uid]: { ...board, ships, ready: false },
    },
    updatedAt: Date.now(),
  }
}

export function setPlayerReady(
  state: BattleshipState,
  uid: string,
  ready: boolean,
): BattleshipState | null {
  if (state.status !== 'placing') return null
  const board = state.boards[uid]
  if (!board) return null
  if (ready && !isFleetComplete(board.ships)) return null
  const boards = {
    ...state.boards,
    [uid]: { ...board, ready },
  }
  const bothReady = JENGA_PLAYER_UIDS.every((id) => boards[id]?.ready)
  if (bothReady) {
    return {
      ...state,
      boards,
      status: 'playing',
      turnUid: state.firstUid || state.turnUid || JENGA_PLAYER_UIDS[0]!,
      updatedAt: Date.now(),
    }
  }
  return { ...state, boards, updatedAt: Date.now() }
}

export function applyBattleshipShot(
  state: BattleshipState,
  uid: string,
  x: number,
  y: number,
): BattleshipState | null {
  if (state.status !== 'playing') return null
  if (state.turnUid !== uid) return null
  if (x < 0 || y < 0 || x >= BS_SIZE || y >= BS_SIZE) return null
  const opponent = nextTurnUid(uid)
  const theirBoard = state.boards[opponent]
  if (!theirBoard) return null
  const idx = cellIndex(x, y)
  if (theirBoard.received[idx] !== null) return null
  const hit = cellHasShip(theirBoard.ships, x, y)
  const received = theirBoard.received.slice()
  received[idx] = hit ? 'hit' : 'miss'
  const boards = {
    ...state.boards,
    [opponent]: { ...theirBoard, received },
  }
  const lastShot = { x, y, boardUid: opponent }
  if (hit && allShipsSunk(theirBoard.ships, received)) {
    return {
      ...state,
      boards,
      status: 'won',
      winnerUid: uid,
      lastShot,
      updatedAt: Date.now(),
    }
  }
  return {
    ...state,
    boards,
    turnUid: nextTurnUid(uid),
    lastShot,
    updatedAt: Date.now(),
  }
}

function normalizeBoard(raw: unknown): BsPlayerBoard {
  if (!raw || typeof raw !== 'object') return emptyPlayerBoard()
  const b = raw as Record<string, unknown>
  const shipsRaw = Array.isArray(b.ships) ? b.ships : []
  const ships: BsShip[] = []
  for (const item of shipsRaw) {
    if (!item || typeof item !== 'object') continue
    const s = item as Record<string, unknown>
    const id = typeof s.id === 'string' ? s.id : ''
    const def = BS_FLEET.find((d) => d.id === id)
    if (!def) continue
    ships.push({
      id,
      x: Math.max(0, Math.floor(clampNum(s.x, 0))),
      y: Math.max(0, Math.floor(clampNum(s.y, 0))),
      horizontal: Boolean(s.horizontal),
      length: def.length,
    })
  }
  const recvRaw = Array.isArray(b.received) ? b.received : []
  const received: BsMark[] = emptyMarks()
  for (let i = 0; i < BS_SIZE * BS_SIZE; i += 1) {
    const v = recvRaw[i]
    received[i] = v === 'hit' || v === 'miss' ? v : null
  }
  return {
    ships,
    received,
    ready: Boolean(b.ready),
  }
}

function normalizeLastShot(
  raw: unknown,
): { x: number; y: number; boardUid: string } | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const x = Math.floor(clampNum(o.x, -1))
  const y = Math.floor(clampNum(o.y, -1))
  const boardUid = typeof o.boardUid === 'string' ? o.boardUid : ''
  if (!boardUid || x < 0 || y < 0 || x >= BS_SIZE || y >= BS_SIZE) return null
  return { x, y, boardUid }
}

export function normalizeBattleship(
  raw: unknown,
  fallbackTurnUid: string,
): BattleshipState {
  if (!raw || typeof raw !== 'object') {
    return createInitialBattleship(fallbackTurnUid)
  }
  const s = raw as Record<string, unknown>
  const boardsRaw =
    s.boards && typeof s.boards === 'object'
      ? (s.boards as Record<string, unknown>)
      : {}
  const boards: Record<string, BsPlayerBoard> = {}
  for (const uid of JENGA_PLAYER_UIDS) {
    boards[uid] = normalizeBoard(boardsRaw[uid])
  }
  // Also keep any extra keys (shouldn't happen).
  for (const [k, v] of Object.entries(boardsRaw)) {
    if (!boards[k]) boards[k] = normalizeBoard(v)
  }
  const status: BsStatus =
    s.status === 'placing' || s.status === 'playing' || s.status === 'won'
      ? s.status
      : 'placing'
  const seed = clampNum(s.version, 1) * 1009 + clampNum(s.updatedAt, 1)
  return {
    cats: normalizeJengaCats(s.cats, seed),
    shipCats: normalizeShipCats(s.shipCats, seed + 17),
    boards,
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
    lastShot: normalizeLastShot(s.lastShot),
    firstUid: parseOptionalSeatUid(
      s.firstUid,
      'firstUid' in s,
      typeof s.turnUid === 'string' && s.turnUid
        ? s.turnUid
        : fallbackTurnUid || JENGA_PLAYER_UIDS[0]!,
    ),
  }
}
