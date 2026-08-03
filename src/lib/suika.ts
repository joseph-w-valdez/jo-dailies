/** Cat Suika — merge ladder + in-memory game state. */

import { JENGA_CAT_THEMES } from './jenga'

export const SUIKA_SKILL_CHARGES = 2
/** Fully refill all skill charges each time score crosses a multiple of this. */
export const SUIKA_SKILL_REFRESH_SCORE = 2000
export const SUIKA_SKILLS_UNLIMITED = false

/** Bowl half-width / height in world units (2D plane = X/Y). */
export const BOWL_HALF_W = 2.01
export const BOWL_FLOOR_Y = 0
export const BOWL_WALL_H = 4.45
export const DANGER_Y = 3.53
export const DROP_Y = 3.92
/** Visual + collider wall thickness (shared by Bowl mesh + camera). */
export const BOWL_WALL_T = 0.55

/** World AABB the camera / canvas should frame (jar + dropper cloud). */
export function suikaViewBounds() {
  const floorPad = 0.32
  const dropPad = 1.12
  return {
    xMin: -BOWL_HALF_W - BOWL_WALL_T,
    xMax: BOWL_HALF_W + BOWL_WALL_T,
    yMin: BOWL_FLOOR_Y - floorPad,
    yMax: DROP_Y + dropPad,
  }
}

export type SuikaStatus = 'playing' | 'over'

export interface SuikaPiece {
  id: string
  tier: number
  x: number
  y: number
  /** Radians around Z — kept so settled cats stay tilted. */
  rot: number
}

export interface SuikaGameState {
  pieces: SuikaPiece[]
  score: number
  nextTier: number
  nextNextTier: number
  status: SuikaStatus
  shakeLeft: number
  floatLeft: number
  snipeLeft: number
  flipLeft: number
  magnetLeft: number
  compressLeft: number
  swapLeft: number
  highScore: number
  highScoreUid: string | null
  /** First name / handle shown under Best. */
  highScoreName: string | null
  highScoreAt: number | null
  version: number
  roundId: string
  updatedAt: number
  busyUid: string | null
  dropSeq: number
  skillSeq: number
}

export interface SuikaTier {
  icon: string
  color: string
  radius: number
  score: number
}

/** One full Jenga cat set. Ladder = this set twice; two final Bulbas poof. */
export const SUIKA_LOOP_SIZE = JENGA_CAT_THEMES.length
export const SUIKA_LOOP_COUNT = 2

function buildSuikaTiers(): SuikaTier[] {
  const tiers: SuikaTier[] = []
  for (let loop = 0; loop < SUIKA_LOOP_COUNT; loop++) {
    for (let i = 0; i < SUIKA_LOOP_SIZE; i++) {
      const theme = JENGA_CAT_THEMES[i]!
      const g = loop * SUIKA_LOOP_SIZE + i
      tiers.push({
        icon: theme.icon,
        // Cat 8 reads as a white disc in Suika (Jenga keeps its green brick).
        color: theme.icon === '/cats/cat-8.png' ? '#ffffff' : theme.color,
        // Continuous growth across both loops — final Bulba ≈ ⅓ jar width.
        radius: 0.195 + g * 0.054,
        score: ((g + 1) * (g + 2)) / 2,
      })
    }
  }
  return tiers
}

export const SUIKA_TIERS: readonly SuikaTier[] = buildSuikaTiers()

/** Last tier of the first loop (before size wraps to loop 2). */
export const SUIKA_BASE_MAX_TIER = SUIKA_LOOP_SIZE - 1
/** Second-loop Bulba — merging two of these poofs them. */
export const SUIKA_MAX_TIER = SUIKA_TIERS.length - 1
/** Droppable tiers = first 5 cats (classic Suika drops cherries→persimmon). */
export const SUIKA_DROP_MAX_TIER = 4
/** Bonus when two final Bulbas merge and poof. */
export const SUIKA_FINAL_MERGE_SCORE = 200

export function suikaLoopOf(tier: number): number {
  return Math.floor(Math.max(0, tier) / SUIKA_LOOP_SIZE)
}

export interface SuikaLivePose {
  id: string
  tier: number
  x: number
  y: number
}

export interface SuikaLiveGhost {
  uid: string
  phase: 'busy'
  pieces: SuikaLivePose[]
}

function clampNum(n: unknown, fallback = 0): number {
  const v = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(v) ? v : fallback
}

function newRoundId(): string {
  return `suika-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function newPieceId(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function randomDropTier(random: () => number = Math.random): number {
  return Math.floor(random() * (SUIKA_DROP_MAX_TIER + 1))
}

export function createPiece(
  tier: number,
  x: number,
  y: number,
  id = newPieceId(),
  rot = 0,
): SuikaPiece {
  return {
    id,
    tier: Math.max(0, Math.min(SUIKA_MAX_TIER, Math.floor(tier))),
    x,
    y,
    rot,
  }
}

export function createInitialSuika(): SuikaGameState {
  return {
    pieces: [],
    score: 0,
    nextTier: randomDropTier(),
    nextNextTier: randomDropTier(),
    status: 'playing',
    shakeLeft: SUIKA_SKILL_CHARGES,
    floatLeft: SUIKA_SKILL_CHARGES,
    snipeLeft: SUIKA_SKILL_CHARGES,
    flipLeft: SUIKA_SKILL_CHARGES,
    magnetLeft: SUIKA_SKILL_CHARGES,
    compressLeft: SUIKA_SKILL_CHARGES,
    swapLeft: SUIKA_SKILL_CHARGES,
    highScore: 0,
    highScoreUid: null,
    highScoreName: null,
    highScoreAt: null,
    version: 1,
    roundId: newRoundId(),
    updatedAt: Date.now(),
    busyUid: null,
    dropSeq: 0,
    skillSeq: 0,
  }
}

/** New run — keeps room high score. */
export function resetSuikaRun(prev: SuikaGameState): SuikaGameState {
  return {
    ...createInitialSuika(),
    highScore: prev.highScore,
    highScoreUid: prev.highScoreUid,
    highScoreName: prev.highScoreName,
    highScoreAt: prev.highScoreAt,
    version: prev.version + 1,
    updatedAt: Date.now(),
  }
}

export function advanceDropQueue(
  state: SuikaGameState,
  random: () => number = Math.random,
): Pick<SuikaGameState, 'nextTier' | 'nextNextTier'> {
  return {
    nextTier: state.nextNextTier,
    nextNextTier: randomDropTier(random),
  }
}

/** Remove every piece at the current lowest tier (bowl only — no score). */
export function snipeLowestTier(pieces: SuikaPiece[]): SuikaPiece[] {
  if (pieces.length === 0) return pieces
  let minTier = pieces[0]!.tier
  for (const p of pieces) {
    if (p.tier < minTier) minTier = p.tier
  }
  return pieces.filter((p) => p.tier !== minTier)
}

/** Mirror piece Y about the stack centroid; clamp under the danger line. */
export function flipPiecesVertical(pieces: SuikaPiece[]): SuikaPiece[] {
  if (pieces.length === 0) return pieces
  let minBottom = Infinity
  let maxTop = -Infinity
  for (const p of pieces) {
    const r = SUIKA_TIERS[p.tier]?.radius ?? 0.3
    minBottom = Math.min(minBottom, p.y - r)
    maxTop = Math.max(maxTop, p.y + r)
  }
  const midY = (minBottom + maxTop) / 2
  return pieces.map((p) => {
    const r = SUIKA_TIERS[p.tier]?.radius ?? 0.3
    const flipped = midY - (p.y - midY)
    const maxY = DANGER_Y - r - 0.04
    return {
      ...p,
      y: Math.max(r, Math.min(maxY, flipped)),
      rot: -(p.rot ?? 0),
    }
  })
}

/** Swap positions of two random different-tier pieces. Null if not possible. */
export function swapTwoPiecePositions(
  pieces: SuikaPiece[],
  random: () => number = Math.random,
): SuikaPiece[] | null {
  if (pieces.length < 2) return null
  const pairs: [number, number][] = []
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      if (pieces[i]!.tier !== pieces[j]!.tier) pairs.push([i, j])
    }
  }
  if (pairs.length === 0) {
    // All same tier — still swap two random pieces for a jostle.
    const a = Math.floor(random() * pieces.length)
    let b = Math.floor(random() * (pieces.length - 1))
    if (b >= a) b += 1
    pairs.push([a, b])
  }
  const [ia, ib] = pairs[Math.floor(random() * pairs.length)]!
  const a = pieces[ia]!
  const b = pieces[ib]!
  return pieces.map((p, i) => {
    if (i === ia) return { ...p, x: b.x, y: b.y, rot: b.rot }
    if (i === ib) return { ...p, x: a.x, y: a.y, rot: a.rot }
    return p
  })
}

export function countPiecesOfTier(pieces: SuikaPiece[], tier: number): number {
  let n = 0
  for (const p of pieces) if (p.tier === tier) n += 1
  return n
}

export function withHighScore(
  state: SuikaGameState,
  uid: string | null,
  name: string | null = null,
): SuikaGameState {
  if (state.score <= state.highScore) return state
  return {
    ...state,
    highScore: state.score,
    highScoreUid: uid,
    highScoreName: name,
    highScoreAt: Date.now(),
  }
}

/** Refill all skills to full when score crosses a 2000-pt milestone. */
export function withSkillScoreRefresh(
  state: SuikaGameState,
  prevScore: number,
): SuikaGameState {
  if (SUIKA_SKILLS_UNLIMITED) return state
  const before = Math.floor(prevScore / SUIKA_SKILL_REFRESH_SCORE)
  const after = Math.floor(state.score / SUIKA_SKILL_REFRESH_SCORE)
  if (after <= before) return state
  return {
    ...state,
    shakeLeft: SUIKA_SKILL_CHARGES,
    floatLeft: SUIKA_SKILL_CHARGES,
    snipeLeft: SUIKA_SKILL_CHARGES,
    flipLeft: SUIKA_SKILL_CHARGES,
    magnetLeft: SUIKA_SKILL_CHARGES,
    compressLeft: SUIKA_SKILL_CHARGES,
    swapLeft: SUIKA_SKILL_CHARGES,
  }
}

/** Room best record — the only Suika fields synced to Firestore. */
export interface SuikaRoomBest {
  highScore: number
  highScoreUid: string | null
  highScoreName: string | null
  highScoreAt: number | null
}

export function normalizeSuikaRoomBest(raw: unknown): SuikaRoomBest {
  if (!raw || typeof raw !== 'object') {
    return {
      highScore: 0,
      highScoreUid: null,
      highScoreName: null,
      highScoreAt: null,
    }
  }
  const s = raw as Record<string, unknown>
  return {
    highScore: Math.max(0, Math.floor(clampNum(s.highScore, 0))),
    highScoreUid: typeof s.highScoreUid === 'string' ? s.highScoreUid : null,
    highScoreName:
      typeof s.highScoreName === 'string' && s.highScoreName.trim()
        ? s.highScoreName.trim()
        : null,
    highScoreAt:
      typeof s.highScoreAt === 'number' && Number.isFinite(s.highScoreAt)
        ? s.highScoreAt
        : null,
  }
}

export function applyRoomBest(
  state: SuikaGameState,
  best: SuikaRoomBest,
): SuikaGameState {
  if (best.highScore < state.highScore) return state
  if (
    best.highScore === state.highScore &&
    best.highScoreUid === state.highScoreUid &&
    best.highScoreName === state.highScoreName &&
    best.highScoreAt === state.highScoreAt
  ) {
    return state
  }
  return {
    ...state,
    highScore: best.highScore,
    highScoreUid: best.highScoreUid,
    highScoreName: best.highScoreName,
    highScoreAt: best.highScoreAt,
  }
}

export function clampDropX(x: number, tier: number): number {
  const r = SUIKA_TIERS[tier]?.radius ?? 0.3
  const max = BOWL_HALF_W - r - 0.05
  return Math.max(-max, Math.min(max, x))
}
