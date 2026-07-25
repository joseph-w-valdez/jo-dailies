export type WatchKind = 'anime' | 'show' | 'movie'

/** 0–10; null means unrated */
export type WatchRating = number

export const MAX_RATING = 10

export type WatchStatus =
  | 'planned'
  | 'watching'
  | 'onhold'
  | 'rewatching'
  | 'dropped'

export const WATCH_STATUSES: { id: WatchStatus; label: string }[] = [
  { id: 'planned', label: 'to watch' },
  { id: 'watching', label: 'watching' },
  { id: 'rewatching', label: 'rewatching' },
  { id: 'onhold', label: 'on hold' },
  { id: 'dropped', label: 'dropped' },
]

export function isWatchStatus(value: unknown): value is WatchStatus {
  return WATCH_STATUSES.some((s) => s.id === value)
}

/** Counts as finished — hidden from "to watch" and shuffle. */
export function isSettled(status: WatchStatus): boolean {
  return status === 'dropped'
}

export interface WatchItem {
  id: string
  title: string
  kind: WatchKind
  status: WatchStatus
  order: number
  /** 1-based; used for anime / show */
  season: number
  /** 1-based; used for anime / show */
  episode: number
  rating: WatchRating | null
}

export function isWatchRating(value: unknown): value is WatchRating {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_RATING
  )
}

export const WATCH_KINDS: { id: WatchKind; label: string }[] = [
  { id: 'anime', label: 'Anime' },
  { id: 'show', label: 'Show' },
  { id: 'movie', label: 'Movie' },
]

interface WatchStore {
  version: 5
  items: WatchItem[]
}

export const WATCHLIST_KEY = 'jo-dailies:watchlist:v1'

function isWatchKind(value: unknown): value is WatchKind {
  return value === 'anime' || value === 'show' || value === 'movie'
}

export function normalizeWatchItem(
  raw: unknown,
  fallbackOrder = 0,
): WatchItem | null {
  if (!raw || typeof raw !== 'object') return null
  const i = raw as Record<string, unknown>
  if (typeof i.id !== 'string' || typeof i.title !== 'string') return null
  const kind = isWatchKind(i.kind) ? i.kind : 'show'
  const season =
    typeof i.season === 'number' && i.season >= 1 ? Math.floor(i.season) : 1
  const episode =
    typeof i.episode === 'number' && i.episode >= 1 ? Math.floor(i.episode) : 1
  const rating = isWatchRating(i.rating) ? i.rating : null
  const status: WatchStatus = isWatchStatus(i.status)
    ? i.status
    : i.status === 'completed' || i.watched
      ? 'watching'
      : 'planned'
  const order =
    typeof i.order === 'number' && Number.isFinite(i.order)
      ? i.order
      : fallbackOrder
  return {
    id: i.id,
    title: i.title,
    kind,
    status,
    order,
    season,
    episode,
    rating,
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
    return items
      .map((item, index) => normalizeWatchItem(item, index * 1024))
      .filter((i): i is WatchItem => i !== null)
  } catch {
    return []
  }
}

export function saveWatchlist(items: WatchItem[]): void {
  try {
    const store: WatchStore = { version: 5, items }
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
