/** Guess Who — Valorant agents, shared 2P board. */

import {
  JENGA_PLAYER_UIDS,
  isRoomUid,
  nextTurnUid,
  parseOptionalSeatUid,
} from './jenga'
import {
  agentById,
  VALORANT_AGENTS,
  type ValorantAgent,
  type ValorantRole,
} from './valorantAgents'

export type GuessWhoPhase = 'picking' | 'playing' | 'finished'
export type GuessWhoStatus = 'playing' | 'won'

/** Optional once-per-game cheat skills (funny, not balanced). */
export type GuessWhoSkillId =
  | 'sova'
  | 'cypher'
  | 'jett'
  | 'clove'
  | 'phoenix'
  | 'tejo'

/** Matches the 3D board column count. */
export const GUESS_WHO_BOARD_COLS = 8

export function guessWhoRowCount(
  agentCount = VALORANT_AGENTS.length,
): number {
  const cols = Math.min(GUESS_WHO_BOARD_COLS, Math.max(1, agentCount))
  return Math.ceil(agentCount / cols)
}

/** Agents in a board row (0 = front / closest to you). */
export function agentsInGuessWhoRow(
  row: number,
  agentCount = VALORANT_AGENTS.length,
): ValorantAgent[] {
  const cols = Math.min(GUESS_WHO_BOARD_COLS, Math.max(1, agentCount))
  if (row < 0 || row >= guessWhoRowCount(agentCount)) return []
  return VALORANT_AGENTS.slice(row * cols, row * cols + cols)
}

/** Full 2×2 blocks that fit on the agent grid (for Clove). */
export function guessWho2x2Blocks(
  agentCount = VALORANT_AGENTS.length,
): string[][] {
  const cols = Math.min(GUESS_WHO_BOARD_COLS, Math.max(1, agentCount))
  const rows = guessWhoRowCount(agentCount)
  const blocks: string[][] = []
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const idxs = [
        r * cols + c,
        r * cols + c + 1,
        (r + 1) * cols + c,
        (r + 1) * cols + c + 1,
      ]
      if (idxs.every((i) => i < agentCount)) {
        blocks.push(idxs.map((i) => VALORANT_AGENTS[i]!.id))
      }
    }
  }
  return blocks
}

export const GUESS_WHO_SKILLS: readonly {
  id: GuessWhoSkillId
  label: string
  blurb: string
  /** Needs a board-row tap afterward (Tejo). */
  needsRow?: boolean
  cls: string
}[] = [
  {
    id: 'sova',
    label: 'Sova Dart',
    blurb: "Recon dart — peek their secret's role.",
    cls: 'border-sky-500/55 bg-sky-500/20 text-app-text hover:bg-sky-500/30',
  },
  {
    id: 'cypher',
    label: 'Cypher Cam',
    blurb: 'Tripwire the alphabet — name A–M or N–Z?',
    cls: 'border-amber-500/55 bg-amber-500/20 text-app-text hover:bg-amber-500/30',
  },
  {
    id: 'jett',
    label: 'Jett Dash',
    blurb: 'Dash their board — flip 4 random upright faces over there.',
    cls: 'border-cyan-500/55 bg-cyan-500/20 text-app-text hover:bg-cyan-500/30',
  },
  {
    id: 'clove',
    label: 'Clove Ruse',
    blurb: 'Smoke their board — flip a random 2×2 on their side.',
    cls: 'border-rose-500/55 bg-rose-500/20 text-app-text hover:bg-rose-500/30',
  },
  {
    id: 'tejo',
    label: 'Tejo Armageddon',
    blurb: 'Laser a row on your board; learn if they got hit.',
    needsRow: true,
    cls: 'border-yellow-500/55 bg-yellow-500/20 text-app-text hover:bg-yellow-500/30',
  },
  {
    id: 'phoenix',
    label: 'Phoenix Flash',
    blurb: "Curveball their board — faces blank until they finish their turn.",
    cls: 'border-orange-500/55 bg-orange-500/20 text-app-text hover:bg-orange-500/30',
  },
] as const

export interface GuessWhoSeat {
  /** Locked secret agent id, or null while still choosing. */
  secretId: string | null
  /** Agent ids flipped face-down on this seat's board. */
  flipped: string[]
}

export interface GuessWhoLastSkill {
  uid: string
  skill: GuessWhoSkillId
  note: string
}

export interface GuessWhoState {
  seats: [GuessWhoSeat, GuessWhoSeat]
  phase: GuessWhoPhase
  status: GuessWhoStatus
  turnUid: string
  /** null until who-asks-first is chosen (after both secrets lock). */
  firstUid: string | null
  winnerUid: string | null
  lastGuess: {
    uid: string
    agentId: string
    correct: boolean
  } | null
  /** Skills already spent, keyed by uid. */
  skillsUsedByUid: Record<string, GuessWhoSkillId[]>
  /** Role intel revealed about a seat's secret (Sova). */
  revealedRoleByUid: Partial<Record<string, ValorantRole>>
  /** Name-half intel about a seat's secret (Cypher). */
  nameHalfByUid: Partial<Record<string, 'early' | 'late'>>
  /**
   * Whose board faces are blanked (Phoenix). Clears when that player passes.
   */
  flashedBoardUid: string | null
  lastSkill: GuessWhoLastSkill | null
  hotseat: boolean
  version: number
  roundId: string
  updatedAt: number
}

function newRoundId(): string {
  return `gw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function clampNum(n: unknown, fallback = 0): number {
  const v = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(v) ? v : fallback
}

function emptySeat(): GuessWhoSeat {
  return { secretId: null, flipped: [] }
}

function emptySkillsUsed(): Record<string, GuessWhoSkillId[]> {
  return {
    [JENGA_PLAYER_UIDS[0]!]: [],
    [JENGA_PLAYER_UIDS[1]!]: [],
  }
}

function cloneSeats(seats: [GuessWhoSeat, GuessWhoSeat]): [GuessWhoSeat, GuessWhoSeat] {
  return [
    { ...seats[0], flipped: [...seats[0].flipped] },
    { ...seats[1], flipped: [...seats[1].flipped] },
  ]
}

function markSkillUsed(
  state: GuessWhoState,
  uid: string,
  skill: GuessWhoSkillId,
): Record<string, GuessWhoSkillId[]> {
  const prev = state.skillsUsedByUid[uid] ?? []
  return {
    ...state.skillsUsedByUid,
    [uid]: prev.includes(skill) ? prev : [...prev, skill],
  }
}

export function seatForUid(uid: string | null): 0 | 1 | null {
  if (!uid) return null
  const idx = JENGA_PLAYER_UIDS.findIndex((id) => id === uid)
  if (idx === 0 || idx === 1) return idx
  if (uid === 'local') return 0
  return null
}

export function createInitialGuessWho(
  turnUid: string,
  opts?: { hotseat?: boolean },
): GuessWhoState {
  return {
    seats: [emptySeat(), emptySeat()],
    phase: 'picking',
    status: 'playing',
    turnUid: turnUid || JENGA_PLAYER_UIDS[0]!,
    firstUid: null,
    winnerUid: null,
    lastGuess: null,
    skillsUsedByUid: emptySkillsUsed(),
    revealedRoleByUid: {},
    nameHalfByUid: {},
    flashedBoardUid: null,
    lastSkill: null,
    hotseat: Boolean(opts?.hotseat),
    version: 1,
    roundId: newRoundId(),
    updatedAt: Date.now(),
  }
}

/** Solo debug: both secrets locked, already in playing (hotseat). */
export function createDebugPlayingGuessWho(turnUid: string): GuessWhoState {
  const uid = turnUid || JENGA_PLAYER_UIDS[0]!
  const a = VALORANT_AGENTS[0]?.id ?? null
  const b = VALORANT_AGENTS[1]?.id ?? null
  const base = createInitialGuessWho(uid, { hotseat: true })
  return {
    ...base,
    seats: [
      { secretId: a, flipped: [] },
      { secretId: b, flipped: [] },
    ],
    phase: 'playing',
    status: 'playing',
    firstUid: uid,
    turnUid: uid,
    updatedAt: Date.now(),
  }
}

function bothSecretsLocked(seats: [GuessWhoSeat, GuessWhoSeat]): boolean {
  return Boolean(seats[0].secretId && seats[1].secretId)
}

function parseFlipped(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const ids = new Set(VALORANT_AGENTS.map((a) => a.id))
  const out: string[] = []
  for (const item of raw) {
    if (typeof item === 'string' && ids.has(item) && !out.includes(item)) {
      out.push(item)
    }
  }
  return out
}

function parseSeat(raw: unknown): GuessWhoSeat {
  if (!raw || typeof raw !== 'object') return emptySeat()
  const o = raw as Record<string, unknown>
  const secretId =
    typeof o.secretId === 'string' && agentById(o.secretId) ? o.secretId : null
  return { secretId, flipped: parseFlipped(o.flipped) }
}

function parseSkillId(raw: unknown): GuessWhoSkillId | null {
  return raw === 'sova' ||
    raw === 'cypher' ||
    raw === 'jett' ||
    raw === 'clove' ||
    raw === 'phoenix' ||
    raw === 'tejo'
    ? raw
    : null
}

function parseSkillsUsed(raw: unknown): Record<string, GuessWhoSkillId[]> {
  const out = emptySkillsUsed()
  if (!raw || typeof raw !== 'object') return out
  const bag = raw as Record<string, unknown>
  for (const uid of JENGA_PLAYER_UIDS) {
    const list = bag[uid]
    if (!Array.isArray(list)) continue
    const next: GuessWhoSkillId[] = []
    for (const item of list) {
      const id = parseSkillId(item)
      if (id && !next.includes(id)) next.push(id)
    }
    out[uid] = next
  }
  return out
}

function parseRole(raw: unknown): ValorantRole | null {
  return raw === 'Duelist' ||
    raw === 'Initiator' ||
    raw === 'Controller' ||
    raw === 'Sentinel'
    ? raw
    : null
}

export function normalizeGuessWho(raw: unknown, uid: string): GuessWhoState {
  if (!raw || typeof raw !== 'object') return createInitialGuessWho(uid)
  const s = raw as Record<string, unknown>
  const seatsRaw = Array.isArray(s.seats) ? s.seats : []
  const seats: [GuessWhoSeat, GuessWhoSeat] = [
    parseSeat(seatsRaw[0]),
    parseSeat(seatsRaw[1]),
  ]
  const phaseRaw = typeof s.phase === 'string' ? s.phase : 'picking'
  const phase: GuessWhoPhase =
    phaseRaw === 'playing' || phaseRaw === 'finished' || phaseRaw === 'picking'
      ? phaseRaw
      : 'picking'
  const status: GuessWhoStatus = s.status === 'won' ? 'won' : 'playing'
  const turnUid =
    typeof s.turnUid === 'string' && isRoomUid(s.turnUid)
      ? s.turnUid
      : JENGA_PLAYER_UIDS[0]!
  const firstUid = parseOptionalSeatUid(
    s.firstUid,
    Object.prototype.hasOwnProperty.call(s, 'firstUid'),
    null,
  )
  const winnerUid =
    typeof s.winnerUid === 'string' && isRoomUid(s.winnerUid)
      ? s.winnerUid
      : null

  let lastGuess: GuessWhoState['lastGuess'] = null
  if (s.lastGuess && typeof s.lastGuess === 'object') {
    const g = s.lastGuess as Record<string, unknown>
    if (
      typeof g.uid === 'string' &&
      isRoomUid(g.uid) &&
      typeof g.agentId === 'string' &&
      agentById(g.agentId)
    ) {
      lastGuess = {
        uid: g.uid,
        agentId: g.agentId,
        correct: g.correct === true,
      }
    }
  }

  const revealedRoleByUid: GuessWhoState['revealedRoleByUid'] = {}
  if (s.revealedRoleByUid && typeof s.revealedRoleByUid === 'object') {
    const bag = s.revealedRoleByUid as Record<string, unknown>
    for (const id of JENGA_PLAYER_UIDS) {
      const role = parseRole(bag[id])
      if (role) revealedRoleByUid[id] = role
    }
  }

  const nameHalfByUid: GuessWhoState['nameHalfByUid'] = {}
  if (s.nameHalfByUid && typeof s.nameHalfByUid === 'object') {
    const bag = s.nameHalfByUid as Record<string, unknown>
    for (const id of JENGA_PLAYER_UIDS) {
      const half = bag[id]
      if (half === 'early' || half === 'late') nameHalfByUid[id] = half
    }
  }

  const flashedBoardUid =
    typeof s.flashedBoardUid === 'string' && isRoomUid(s.flashedBoardUid)
      ? s.flashedBoardUid
      : null

  let lastSkill: GuessWhoLastSkill | null = null
  if (s.lastSkill && typeof s.lastSkill === 'object') {
    const g = s.lastSkill as Record<string, unknown>
    const skill = parseSkillId(g.skill)
    if (
      typeof g.uid === 'string' &&
      isRoomUid(g.uid) &&
      skill &&
      typeof g.note === 'string' &&
      g.note
    ) {
      lastSkill = { uid: g.uid, skill, note: g.note }
    }
  }

  // Heal inconsistent phase if both secrets are in and game isn't finished.
  let nextPhase = phase
  if (status === 'won' || winnerUid) {
    nextPhase = 'finished'
  } else if (!bothSecretsLocked(seats)) {
    nextPhase = 'picking'
  } else if (firstUid == null) {
    nextPhase = 'picking'
  } else if (nextPhase === 'picking') {
    nextPhase = 'playing'
  }

  return {
    seats,
    phase: nextPhase,
    status: nextPhase === 'finished' ? 'won' : 'playing',
    turnUid,
    firstUid,
    winnerUid: nextPhase === 'finished' ? winnerUid : null,
    lastGuess,
    skillsUsedByUid: parseSkillsUsed(s.skillsUsedByUid),
    revealedRoleByUid,
    nameHalfByUid,
    flashedBoardUid,
    lastSkill,
    hotseat: Boolean(s.hotseat),
    version: Math.max(1, Math.floor(clampNum(s.version, 1))),
    roundId:
      typeof s.roundId === 'string' && s.roundId
        ? s.roundId
        : newRoundId(),
    updatedAt: Math.floor(clampNum(s.updatedAt, Date.now())),
  }
}

export function guessWhoToDoc(state: GuessWhoState): Record<string, unknown> {
  return {
    seats: state.seats.map((seat) => ({
      secretId: seat.secretId,
      flipped: seat.flipped,
    })),
    phase: state.phase,
    status: state.status,
    turnUid: state.turnUid,
    firstUid: state.firstUid,
    winnerUid: state.winnerUid,
    lastGuess: state.lastGuess,
    skillsUsedByUid: state.skillsUsedByUid,
    revealedRoleByUid: state.revealedRoleByUid,
    nameHalfByUid: state.nameHalfByUid,
    flashedBoardUid: state.flashedBoardUid,
    lastSkill: state.lastSkill,
    hotseat: state.hotseat,
    version: state.version,
    roundId: state.roundId,
    updatedAt: state.updatedAt,
  }
}

/** Lock in a secret during the picking phase. */
export function pickGuessWhoSecret(
  state: GuessWhoState,
  uid: string,
  agentId: string,
): GuessWhoState | null {
  if (state.phase !== 'picking' || state.firstUid != null) return null
  if (!isRoomUid(uid) && uid !== 'local') return null
  if (!agentById(agentId)) return null

  let seat: 0 | 1 | null = seatForUid(uid)
  if (state.hotseat) {
    // Hotseat fills seat 0 then seat 1 regardless of which account is signed in.
    if (!state.seats[0].secretId) seat = 0
    else if (!state.seats[1].secretId) seat = 1
    else return null
  }
  if (seat === null) return null
  if (state.seats[seat].secretId) return null

  const seats = cloneSeats(state.seats)
  seats[seat] = { ...seats[seat], secretId: agentId }

  return {
    ...state,
    seats,
    updatedAt: Date.now(),
  }
}

/** After both secrets are locked, choose who asks first. */
export function selectGuessWhoFirst(
  state: GuessWhoState,
  uid: string,
): GuessWhoState | null {
  if (state.phase !== 'picking' || state.firstUid != null) return null
  if (!bothSecretsLocked(state.seats)) return null
  if (!isRoomUid(uid)) return null
  return {
    ...state,
    firstUid: uid,
    turnUid: uid,
    phase: 'playing',
    status: 'playing',
    updatedAt: Date.now(),
  }
}

export function toggleGuessWhoFlip(
  state: GuessWhoState,
  uid: string,
  agentId: string,
): GuessWhoState | null {
  if (state.phase !== 'playing') return null
  if (!isRoomUid(uid) && uid !== 'local') return null
  if (!agentById(agentId)) return null
  const seat = seatForUid(uid)
  if (seat === null) return null
  // Board faces are candidates for *their* secret — your mystery card is
  // separate (mystery stand). Same face as your pick is still fair game.

  const flipped = state.seats[seat].flipped
  const nextFlipped = flipped.includes(agentId)
    ? flipped.filter((id) => id !== agentId)
    : [...flipped, agentId]

  const seats = cloneSeats(state.seats)
  seats[seat] = { ...seats[seat], flipped: nextFlipped }

  return {
    ...state,
    seats,
    updatedAt: Date.now(),
  }
}

/** Flip every agent of a role. QOL helper (board = their candidates). */
export function flipGuessWhoRole(
  state: GuessWhoState,
  uid: string,
  role: ValorantRole,
  faceDown = true,
): GuessWhoState | null {
  if (state.phase !== 'playing') return null
  if (!isRoomUid(uid) && uid !== 'local') return null
  const seat = seatForUid(uid)
  if (seat === null) return null
  const roleIds = VALORANT_AGENTS.filter((a) => a.role === role).map((a) => a.id)
  if (roleIds.length === 0) return null

  const flipped = new Set(state.seats[seat].flipped)
  for (const id of roleIds) {
    if (faceDown) flipped.add(id)
    else flipped.delete(id)
  }

  const seats = cloneSeats(state.seats)
  seats[seat] = { ...seats[seat], flipped: [...flipped] }
  return { ...state, seats, updatedAt: Date.now() }
}

export function restoreGuessWhoBoard(
  state: GuessWhoState,
  uid: string,
): GuessWhoState | null {
  if (state.phase !== 'playing') return null
  if (!isRoomUid(uid) && uid !== 'local') return null
  const seat = seatForUid(uid)
  if (seat === null) return null
  if (state.seats[seat].flipped.length === 0) return null
  const seats = cloneSeats(state.seats)
  seats[seat] = { ...seats[seat], flipped: [] }
  return { ...state, seats, updatedAt: Date.now() }
}

export function hasUsedGuessWhoSkill(
  state: GuessWhoState,
  uid: string,
  skill: GuessWhoSkillId,
): boolean {
  return (state.skillsUsedByUid[uid] ?? []).includes(skill)
}

function agentNameHalf(name: string): 'early' | 'late' {
  const ch = name.trim().charAt(0).toUpperCase()
  return ch >= 'A' && ch <= 'M' ? 'early' : 'late'
}

/**
 * Spend a once-per-game cheat skill. Tejo needs `row`.
 * `random` is injectable for tests (Jett / Clove / Yoru).
 */
export function useGuessWhoSkill(
  state: GuessWhoState,
  uid: string,
  skill: GuessWhoSkillId,
  opts?: { row?: number; random?: () => number },
): GuessWhoState | null {
  if (state.phase !== 'playing' || state.status !== 'playing') return null
  if (!isRoomUid(uid) && uid !== 'local') return null
  const seat = seatForUid(uid)
  if (seat === null) return null
  if (hasUsedGuessWhoSkill(state, uid, skill)) return null

  const oppSeat = seat === 0 ? 1 : 0
  const oppUid = JENGA_PLAYER_UIDS[oppSeat]!
  const oppSecret = agentById(state.seats[oppSeat].secretId)
  if (!oppSecret && (skill === 'sova' || skill === 'cypher')) return null

  const random = opts?.random ?? Math.random

  if (skill === 'sova') {
    const role = oppSecret!.role
    return {
      ...state,
      skillsUsedByUid: markSkillUsed(state, uid, skill),
      revealedRoleByUid: { ...state.revealedRoleByUid, [oppUid]: role },
      lastSkill: {
        uid,
        skill,
        note: `Sova dart: they're a ${role}`,
      },
      updatedAt: Date.now(),
    }
  }

  if (skill === 'cypher') {
    const half = agentNameHalf(oppSecret!.name)
    return {
      ...state,
      skillsUsedByUid: markSkillUsed(state, uid, skill),
      nameHalfByUid: { ...state.nameHalfByUid, [oppUid]: half },
      lastSkill: {
        uid,
        skill,
        note:
          half === 'early'
            ? 'Cypher cam: name starts A–M'
            : 'Cypher cam: name starts N–Z',
      },
      updatedAt: Date.now(),
    }
  }

  if (skill === 'jett') {
    // Grief their board (candidates for *your* secret).
    const candidates = VALORANT_AGENTS.filter(
      (a) => !state.seats[oppSeat].flipped.includes(a.id),
    )
    if (candidates.length === 0) return null
    const pool = [...candidates]
    const pick: string[] = []
    while (pick.length < 4 && pool.length > 0) {
      const i = Math.floor(random() * pool.length)
      const [taken] = pool.splice(i, 1)
      if (taken) pick.push(taken.id)
    }
    const seats = cloneSeats(state.seats)
    seats[oppSeat] = {
      ...seats[oppSeat],
      flipped: [...seats[oppSeat].flipped, ...pick],
    }
    return {
      ...state,
      seats,
      skillsUsedByUid: markSkillUsed(state, uid, skill),
      lastSkill: {
        uid,
        skill,
        note: `Jett dashed ${pick.length} faces on their board`,
      },
      updatedAt: Date.now(),
    }
  }

  if (skill === 'clove') {
    const blocks = guessWho2x2Blocks()
    if (blocks.length === 0) return null
    const block = blocks[Math.floor(random() * blocks.length)]!
    const flipped = new Set(state.seats[oppSeat].flipped)
    for (const id of block) flipped.add(id)
    const seats = cloneSeats(state.seats)
    seats[oppSeat] = { ...seats[oppSeat], flipped: [...flipped] }
    return {
      ...state,
      seats,
      skillsUsedByUid: markSkillUsed(state, uid, skill),
      lastSkill: {
        uid,
        skill,
        note: `Clove smoked a 2×2 on their board`,
      },
      updatedAt: Date.now(),
    }
  }

  if (skill === 'tejo') {
    const row = opts?.row
    const rows = guessWhoRowCount()
    if (row == null || !Number.isInteger(row) || row < 0 || row >= rows) {
      return null
    }
    const inRow = agentsInGuessWhoRow(row)
    if (inRow.length === 0) return null
    const rowIds = inRow.map((a) => a.id)
    const oppSecretId = state.seats[oppSeat].secretId
    const hit = Boolean(oppSecretId && rowIds.includes(oppSecretId))
    const flipped = new Set(state.seats[seat].flipped)
    for (const id of rowIds) flipped.add(id)
    const seats = cloneSeats(state.seats)
    seats[seat] = { ...seats[seat], flipped: [...flipped] }
    const rowLabel =
      row === 0 ? 'front' : row === rows - 1 ? 'back' : `${row + 1}`
    return {
      ...state,
      seats,
      skillsUsedByUid: markSkillUsed(state, uid, skill),
      lastSkill: {
        uid,
        skill,
        note: hit
          ? `Tejo Armageddon ${rowLabel} row — DIRECT HIT (they're in there)`
          : `Tejo Armageddon ${rowLabel} row — miss, clear sky`,
      },
      updatedAt: Date.now(),
    }
  }

  if (skill === 'phoenix') {
    return {
      ...state,
      skillsUsedByUid: markSkillUsed(state, uid, skill),
      flashedBoardUid: oppUid,
      lastSkill: {
        uid,
        skill,
        note: 'Phoenix flash — their board is blinded until their turn ends',
      },
      updatedAt: Date.now(),
    }
  }

  return null
}

export function passGuessWhoTurn(
  state: GuessWhoState,
  uid: string,
): GuessWhoState | null {
  if (state.phase !== 'playing' || state.status !== 'playing') return null
  if (state.turnUid !== uid) return null
  return {
    ...state,
    turnUid: nextTurnUid(uid),
    // Flash lasts through the blinded player's turn (clears when they pass).
    flashedBoardUid:
      state.flashedBoardUid === uid ? null : state.flashedBoardUid,
    updatedAt: Date.now(),
  }
}

/** Final guess of the opponent's secret. Wrong guess loses. */
export function guessGuessWhoAgent(
  state: GuessWhoState,
  uid: string,
  agentId: string,
): GuessWhoState | null {
  if (state.phase !== 'playing' || state.status !== 'playing') return null
  if (state.turnUid !== uid) return null
  if (!isRoomUid(uid) && uid !== 'local') return null
  if (!agentById(agentId)) return null
  const seat = seatForUid(uid)
  if (seat === null) return null
  const oppSeat = seat === 0 ? 1 : 0
  const secret = state.seats[oppSeat].secretId
  if (!secret) return null

  const correct = secret === agentId
  if (correct) {
    return {
      ...state,
      phase: 'finished',
      status: 'won',
      winnerUid: uid,
      lastGuess: { uid, agentId, correct: true },
      flashedBoardUid:
        state.flashedBoardUid === uid ? null : state.flashedBoardUid,
      updatedAt: Date.now(),
    }
  }
  return {
    ...state,
    phase: 'finished',
    status: 'won',
    winnerUid: nextTurnUid(uid),
    lastGuess: { uid, agentId, correct: false },
    flashedBoardUid:
      state.flashedBoardUid === uid ? null : state.flashedBoardUid,
    updatedAt: Date.now(),
  }
}

export function surrenderGuessWho(
  state: GuessWhoState,
  loserUid: string,
): GuessWhoState | null {
  if (state.phase !== 'playing' || state.status !== 'playing') return null
  if (!isRoomUid(loserUid) && loserUid !== 'local') return null
  return {
    ...state,
    phase: 'finished',
    status: 'won',
    winnerUid: nextTurnUid(loserUid),
    flashedBoardUid:
      state.flashedBoardUid === loserUid ? null : state.flashedBoardUid,
    updatedAt: Date.now(),
  }
}

export function remainingAgentCount(seat: GuessWhoSeat): number {
  return VALORANT_AGENTS.length - seat.flipped.length
}

export function opponentUidFor(uid: string): string {
  return nextTurnUid(uid)
}
