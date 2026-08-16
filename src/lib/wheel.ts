/** Shared room picker wheel — Firestore `rooms/{id}/wheel/current`. */
import {
  VALORANT_AGENTS,
  VALORANT_ROLE_META,
  type ValorantRole,
} from './valorantAgents'

export interface WheelEntry {
  id: string
  label: string
  weight: number
  enabled: boolean
  color: string
  /** Optional face / mark on the slice (e.g. Valorant agent icon URL). */
  icon?: string
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
  /**
   * Usual agent pools — enabled options + weights for Joseph / Joha.
   * `null` = never saved yet. Legacy string[] presets are upgraded on read.
   */
  agentPresets: {
    joseph: WheelAgentPresetEntry[] | null
    joha: WheelAgentPresetEntry[] | null
  }
}

/** One enabled option inside a Joseph / Joha preset. */
export interface WheelAgentPresetEntry {
  id: string
  label: string
  weight: number
}

export type WheelAgentPresetWho = keyof WheelRoomState['agentPresets']

export const WHEEL_TAB_MAX = 8
export const WHEEL_DEFAULT_TAB_NAME = 'Main'

export const WHEEL_AGENT_PRESET_LABELS: Record<WheelAgentPresetWho, string> = {
  joseph: 'Joseph',
  joha: 'Joha',
}

function emptyAgentPresets(): WheelRoomState['agentPresets'] {
  return { joseph: null, joha: null }
}

function normalizeAgentPresets(
  raw: WheelRoomState['agentPresets'] | null | undefined,
): WheelRoomState['agentPresets'] {
  const joseph = raw?.joseph ?? null
  const joha = raw?.joha ?? null
  if (raw && raw.joseph === joseph && raw.joha === joha) return raw
  return { joseph, joha }
}

function parsePresetEntry(raw: unknown): WheelAgentPresetEntry | null {
  if (typeof raw === 'string') {
    const key = raw.trim()
    if (!key) return null
    return { id: key, label: key, weight: 1 }
  }
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' ? o.id.trim() : ''
  const label = typeof o.label === 'string' ? o.label.trim() : ''
  if (!id && !label) return null
  return {
    id: id || label,
    label: label || id,
    weight: normalizeWeight(o.weight ?? 1),
  }
}

function parseAgentPresets(raw: unknown): WheelRoomState['agentPresets'] {
  const out = emptyAgentPresets()
  if (!raw || typeof raw !== 'object') return out
  const o = raw as Record<string, unknown>
  for (const who of ['joseph', 'joha'] as const) {
    const v = o[who]
    if (v == null) continue
    const list = Array.isArray(v) ? v : listFromRemote(v)
    if (!Array.isArray(v) && list.length === 0) continue
    const entries = list
      .map(parsePresetEntry)
      .filter((e): e is WheelAgentPresetEntry => e !== null)
    out[who] = entries
  }
  return out
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

function newId(prefix = 'w'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createWheelEntry(
  label: string,
  opts?: {
    weight?: number
    color?: string
    enabled?: boolean
    icon?: string
    id?: string
  },
): WheelEntry {
  const icon =
    typeof opts?.icon === 'string' && opts.icon.trim()
      ? opts.icon.trim()
      : undefined
  return {
    id: opts?.id && opts.id.trim() ? opts.id.trim() : newId('w'),
    label: label.trim() || 'Untitled',
    weight: normalizeWeight(opts?.weight ?? 1),
    enabled: opts?.enabled !== false,
    color: opts?.color ?? WHEEL_COLORS[0]!,
    ...(icon ? { icon } : {}),
  }
}

export function createWheelTab(
  name: string,
  opts?: {
    id?: string
    entries?: WheelEntry[]
    rotation?: number
    winnerId?: string | null
    spinId?: string | null
  },
): WheelTab {
  return {
    id: opts?.id && opts.id.trim() ? opts.id.trim() : newId('wt'),
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

export const WHEEL_VALORANT_TAB_ID = 'wt-agents'
export const WHEEL_VALORANT_TAB_NAME = 'Valorant'

/** Current + legacy display names for the pinned Valorant tab. */
const WHEEL_VALORANT_TAB_ALIASES = new Set([
  WHEEL_VALORANT_TAB_NAME.toLowerCase(),
  'agents',
])

function isValorantTabName(name: string | undefined): boolean {
  return WHEEL_VALORANT_TAB_ALIASES.has(name?.trim().toLowerCase() ?? '')
}

export function isPinnedWheelTab(
  tab: Pick<WheelTab, 'id'> & { name?: string },
): boolean {
  if (tab.id === WHEEL_VALORANT_TAB_ID) return true
  return isValorantTabName(tab.name)
}

export function createValorantAgentsTab(): WheelTab {
  return createWheelTab(WHEEL_VALORANT_TAB_NAME, {
    id: WHEEL_VALORANT_TAB_ID,
    entries: createValorantAgentWheelEntries(),
  })
}

/**
 * Guarantee exactly one pinned Valorant tab (stable id).
 * Promotes legacy “Agents” tabs that were created before the rename/pin.
 */
export function ensureValorantAgentsTab(state: WheelRoomState): WheelRoomState {
  const agentPresets = normalizeAgentPresets(state.agentPresets)
  const base: WheelRoomState =
    state.agentPresets === agentPresets
      ? state
      : { ...state, agentPresets }

  const byId = base.tabs.find((t) => t.id === WHEEL_VALORANT_TAB_ID)
  const byName = base.tabs.find(
    (t) => t.id !== WHEEL_VALORANT_TAB_ID && isValorantTabName(t.name),
  )
  const byContent = base.tabs.find(
    (t) =>
      t.id !== WHEEL_VALORANT_TAB_ID &&
      t.id !== byName?.id &&
      isValorantAgentWheel(t.entries),
  )
  const legacy = byId ?? byName ?? byContent

  if (!legacy) {
    const agents = createValorantAgentsTab()
    let tabs = [...base.tabs, agents]
    if (tabs.length > WHEEL_TAB_MAX) {
      const dropIdx = tabs.findIndex(
        (t) =>
          t.id !== WHEEL_VALORANT_TAB_ID &&
          t.id !== base.activeTabId &&
          t.id !== tabs[0]?.id,
      )
      if (dropIdx >= 0) tabs = tabs.filter((_, i) => i !== dropIdx)
      else tabs = tabs.slice(0, WHEEL_TAB_MAX - 1).concat(agents)
    }
    return { ...base, tabs }
  }

  const hasDuplicate = base.tabs.some(
    (t) =>
      t.id !== legacy.id &&
      (t.id === WHEEL_VALORANT_TAB_ID ||
        isValorantTabName(t.name) ||
        isValorantAgentWheel(t.entries)),
  )
  const needsPin =
    legacy.id !== WHEEL_VALORANT_TAB_ID ||
    legacy.name !== WHEEL_VALORANT_TAB_NAME
  const activeOk = base.tabs.some((t) => t.id === base.activeTabId)

  // Already correct — don't reshuffle tab order on every snapshot.
  if (!hasDuplicate && !needsPin && activeOk) {
    return base
  }

  const pinned: WheelTab = {
    ...legacy,
    id: WHEEL_VALORANT_TAB_ID,
    name: WHEEL_VALORANT_TAB_NAME,
  }

  const tabs = base.tabs
    .filter((t) => {
      if (t.id === legacy.id) return false
      if (t.id === WHEEL_VALORANT_TAB_ID) return false
      if (isValorantTabName(t.name)) return false
      if (t.id !== legacy.id && isValorantAgentWheel(t.entries)) return false
      return true
    })
    .concat(pinned)

  const nextActive =
    base.activeTabId === legacy.id ||
    base.activeTabId === WHEEL_VALORANT_TAB_ID ||
    base.activeTabId === byName?.id
      ? WHEEL_VALORANT_TAB_ID
      : tabs.some((t) => t.id === base.activeTabId)
        ? base.activeTabId
        : (tabs[0]?.id ?? WHEEL_VALORANT_TAB_ID)

  return {
    ...base,
    tabs,
    activeTabId: nextActive,
  }
}

export function createInitialWheel(): WheelRoomState {
  const main = createWheelTab(WHEEL_DEFAULT_TAB_NAME)
  const agents = createValorantAgentsTab()
  return {
    tabs: [main, agents],
    activeTabId: main.id,
    version: 1,
    updatedAt: Date.now(),
    agentPresets: emptyAgentPresets(),
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
  opts?: { entries?: WheelEntry[] },
): WheelRoomState | null {
  if (state.tabs.length >= WHEEL_TAB_MAX) return null
  const n = state.tabs.length + 1
  const tab = createWheelTab(name?.trim() || `Wheel ${n}`, {
    entries: opts?.entries,
  })
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
  const tab = state.tabs.find((t) => t.id === tabId)
  if (!tab || isPinnedWheelTab(tab)) return null
  if (state.tabs.length <= 1) return null
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
  const tab = state.tabs.find((t) => t.id === tabId)
  if (!tab || isPinnedWheelTab(tab)) return null
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
    ...(typeof o.icon === 'string' && o.icon.trim()
      ? { icon: o.icon.trim() }
      : {}),
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
  return ensureValorantAgentsTab(expireStaleWheelOutcome(parseWheelState(raw)))
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
    return {
      tabs,
      activeTabId,
      version,
      updatedAt,
      agentPresets: parseAgentPresets(s.agentPresets),
    }
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
    agentPresets: parseAgentPresets(s.agentPresets),
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
        ...(e.icon ? { icon: e.icon } : {}),
      })),
      rotation: tab.rotation,
      winnerId: tab.winnerId || null,
      spinId: tab.spinId || null,
    })),
    activeTabId: state.activeTabId,
    version: state.version,
    updatedAt: state.updatedAt,
    agentPresets: {
      joseph: normalizeAgentPresets(state.agentPresets).joseph,
      joha: normalizeAgentPresets(state.agentPresets).joha,
    },
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

/** All agents as equal-weight slices with role-grouped complementary colors. */
const WHEEL_AGENT_ROLE_ORDER: readonly Exclude<ValorantRole, 'Unknown'>[] = [
  'Duelist',
  'Initiator',
  'Controller',
  'Sentinel',
]

/** Role hue centers — soft midtones; warm → cool around the wheel by role. */
const WHEEL_AGENT_ROLE_HUE: Record<
  Exclude<ValorantRole, 'Unknown'>,
  { h: number; s: number; l: number }
> = {
  Duelist: { h: 350, s: 56, l: 62 }, // rose
  Initiator: { h: 36, s: 60, l: 64 }, // peach / amber
  Controller: { h: 268, s: 50, l: 64 }, // lilac
  Sentinel: { h: 198, s: 52, l: 62 }, // sky
}

function clampChannel(n: number): number {
  return Math.min(255, Math.max(0, Math.round(n)))
}

function hslToHex(h: number, s: number, l: number): string {
  const H = ((h % 360) + 360) % 360
  const S = Math.min(100, Math.max(0, s)) / 100
  const L = Math.min(100, Math.max(0, l)) / 100
  const c = (1 - Math.abs(2 * L - 1)) * S
  const x = c * (1 - Math.abs(((H / 60) % 2) - 1))
  const m = L - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (H < 60) [r, g, b] = [c, x, 0]
  else if (H < 120) [r, g, b] = [x, c, 0]
  else if (H < 180) [r, g, b] = [0, c, x]
  else if (H < 240) [r, g, b] = [0, x, c]
  else if (H < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return (
    '#' +
    [r, g, b]
      .map((v) => clampChannel((v + m) * 255).toString(16).padStart(2, '0'))
      .join('')
  )
}

/** Distinct complementary slice color within a role family. */
export function valorantAgentWheelColor(
  role: ValorantRole,
  indexInRole: number,
  roleCount: number,
): string {
  if (role === 'Unknown') return '#8b95a5'
  const base = WHEEL_AGENT_ROLE_HUE[role]
  const t = roleCount <= 1 ? 0.5 : indexInRole / (roleCount - 1)
  // Wider hue spread so neighbors in a role don't look identical.
  const h = base.h + (t - 0.5) * 48 + (indexInRole % 3) * 5 - 5
  const s = Math.min(
    72,
    Math.max(34, base.s + (indexInRole % 4) * 7 - 8 + (t - 0.5) * 10),
  )
  // Mostly mid soft tones; sprinkle a few deeper + a few lighter.
  const band = indexInRole % 4
  const lOffset =
    band === 0 ? -10 : band === 1 ? 6 : band === 2 ? -4 : 10
  const l = Math.min(78, Math.max(48, base.l + lOffset + (t - 0.5) * 8))
  return hslToHex(h, s, l)
}

export function createValorantAgentWheelEntries(): WheelEntry[] {
  const grouped = new Map<Exclude<ValorantRole, 'Unknown'>, typeof VALORANT_AGENTS[number][]>()
  for (const role of WHEEL_AGENT_ROLE_ORDER) grouped.set(role, [])
  for (const agent of VALORANT_AGENTS) {
    if (agent.role === 'Unknown') continue
    grouped.get(agent.role)!.push(agent)
  }

  const entries: WheelEntry[] = []
  for (const role of WHEEL_AGENT_ROLE_ORDER) {
    const agents = grouped.get(role) ?? []
    agents.sort((a, b) => a.name.localeCompare(b.name))
    agents.forEach((agent, i) => {
      entries.push(
        createWheelEntry(agent.name, {
          id: `agent-${agent.id}`,
          color: valorantAgentWheelColor(role, i, agents.length),
          icon: agent.icon,
          weight: 1,
          enabled: true,
        }),
      )
    })
  }
  return entries
}

/** Four equal slices — one per role — with official role icons. */
export function createValorantRoleWheelEntries(): WheelEntry[] {
  return WHEEL_AGENT_ROLE_ORDER.map((role, i) =>
    createWheelEntry(role, {
      id: `role-${role.toLowerCase()}`,
      color: valorantAgentWheelColor(role, i, WHEEL_AGENT_ROLE_ORDER.length),
      icon: VALORANT_ROLE_META[role].icon,
      weight: 1,
      enabled: true,
    }),
  )
}

function replacePinnedAgentsEntries(
  state: WheelRoomState,
  entries: WheelEntry[],
): WheelRoomState | null {
  const ensured = ensureValorantAgentsTab(state)
  if (!ensured.tabs.some((t) => t.id === WHEEL_VALORANT_TAB_ID)) return null
  return {
    ...ensured,
    tabs: ensured.tabs.map((tab) =>
      tab.id === WHEEL_VALORANT_TAB_ID
        ? {
            ...tab,
            name: WHEEL_VALORANT_TAB_NAME,
            entries,
            winnerId: null,
            spinId: null,
          }
        : tab,
    ),
    updatedAt: Date.now(),
  }
}

/** Restore the pinned Agents tab to the full equal-weight roster. */
export function resetValorantAgentsTab(
  state: WheelRoomState,
): WheelRoomState | null {
  return replacePinnedAgentsEntries(state, createValorantAgentWheelEntries())
}

/** Replace the Agents tab with a 4-slice role-type wheel. */
export function loadValorantRolesWheel(
  state: WheelRoomState,
): WheelRoomState | null {
  return replacePinnedAgentsEntries(state, createValorantRoleWheelEntries())
}

/** Snapshot currently-enabled options (+ weights) onto a Joseph / Joha preset. */
export function saveWheelAgentPreset(
  state: WheelRoomState,
  who: WheelAgentPresetWho,
): WheelRoomState | null {
  const ensured = ensureValorantAgentsTab(state)
  const tab =
    ensured.tabs.find((t) => t.id === WHEEL_VALORANT_TAB_ID) ??
    ensured.tabs.find((t) => isPinnedWheelTab(t))
  if (!tab) return null
  const enabled: WheelAgentPresetEntry[] = tab.entries
    .filter((e) => e.enabled)
    .map((e) => ({
      id: e.id,
      label: e.label.trim(),
      weight: normalizeWeight(e.weight),
    }))
  return {
    ...ensured,
    tabs: ensured.tabs.map((t) =>
      t.id === tab.id
        ? { ...t, id: WHEEL_VALORANT_TAB_ID, name: WHEEL_VALORANT_TAB_NAME }
        : t,
    ),
    activeTabId:
      ensured.activeTabId === tab.id
        ? WHEEL_VALORANT_TAB_ID
        : ensured.activeTabId,
    agentPresets: {
      ...normalizeAgentPresets(ensured.agentPresets),
      [who]: enabled,
    },
    updatedAt: Date.now(),
  }
}

function presetMatchWeight(
  entry: WheelEntry,
  preset: readonly WheelAgentPresetEntry[],
): number | null {
  const id = entry.id.trim().toLowerCase()
  const label = entry.label.trim().toLowerCase()
  for (const item of preset) {
    if (
      item.id.trim().toLowerCase() === id ||
      item.label.trim().toLowerCase() === label ||
      item.id.trim().toLowerCase() === label ||
      item.label.trim().toLowerCase() === id
    ) {
      return normalizeWeight(item.weight)
    }
  }
  return null
}

function isRolesPreset(preset: readonly WheelAgentPresetEntry[]): boolean {
  if (preset.length === 0) return false
  const roleKeys = new Set(
    WHEEL_AGENT_ROLE_ORDER.flatMap((role) => [
      role.toLowerCase(),
      `role-${role.toLowerCase()}`,
    ]),
  )
  return preset.every((item) => {
    const id = item.id.trim().toLowerCase()
    const label = item.label.trim().toLowerCase()
    return roleKeys.has(id) || roleKeys.has(label)
  })
}

/** Apply a saved preset: restore enabled options and their weights. */
export function loadWheelAgentPreset(
  state: WheelRoomState,
  who: WheelAgentPresetWho,
): WheelRoomState | null {
  const preset = normalizeAgentPresets(state.agentPresets)[who]
  if (preset == null) return null
  const base = isRolesPreset(preset)
    ? createValorantRoleWheelEntries()
    : createValorantAgentWheelEntries()
  const entries = base.map((entry) => {
    const weight = presetMatchWeight(entry, preset)
    if (weight == null) {
      return { ...entry, enabled: false, weight: 1 }
    }
    return { ...entry, enabled: true, weight }
  })
  const next = replacePinnedAgentsEntries(state, entries)
  if (!next) return null
  return {
    ...next,
    agentPresets: normalizeAgentPresets(state.agentPresets),
  }
}

export function wheelAgentPresetSaved(
  state: WheelRoomState,
  who: WheelAgentPresetWho,
): boolean {
  return normalizeAgentPresets(state.agentPresets)[who] != null
}

/** True when this tab is mostly the Valorant agent roster. */
export function isValorantAgentWheel(entries: readonly WheelEntry[]): boolean {
  if (entries.length < 8) return false
  const names = new Set(
    VALORANT_AGENTS.map((a) => a.name.trim().toLowerCase()),
  )
  let hits = 0
  for (const entry of entries) {
    if (names.has(entry.label.trim().toLowerCase())) hits += 1
  }
  return hits >= Math.min(8, Math.ceil(entries.length * 0.5))
}

export function valorantRoleForWheelLabel(
  label: string,
): ValorantRole | null {
  const name = label.trim().toLowerCase()
  for (const role of WHEEL_AGENT_ROLE_ORDER) {
    if (role.toLowerCase() === name) return role
  }
  const agent = VALORANT_AGENTS.find(
    (a) => a.name.trim().toLowerCase() === name,
  )
  return agent?.role ?? null
}

/** Enable/disable every agent matching a role (leaves other entries alone). */
export function setValorantRoleEnabled(
  entries: readonly WheelEntry[],
  role: ValorantRole,
  enabled: boolean,
): WheelEntry[] {
  return entries.map((entry) => {
    const entryRole = valorantRoleForWheelLabel(entry.label)
    if (entryRole !== role) return entry
    return entry.enabled === enabled ? entry : { ...entry, enabled }
  })
}

export function setAllWheelEntriesEnabled(
  entries: readonly WheelEntry[],
  enabled: boolean,
): WheelEntry[] {
  return entries.map((entry) =>
    entry.enabled === enabled ? entry : { ...entry, enabled },
  )
}

/** Set every option to weight 1 (keeps enable/disable + colors). */
export function equalizeWheelEntryWeights(
  entries: readonly WheelEntry[],
): WheelEntry[] {
  return entries.map((entry) =>
    entry.weight === 1 ? entry : { ...entry, weight: 1 },
  )
}

/** Fisher–Yates shuffle — new order for wheel slices / options list. */
export function shuffleWheelEntries(
  entries: readonly WheelEntry[],
): WheelEntry[] {
  const next = [...entries]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const a = next[i]!
    next[i] = next[j]!
    next[j] = a
  }
  return next
}

export function valorantRoleFilterState(
  entries: readonly WheelEntry[],
  role: ValorantRole,
): 'all' | 'some' | 'none' {
  const matched = entries.filter(
    (e) => valorantRoleForWheelLabel(e.label) === role,
  )
  if (matched.length === 0) return 'none'
  const on = matched.filter((e) => e.enabled).length
  if (on === 0) return 'none'
  if (on === matched.length) return 'all'
  return 'some'
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
  /** Fraction of radius for label center (default mid-slice). */
  radiusFactor = 0.62,
): { x: number; y: number; angle: number } {
  const span = endDeg - startDeg
  // One full-circle slice: sit the label upright toward the 3 o'clock pointer.
  if (span >= 359.99) {
    return { x: cx + radius * 0.55, y: cy, angle: 0 }
  }
  const mid = (startDeg + endDeg) / 2
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180
  const r = radius * radiusFactor
  // Flip lower-half labels so they aren't upside-down.
  const angle = mid > 90 && mid < 270 ? mid + 180 : mid
  return {
    x: cx + r * Math.cos(toRad(mid)),
    y: cy + r * Math.sin(toRad(mid)),
    angle,
  }
}

/**
 * Icon near the outer rim, rotated so the top of the image points outward
 * along the slice (matches wheel orientation as it spins).
 */
export function wheelIconPose(
  cx: number,
  cy: number,
  radius: number,
  startDeg: number,
  endDeg: number,
): { x: number; y: number; angle: number } {
  const span = endDeg - startDeg
  const mid = span >= 359.99 ? 90 : (startDeg + endDeg) / 2
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180
  const r = radius * 0.78
  return {
    x: cx + r * Math.cos(toRad(mid)),
    y: cy + r * Math.sin(toRad(mid)),
    angle: mid,
  }
}
