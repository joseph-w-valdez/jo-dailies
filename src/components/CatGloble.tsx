import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  applyGlobleGuess,
  buildGlobleHint,
  clampGlobleHintAfter,
  formatDistanceKm,
  GLOBLE_DEFAULT_HINT_AFTER,
  GLOBLE_MAX_HINT_AFTER,
  GLOBLE_MIN_HINT_AFTER,
  globleCountryFill,
  globleCountryStroke,
  proximityColor,
  startGlobleRound,
  suggestGlobleCountries,
  type GlobleCountry,
  type GlobleGuess,
  type GlobleRound,
} from '../lib/globle'
import { GLOBLE_COUNTRIES } from '../lib/globleCountries'
import { GLOBLE_COUNTRY_PATHS } from '../lib/globleCountryPaths'
import { ArcadeStage, ArcadeStatus } from './ArcadeStage'

const COUNTRIES_BY_ID = new Map(GLOBLE_COUNTRIES.map((c) => [c.id, c]))

const MAP_PATH_ENTRIES = Object.entries(GLOBLE_COUNTRY_PATHS).filter(([id]) =>
  COUNTRIES_BY_ID.has(id),
)

const MAP_W = 1000
const MAP_H = 500
const MIN_ZOOM = 1
const MAX_ZOOM = 12

type MapView = { x: number; y: number; w: number; h: number }

const DEFAULT_VIEW: MapView = { x: 0, y: 0, w: MAP_W, h: MAP_H }

function clampMapView(next: MapView): MapView {
  const w = Math.min(MAP_W, Math.max(MAP_W / MAX_ZOOM, next.w))
  const h = w * (MAP_H / MAP_W)
  const x = Math.min(MAP_W - w, Math.max(0, next.x))
  const y = Math.min(MAP_H - h, Math.max(0, next.y))
  return { x, y, w, h }
}

function zoomAt(
  view: MapView,
  factor: number,
  anchorX: number,
  anchorY: number,
): MapView {
  const newW = view.w * factor
  const newH = newW * (MAP_H / MAP_W)
  const relX = (anchorX - view.x) / view.w
  const relY = (anchorY - view.y) / view.h
  return clampMapView({
    w: newW,
    h: newH,
    x: anchorX - relX * newW,
    y: anchorY - relY * newH,
  })
}

const HINT_PREF_KEY = 'jo-dailies:globle-hint-after:v1'

function loadHintAfterPref(): number {
  try {
    const raw = localStorage.getItem(HINT_PREF_KEY)
    if (raw == null) return GLOBLE_DEFAULT_HINT_AFTER
    return clampGlobleHintAfter(Number(raw))
  } catch {
    return GLOBLE_DEFAULT_HINT_AFTER
  }
}

function saveHintAfterPref(value: number): void {
  try {
    localStorage.setItem(HINT_PREF_KEY, String(clampGlobleHintAfter(value)))
  } catch {
    /* ignore */
  }
}

function Arrow({ dir }: { dir: string }) {
  const rot: Record<string, number> = {
    N: 0,
    NE: 45,
    E: 90,
    SE: 135,
    S: 180,
    SW: 225,
    W: 270,
    NW: 315,
  }
  return (
    <span
      aria-hidden
      className="inline-block text-sm leading-none"
      style={{ transform: `rotate(${rot[dir] ?? 0}deg)` }}
    >
      ↑
    </span>
  )
}

export function CatGloble({ onClose }: { onClose: () => void }) {
  const listboxId = useId()
  const statusId = useId()
  const [phase, setPhase] = useState<'setup' | 'playing'>('setup')
  const [hintAfterDraft, setHintAfterDraft] = useState(() => loadHintAfterPref())
  const [round, setRound] = useState<GlobleRound | null>(null)
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [highlight, setHighlight] = useState(0)
  const [listOpen, setListOpen] = useState(false)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [mapView, setMapView] = useState<MapView>(DEFAULT_VIEW)
  const inputRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<(HTMLLIElement | null)[]>([])
  const mapFrameRef = useRef<HTMLDivElement>(null)
  const mapViewRef = useRef(mapView)
  mapViewRef.current = mapView
  const panRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    origin: MapView
    moved: boolean
  } | null>(null)
  const skipCountryClickRef = useRef(false)

  const mapZoom = MAP_W / mapView.w
  const mapZoomed = mapZoom > MIN_ZOOM + 0.01

  const guessedIds = useMemo(
    () => new Set(round?.guesses.map((g) => g.country.id) ?? []),
    [round?.guesses],
  )

  const guessById = useMemo(() => {
    const map = new Map<string, GlobleGuess>()
    for (const guess of round?.guesses ?? []) map.set(guess.country.id, guess)
    return map
  }, [round?.guesses])

  const suggestions = useMemo(
    () =>
      !round || round.won
        ? []
        : suggestGlobleCountries(query, 8, guessedIds),
    [query, guessedIds, round],
  )

  const hoverCountry = hoverId ? (COUNTRIES_BY_ID.get(hoverId) ?? null) : null
  const hintCells = round ? buildGlobleHint(round) : null

  const showList = listOpen && phase === 'playing' && suggestions.length > 0
  const activeOptionId = showList
    ? `${listboxId}-opt-${suggestions[highlight]?.id ?? 'none'}`
    : undefined

  useEffect(() => {
    if (highlight >= suggestions.length) {
      setHighlight(Math.max(0, suggestions.length - 1))
    }
  }, [highlight, suggestions.length])

  useEffect(() => {
    if (!showList) return
    optionRefs.current[highlight]?.scrollIntoView({ block: 'nearest' })
  }, [highlight, showList, suggestions])

  const statusLabel =
    phase === 'setup'
      ? 'New game setup'
      : !round
        ? 'Ready'
        : round.won
          ? `Found ${round.secret.name} in ${round.guesses.length}`
          : round.guesses.length === 0
            ? 'Guess a country'
            : `${round.guesses.length} guess${round.guesses.length === 1 ? '' : 'es'}`

  const beginRound = (excludeId?: string) => {
    const hintAfterWrong = clampGlobleHintAfter(hintAfterDraft)
    saveHintAfterPref(hintAfterWrong)
    setHintAfterDraft(hintAfterWrong)
    setRound(
      startGlobleRound({
        hintAfterWrong,
        excludeId,
        random: Math.random,
      }),
    )
    setPhase('playing')
    setQuery('')
    setMessage(null)
    setHighlight(0)
    setListOpen(false)
    setHoverId(null)
    setMapView(DEFAULT_VIEW)
    panRef.current = null
    window.setTimeout(() => inputRef.current?.focus(), 30)
  }

  const openSetup = () => {
    setPhase('setup')
    setRound(null)
    setQuery('')
    setMessage(null)
    setListOpen(false)
    setHoverId(null)
    setMapView(DEFAULT_VIEW)
    panRef.current = null
  }

  const submitCountry = (
    country: GlobleCountry,
    opts?: { focusInput?: boolean },
  ) => {
    if (!round) return
    const next = applyGlobleGuess(round, country)
    if (!next) {
      setMessage('Already guessed')
      return
    }
    setRound(next)
    setQuery('')
    setHighlight(0)
    setListOpen(false)
    setHoverId(null)
    setMessage(next.won ? `It's ${next.secret.name}!` : null)
    if (opts?.focusInput !== false) inputRef.current?.focus()
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!showList && suggestions.length === 0) {
      setMessage(query.trim() ? 'Unknown country' : null)
      return
    }
    const pick = suggestions[highlight] ?? suggestions[0]
    if (!pick) {
      setMessage(query.trim() ? 'Unknown country' : null)
      return
    }
    submitCountry(pick)
  }

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (showList) {
        setListOpen(false)
        return
      }
      if (query) {
        setQuery('')
        setHighlight(0)
        setMessage(null)
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (suggestions.length === 0) return
      setListOpen(true)
      setHighlight((h) => (showList ? (h + 1) % suggestions.length : 0))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (suggestions.length === 0) return
      setListOpen(true)
      setHighlight((h) =>
        showList
          ? (h - 1 + suggestions.length) % suggestions.length
          : suggestions.length - 1,
      )
      return
    }

    if (event.key === 'Home' && showList) {
      event.preventDefault()
      setHighlight(0)
      return
    }

    if (event.key === 'End' && showList) {
      event.preventDefault()
      setHighlight(suggestions.length - 1)
      return
    }

    if (event.key === 'Enter' && showList) {
      const pick = suggestions[highlight]
      if (pick) {
        event.preventDefault()
        submitCountry(pick)
      }
    }
  }

  useEffect(() => {
    if (phase !== 'playing') return
    const frame = mapFrameRef.current
    if (!frame) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = frame.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      const view = mapViewRef.current
      const anchorX =
        ((event.clientX - rect.left) / rect.width) * view.w + view.x
      const anchorY =
        ((event.clientY - rect.top) / rect.height) * view.h + view.y
      const direction = event.deltaY === 0 ? 0 : event.deltaY > 0 ? 1 : -1
      if (direction === 0) return
      const factor = direction > 0 ? 1.12 : 1 / 1.12
      setMapView(zoomAt(view, factor, anchorX, anchorY))
    }
    frame.addEventListener('wheel', onWheel, { passive: false })
    return () => frame.removeEventListener('wheel', onWheel)
  }, [phase])

  const resetMapZoom = () => {
    setMapView(DEFAULT_VIEW)
    panRef.current = null
  }

  const onMapPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    if ((event.target as Element | null)?.closest?.('button')) return
    if (MAP_W / mapViewRef.current.w <= MIN_ZOOM + 0.01) return
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: mapViewRef.current,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onMapPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current
    if (!pan || pan.pointerId !== event.pointerId) return
    const frame = mapFrameRef.current
    if (!frame) return
    const rect = frame.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const dxPx = event.clientX - pan.startX
    const dyPx = event.clientY - pan.startY
    if (Math.hypot(dxPx, dyPx) > 3) pan.moved = true
    const dx = (-dxPx / rect.width) * pan.origin.w
    const dy = (-dyPx / rect.height) * pan.origin.h
    setMapView(
      clampMapView({
        ...pan.origin,
        x: pan.origin.x + dx,
        y: pan.origin.y + dy,
      }),
    )
  }

  const onMapPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current
    if (!pan || pan.pointerId !== event.pointerId) return
    if (pan.moved) skipCountryClickRef.current = true
    panRef.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
  }

  return (
    <ArcadeStage
      title="Globle"
      onClose={onClose}
      meta={
        <ArcadeStatus tone={round?.won ? 'win' : 'ready'}>
          {statusLabel}
        </ArcadeStatus>
      }
    >
      {({ immersive }) => (
        <div className={immersive ? 'flex min-h-0 flex-1 flex-col' : undefined}>
          {immersive ? null : (
            <p className="mt-2 text-xs text-muted">
              Unlimited country guessing — local only, no sync. Type a name or
              click a country on the map. After enough misses, name blanks
              appear, then letters fill in. Scroll to zoom, drag to pan. ↑↓
              suggestions, Enter to pick, Esc to close.
            </p>
          )}

          {phase === 'setup' ? (
            <div className="mx-auto mt-6 w-full max-w-md space-y-4 rounded-xl border border-border bg-surface/60 p-4">
              <div>
                <h2 className="text-sm font-semibold text-white">New game</h2>
                <p className="mt-1 text-xs text-muted">
                  After this many wrong guesses, show underscores for the
                  country name. Each miss after that reveals a random letter.
                  Use 0 to show blanks from the start.
                </p>
              </div>
              <label className="block space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs text-muted">
                  <span>Hint after wrong guesses</span>
                  <span className="tabular-nums text-white">{hintAfterDraft}</span>
                </div>
                <input
                  type="range"
                  min={GLOBLE_MIN_HINT_AFTER}
                  max={GLOBLE_MAX_HINT_AFTER}
                  value={hintAfterDraft}
                  onChange={(event) =>
                    setHintAfterDraft(
                      clampGlobleHintAfter(Number(event.target.value)),
                    )
                  }
                  className="w-full accent-sky-400"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={GLOBLE_MIN_HINT_AFTER}
                    max={GLOBLE_MAX_HINT_AFTER}
                    value={hintAfterDraft}
                    onChange={(event) =>
                      setHintAfterDraft(
                        clampGlobleHintAfter(Number(event.target.value)),
                      )
                    }
                    className="w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm tabular-nums text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setHintAfterDraft(GLOBLE_DEFAULT_HINT_AFTER)}
                    className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-muted hover:text-white"
                  >
                    Default ({GLOBLE_DEFAULT_HINT_AFTER})
                  </button>
                </div>
              </label>
              <button
                type="button"
                onClick={() => beginRound()}
                className="w-full rounded-lg border border-sky-500/55 bg-sky-500/20 px-3 py-2.5 text-sm font-medium text-app-text hover:bg-sky-500/30"
              >
                Start
              </button>
            </div>
          ) : !round ? null : (
          <div
            className={[
              'mt-3 grid gap-3',
              'lg:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)]',
              immersive ? 'min-h-0 flex-1 lg:items-stretch' : 'lg:items-start',
            ].join(' ')}
          >
            <div
              className={[
                'overflow-hidden rounded-xl border border-border bg-[#0b1220]',
                immersive ? 'min-h-0 lg:h-full' : '',
              ].join(' ')}
            >
              <div
                ref={mapFrameRef}
                className={[
                  'relative mx-auto w-full max-w-full touch-none',
                  mapZoomed ? 'cursor-grab active:cursor-grabbing' : '',
                ].join(' ')}
                onPointerDown={onMapPointerDown}
                onPointerMove={onMapPointerMove}
                onPointerUp={onMapPointerUp}
                onPointerCancel={onMapPointerUp}
              >
                <svg
                  viewBox={`${mapView.x} ${mapView.y} ${mapView.w} ${mapView.h}`}
                  className="block h-auto w-full select-none"
                  role="img"
                  aria-label="World map"
                >
                  <rect
                    x="0"
                    y="0"
                    width={MAP_W}
                    height={MAP_H}
                    fill="#0b1220"
                  />
                  <g>
                    {MAP_PATH_ENTRIES.map(([id, d]) => {
                      const guess = guessById.get(id) ?? null
                      const correct =
                        Boolean(guess) &&
                        round.won &&
                        id === round.secret.id
                      const hovered = hoverId === id && !guess
                      const fill = globleCountryFill({
                        proximity: guess?.proximity ?? null,
                        hovered,
                        correct,
                      })
                      const stroke = globleCountryStroke({
                        proximity: guess?.proximity ?? null,
                        hovered,
                        correct,
                      })
                      const clickable = !round.won && !guess
                      return (
                        <path
                          key={id}
                          d={d}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={hovered || correct ? 1.25 : 0.6}
                          vectorEffect="non-scaling-stroke"
                          className={
                            clickable
                              ? 'cursor-pointer transition-[fill,stroke] duration-100'
                              : 'cursor-default'
                          }
                          onPointerEnter={() => {
                            if (!round.won) setHoverId(id)
                          }}
                          onPointerLeave={() => {
                            setHoverId((current) =>
                              current === id ? null : current,
                            )
                          }}
                          onClick={() => {
                            if (skipCountryClickRef.current) {
                              skipCountryClickRef.current = false
                              return
                            }
                            if (!clickable) return
                            const country = COUNTRIES_BY_ID.get(id)
                            if (country) {
                              submitCountry(country, { focusInput: false })
                            }
                          }}
                        >
                          <title>
                            {COUNTRIES_BY_ID.get(id)?.name ?? id}
                            {guess
                              ? ` — ${formatDistanceKm(guess.distanceKm)}`
                              : ''}
                          </title>
                        </path>
                      )
                    })}
                  </g>
                </svg>

                <div className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1.5">
                  <span className="rounded-md border border-border bg-surface-raised/90 px-2 py-1 text-[10px] tabular-nums text-muted">
                    {mapZoom.toFixed(1)}×
                  </span>
                  <button
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation()
                      resetMapZoom()
                    }}
                    disabled={!mapZoomed}
                    className="pointer-events-auto rounded-md border border-border bg-surface-raised/90 px-2 py-1 text-[10px] font-medium text-white transition hover:border-muted disabled:cursor-default disabled:opacity-40"
                  >
                    Reset zoom
                  </button>
                </div>

                {!round.won && hoverCountry ? (
                  <span
                    className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-md border border-border bg-surface-raised/95 px-2.5 py-1 text-xs font-medium text-white shadow"
                    aria-live="polite"
                  >
                    {hoverCountry.name}
                  </span>
                ) : null}
              </div>
            </div>

            <aside
              className={[
                'flex min-h-0 flex-col gap-2 rounded-xl border border-border bg-surface/60 p-2.5',
                immersive ? 'max-h-full overflow-hidden' : '',
              ].join(' ')}
            >
              {hintCells ? (
                <div
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2"
                  aria-label="Country name hint"
                >
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100/80">
                    Hint
                    {round.guesses.length <= round.hintAfterWrong
                      ? ' · blanks'
                      : ` · ${round.hintRevealed.length} letter${round.hintRevealed.length === 1 ? '' : 's'}`}
                  </p>
                  <p className="flex flex-wrap gap-x-1 gap-y-1 font-mono text-sm tracking-wide text-white">
                    {hintCells.map((cell, i) =>
                      cell.kind === 'gap' ? (
                        <span key={`g-${i}`} className="px-0.5 text-muted">
                          {cell.char === ' ' ? '\u00a0' : cell.char}
                        </span>
                      ) : (
                        <span
                          key={`l-${i}`}
                          className={[
                            'inline-flex min-w-[0.85em] justify-center border-b border-white/35 pb-0.5',
                            cell.revealed ? 'text-amber-100' : 'text-muted',
                          ].join(' ')}
                        >
                          {cell.revealed ? cell.char.toUpperCase() : '_'}
                        </span>
                      ),
                    )}
                  </p>
                </div>
              ) : null}

              {round.won ? (
                <button
                  type="button"
                  onClick={openSetup}
                  className="rounded-lg border border-emerald-500/55 bg-emerald-500/20 px-3 py-2 text-sm font-medium text-app-text hover:bg-emerald-500/30"
                >
                  New country
                </button>
              ) : (
                <form
                  className="relative flex flex-col gap-2"
                  onSubmit={onSubmit}
                >
                  <div className="relative min-w-0">
                    <label htmlFor={`${listboxId}-input`} className="sr-only">
                      Country guess
                    </label>
                    <input
                      id={`${listboxId}-input`}
                      ref={inputRef}
                      role="combobox"
                      aria-autocomplete="list"
                      aria-controls={listboxId}
                      aria-expanded={showList}
                      aria-activedescendant={activeOptionId}
                      aria-describedby={statusId}
                      aria-haspopup="listbox"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value)
                        setHighlight(0)
                        setListOpen(true)
                        setMessage(null)
                      }}
                      onFocus={() => setListOpen(true)}
                      onBlur={() => {
                        window.setTimeout(() => setListOpen(false), 120)
                      }}
                      onKeyDown={onInputKeyDown}
                      placeholder="Type a country…"
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white placeholder:text-muted"
                    />
                    {showList ? (
                      <ul
                        id={listboxId}
                        role="listbox"
                        aria-label="Country suggestions"
                        className="absolute left-0 right-0 z-20 mt-1 max-h-52 overflow-auto rounded-lg border border-border bg-surface-raised py-1 shadow-xl"
                      >
                        {suggestions.map((country, i) => {
                          const selected = i === highlight
                          return (
                            <li
                              key={country.id}
                              id={`${listboxId}-opt-${country.id}`}
                              ref={(node) => {
                                optionRefs.current[i] = node
                              }}
                              role="option"
                              aria-selected={selected}
                              onMouseEnter={() => setHighlight(i)}
                              onMouseDown={(event) => {
                                event.preventDefault()
                                submitCountry(country)
                              }}
                              className={[
                                'cursor-pointer px-3 py-1.5 text-left text-sm',
                                selected
                                  ? 'bg-white/10 text-white'
                                  : 'text-muted hover:bg-white/5 hover:text-white',
                              ].join(' ')}
                            >
                              {country.name}
                            </li>
                          )
                        })}
                      </ul>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="min-w-0 flex-1 rounded-lg border border-sky-500/55 bg-sky-500/20 px-3 py-2 text-sm font-medium text-app-text hover:bg-sky-500/30"
                    >
                      Guess
                    </button>
                    <button
                      type="button"
                      onClick={openSetup}
                      className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted hover:text-white"
                    >
                      New
                    </button>
                  </div>
                </form>
              )}

              <p id={statusId} className="sr-only" aria-live="polite">
                {showList
                  ? `${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'}. ${suggestions[highlight]?.name ?? ''} highlighted.`
                  : (message ?? '')}
              </p>

              {message ? (
                <p
                  className={[
                    'text-sm',
                    round.won ? 'text-emerald-300' : 'text-amber-200',
                  ].join(' ')}
                  role="status"
                >
                  {message}
                </p>
              ) : null}

              <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Guesses
                  {round.guesses.length > 0
                    ? ` · ${round.guesses.length}`
                    : ''}
                </p>
                {round.guesses.length > 0 ? (
                  <ol
                    className={[
                      'min-h-0 flex-1 space-y-1 overflow-y-auto rounded-lg border border-border/80 bg-surface/40 p-1.5 text-sm',
                      immersive ? '' : 'max-h-[22rem]',
                    ].join(' ')}
                  >
                    {[...round.guesses].reverse().map((guess) => {
                      const exact =
                        guess.country.id === round.secret.id && round.won
                      return (
                        <li
                          key={guess.country.id}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5"
                          style={{
                            backgroundColor: exact
                              ? 'rgba(34,197,94,0.15)'
                              : undefined,
                          }}
                        >
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor: exact
                                ? '#22c55e'
                                : proximityColor(guess.proximity),
                            }}
                          />
                          <span className="min-w-0 flex-1 truncate font-medium text-white">
                            {guess.country.name}
                          </span>
                          {exact ? (
                            <span className="text-xs font-semibold text-emerald-300">
                              Correct
                            </span>
                          ) : (
                            <>
                              <span className="shrink-0 tabular-nums text-xs text-muted">
                                {formatDistanceKm(guess.distanceKm)}
                              </span>
                              <span
                                className="w-6 shrink-0 text-center text-white/80"
                                title={`Toward target: ${guess.direction}`}
                              >
                                <Arrow dir={guess.direction} />
                              </span>
                            </>
                          )}
                        </li>
                      )
                    })}
                  </ol>
                ) : (
                  <p className="rounded-lg border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted">
                    Guesses show here with distance and direction.
                  </p>
                )}
              </div>
            </aside>
          </div>
          )}
        </div>
      )}
    </ArcadeStage>
  )
}
