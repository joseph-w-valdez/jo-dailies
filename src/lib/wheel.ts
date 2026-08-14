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

/** Slice colors that read well on dark UI — spaced hues so neighbors don't clash. */
export const WHEEL_COLORS = [
  '#2f6b4f', // forest green
  '#c4a35a', // gold
  '#c45c26', // orange
  '#3d6ea8', // blue
  '#8b5a9e', // purple
  '#b85c7a', // rose
  '#3f8f7a', // teal
  '#a67c52', // brown
] as const

function parseHexColor(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i)
  if (!m) return null
  const n = Number.parseInt(m[1]!, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** RGB → HSL with H in degrees [0, 360). */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const R = r / 255
  const G = g / 255
  const B = b / 255
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === R) h = ((G - B) / d + (G < B ? 6 : 0)) / 6
  else if (max === G) h = ((B - R) / d + 2) / 6
  else h = ((R - G) / d + 4) / 6
  return [h * 360, s, l]
}

/**
 * Perceptual-ish distance: hue dominates so near-blues / near-greens score low.
 * Saturation + lightness keep washed twins from pairing.
 */
export function wheelColorDistance(a: string, b: string): number {
  const ra = parseHexColor(a)
  const rb = parseHexColor(b)
  if (!ra || !rb) return a.toLowerCase() === b.toLowerCase() ? 0 : 180
  const [ha, sa, la] = rgbToHsl(ra[0], ra[1], ra[2])
  const [hb, sb, lb] = rgbToHsl(rb[0], rb[1], rb[2])
  const dh = Math.min(Math.abs(ha - hb), 360 - Math.abs(ha - hb))
  return dh + Math.abs(sa - sb) * 50 + Math.abs(la - lb) * 80
}

/**
 * Next slice color: unused palette first, then the candidate farthest from
 * every color already on the wheel (avoids blue+light-blue style clashes).
 */
export function pickWheelColor(existingColors: readonly string[]): string {
  const used = existingColors
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean)
  const unused = WHEEL_COLORS.filter(
    (c) => !used.includes(c.toLowerCase()),
  )
  const pool = unused.length > 0 ? unused : [...WHEEL_COLORS]

  if (used.length === 0) return pool[0]!

  let best = pool[0]!
  let bestScore = -1
  for (const candidate of pool) {
    let nearest = Infinity
    for (const color of existingColors) {
      nearest = Math.min(nearest, wheelColorDistance(candidate, color))
    }
    if (nearest > bestScore) {
      bestScore = nearest
      best = candidate
    }
  }
  return best
}

function newId(): string {
  return `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createWheelEntry(
  label: string,
  opts?: { weight?: number; color?: string; enabled?: boolean },
): WheelEntry {
  return {
    id: newId(),
    label: label.trim() || 'Untitled',
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

/** How long a finished spin stays highlighted before returning to Ready. */
export const WHEEL_OUTCOME_HOLD_MS = 15_000

export function wheelOutcomeExpiresAt(state: WheelRoomState): number | null {
  if (!state.winnerId && !state.spinId) return null
  return state.updatedAt + WHEEL_OUTCOME_HOLD_MS
}

export function isWheelOutcomeFresh(
  state: WheelRoomState,
  now = Date.now(),
): boolean {
  const expiresAt = wheelOutcomeExpiresAt(state)
  return expiresAt != null && now < expiresAt
}

/** Drop winner/spin once the hold window has passed (safe for first paint). */
export function expireStaleWheelOutcome(
  state: WheelRoomState,
  now = Date.now(),
): WheelRoomState {
  if (!state.winnerId && !state.spinId) return state
  if (isWheelOutcomeFresh(state, now)) return state
  return { ...state, winnerId: null, spinId: null }
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
  // Keep stored label as-is so mid-edit keystrokes aren't rewritten by
  // title-case on every snapshot. createWheelEntry / blur still title-case.
  const label = typeof o.label === 'string' ? o.label.trim() : ''
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
  return expireStaleWheelOutcome(parseWheelState(raw))
}

/** Parse a wheel doc without applying the outcome hold window. */
export function parseWheelState(raw: unknown): WheelRoomState {
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
