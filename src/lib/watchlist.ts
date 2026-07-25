export type WatchKind = 'anime' | 'show' | 'movie'

export interface WatchItem {
  id: string
  title: string
  kind: WatchKind
  watched: boolean
  /** 1-based; used for anime / show */
  season: number
  /** 1-based; used for anime / show */
  episode: number
}

export const WATCH_KINDS: { id: WatchKind; label: string }[] = [
  { id: 'anime', label: 'Anime' },
  { id: 'show', label: 'Show' },
  { id: 'movie', label: 'Movie' },
]

interface WatchStore {
  version: 2
  items: WatchItem[]
}

export const WATCHLIST_KEY = 'jo-dailies:watchlist:v1'

function isWatchKind(value: unknown): value is WatchKind {
  return value === 'anime' || value === 'show' || value === 'movie'
}

function normalizeItem(raw: unknown): WatchItem | null {
  if (!raw || typeof raw !== 'object') return null
  const i = raw as Record<string, unknown>
  if (typeof i.id !== 'string' || typeof i.title !== 'string') return null
  const kind = isWatchKind(i.kind) ? i.kind : 'show'
  const season =
    typeof i.season === 'number' && i.season >= 1 ? Math.floor(i.season) : 1
  const episode =
    typeof i.episode === 'number' && i.episode >= 1 ? Math.floor(i.episode) : 1
  return {
    id: i.id,
    title: i.title,
    kind,
    watched: Boolean(i.watched),
    season,
    episode,
  }
}

export function loadWatchlist(): WatchItem[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return []
    const items = (parsed as { items?: unknown }).items
    if (!Array.isArray(items)) return []
    return items.map(normalizeItem).filter((i): i is WatchItem => i !== null)
  } catch {
    return []
  }
}

export function saveWatchlist(items: WatchItem[]): void {
  try {
    const store: WatchStore = { version: 2, items }
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(store))
  } catch {
    /* ignore quota / private mode */
  }
}

export function newWatchId(): string {
  return `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function needsProgress(kind: WatchKind): boolean {
  return kind === 'anime' || kind === 'show'
}
