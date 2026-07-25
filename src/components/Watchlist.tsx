import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
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
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import {
  loadWatchlist,
  needsProgress,
  newWatchId,
  saveWatchlist,
  WATCH_KINDS,
  type WatchItem,
  type WatchKind,
} from '../lib/watchlist'

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
  const [draft, setDraft] = useState('')
  const [draftKind, setDraftKind] = useState<WatchKind>('anime')
  const [collapsed, setCollapsed] = useState<CollapsedMap>(() => loadCollapsed())
  const [panelCollapsed, setPanelCollapsed] = useState(() => loadPanelCollapsed())

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    saveWatchlist(items)
  }, [items])

  useEffect(() => {
    saveCollapsed(collapsed)
  }, [collapsed])

  useEffect(() => {
    savePanelCollapsed(panelCollapsed)
  }, [panelCollapsed])

  const remaining = items.filter((i) => !i.watched).length

  const toggleCollapsed = (kind: WatchKind) => {
    setCollapsed((prev) => ({ ...prev, [kind]: !prev[kind] }))
  }

  const grouped = useMemo(() => {
    return WATCH_KINDS.map((kind) => ({
      ...kind,
      items: items.filter((i) => i.kind === kind.id),
    }))
  }, [items])

  const addItem = (event: FormEvent) => {
    event.preventDefault()
    const title = draft.trim()
    if (!title) return
    setItems((prev) => [
      {
        id: newWatchId(),
        title,
        kind: draftKind,
        watched: false,
        season: 1,
        episode: 1,
      },
      ...prev,
    ])
    setDraft('')
  }

  const patchItem = (id: string, patch: Partial<WatchItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  const bumpEpisode = (item: WatchItem, delta: number) => {
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
    patchItem(item.id, { season, episode, watched: false })
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const onDragEnd = (event: DragEndEvent, kind: WatchKind) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setItems((prev) => {
      const kindItems = prev.filter((i) => i.kind === kind)
      const oldIndex = kindItems.findIndex((i) => i.id === active.id)
      const newIndex = kindItems.findIndex((i) => i.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return prev

      const nextKind = arrayMove(kindItems, oldIndex, newIndex)
      let cursor = 0
      return prev.map((item) => {
        if (item.kind !== kind) return item
        return nextKind[cursor++]!
      })
    })
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-4">
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

      {!panelCollapsed ? (
        <>
          <p className="mt-1 text-xs text-muted">Stuff to watch with Jo.</p>

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
            <p className="mt-4 rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted">
              Nothing queued up yet.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
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
                          <ul className="space-y-2">
                            {group.items.map((item) => (
                              <SortableWatchRow
                                key={item.id}
                                item={item}
                                onToggle={() =>
                                  patchItem(item.id, { watched: !item.watched })
                                }
                                onBump={(delta) => bumpEpisode(item, delta)}
                                onSeason={(season) =>
                                  patchItem(item.id, {
                                    season: Math.max(1, season),
                                    watched: false,
                                  })
                                }
                                onEpisode={(episode) =>
                                  patchItem(item.id, {
                                    episode: Math.max(1, episode),
                                    watched: false,
                                  })
                                }
                                onRemove={() => removeItem(item.id)}
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

interface SortableWatchRowProps {
  item: WatchItem
  onToggle: () => void
  onBump: (delta: number) => void
  onSeason: (season: number) => void
  onEpisode: (episode: number) => void
  onRemove: () => void
}

function SortableWatchRow({
  item,
  onToggle,
  onBump,
  onSeason,
  onEpisode,
  onRemove,
}: SortableWatchRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const showProgress = needsProgress(item.kind)

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={[
        'rounded-xl border border-border bg-surface hover:border-white/20',
        isDragging ? 'z-10 opacity-80 shadow-lg shadow-black/30' : '',
      ].join(' ')}
    >
      <div className="group px-3 py-2.5">
        <div className="flex items-start gap-2">
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="mt-0.5 flex size-6 shrink-0 cursor-grab items-center justify-center rounded-md text-muted touch-none active:cursor-grabbing hover:bg-surface-raised hover:text-white"
            aria-label={`Drag to reorder ${item.title}`}
            title="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripIcon />
          </button>

          <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={item.watched}
              onChange={onToggle}
              className="mt-0.5 size-4 shrink-0 accent-golden"
              aria-label={`Mark ${item.title} ${item.watched ? 'unwatched' : 'watched'}`}
            />
            <span
              className={[
                'min-w-0 break-words text-sm leading-snug',
                item.watched ? 'text-muted line-through' : 'text-white',
              ].join(' ')}
              title={item.title}
            >
              {item.title}
            </span>
          </label>

          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${item.title}`}
            className="shrink-0 rounded-md px-1 text-muted opacity-0 transition hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
          >
            ×
          </button>
        </div>

        {showProgress ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 pl-8">
            <label className="flex items-center gap-1 text-[11px] text-muted">
              S
              <NumField
                value={item.season}
                ariaLabel={`${item.title} season`}
                onCommit={onSeason}
              />
            </label>
            <label className="flex items-center gap-1 text-[11px] text-muted">
              E
              <NumField
                value={item.episode}
                ariaLabel={`${item.title} episode`}
                onCommit={onEpisode}
              />
            </label>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => onBump(-1)}
                aria-label={`Previous episode of ${item.title}`}
                className="flex size-6 items-center justify-center rounded-md border border-border text-xs text-muted transition hover:border-white/25 hover:text-white"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => onBump(1)}
                aria-label={`Next episode of ${item.title}`}
                className="flex size-6 items-center justify-center rounded-md border border-border text-xs text-muted transition hover:border-white/25 hover:text-white"
              >
                +
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </li>
  )
}

function NumField({
  value,
  ariaLabel,
  onCommit,
}: {
  value: number
  ariaLabel: string
  onCommit: (n: number) => void
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
      className="w-10 rounded-md border border-border bg-surface-raised px-1.5 py-0.5 text-center text-xs tabular-nums text-white focus:border-white/25 focus:outline-none"
    />
  )
}

function GripIcon() {
  return (
    <svg viewBox="0 0 12 12" className="size-3.5" aria-hidden="true">
      <circle cx="3.5" cy="2.5" r="1" fill="currentColor" />
      <circle cx="8.5" cy="2.5" r="1" fill="currentColor" />
      <circle cx="3.5" cy="6" r="1" fill="currentColor" />
      <circle cx="8.5" cy="6" r="1" fill="currentColor" />
      <circle cx="3.5" cy="9.5" r="1" fill="currentColor" />
      <circle cx="8.5" cy="9.5" r="1" fill="currentColor" />
    </svg>
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
