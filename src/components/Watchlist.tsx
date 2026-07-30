import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useDndContext,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react'
import { useFirebaseAuth } from '../hooks/firebaseAuthContext'
import { db, syncRoomId } from '../lib/firebase'
import { updateSyncSource } from '../lib/syncStatus'
import {
  isSettled,
  isWatchRating,
  loadWatchlist,
  MAX_RATING,
  needsProgress,
  newWatchId,
  normalizeWatchItem,
  saveWatchlist,
  WATCH_KINDS,
  WATCH_STATUSES,
  type WatchItem,
  type WatchKind,
  type WatchRating,
  type WatchStatus,
} from '../lib/watchlist'
import { PetFace } from './PetSprite'

const WATCHLIST_MIGRATION_KEY = 'jo-dailies:firestore-watchlist-migrated:v1'

/** Ribbon styling per status, matching the vibe banner treatment. */
const STATUS_STYLES: Record<
  WatchStatus,
  { banner: string; dot: string; accent: string }
> = {
  planned: {
    banner: 'border border-border/80 bg-surface-raised/90 text-muted',
    dot: 'bg-muted',
    accent: 'text-muted',
  },
  watching: {
    banner: 'bg-streak text-black',
    dot: 'bg-streak',
    accent: 'text-streak',
  },
  rewatching: {
    banner: 'bg-fuchsia-500 text-white',
    dot: 'bg-fuchsia-500',
    accent: 'text-fuchsia-500',
  },
  onhold: {
    banner: 'bg-amber-400 text-black',
    dot: 'bg-amber-400',
    accent: 'text-amber-400',
  },
  dropped: {
    banner: 'bg-rose-500 text-white',
    dot: 'bg-rose-500',
    accent: 'text-rose-500',
  },
}

function statusLabel(status: WatchStatus): string {
  return WATCH_STATUSES.find((s) => s.id === status)?.label ?? status
}

/** Touching progress means it's in flight again. */
function activeStatus(status: WatchStatus): WatchStatus {
  return status === 'planned' || status === 'dropped' ? 'watching' : status
}

const RATING_VALUES: WatchRating[] = Array.from(
  { length: MAX_RATING + 1 },
  (_, i) => i,
)

const RATING_VIBES: Record<number, string> = {
  0: 'skip',
  1: 'nah',
  2: 'meh',
  3: 'mid-',
  4: 'mid',
  5: 'okay',
  6: 'solid',
  7: 'good',
  8: 'great',
  9: 'peak',
  10: 'masterpiece',
}

const EPISODE_CHEERS = [
  'onward!',
  'binge mode',
  'one more!',
  'keep going~',
  'nice pace',
  'ep unlocked',
  'still watching?',
  'couch locked',
]

const EMPTY_PETS = [
  '/cats/cat-3.png',
  '/cats/cat-6.png',
  '/cats/cat-8.png',
  '/cats/extra-sage.png',
]

const ROW_PETS = [
  '/cats/cat-1.png',
  '/cats/cat-2.png',
  '/cats/cat-3.png',
  '/cats/cat-4.png',
  '/cats/cat-5.png',
  '/cats/cat-6.png',
  '/cats/cat-7.png',
  '/cats/cat-8.png',
  '/cats/cat-9.png',
  '/cats/extra-sage.png',
  '/cats/extra-bulba.png',
] as const

function randomPet(): string {
  return ROW_PETS[Math.floor(Math.random() * ROW_PETS.length)]!
}

/** Starts a drag from anywhere on the card except interactive controls. */
class CardPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: event }: { nativeEvent: PointerEvent }) => {
        const target = event.target as HTMLElement | null
        return !target?.closest('button, input, select, textarea, a, [role="menu"]')
      },
    },
  ]
}

interface RatingTone {
  row: string
  cell: string
  banner: string
  accent: string
}

/** Bad → mid → great: red → orange → yellow → lime → green. */
const RATING_TONES: RatingTone[] = [
  {
    row: 'border-rose-400/40 bg-rose-500/[0.08]',
    cell: 'bg-rose-500/80 text-white',
    banner: 'bg-rose-500 text-white',
    accent: 'text-rose-500',
  },
  {
    row: 'border-orange-400/40 bg-orange-500/[0.08]',
    cell: 'bg-orange-500/80 text-white',
    banner: 'bg-orange-500 text-white',
    accent: 'text-orange-500',
  },
  {
    row: 'border-amber-400/45 bg-amber-500/[0.09]',
    cell: 'bg-amber-500/80 text-black',
    banner: 'bg-amber-400 text-black',
    accent: 'text-amber-400',
  },
  {
    row: 'border-lime-400/40 bg-lime-500/[0.08]',
    cell: 'bg-lime-500/80 text-black',
    banner: 'bg-lime-400 text-black',
    accent: 'text-lime-400',
  },
  {
    row: 'border-emerald-400/45 bg-emerald-500/[0.09]',
    cell: 'bg-emerald-500/80 text-white',
    banner: 'bg-emerald-500 text-white',
    accent: 'text-emerald-500',
  },
]

function ratingTone(rating: WatchRating): RatingTone {
  if (rating <= 2) return RATING_TONES[0]!
  if (rating <= 4) return RATING_TONES[1]!
  if (rating <= 6) return RATING_TONES[2]!
  if (rating <= 8) return RATING_TONES[3]!
  return RATING_TONES[4]!
}

function pickCheer(avoid?: string): string {
  const pool = EPISODE_CHEERS.filter((c) => c !== avoid)
  return pool[Math.floor(Math.random() * pool.length)] ?? EPISODE_CHEERS[0]!
}

const COLLAPSE_KEY = 'jo-dailies:watchlist-collapsed:v1'
const PANEL_COLLAPSE_KEY = 'jo-dailies:watchlist-panel-collapsed:v1'

type CollapsedMap = Partial<Record<WatchKind, boolean>>

function loadCollapsed(): CollapsedMap {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as CollapsedMap
  } catch {
    return {}
  }
}

function saveCollapsed(map: CollapsedMap) {
  try {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

function loadPanelCollapsed(): boolean {
  try {
    return localStorage.getItem(PANEL_COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

function savePanelCollapsed(value: boolean) {
  try {
    localStorage.setItem(PANEL_COLLAPSE_KEY, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function Watchlist() {
  const [items, setItems] = useState<WatchItem[]>(() => loadWatchlist())
  const { user } = useFirebaseAuth()
  const [draft, setDraft] = useState('')
  const [draftKind, setDraftKind] = useState<WatchKind>('anime')
  const [collapsed, setCollapsed] = useState<CollapsedMap>(() => loadCollapsed())
  const [panelCollapsed, setPanelCollapsed] = useState(() => loadPanelCollapsed())
  const [cheer, setCheer] = useState<string | null>(null)
  const [rowPets, setRowPets] = useState<Record<string, string>>(() => {
    const initial = loadWatchlist()
    return Object.fromEntries(initial.map((item) => [item.id, randomPet()]))
  })
  const [cheerKey, setCheerKey] = useState(0)
  const [sparkleId, setSparkleId] = useState<string | null>(null)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [pickedTitle, setPickedTitle] = useState<string | null>(null)
  const [pickedKey, setPickedKey] = useState(0)
  const [filterKind, setFilterKind] = useState<WatchKind | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<WatchStatus | 'all'>('all')
  const lastCheer = useRef<string | undefined>(undefined)
  const listRef = useRef<HTMLDivElement>(null)
  // Mirrors pickedId so removeItem can stay referentially stable for memoized rows.
  const pickedIdRef = useRef<string | null>(null)
  pickedIdRef.current = pickedId

  const emptyPet = useMemo(
    () => EMPTY_PETS[Math.floor(Math.random() * EMPTY_PETS.length)]!,
    [],
  )

  const sensors = useSensors(
    useSensor(CardPointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    if (!user) return

    const watchItemsRef = collection(
      db,
      'rooms',
      syncRoomId,
      'watchItems',
    )
    const hadMigrated =
      localStorage.getItem(WATCHLIST_MIGRATION_KEY) === '1'
    const local = loadWatchlist()

    const unsubscribe = onSnapshot(
      watchItemsRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        updateSyncSource('watchlist', {
          pending: snapshot.metadata.hasPendingWrites,
          fromCache: snapshot.metadata.fromCache,
        })

        if (snapshot.empty && !hadMigrated && local.length > 0) return

        const next = snapshot.docs
          .map((itemDoc, index) =>
            normalizeWatchItem(
              { ...itemDoc.data(), id: itemDoc.id },
              index * 1024,
            ),
          )
          .filter((item): item is WatchItem => item !== null)
          .sort((a, b) => a.order - b.order)
        saveWatchlist(next)
        setItems(next)
      },
      (error) => {
        updateSyncSource('watchlist', {
          pending: false,
          fromCache: false,
          error: true,
        })
        console.error('Watchlist sync failed', error)
      },
    )

    if (!hadMigrated) {
      const uploads = local.map((item) =>
        setDoc(doc(watchItemsRef, item.id), item),
      )
      void Promise.all(uploads)
        .then(() => localStorage.setItem(WATCHLIST_MIGRATION_KEY, '1'))
        .catch((error: unknown) => {
          console.error('Could not migrate local watchlist', error)
        })
    }

    return () => {
      unsubscribe()
      updateSyncSource('watchlist', null)
    }
  }, [user])

  useEffect(() => {
    saveWatchlist(items)
  }, [items])

  useEffect(() => {
    setRowPets((prev) => {
      const ids = new Set(items.map((i) => i.id))
      const next = { ...prev }
      let changed = false
      for (const item of items) {
        if (!next[item.id]) {
          next[item.id] = randomPet()
          changed = true
        }
      }
      for (const id of Object.keys(next)) {
        if (!ids.has(id)) {
          delete next[id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [items])

  useEffect(() => {
    saveCollapsed(collapsed)
  }, [collapsed])

  useEffect(() => {
    savePanelCollapsed(panelCollapsed)
  }, [panelCollapsed])

  useEffect(() => {
    if (!cheer) return
    const t = window.setTimeout(() => setCheer(null), 1600)
    return () => window.clearTimeout(t)
  }, [cheer, cheerKey])

  useEffect(() => {
    if (!sparkleId) return
    const t = window.setTimeout(() => setSparkleId(null), 900)
    return () => window.clearTimeout(t)
  }, [sparkleId])

  useEffect(() => {
    if (!pickedId || !pickedTitle) return
    const t = window.setTimeout(() => {
      setPickedId(null)
      setPickedTitle(null)
    }, 60_000)
    return () => window.clearTimeout(t)
  }, [pickedId, pickedTitle, pickedKey])

  useEffect(() => {
    if (!pickedId) return
    const el = listRef.current?.querySelector(
      `[data-watch-id="${pickedId}"]`,
    ) as HTMLElement | null
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [pickedId, pickedKey, collapsed])

  const remaining = items.filter((i) => !isSettled(i.status)).length
  const filtersActive = filterKind !== 'all' || filterStatus !== 'all'

  /** Viewing filter — "any status" shows everything, settled included. */
  const matchesFilter = useCallback(
    (item: WatchItem) =>
      (filterKind === 'all' || item.kind === filterKind) &&
      (filterStatus === 'all' || item.status === filterStatus),
    [filterKind, filterStatus],
  )

  // Shuffle keeps its old bias: "any status" still skips done/dropped.
  const shufflePool = useMemo(
    () =>
      items.filter((i) => {
        const kindOk = filterKind === 'all' || i.kind === filterKind
        const statusOk =
          filterStatus === 'all'
            ? !isSettled(i.status)
            : i.status === filterStatus
        return kindOk && statusOk
      }),
    [items, filterKind, filterStatus],
  )

  const toggleCollapsed = (kind: WatchKind) => {
    setCollapsed((prev) => ({ ...prev, [kind]: !prev[kind] }))
  }

  const grouped = useMemo(() => {
    return WATCH_KINDS.map((kind) => ({
      ...kind,
      items: items.filter((i) => i.kind === kind.id && matchesFilter(i)),
    }))
  }, [items, matchesFilter])

  const visibleCount = grouped.reduce((sum, group) => sum + group.items.length, 0)

  const showCheer = useCallback((text: string) => {
    lastCheer.current = text
    setCheer(text)
    setCheerKey((n) => n + 1)
  }, [])

  const addItem = (event: FormEvent) => {
    event.preventDefault()
    const title = draft.trim()
    if (!title) return
    const item: WatchItem = {
      id: newWatchId(),
      title,
      kind: draftKind,
      status: 'planned',
      order:
        items.length === 0
          ? 0
          : Math.min(...items.map((existing) => existing.order)) - 1024,
      season: 1,
      episode: 1,
      rating: null,
    }
    setItems((prev) => [item, ...prev])
    void setDoc(
      doc(db, 'rooms', syncRoomId, 'watchItems', item.id),
      item,
    ).catch((error: unknown) => {
      console.error('Could not add watchlist item', error)
    })
    setDraft('')
  }

  const patchItem = useCallback((id: string, patch: Partial<WatchItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
    void setDoc(
      doc(db, 'rooms', syncRoomId, 'watchItems', id),
      patch,
      { merge: true },
    ).catch((error: unknown) => {
      console.error('Could not update watchlist item', error)
    })
  }, [])

  const bumpSeason = useCallback(
    (item: WatchItem, delta: number) => {
      const season = Math.max(1, item.season + delta)
      if (season === item.season) return
      patchItem(item.id, { season, status: activeStatus(item.status) })
      if (delta > 0) showCheer(pickCheer(lastCheer.current))
    },
    [patchItem, showCheer],
  )

  const bumpEpisode = useCallback(
    (item: WatchItem, delta: number) => {
      let season = item.season
      let episode = item.episode + delta
      if (episode < 1) {
        if (season > 1) {
          season -= 1
          episode = 1
        } else {
          episode = 1
        }
      }
      patchItem(item.id, { season, episode, status: activeStatus(item.status) })
      if (delta > 0) showCheer(pickCheer(lastCheer.current))
    },
    [patchItem, showCheer],
  )

  const rateItem = useCallback(
    (item: WatchItem, rating: WatchRating) => {
      const next = item.rating === rating ? null : rating
      patchItem(item.id, { rating: next })
      if (next !== null && next >= 9) setSparkleId(item.id)
    },
    [patchItem],
  )

  const setItemStatus = useCallback(
    (item: WatchItem, status: WatchStatus) => {
      patchItem(item.id, { status })
    },
    [patchItem],
  )

  const setItemSeason = useCallback(
    (item: WatchItem, season: number) => {
      patchItem(item.id, {
        season: Math.max(1, season),
        status: activeStatus(item.status),
      })
    },
    [patchItem],
  )

  const setItemEpisode = useCallback(
    (item: WatchItem, episode: number) => {
      patchItem(item.id, {
        episode: Math.max(1, episode),
        status: activeStatus(item.status),
      })
    },
    [patchItem],
  )

  const pickWhatNext = () => {
    if (shufflePool.length === 0) {
      const kindLabel =
        filterKind === 'all'
          ? null
          : WATCH_KINDS.find((k) => k.id === filterKind)?.label.toLowerCase()
      const statusLabelText =
        filterStatus === 'all'
          ? null
          : statusLabel(filterStatus).toLowerCase()
      const parts = [kindLabel, statusLabelText].filter(Boolean)
      showCheer(
        parts.length === 0
          ? 'nothing left!'
          : `no ${parts.join(' · ')} left!`,
      )
      return
    }
    const pick = shufflePool[Math.floor(Math.random() * shufflePool.length)]!
    setPanelCollapsed(false)
    setCollapsed((prev) => ({ ...prev, [pick.kind]: false }))
    setPickedId(pick.id)
    setPickedTitle(pick.title)
    setPickedKey((n) => n + 1)
  }

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    void deleteDoc(
      doc(db, 'rooms', syncRoomId, 'watchItems', id),
    ).catch((error: unknown) => {
      console.error('Could not remove watchlist item', error)
    })
    if (pickedIdRef.current === id) {
      setPickedId(null)
      setPickedTitle(null)
    }
  }, [])

  const removeRow = useCallback(
    (item: WatchItem) => {
      removeItem(item.id)
    },
    [removeItem],
  )

  const onDragEnd = (event: DragEndEvent, kind: WatchKind) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setItems((prev) => {
      const kindItems = prev.filter((i) => i.kind === kind)

      // Only visible rows can be dragged; filtered-out rows keep their slots.
      const visibleSlots: number[] = []
      kindItems.forEach((item, index) => {
        if (matchesFilter(item)) visibleSlots.push(index)
      })
      const visible = visibleSlots.map((slot) => kindItems[slot]!)
      const oldIndex = visible.findIndex((i) => i.id === active.id)
      const newIndex = visible.findIndex((i) => i.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return prev

      const movedVisible = arrayMove(visible, oldIndex, newIndex)
      const reordered = [...kindItems]
      visibleSlots.forEach((slot, i) => {
        reordered[slot] = movedVisible[i]!
      })

      const nextKind = reordered.map((item, index) => ({
        ...item,
        order: index * 1024,
      }))
      const batch = writeBatch(db)
      for (const item of nextKind) {
        batch.set(
          doc(db, 'rooms', syncRoomId, 'watchItems', item.id),
          { order: item.order },
          { merge: true },
        )
      }
      void batch.commit().catch((error: unknown) => {
        console.error('Could not reorder watchlist', error)
      })

      let cursor = 0
      return prev.map((item) => {
        if (item.kind !== kind) return item
        return nextKind[cursor++]!
      })
    })
  }

  return (
    <section className="relative rounded-2xl border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setPanelCollapsed((v) => !v)}
          aria-expanded={!panelCollapsed}
          className="flex min-w-0 items-center gap-1.5 text-left transition hover:opacity-90"
        >
          <ChevronIcon open={!panelCollapsed} />
          <h2 className="text-sm font-semibold text-white">Watchlist</h2>
        </button>
        <span className="shrink-0 text-[11px] text-muted tabular-nums">
          {remaining} to watch
        </span>
      </div>

      {cheer ? (
        <p
          key={cheerKey}
          className="watchlist-cheer pointer-events-none absolute right-3 top-10 z-10 rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-medium text-white shadow-lg"
          role="status"
        >
          {cheer}
        </p>
      ) : null}

      {!panelCollapsed ? (
        <>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">Stuff to watch with Jo.</p>
            {items.length > 0 ? (
              <div className="relative flex min-w-0 max-w-full flex-col items-end">
                {pickedTitle ? (
                  <p
                    key={pickedKey}
                    className="watchlist-pick-banner absolute bottom-full left-0 z-[1] mb-0 max-w-full truncate rounded-b-none rounded-t-lg border border-b-0 border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-white shadow-lg"
                    role="status"
                    title={pickedTitle}
                  >
                    up next: <span className="font-bold">{pickedTitle}</span>
                  </p>
                ) : null}
                <div
                  className={[
                    'inline-flex overflow-hidden rounded-lg border bg-surface',
                    filtersActive ? 'border-white/25' : 'border-border',
                  ].join(' ')}
                  role="group"
                  aria-label="Filter and shuffle"
                >
                  <label className="sr-only" htmlFor="watchlist-filter-kind">
                    Filter category
                  </label>
                  <select
                    id="watchlist-filter-kind"
                    value={filterKind}
                    onChange={(e) =>
                      setFilterKind(e.target.value as WatchKind | 'all')
                    }
                    className={[
                      'border-0 border-r border-border bg-transparent py-1 pl-2 pr-1 text-[10px] text-muted [color-scheme:dark] focus:outline-none',
                      filterKind !== 'all' ? 'font-semibold' : '',
                    ].join(' ')}
                    title="Filter by category"
                  >
                    <option value="all" className="bg-surface text-white">
                      All
                    </option>
                    {WATCH_KINDS.map((kind) => (
                      <option
                        key={kind.id}
                        value={kind.id}
                        className="bg-surface text-white"
                      >
                        {kind.label}
                      </option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor="watchlist-filter-status">
                    Filter status
                  </label>
                  <select
                    id="watchlist-filter-status"
                    value={filterStatus}
                    onChange={(e) =>
                      setFilterStatus(e.target.value as WatchStatus | 'all')
                    }
                    className={[
                      'max-w-[6.5rem] border-0 border-r border-border bg-transparent py-1 pl-2 pr-1 text-[10px] text-muted [color-scheme:dark] focus:outline-none',
                      filterStatus !== 'all' ? 'font-semibold' : '',
                    ].join(' ')}
                    title="Filter by status"
                  >
                    <option value="all" className="bg-surface text-white">
                      Any status
                    </option>
                    {WATCH_STATUSES.map((status) => (
                      <option
                        key={status.id}
                        value={status.id}
                        className="bg-surface text-white"
                      >
                        {status.label}
                      </option>
                    ))}
                  </select>
                  {filtersActive ? (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterKind('all')
                        setFilterStatus('all')
                      }}
                      className="border-r border-border px-1.5 py-1 text-[11px] leading-none text-muted transition hover:bg-white/5 hover:text-white"
                      title="Clear filters"
                      aria-label="Clear filters"
                    >
                      ×
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={pickWhatNext}
                    disabled={shufflePool.length === 0}
                    className="px-2 py-1 text-[10px] font-medium text-muted transition hover:bg-white/5 hover:text-white disabled:opacity-40"
                    title="Pick something random to watch"
                  >
                    What next?
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={addItem} className="mt-4 space-y-2">
            <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
              {WATCH_KINDS.map((kind) => (
                <button
                  key={kind.id}
                  type="button"
                  onClick={() => setDraftKind(kind.id)}
                  className={[
                    'flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition',
                    draftKind === kind.id
                      ? 'bg-surface-raised text-white'
                      : 'text-muted hover:text-white',
                  ].join(' ')}
                >
                  {kind.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Add ${draftKind}…`}
                aria-label="Add to watchlist"
                className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-white placeholder:text-muted/70 focus:border-white/25 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="shrink-0 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-white transition hover:border-white/25 hover:bg-surface-raised disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </form>

          {items.length === 0 ? (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-3 py-6 text-center">
              <PetFace
                species={emptyPet}
                className="watchlist-peek size-14 opacity-90"
              />
              <p className="text-xs text-muted">Nothing queued up yet.</p>
              <p className="text-[10px] text-muted/80">Waiting for the next watch party…</p>
            </div>
          ) : visibleCount === 0 ? (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-3 py-6 text-center">
              <p className="text-xs text-muted">Nothing matches this filter.</p>
              <button
                type="button"
                onClick={() => {
                  setFilterKind('all')
                  setFilterStatus('all')
                }}
                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-white transition hover:border-white/25"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div ref={listRef} className="mt-4 space-y-4">
              {grouped.map((group) =>
                group.items.length === 0 ? null : (
                  <div key={group.id}>
                    <button
                      type="button"
                      onClick={() => toggleCollapsed(group.id)}
                      aria-expanded={!collapsed[group.id]}
                      className="mb-2 flex w-full items-center gap-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted transition hover:text-white"
                    >
                      <ChevronIcon open={!collapsed[group.id]} />
                      <span>{group.label}</span>
                      <span className="tabular-nums opacity-70">
                        ({group.items.length})
                      </span>
                    </button>

                    {!collapsed[group.id] ? (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => onDragEnd(event, group.id)}
                      >
                        <SortableContext
                          items={group.items.map((i) => i.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <ul className="watchlist-kind-list space-y-2">
                            {group.items.map((item) => (
                              <SortableWatchRow
                                key={item.id}
                                item={item}
                                pet={rowPets[item.id] ?? ROW_PETS[0]!}
                                highlighted={pickedId === item.id}
                                sparkle={sparkleId === item.id}
                                onStatus={setItemStatus}
                                onBumpSeason={bumpSeason}
                                onBumpEpisode={bumpEpisode}
                                onSeason={setItemSeason}
                                onEpisode={setItemEpisode}
                                onRate={rateItem}
                                onRemove={removeRow}
                              />
                            ))}
                          </ul>
                        </SortableContext>
                      </DndContext>
                    ) : null}
                  </div>
                ),
              )}
            </div>
          )}
        </>
      ) : null}
    </section>
  )
}

/**
 * Handlers take the item so the parent can hand down referentially stable
 * callbacks — otherwise every keystroke in the add field re-renders every row.
 */
interface SortableWatchRowProps {
  item: WatchItem
  pet: string
  highlighted: boolean
  sparkle: boolean
  onStatus: (item: WatchItem, status: WatchStatus) => void
  onBumpSeason: (item: WatchItem, delta: number) => void
  onBumpEpisode: (item: WatchItem, delta: number) => void
  onSeason: (item: WatchItem, season: number) => void
  onEpisode: (item: WatchItem, episode: number) => void
  onRate: (item: WatchItem, rating: WatchRating) => void
  onRemove: (item: WatchItem) => void
}

const SortableWatchRow = memo(function SortableWatchRow({
  item,
  pet,
  highlighted,
  sparkle,
  onStatus,
  onBumpSeason,
  onBumpEpisode,
  onSeason,
  onEpisode,
  onRate,
  onRemove,
}: SortableWatchRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const showProgress = needsProgress(item.kind)
  const rated = isWatchRating(item.rating)
  const tone = rated ? ratingTone(item.rating!) : null
  const vibe =
    rated && item.rating !== null ? RATING_VIBES[item.rating] : null
  const [statusOpen, setStatusOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  useEffect(() => {
    if (!confirmRemove) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmRemove(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [confirmRemove])

  const handleStatus = useCallback(
    (status: WatchStatus) => onStatus(item, status),
    [onStatus, item],
  )
  const handleBumpSeason = useCallback(
    (delta: number) => onBumpSeason(item, delta),
    [onBumpSeason, item],
  )
  const handleBumpEpisode = useCallback(
    (delta: number) => onBumpEpisode(item, delta),
    [onBumpEpisode, item],
  )
  const handleSeason = useCallback(
    (season: number) => onSeason(item, season),
    [onSeason, item],
  )
  const handleEpisode = useCallback(
    (episode: number) => onEpisode(item, episode),
    [onEpisode, item],
  )
  const handleRate = useCallback(
    (rating: WatchRating) => onRate(item, rating),
    [onRate, item],
  )

  // Skip style/layout/paint for offscreen rows, but not while something needs
  // to escape the card's bounds (menu, pick ring) — paint containment clips it.
  // Also stay measurable during a drag so dnd-kit gets real rects, not the
  // contain-intrinsic-size placeholder.
  const { active: dragActive } = useDndContext()
  const canSkipOffscreen =
    !statusOpen && !confirmRemove && !highlighted && !isDragging && !dragActive

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-watch-id={item.id}
      {...attributes}
      {...listeners}
      className={[
        'group relative cursor-grab touch-none rounded-xl border transition-colors active:cursor-grabbing',
        canSkipOffscreen ? 'watchlist-card-lazy' : '',
        tone ? tone.row : 'border-border bg-surface hover:border-white/20',
        highlighted ? 'watchlist-picked ring-2 ring-golden/70' : '',
        sparkle ? 'watchlist-rating-sparkle' : '',
        statusOpen || confirmRemove ? 'z-30' : '',
        isDragging ? 'z-40 opacity-80 shadow-lg shadow-black/30' : '',
      ].join(' ')}
    >
      {sparkle ? (
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl" aria-hidden="true">
          <span className="watchlist-spark done-sparkle absolute left-[18%] top-2 text-golden">✦</span>
          <span className="watchlist-spark done-sparkle absolute left-[52%] top-1 text-emerald-300 [animation-delay:80ms]">✧</span>
          <span className="watchlist-spark done-sparkle absolute left-[78%] top-3 text-amber-300 [animation-delay:140ms]">✦</span>
        </span>
      ) : null}

      <div className="flex flex-col gap-[6px] pb-[6px]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 shrink items-start">
            <div className="shrink-0">
              <StatusBanner
                title={item.title}
                status={item.status}
                open={statusOpen}
                onOpenChange={setStatusOpen}
                onStatus={handleStatus}
              />
            </div>
            <MarqueeText
              text={item.title}
              maxWidth="11rem"
              className={[
                'watchlist-title shrink-0 rounded-br-lg px-2 py-[6px] text-[9px] font-bold uppercase leading-none tracking-[0.14em] shadow-sm',
                isSettled(item.status)
                  ? 'bg-rose-500/70 text-white line-through decoration-white/35'
                  : tone
                    ? tone.banner
                    : STATUS_STYLES[item.status].banner,
              ].join(' ')}
            />
          </div>

          <div className="flex shrink-0 items-start">
            {vibe && tone ? (
              <MarqueeText
                text={vibe}
                title={`${item.rating}/10 · ${vibe}`}
                maxWidth="7.5rem"
                className={[
                  'pointer-events-none rounded-bl-lg rounded-tr-xl px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] shadow-sm',
                  tone.banner,
                ].join(' ')}
              />
            ) : null}
          </div>
        </div>

        {/* Always reserve the S/E row height so movie cards match series
            layout (pet + remove chip don't collide with the rating bar). */}
        <div className="flex min-h-6 flex-wrap items-center gap-2 px-2">
          {showProgress ? (
            <>
              <ProgressChip
                label="S"
                value={item.season}
                ariaLabel={`${item.title} season`}
                onCommit={handleSeason}
                onBump={handleBumpSeason}
                banner={tone?.banner ?? STATUS_STYLES[item.status].banner}
                accent={tone?.accent ?? STATUS_STYLES[item.status].accent}
              />
              <ProgressChip
                label="E"
                value={item.episode}
                ariaLabel={`${item.title} episode`}
                onCommit={handleEpisode}
                onBump={handleBumpEpisode}
                banner={tone?.banner ?? STATUS_STYLES[item.status].banner}
                accent={tone?.accent ?? STATUS_STYLES[item.status].accent}
              />
            </>
          ) : null}
        </div>

        <div className="relative px-2 pr-10">
          <RatingBar title={item.title} rating={item.rating} onRate={handleRate} />
        </div>
      </div>

      {confirmRemove ? (
        <div className="absolute inset-x-0 bottom-0 z-[3] flex items-center gap-1.5 rounded-b-xl bg-black/85 px-2 py-1.5 backdrop-blur-sm">
          <span className="mr-auto text-[10px] font-medium text-white/85">
            Are you sure?
          </span>
          <button
            type="button"
            onClick={() => {
              setConfirmRemove(false)
              onRemove(item)
            }}
            className="rounded-md bg-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white transition hover:bg-rose-400"
          >
            Remove
          </button>
          <button
            type="button"
            onClick={() => setConfirmRemove(false)}
            className="rounded-md px-2 py-0.5 text-[10px] font-medium text-muted transition hover:text-white"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmRemove(true)}
          aria-label={`Remove ${item.title}`}
          className="absolute bottom-0 right-0 z-[2] flex h-6 w-6 items-center justify-center rounded-br-xl rounded-tl-md bg-rose-500 text-sm leading-none text-white transition hover:bg-rose-400"
        >
          ×
        </button>
      )}

      <PetFace
        species={pet}
        className="watchlist-row-pet pointer-events-none absolute right-2 top-7 z-[1] size-7 drop-shadow-sm"
      />
    </li>
  )
})

/**
 * Marquee sizing shared across every label: one resize listener for the whole
 * list, a cached root font size, and canvas text metrics so measuring never
 * touches the DOM (the old per-instance probe forced a reflow per card).
 */
const marqueeSubscribers = new Set<() => void>()
let marqueeResizeFrame = 0
let cachedRootFontPx = 0

function flushMarqueeSubscribers() {
  marqueeResizeFrame = 0
  cachedRootFontPx = 0
  for (const notify of marqueeSubscribers) notify()
}

function onMarqueeResize() {
  if (marqueeResizeFrame) return
  marqueeResizeFrame = requestAnimationFrame(flushMarqueeSubscribers)
}

function subscribeMarqueeResize(notify: () => void): () => void {
  if (marqueeSubscribers.size === 0) {
    window.addEventListener('resize', onMarqueeResize)
  }
  marqueeSubscribers.add(notify)
  return () => {
    marqueeSubscribers.delete(notify)
    if (marqueeSubscribers.size === 0) {
      window.removeEventListener('resize', onMarqueeResize)
      if (marqueeResizeFrame) {
        cancelAnimationFrame(marqueeResizeFrame)
        marqueeResizeFrame = 0
      }
    }
  }
}

function rootFontPx(): number {
  if (!cachedRootFontPx) {
    const n = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    )
    cachedRootFontPx = Number.isFinite(n) && n > 0 ? n : 16
  }
  return cachedRootFontPx
}

function remToPx(value: string): number {
  const n = Number.parseFloat(value)
  if (!Number.isFinite(n)) return 0
  return value.endsWith('rem') ? n * rootFontPx() : n
}

let textMetricsCtx: CanvasRenderingContext2D | null | undefined

function measureTextPx(
  text: string,
  font: string,
  letterSpacing: string,
): number {
  if (textMetricsCtx === undefined) {
    textMetricsCtx = document.createElement('canvas').getContext('2d')
  }
  if (!textMetricsCtx) return 0

  textMetricsCtx.font = font
  const spacing = Number.parseFloat(letterSpacing)
  const hasSpacing = Number.isFinite(spacing) && spacing !== 0
  // letterSpacing on canvas is Chromium-only; elsewhere add it back by hand.
  const supportsSpacing = 'letterSpacing' in textMetricsCtx
  if (supportsSpacing) {
    textMetricsCtx.letterSpacing = hasSpacing ? letterSpacing : '0px'
  }
  const extra = hasSpacing && !supportsSpacing ? spacing * text.length : 0
  return textMetricsCtx.measureText(text).width + extra
}

/**
 * Classic ticker marquee: duplicate the label and scroll with translateX(-50%).
 * Overflow is decided only from single-line text vs the CSS max-width budget —
 * never from the live box (shrink-wrap ≈ text width, and a duplicated strip
 * always "overflows", which is what kept FROM / CODE GEASS stuck scrolling).
 */
function MarqueeText({
  text,
  className,
  title,
  maxWidth,
}: {
  text: string
  className?: string
  title?: string
  maxWidth: string
}) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const [active, setActive] = useState(false)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    // Read style once per mount; only the rem budget can change on resize.
    const cs = getComputedStyle(root)
    const chrome =
      (Number.parseFloat(cs.paddingLeft) || 0) +
      (Number.parseFloat(cs.paddingRight) || 0) +
      (Number.parseFloat(cs.borderLeftWidth) || 0) +
      (Number.parseFloat(cs.borderRightWidth) || 0)
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    const letterSpacing = cs.letterSpacing
    const rendered =
      cs.textTransform === 'uppercase'
        ? text.toUpperCase()
        : cs.textTransform === 'lowercase'
          ? text.toLowerCase()
          : text

    const apply = () => {
      const budget = remToPx(maxWidth) - chrome
      if (!(budget > 0)) {
        setActive(false)
        return
      }
      // Require a clear overflow so subpixels can't flip short labels on.
      setActive(measureTextPx(rendered, font, letterSpacing) > budget + 8)
    }

    apply()
    let cancelled = false
    void document.fonts?.ready.then(() => {
      if (!cancelled) apply()
    })
    const unsubscribe = subscribeMarqueeResize(apply)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [text, maxWidth, className])

  return (
    <span
      ref={rootRef}
      title={title ?? text}
      className={className}
      style={{
        display: 'inline-block',
        boxSizing: 'border-box',
        flexShrink: 0,
        // Shrink-wrap short labels; long ones hit maxWidth and can marquee.
        width: 'fit-content',
        maxWidth,
        overflow: 'hidden',
        verticalAlign: 'top',
        whiteSpace: 'nowrap',
      }}
    >
      {active ? (
        <span className="watchlist-marquee-strip">
          <span className="watchlist-marquee-chunk">{text}</span>
          <span className="watchlist-marquee-chunk" aria-hidden="true">
            {text}
          </span>
        </span>
      ) : (
        text
      )}
    </span>
  )
}

function StatusBanner({
  title,
  status,
  open,
  onOpenChange,
  onStatus,
}: {
  title: string
  status: WatchStatus
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatus: (status: WatchStatus) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) onOpenChange(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onOpenChange])

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${title} status: ${statusLabel(status)}`}
        title="Change status"
        className={[
          'flex items-center justify-center gap-1 whitespace-nowrap rounded-br-none rounded-tl-xl px-2 py-[6px] text-[9px] font-bold uppercase leading-none tracking-[0.14em] shadow-sm transition hover:brightness-110',
          STATUS_STYLES[status].banner,
        ].join(' ')}
      >
        {statusLabel(status)}
        <svg viewBox="0 0 10 10" className="size-2" aria-hidden="true">
          <path
            d="M2 3.5 L5 6.5 L8 3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="watchlist-status-menu absolute left-0 top-full z-20 mt-1 min-w-[8.5rem] overflow-hidden rounded-lg border border-border bg-surface-raised p-1 shadow-xl shadow-black/50"
        >
          {WATCH_STATUSES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="menuitemradio"
              aria-checked={s.id === status}
              onClick={() => {
                onStatus(s.id)
                onOpenChange(false)
              }}
              className={[
                'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[11px] transition',
                s.id === status
                  ? 'bg-white/10 text-white'
                  : 'text-muted hover:bg-white/5 hover:text-white',
              ].join(' ')}
            >
              <span
                className={[
                  'size-2 shrink-0 rounded-full',
                  STATUS_STYLES[s.id].dot,
                ].join(' ')}
              />
              {s.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ProgressChip({
  label,
  value,
  ariaLabel,
  onCommit,
  onBump,
  banner,
  accent,
}: {
  label: string
  value: number
  ariaLabel: string
  onCommit: (n: number) => void
  onBump: (delta: number) => void
  banner: string
  accent: string
}) {
  const [text, setText] = useState(String(value))

  useEffect(() => {
    setText(String(value))
  }, [value])

  const commit = () => {
    const n = Number.parseInt(text, 10)
    onCommit(Number.isFinite(n) && n >= 1 ? n : 1)
  }

  return (
    <div
      className="inline-flex items-stretch overflow-hidden rounded-lg shadow-sm"
      role="group"
      aria-label={ariaLabel}
    >
      <span
        className={[
          'flex items-center px-2 text-[9px] font-bold uppercase leading-none tracking-[0.14em]',
          banner,
        ].join(' ')}
      >
        {label}
      </span>
      <div className="inline-flex items-stretch bg-black/30">
        <button
          type="button"
          onClick={() => onBump(-1)}
          aria-label={`Decrease ${ariaLabel}`}
          className={[
            'flex h-6 w-4 items-center justify-center bg-surface text-[11px] font-bold transition hover:brightness-125',
            accent,
          ].join(' ')}
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={text}
          onChange={(e) => setText(e.target.value.replace(/\D/g, '').slice(0, 3))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          aria-label={ariaLabel}
          className="h-6 w-7 bg-transparent text-center text-[11px] font-bold tabular-nums tracking-wide text-white focus:bg-white/5 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => onBump(1)}
          aria-label={`Increase ${ariaLabel}`}
          className={[
            'flex h-6 w-4 items-center justify-center bg-surface text-[11px] font-bold transition hover:brightness-125',
            accent,
          ].join(' ')}
        >
          +
        </button>
      </div>
    </div>
  )
}

function RatingBar({
  title,
  rating,
  onRate,
}: {
  title: string
  rating: WatchRating | null
  onRate: (rating: WatchRating) => void
}) {
  const rated = isWatchRating(rating)
  const tone = rated ? ratingTone(rating!) : null

  return (
    <div
      role="group"
      aria-label={`${title} rating`}
      className="flex min-w-0 overflow-hidden rounded-md border border-border"
    >
      {RATING_VALUES.map((value) => {
        const filled = rated && rating! >= value
        const vibe = RATING_VIBES[value] ?? `${value}/${MAX_RATING}`
        return (
          <button
            key={value}
            type="button"
            onClick={() => onRate(value)}
            aria-label={`Rate ${title} ${value} out of ${MAX_RATING} — ${vibe}`}
            aria-pressed={rating === value}
            title={`${value} · ${vibe}`}
            className={[
              'min-w-0 flex-1 border-r border-border/60 py-1 text-[10px] font-medium tabular-nums transition last:border-r-0',
              filled && tone
                ? tone.cell
                : 'bg-surface-raised text-muted hover:bg-white/10 hover:text-white',
            ].join(' ')}
          >
            {value}
          </button>
        )
      })}
    </div>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={[
        'size-3 shrink-0 transition-transform duration-200',
        open ? 'rotate-90' : 'rotate-0',
      ].join(' ')}
      aria-hidden="true"
    >
      <path
        d="M4 2.5 L8.5 6 L4 9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
