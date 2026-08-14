/** Shared room picker wheel — Firestore `rooms/{id}/wheel/current`. */
export interface WheelEntry {
  id: string
  label: string
  weight: number
  enabled: boolean
  color: string
}

export interface WheelSegment {
  entry: WheelEntry
  /** Degrees clockwise from 12 o'clock. */
  startDeg: number
  endDeg: number
}

/** Durable shared wheel document. */
export interface WheelRoomState {
  entries: WheelEntry[]
  /** Absolute CSS rotation after the last completed spin. */
  rotation: number
  winnerId: string | null
  /** Unique id per completed spin — peers use this to celebrate. */
  spinId: string | null
  version: number
  updatedAt: number
}

/** Slice colors that read well on dark UI. */
export const WHEEL_COLORS = [
  '#2f6b4f',
  '#c4a35a',
  '#c45c26',
  '#3d6ea8',
  '#8b5a9e',
  '#b85c7a',
  '#3f8f7a',
  '#a67c52',
] as const

function newId(): string {
  return `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const TITLE_CASE_SMALL = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'from',
  'in',
  'nor',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
])

/** Title-case option labels: "play valorant" → "Play Valorant". */
export function titleCaseLabel(raw: string): string {
  const t = raw.trim().replace(/\s+/g, ' ')
  if (!t) return ''
  return t
    .split(' ')
    .map((word, i) => {
      if (!word) return word
      const lower = word.toLowerCase()
      if (i > 0 && TITLE_CASE_SMALL.has(lower)) return lower
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

export function createWheelEntry(
  label: string,
  opts?: { weight?: number; color?: string; enabled?: boolean },
): WheelEntry {
  return {
    id: newId(),
    label: titleCaseLabel(label) || 'Untitled',
    weight: normalizeWeight(opts?.weight ?? 1),
    enabled: opts?.enabled !== false,
    color: opts?.color ?? WHEEL_COLORS[0]!,
  }
}

export function defaultWheelEntries(): WheelEntry[] {
  return []
}

export function createInitialWheel(): WheelRoomState {
  return {
    entries: defaultWheelEntries(),
    rotation: 0,
    winnerId: null,
    spinId: null,
    version: 1,
    updatedAt: Date.now(),
  }
}

export function newWheelSpinId(): string {
  return `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function clampNum(n: unknown, fallback = 0): number {
  const v = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(v) ? v : fallback
}

/** RTDB may return dense lists as arrays or as `{0:…,1:…}` maps. */
function listFromRemote(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    return Object.keys(raw as Record<string, unknown>)
      .filter((k) => /^\d+$/.test(k))
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => (raw as Record<string, unknown>)[k])
  }
  return []
}

function parseWheelEntry(raw: unknown, colorIndex: number): WheelEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const label =
    typeof o.label === 'string' ? titleCaseLabel(o.label) : ''
  if (!label) return null
  return {
    id: typeof o.id === 'string' && o.id ? o.id : newId(),
    label,
    weight: normalizeWeight(o.weight),
    enabled: o.enabled !== false,
    color:
      typeof o.color === 'string' && o.color
        ? o.color
        : WHEEL_COLORS[colorIndex % WHEEL_COLORS.length]!,
  }
}

export function normalizeWheel(raw: unknown): WheelRoomState {
  if (!raw || typeof raw !== 'object') return createInitialWheel()
  const s = raw as Record<string, unknown>
  const entries = listFromRemote(s.entries)
    .map((item, i) => parseWheelEntry(item, i))
    .filter((e): e is WheelEntry => e !== null)
  return {
    entries: entries.length > 0 ? entries : defaultWheelEntries(),
    rotation: clampNum(s.rotation, 0),
    winnerId: typeof s.winnerId === 'string' && s.winnerId ? s.winnerId : null,
    spinId: typeof s.spinId === 'string' && s.spinId ? s.spinId : null,
    version: Math.max(1, Math.floor(clampNum(s.version, 1))),
    updatedAt: Math.floor(clampNum(s.updatedAt, Date.now())),
  }
}

/** Payload for Firestore. */
export function wheelToDoc(state: WheelRoomState): Record<string, unknown> {
  return {
    entries: state.entries.map((e) => ({
      id: e.id,
      label: e.label,
      weight: e.weight,
      enabled: e.enabled,
      color: e.color,
    })),
    rotation: state.rotation,
    winnerId: state.winnerId || null,
    spinId: state.spinId || null,
    version: state.version,
    updatedAt: state.updatedAt,
  }
}

/** One-tap labels for the options panel. */
export const WHEEL_QUICK_ADDS = [
  'Play Valorant',
  'Watch a Movie',
  'Watch Anime',
  'Play a Game',
  'Say Hi to Joha',
] as const

export const WHEEL_WEIGHT_MIN = 0.1
export const WHEEL_WEIGHT_MAX = 99
/** Comfortable range for the slider; typing can go higher. */
export const WHEEL_WEIGHT_SLIDER_MAX = 10
export const WHEEL_WEIGHT_STEP = 0.1

export function normalizeWeight(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return 1
  const clamped = Math.min(WHEEL_WEIGHT_MAX, Math.max(WHEEL_WEIGHT_MIN, n))
  return Math.round(clamped * 10) / 10
}

/** Format weight for display without noisy trailing zeros. */
export function formatWeight(weight: number): string {
  const rounded = normalizeWeight(weight)
  return Number.isInteger(rounded)
    ? String(rounded)
    : String(Math.round(rounded * 10) / 10)
}

export function activeWheelEntries(entries: WheelEntry[]): WheelEntry[] {
  return entries.filter((e) => e.enabled && e.label.trim().length > 0)
}

export function buildWheelSegments(entries: WheelEntry[]): WheelSegment[] {
  const active = activeWheelEntries(entries)
  const total = active.reduce((sum, e) => sum + e.weight, 0)
  if (total <= 0) return []
  let cursor = 0
  return active.map((entry) => {
    const span = (entry.weight / total) * 360
    const startDeg = cursor
    const endDeg = cursor + span
    cursor = endDeg
    return { entry, startDeg, endDeg }
  })
}

/** Weighted pick among active entries (same order as `buildWheelSegments`). */
export function pickWeightedIndex(
  entries: WheelEntry[],
  random: () => number = Math.random,
): number {
  const active = activeWheelEntries(entries)
  const total = active.reduce((sum, e) => sum + e.weight, 0)
  if (active.length === 0 || total <= 0) return -1
  let r = random() * total
  for (let i = 0; i < active.length; i += 1) {
    r -= active[i]!.weight
    if (r <= 0) return i
  }
  return active.length - 1
}

/**
 * Absolute CSS rotation (clockwise) so the pointer at 3 o'clock lands
 * inside the winner segment after `spins` full turns.
 */
export function rotationForWinner(
  currentRotation: number,
  segments: WheelSegment[],
  winnerIndex: number,
  spins = 5,
  random: () => number = Math.random,
): number {
  const seg = segments[winnerIndex]
  if (!seg) return currentRotation
  const span = seg.endDeg - seg.startDeg
  const pad = Math.min(3, span * 0.12)
  const target =
    seg.startDeg + pad + random() * Math.max(0.001, span - 2 * pad)
  // Pointer at 3 o'clock (90°): local θ sits under pointer when rotation ≡ 90 − θ.
  const desiredMod = ((90 - target) % 360 + 360) % 360
  const currentMod = ((currentRotation % 360) + 360) % 360
  let delta = desiredMod - currentMod
  if (delta <= 0) delta += 360
  return currentRotation + spins * 360 + delta
}

/** SVG arc path for a slice from startDeg→endDeg (clockwise from 12 o'clock). */
export function wheelSlicePath(
  cx: number,
  cy: number,
  radius: number,
  startDeg: number,
  endDeg: number,
): string {
  const span = endDeg - startDeg
  if (span >= 359.99) {
    return [
      `M ${cx} ${cy - radius}`,
      `A ${radius} ${radius} 0 1 1 ${cx} ${cy + radius}`,
      `A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius}`,
      'Z',
    ].join(' ')
  }
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180
  const x0 = cx + radius * Math.cos(toRad(startDeg))
  const y0 = cy + radius * Math.sin(toRad(startDeg))
  const x1 = cx + radius * Math.cos(toRad(endDeg))
  const y1 = cy + radius * Math.sin(toRad(endDeg))
  const large = span > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${x0} ${y0} A ${radius} ${radius} 0 ${large} 1 ${x1} ${y1} Z`
}

export function wheelLabelPose(
  cx: number,
  cy: number,
  radius: number,
  startDeg: number,
  endDeg: number,
): { x: number; y: number; angle: number } {
  const span = endDeg - startDeg
  // One full-circle slice: sit the label upright toward the 3 o'clock pointer.
  if (span >= 359.99) {
    return { x: cx + radius * 0.55, y: cy, angle: 0 }
  }
  const mid = (startDeg + endDeg) / 2
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180
  const r = radius * 0.62
  // Flip lower-half labels so they aren't upside-down.
  const angle = mid > 90 && mid < 270 ? mid + 180 : mid
  return {
    x: cx + r * Math.cos(toRad(mid)),
    y: cy + r * Math.sin(toRad(mid)),
    angle,
  }
}
