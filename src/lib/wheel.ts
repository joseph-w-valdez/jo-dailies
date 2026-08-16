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

/** One named wheel inside the shared room doc. */
export interface WheelTab {
  id: string
  name: string
  entries: WheelEntry[]
  /** Absolute CSS rotation after the last completed spin. */
  rotation: number
  winnerId: string | null
  /** Unique id per completed spin — peers use this to celebrate. */
  spinId: string | null
}

/** Durable shared wheel document (multi-tab). */
export interface WheelRoomState {
  tabs: WheelTab[]
  activeTabId: string
  version: number
  updatedAt: number
}

export const WHEEL_TAB_MAX = 8
export const WHEEL_DEFAULT_TAB_NAME = 'Main'

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

function newId(prefix = 'w'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createWheelEntry(
  label: string,
  opts?: { weight?: number; color?: string; enabled?: boolean },
): WheelEntry {
  return {
    id: newId('w'),
    label: label.trim() || 'Untitled',
    weight: normalizeWeight(opts?.weight ?? 1),
    enabled: opts?.enabled !== false,
    color: opts?.color ?? WHEEL_COLORS[0]!,
  }
}

export function createWheelTab(
  name: string,
  opts?: {
    entries?: WheelEntry[]
    rotation?: number
    winnerId?: string | null
    spinId?: string | null
  },
): WheelTab {
  return {
    id: newId('wt'),
    name: name.trim() || 'Wheel',
    entries: opts?.entries ?? [],
    rotation: opts?.rotation ?? 0,
    winnerId: opts?.winnerId ?? null,
    spinId: opts?.spinId ?? null,
  }
}

export function defaultWheelEntries(): WheelEntry[] {
  return []
}

export function createInitialWheel(): WheelRoomState {
  const tab = createWheelTab(WHEEL_DEFAULT_TAB_NAME)
  return {
    tabs: [tab],
    activeTabId: tab.id,
    version: 1,
    updatedAt: Date.now(),
  }
}

export function getActiveWheelTab(state: WheelRoomState): WheelTab {
  return (
    state.tabs.find((t) => t.id === state.activeTabId) ??
    state.tabs[0] ??
    createWheelTab(WHEEL_DEFAULT_TAB_NAME)
  )
}

/** Patch the active tab; keeps `activeTabId` valid. */
export function patchActiveWheelTab(
  state: WheelRoomState,
  patch: Partial<Omit<WheelTab, 'id'>>,
): WheelRoomState {
  const active = getActiveWheelTab(state)
  const tabs = state.tabs.map((tab) =>
    tab.id === active.id ? { ...tab, ...patch } : tab,
  )
  return {
    ...state,
    tabs,
    activeTabId: active.id,
    updatedAt: Date.now(),
  }
}

export function setActiveWheelTab(
  state: WheelRoomState,
  tabId: string,
): WheelRoomState | null {
  if (!state.tabs.some((t) => t.id === tabId)) return null
  if (state.activeTabId === tabId) return state
  return { ...state, activeTabId: tabId, updatedAt: Date.now() }
}

export function addWheelTab(
  state: WheelRoomState,
  name?: string,
): WheelRoomState | null {
  if (state.tabs.length >= WHEEL_TAB_MAX) return null
  const n = state.tabs.length + 1
  const tab = createWheelTab(name?.trim() || `Wheel ${n}`)
  return {
    ...state,
    tabs: [...state.tabs, tab],
    activeTabId: tab.id,
    updatedAt: Date.now(),
  }
}

export function removeWheelTab(
  state: WheelRoomState,
  tabId: string,
): WheelRoomState | null {
  if (state.tabs.length <= 1) return null
  if (!state.tabs.some((t) => t.id === tabId)) return null
  const tabs = state.tabs.filter((t) => t.id !== tabId)
  const activeTabId =
    state.activeTabId === tabId ? tabs[0]!.id : state.activeTabId
  return { ...state, tabs, activeTabId, updatedAt: Date.now() }
}

export function renameWheelTab(
  state: WheelRoomState,
  tabId: string,
  name: string,
): WheelRoomState | null {
  if (!state.tabs.some((t) => t.id === tabId)) return null
  return {
    ...state,
    tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, name } : t)),
    updatedAt: Date.now(),
  }
}

/** How long a finished spin stays highlighted before returning to Ready. */
export const WHEEL_OUTCOME_HOLD_MS = 15_000

export function wheelOutcomeExpiresAt(state: WheelRoomState): number | null {
  const tab = getActiveWheelTab(state)
  if (!tab.winnerId && !tab.spinId) return null
  return state.updatedAt + WHEEL_OUTCOME_HOLD_MS
}

export function isWheelOutcomeFresh(
  state: WheelRoomState,
  now = Date.now(),
): boolean {
  const expiresAt = wheelOutcomeExpiresAt(state)
  return expiresAt != null && now < expiresAt
}

function wheelHasOutcome(state: WheelRoomState): boolean {
  return state.tabs.some((tab) => Boolean(tab.winnerId || tab.spinId))
}

/** Drop winner/spin once the hold window has passed (safe for first paint). */
export function expireStaleWheelOutcome(
  state: WheelRoomState,
  now = Date.now(),
): WheelRoomState {
  if (!wheelHasOutcome(state)) return state
  if (now < state.updatedAt + WHEEL_OUTCOME_HOLD_MS) return state
  let changed = false
  const tabs = state.tabs.map((tab) => {
    if (!tab.winnerId && !tab.spinId) return tab
    changed = true
    return { ...tab, winnerId: null, spinId: null }
  })
  return changed ? { ...state, tabs } : state
}

export function wheelNeedsOutcomeSweep(
  parsed: WheelRoomState,
  expired: WheelRoomState,
): boolean {
  return wheelHasOutcome(parsed) && !wheelHasOutcome(expired)
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
    id: typeof o.id === 'string' && o.id ? o.id : newId('w'),
    label,
    weight: normalizeWeight(o.weight),
    enabled: o.enabled !== false,
    color:
      typeof o.color === 'string' && o.color
        ? o.color
        : WHEEL_COLORS[colorIndex % WHEEL_COLORS.length]!,
  }
}

function parseWheelTab(raw: unknown, index: number): WheelTab | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const name =
    typeof o.name === 'string' && o.name.trim()
      ? o.name.trim()
      : index === 0
        ? WHEEL_DEFAULT_TAB_NAME
        : `Wheel ${index + 1}`
  const entries = listFromRemote(o.entries)
    .map((item, i) => parseWheelEntry(item, i))
    .filter((e): e is WheelEntry => e !== null)
  return {
    id: typeof o.id === 'string' && o.id ? o.id : newId('wt'),
    name,
    entries,
    rotation: clampNum(o.rotation, 0),
    winnerId: typeof o.winnerId === 'string' && o.winnerId ? o.winnerId : null,
    spinId: typeof o.spinId === 'string' && o.spinId ? o.spinId : null,
  }
}

export function normalizeWheel(raw: unknown): WheelRoomState {
  return expireStaleWheelOutcome(parseWheelState(raw))
}

/** Parse a wheel doc without applying the outcome hold window. */
export function parseWheelState(raw: unknown): WheelRoomState {
  if (!raw || typeof raw !== 'object') return createInitialWheel()
  const s = raw as Record<string, unknown>
  const version = Math.max(1, Math.floor(clampNum(s.version, 1)))
  const updatedAt = Math.floor(clampNum(s.updatedAt, Date.now()))

  const parsedTabs = listFromRemote(s.tabs)
    .map((item, i) => parseWheelTab(item, i))
    .filter((t): t is WheelTab => t !== null)

  if (parsedTabs.length > 0) {
    const tabs = parsedTabs.slice(0, WHEEL_TAB_MAX)
    const activeTabId =
      typeof s.activeTabId === 'string' &&
      tabs.some((t) => t.id === s.activeTabId)
        ? s.activeTabId
        : tabs[0]!.id
    return { tabs, activeTabId, version, updatedAt }
  }

  // Legacy single-wheel docs: wrap `entries` (+ spin fields) into Main.
  const entries = listFromRemote(s.entries)
    .map((item, i) => parseWheelEntry(item, i))
    .filter((e): e is WheelEntry => e !== null)
  const tab = createWheelTab(WHEEL_DEFAULT_TAB_NAME, {
    entries,
    rotation: clampNum(s.rotation, 0),
    winnerId: typeof s.winnerId === 'string' && s.winnerId ? s.winnerId : null,
    spinId: typeof s.spinId === 'string' && s.spinId ? s.spinId : null,
  })
  return {
    tabs: [tab],
    activeTabId: tab.id,
    version,
    updatedAt,
  }
}

/** Payload for Firestore. */
export function wheelToDoc(state: WheelRoomState): Record<string, unknown> {
  return {
    tabs: state.tabs.map((tab) => ({
      id: tab.id,
      name: tab.name,
      entries: tab.entries.map((e) => ({
        id: e.id,
        label: e.label,
        weight: e.weight,
        enabled: e.enabled,
        color: e.color,
      })),
      rotation: tab.rotation,
      winnerId: tab.winnerId || null,
      spinId: tab.spinId || null,
    })),
    activeTabId: state.activeTabId,
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
