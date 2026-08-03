/** Shared Jenga — brick layout + game state helpers. */

export const JENGA_PLAYER_UIDS = [
  'cBSmIOeTysM7hzi5Xnm7rkmsUFW2',
  'PLxEvRfAjSbj7kQumrbQ5xHF4S03',
] as const

/** Layers of 3 bricks. 15 ≈ classic feel without melting phones. */
export const JENGA_LAYERS = 15

/** Brick size in world units (length × height × width). */
export const BRICK_L = 0.75
export const BRICK_H = 0.15
export const BRICK_W = 0.25
/** Hairline gap so side-by-side colliders don't explode on spawn. */
export const BRICK_GAP = 0.004
/** Rest bricks a hair above the floor plane. */
export const FLOOR_EPSILON = 0.002
/** Collider scale vs visual mesh — avoids perfect-edge stacking blowups. */
export const COLLIDER_FIT = 0.96

export type JengaStatus = 'playing' | 'collapsed'

export interface JengaPose {
  x: number
  y: number
  z: number
  /** Quaternion */
  qx: number
  qy: number
  qz: number
  qw: number
}

export interface JengaBrick extends JengaPose {
  id: string
  /** 0 = bottom */
  layer: number
  /** Long axis along X when true; along Z when false. */
  alongX: boolean
}

export type JengaEndReason = 'explode' | 'meteor' | 'topple' | null

export interface JengaGameState {
  bricks: JengaBrick[]
  turnUid: string
  status: JengaStatus
  winnerUid: string | null
  updatedAt: number
  version: number
  /** Two cat icon paths for this game — bricks alternate between them. */
  cats: [string, string]
  /** Why the round ended, when status is collapsed. */
  endReason: JengaEndReason
  /** Stable id for the tower instance — physics remounts only when this changes. */
  roundId: string
  /** Bumps on each explode so every client can replay the blast. */
  explodeCount: number
  /** Bumps on each meteor so every client can spawn the impact. */
  meteorCount: number
}

/** Cat face + brick color. Icons are `/cats/<stem>.png` species keys. */
export const JENGA_CAT_THEMES = [
  { icon: '/cats/cat-1.png', color: '#2F3A52' },
  { icon: '/cats/cat-2.png', color: '#D4893A' },
  { icon: '/cats/cat-3.png', color: '#E05A28' },
  { icon: '/cats/cat-4.png', color: '#4BA3E8' },
  { icon: '/cats/cat-5.png', color: '#1A1F2E' },
  { icon: '/cats/cat-6.png', color: '#8A7A6A' },
  { icon: '/cats/cat-7.png', color: '#9A2848' },
  { icon: '/cats/cat-8.png', color: '#1DB981' },
  { icon: '/cats/cat-9.png', color: '#D44D8C' },
  { icon: '/cats/extra-sage.png', color: '#1AA89C' },
  { icon: '/cats/extra-bulba.png', color: '#3D6B4F' },
] as const

const JENGA_CAT_ICON_SET = new Set<string>(
  JENGA_CAT_THEMES.map((theme) => theme.icon),
)

function unitFromSeed(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/** Pick two distinct cat icons for a new / reset game. */
export function pickTwoJengaCats(
  random: () => number = Math.random,
): [string, string] {
  const icons = JENGA_CAT_THEMES.map((theme) => theme.icon)
  const a = Math.floor(random() * icons.length)
  let b = Math.floor(random() * (icons.length - 1))
  if (b >= a) b += 1
  return [icons[a]!, icons[b]!]
}

export function normalizeJengaCats(
  raw: unknown,
  seed = 1,
): [string, string] {
  if (Array.isArray(raw) && raw.length >= 2) {
    const a = raw[0]
    const b = raw[1]
    if (
      typeof a === 'string' &&
      typeof b === 'string' &&
      a !== b &&
      JENGA_CAT_ICON_SET.has(a) &&
      JENGA_CAT_ICON_SET.has(b)
    ) {
      return [a, b]
    }
  }
  // Legacy saves without cats — deterministic so both clients match.
  let n = seed
  return pickTwoJengaCats(() => {
    n += 1
    return unitFromSeed(n)
  })
}

/** Alternate cats along the tower order (`b-layer-index`). */
export function jengaCatSlotForBrick(brickId: string): 0 | 1 {
  const match = /^b-(\d+)-(\d+)$/.exec(brickId)
  if (!match) return 0
  const layer = Number(match[1])
  const index = Number(match[2])
  return ((layer * 3 + index) % 2) as 0 | 1
}

export interface JengaLiveGhost {
  uid: string
  brickId: string
  pose: JengaPose
  phase: 'pulling' | 'placing'
}

export const JENGA_KEY = 'jo-dailies:jenga:v3'

export function nextTurnUid(current: string): string {
  const idx = JENGA_PLAYER_UIDS.findIndex((id) => id === current)
  if (idx < 0) return JENGA_PLAYER_UIDS[0]!
  return JENGA_PLAYER_UIDS[(idx + 1) % JENGA_PLAYER_UIDS.length]!
}

export function buildInitialTower(): JengaBrick[] {
  const bricks: JengaBrick[] = []
  const stride = BRICK_W + BRICK_GAP
  for (let layer = 0; layer < JENGA_LAYERS; layer += 1) {
    // Even layers: long axis along X, three bricks packed along Z.
    // Odd layers: long axis along Z, three bricks packed along X.
    const alongX = layer % 2 === 0
    for (let i = 0; i < 3; i += 1) {
      const offset = (i - 1) * stride
      const y = layer * BRICK_H + BRICK_H / 2 + FLOOR_EPSILON
      if (alongX) {
        bricks.push({
          id: `b-${layer}-${i}`,
          layer,
          alongX: true,
          x: 0,
          y,
          z: offset,
          qx: 0,
          qy: 0,
          qz: 0,
          qw: 1,
        })
      } else {
        bricks.push({
          id: `b-${layer}-${i}`,
          layer,
          alongX: false,
          x: offset,
          y,
          z: 0,
          qx: 0,
          qy: Math.SQRT1_2,
          qz: 0,
          qw: Math.SQRT1_2,
        })
      }
    }
  }
  return bricks
}

export function createInitialGame(turnUid: string): JengaGameState {
  return {
    bricks: buildInitialTower(),
    turnUid: turnUid || JENGA_PLAYER_UIDS[0]!,
    status: 'playing',
    winnerUid: null,
    updatedAt: Date.now(),
    version: 1,
    cats: pickTwoJengaCats(),
    endReason: null,
    roundId: `r-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`,
    explodeCount: 0,
    meteorCount: 0,
  }
}

function clampNum(n: unknown, fallback = 0): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback
}

function normalizePose(raw: Record<string, unknown>): JengaPose {
  return {
    x: clampNum(raw.x),
    y: clampNum(raw.y),
    z: clampNum(raw.z),
    qx: clampNum(raw.qx),
    qy: clampNum(raw.qy),
    qz: clampNum(raw.qz),
    qw: clampNum(raw.qw, 1),
  }
}

export function normalizeBrick(raw: unknown): JengaBrick | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  if (typeof b.id !== 'string' || !b.id) return null
  const pose = normalizePose(b)
  return {
    id: b.id,
    layer: Math.max(0, Math.floor(clampNum(b.layer))),
    alongX: b.alongX !== false,
    ...pose,
  }
}

export function normalizeGameState(
  raw: unknown,
  fallbackTurnUid: string,
): JengaGameState {
  if (!raw || typeof raw !== 'object') {
    return createInitialGame(fallbackTurnUid)
  }
  const s = raw as Record<string, unknown>
  const bricksRaw = Array.isArray(s.bricks) ? s.bricks : []
  const bricks = bricksRaw
    .map(normalizeBrick)
    .filter((b): b is JengaBrick => b !== null)
  if (bricks.length === 0) {
    return createInitialGame(
      typeof s.turnUid === 'string' ? s.turnUid : fallbackTurnUid,
    )
  }
  const status = s.status === 'collapsed' ? 'collapsed' : 'playing'
  const version = Math.max(1, Math.floor(clampNum(s.version, 1)))
  return {
    bricks,
    turnUid:
      typeof s.turnUid === 'string' && s.turnUid
        ? s.turnUid
        : fallbackTurnUid,
    status,
    winnerUid: typeof s.winnerUid === 'string' ? s.winnerUid : null,
    updatedAt: clampNum(s.updatedAt, Date.now()),
    version,
    cats: normalizeJengaCats(
      s.cats,
      version * 1009 + Math.floor(clampNum(s.updatedAt, 1)),
    ),
    endReason:
      status !== 'collapsed'
        ? null
        : s.endReason === 'explode'
          ? 'explode'
          : s.endReason === 'meteor'
            ? 'meteor'
            : 'topple',
    roundId:
      typeof s.roundId === 'string' && s.roundId
        ? s.roundId
        : `legacy-${version}`,
    explodeCount: Math.max(0, Math.floor(clampNum(s.explodeCount, 0))),
    meteorCount: Math.max(0, Math.floor(clampNum(s.meteorCount, 0))),
  }
}

export function loadJengaLocal(fallbackTurnUid: string): JengaGameState {
  try {
    const raw = localStorage.getItem(JENGA_KEY)
    if (!raw) return createInitialGame(fallbackTurnUid)
    return normalizeGameState(JSON.parse(raw), fallbackTurnUid)
  } catch {
    return createInitialGame(fallbackTurnUid)
  }
}

export function saveJengaLocal(state: JengaGameState): void {
  try {
    localStorage.setItem(JENGA_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

/**
 * After a move settles: fail if any brick except the one pulled fell out of
 * the tower — onto the table or onto debris (e.g. resting on the pulled brick).
 * Bottom foundation bricks that already sat on the pad are ignored.
 */
export function detectCollapse(
  before: JengaBrick[],
  after: JengaBrick[],
  movedId: string | null,
): boolean {
  const prev = new Map(before.map((b) => [b.id, b]))
  /** On the pad, or stacked on something that's on the pad. */
  const nearTableY = BRICK_H * 2.25 + FLOOR_EPSILON
  const aboveFoundationY = BRICK_H * 1.5

  for (const brick of after) {
    if (movedId && brick.id === movedId) continue
    const was = prev.get(brick.id)
    if (!was) continue

    const fellFromAbove = was.y > aboveFoundationY
    const significantDrop = was.y - brick.y > BRICK_H * 1.1
    const nearTable = brick.y <= nearTableY

    // Landed on the floor / on a fallen brick after starting higher in the tower.
    if (fellFromAbove && nearTable && significantDrop) return true

    // Big fall even if it didn't quite reach "table" height (caught mid-collapse).
    if (was.y - brick.y > BRICK_H * 2.5) return true
  }
  return false
}

/** Top of the stacked tower for placing the next brick. */
export function nextPlacePose(bricks: JengaBrick[]): {
  pose: JengaPose
  alongX: boolean
  layer: number
} {
  let maxY = 0
  for (const b of bricks) {
    maxY = Math.max(maxY, b.y + BRICK_H / 2)
  }
  const layer = Math.round(maxY / BRICK_H)
  const alongX = layer % 2 === 0
  const y = maxY + BRICK_H / 2
  if (alongX) {
    return {
      alongX: true,
      layer,
      pose: { x: 0, y, z: 0, qx: 0, qy: 0, qz: 0, qw: 1 },
    }
  }
  return {
    alongX: false,
    layer,
    pose: {
      x: 0,
      y,
      z: 0,
      qx: 0,
      qy: Math.SQRT1_2,
      qz: 0,
      qw: Math.SQRT1_2,
    },
  }
}

export function brickArgs(alongX: boolean): [number, number, number] {
  // Geometry is always L × H × W in local space; rotation handles orientation.
  void alongX
  return [BRICK_L, BRICK_H, BRICK_W]
}
