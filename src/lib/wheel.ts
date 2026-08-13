/** Device-local picker wheel — no Firebase sync. */

export const WHEEL_STORAGE_KEY = 'jo-dailies:wheel:v1'

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
  return [
    createWheelEntry('watch from', { weight: 4, color: WHEEL_COLORS[0] }),
    createWheelEntry('play until dawn', { weight: 1, color: WHEEL_COLORS[1] }),
    createWheelEntry('do dailies', { weight: 1, color: WHEEL_COLORS[2] }),
  ]
}

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
 * Absolute CSS rotation (clockwise) so the pointer at 12 o'clock lands
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
  // Pointer at top: local angle θ sits under pointer when rotation ≡ -θ.
  const desiredMod = ((-target) % 360 + 360) % 360
  const currentMod = ((currentRotation % 360) + 360) % 360
  let delta = desiredMod - currentMod
  if (delta <= 0) delta += 360
  return currentRotation + spins * 360 + delta
}

function parseEntry(raw: unknown, colorIndex: number): WheelEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const label = typeof o.label === 'string' ? o.label : ''
  if (!label.trim()) return null
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

export function loadWheelEntries(): WheelEntry[] {
  try {
    const raw = localStorage.getItem(WHEEL_STORAGE_KEY)
    if (!raw) return defaultWheelEntries()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return defaultWheelEntries()
    const entries = parsed
      .map((item, i) => parseEntry(item, i))
      .filter((e): e is WheelEntry => e !== null)
    return entries.length > 0 ? entries : defaultWheelEntries()
  } catch {
    return defaultWheelEntries()
  }
}

export function saveWheelEntries(entries: WheelEntry[]): void {
  try {
    localStorage.setItem(WHEEL_STORAGE_KEY, JSON.stringify(entries))
  } catch {
    /* ignore quota / private mode */
  }
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
  const mid = (startDeg + endDeg) / 2
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180
  const r = radius * 0.62
  return {
    x: cx + r * Math.cos(toRad(mid)),
    y: cy + r * Math.sin(toRad(mid)),
    angle: mid,
  }
}
