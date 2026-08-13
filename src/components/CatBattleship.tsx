import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { usePetFace } from '../hooks/usePetFace'
import { useSharedBattleship } from '../hooks/useSharedBattleship'
import {
  applyBattleshipShot,
  boardVitals,
  BS_FLEET,
  BS_SIZE,
  cattleshipPetForUid,
  cellIndex,
  classifyBattleshipShot,
  isFleetComplete,
  placeShip,
  removeShip,
  setPlayerReady,
  shipAtCell,
  shipCells,
  shipFits,
  themeForCatIcon,
  type BsShip,
  type BoardVitals,
  type CattleshipShotKind,
} from '../lib/battleship'
import { JENGA_PLAYER_UIDS, nextTurnUid } from '../lib/jenga'
import { petIdleSrc } from '../lib/petAssets'
import { cattleshipIdleQuote, cattleshipShotQuote, type PetQuoteResult } from '../lib/petQuotes'
import { speakDurationMs, SPEAK_FRAME_MS } from '../lib/petSpeak'
import { ArcadeStage, ArcadeStatus } from './ArcadeStage'
import { NewGameConfirm } from './NewGameConfirm'
import { PetSprite } from './PetSprite'

const COACH_QUOTE_MS = 3_800
/** Silence between idle coach lines (after a bubble clears). */
const COACH_IDLE_GAP_MIN_MS = 8_000
const COACH_IDLE_GAP_MAX_MS = 14_000
/** First chatter after opening a round — a bit sooner. */
const COACH_IDLE_FIRST_MS = 3_500

function GridBoard({
  size = BS_SIZE,
  cellClass,
  cellStyle,
  cellContent,
  onCell,
  onHover,
  disabled,
  label,
  fill = false,
}: {
  size?: number
  cellClass: (x: number, y: number) => string
  cellStyle?: (x: number, y: number) => CSSProperties | undefined
  cellContent?: (x: number, y: number) => ReactNode
  onCell?: (x: number, y: number) => void
  onHover?: (cell: { x: number; y: number } | null) => void
  disabled?: boolean
  label: string
  /** Grow to fill a square parent (theater / fullscreen). */
  fill?: boolean
}) {
  return (
    <div
      className={[
        'gap-0.5 rounded-xl border border-border bg-surface/80 p-1.5',
        fill
          ? 'grid h-full w-full min-h-0 min-w-0'
          : 'inline-grid',
      ].join(' ')}
      style={{
        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        gridTemplateRows: fill
          ? `repeat(${size}, minmax(0, 1fr))`
          : undefined,
      }}
      role="grid"
      aria-label={label}
      onMouseLeave={() => onHover?.(null)}
    >
      {Array.from({ length: size * size }, (_, i) => {
        const x = i % size
        const y = Math.floor(i / size)
        return (
          <button
            key={i}
            type="button"
            disabled={disabled || !onCell}
            onClick={() => onCell?.(x, y)}
            onMouseEnter={() => onHover?.({ x, y })}
            style={cellStyle?.(x, y)}
            className={[
              'relative overflow-hidden rounded-sm border border-black/20 p-0',
              fill
                ? 'min-h-0 min-w-0'
                : 'aspect-square min-h-[1.35rem] min-w-[1.35rem] sm:min-h-[1.55rem] sm:min-w-[1.55rem]',
              cellClass(x, y),
              onCell && !disabled ? 'hover:brightness-110' : '',
            ].join(' ')}
            aria-label={`Cell ${x + 1},${y + 1}`}
          >
            {cellContent?.(x, y)}
          </button>
        )
      })}
    </div>
  )
}

function CatTile({
  icon,
  color,
  dimmed,
}: {
  icon: string
  color: string
  dimmed?: boolean
}) {
  return (
    <span
      className={[
        'absolute inset-0 flex items-center justify-center',
        dimmed ? 'opacity-50' : '',
      ].join(' ')}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      <span className="absolute inset-[14%] rounded-full bg-white/95" />
      <img
        src={petIdleSrc(icon)}
        alt=""
        className="relative z-[1] h-[78%] w-[78%] rounded-full object-cover"
        draggable={false}
      />
    </span>
  )
}

/** Vivid hit marker — reads clearly on ship cats without washing them out. */
function HitX() {
  return (
    <span
      className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center"
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[88%] w-[88%] drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
      >
        <path
          d="M3.5 3.5 L20.5 20.5 M20.5 3.5 L3.5 20.5"
          fill="none"
          stroke="#ff2d2d"
          strokeWidth="4.25"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

function FleetVitalsBar({
  label,
  vitals,
}: {
  label: string
  vitals: BoardVitals
}) {
  const pct = Math.round(vitals.hp * 100)
  const barColor =
    pct > 55 ? '#34d399' : pct > 25 ? '#fbbf24' : '#f87171'
  return (
    <div className="w-full max-w-[17rem]">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold text-white/85">{label}</span>
        <span className="text-[10px] tabular-nums text-muted">
          {vitals.shipsLeft}/{vitals.shipsTotal} ships · {pct}%
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} hull ${pct} percent`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}

/** Your fixed mascot (Joseph=cat-2, Struggle=cat-4) cheers your shots. */
function CattleshipCoach({
  species,
  quote,
  quoteKey,
}: {
  species: string
  quote: PetQuoteResult | null
  quoteKey: number
}) {
  const quoting = Boolean(quote)
  const face = usePetFace({
    species,
    mood: quote?.mood ?? 'happy',
    eyes: quote?.eyes,
    mouth: quote?.mouth,
    effect: quote?.effect,
    speech: quoting,
    blink: !quoting,
  })
  const [speakFrame, setSpeakFrame] = useState(0)
  const [mouthSpeaking, setMouthSpeaking] = useState(false)
  const canAnimateSpeak = face.canSpeak && quote?.speech !== 'hold'

  useEffect(() => {
    setSpeakFrame(0)
    if (!quoting || !canAnimateSpeak || !quote) {
      setMouthSpeaking(false)
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMouthSpeaking(false)
      return
    }
    setMouthSpeaking(true)
    const stop = window.setTimeout(() => {
      setMouthSpeaking(false)
      setSpeakFrame(0)
    }, speakDurationMs(quote.text, COACH_QUOTE_MS))
    return () => window.clearTimeout(stop)
  }, [quoting, canAnimateSpeak, quote, quoteKey])

  useEffect(() => {
    if (!mouthSpeaking || face.speaking.length <= 1) return
    const id = window.setInterval(() => {
      setSpeakFrame((f) => (f + 1) % face.speaking.length)
    }, SPEAK_FRAME_MS)
    return () => window.clearInterval(id)
  }, [mouthSpeaking, face.speaking.length, quoteKey])

  const frame =
    mouthSpeaking && face.speaking.length > 0
      ? (face.speaking[speakFrame % face.speaking.length] ?? face.idle)
      : face.idle

  return (
    <div className="relative mx-auto flex w-[5.5rem] flex-col items-center sm:w-[6.5rem]">
      {quote ? (
        <div
          key={quoteKey}
          className="pet-care-quote pointer-events-none absolute bottom-[calc(100%+4px)] left-1/2 z-[2] w-max max-w-[11rem] -translate-x-1/2 rounded-full border border-border bg-surface px-2.5 py-1 text-center text-[11px] font-medium leading-snug text-muted shadow-lg"
        >
          {quote.text}
        </div>
      ) : null}
      <PetSprite
        frame={frame}
        alt="Your cattleship coach"
        className="pet-care-sprite pet-care-happy relative aspect-square w-full drop-shadow-lg"
      />
    </div>
  )
}

export function CatBattleship({ onClose }: { onClose: () => void }) {
  const { game, ready, uid, actorUid, canShoot, commitGame, resetGame } =
    useSharedBattleship()

  const [horizontal, setHorizontal] = useState(true)
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [coachQuote, setCoachQuote] = useState<PetQuoteResult | null>(null)
  const [coachQuoteKey, setCoachQuoteKey] = useState(0)
  const [newGameOpen, setNewGameOpen] = useState(false)
  const [placeAsUid, setPlaceAsUid] = useState<string>(JENGA_PLAYER_UIDS[0]!)
  const lastCoachLineRef = useRef<string | undefined>(undefined)
  const idleFirstRef = useRef(true)

  useEffect(() => {
    setPlaceAsUid(game.hotseat ? JENGA_PLAYER_UIDS[0]! : uid)
  }, [game.roundId, game.hotseat, uid])

  // After locking one fleet in hotseat, switch to the other seat if needed.
  useEffect(() => {
    if (!game.hotseat || game.status !== 'placing') return
    const board = game.boards[placeAsUid]
    if (!board?.ready) return
    const other = nextTurnUid(placeAsUid)
    if (!game.boards[other]?.ready) setPlaceAsUid(other)
  }, [game.hotseat, game.status, game.boards, placeAsUid])

  const seatUid =
    game.status === 'placing'
      ? game.hotseat
        ? placeAsUid
        : uid
      : actorUid
  const myPet = cattleshipPetForUid(seatUid)
  const opponentUid =
    JENGA_PLAYER_UIDS.find((id) => id === seatUid) !== undefined
      ? nextTurnUid(seatUid)
      : JENGA_PLAYER_UIDS[1]!
  const theirPet = cattleshipPetForUid(opponentUid)
  const myBoard = game.boards[seatUid]
  const theirBoard = game.boards[opponentUid]
  const placeSeatLabel =
    seatUid === JENGA_PLAYER_UIDS[0] ? 'P1' : 'P2'

  const placedIds = useMemo(
    () => new Set((myBoard?.ships ?? []).map((s) => s.id)),
    [myBoard?.ships],
  )

  // Keep selection on an unplaced ship (or whatever the player picked up).
  useEffect(() => {
    if (selectedId && !placedIds.has(selectedId)) return
    const next = BS_FLEET.find((d) => !placedIds.has(d.id))
    setSelectedId(next?.id ?? null)
  }, [placedIds, selectedId, game.roundId])

  useEffect(() => {
    setHover(null)
    setCoachQuote(null)
    idleFirstRef.current = true
  }, [game.roundId])

  useEffect(() => {
    if (game.status !== 'placing' || myBoard?.ready) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'r' && e.key !== 'R') return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      setHorizontal((h) => !h)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [game.status, myBoard?.ready])

  const selectedDef =
    selectedId !== null
      ? (BS_FLEET.find((d) => d.id === selectedId) ?? null)
      : null
  const canPlaceSelected =
    Boolean(selectedDef) && !placedIds.has(selectedDef!.id)

  useEffect(() => {
    if (!coachQuote) return
    const clear = window.setTimeout(() => setCoachQuote(null), COACH_QUOTE_MS)
    return () => window.clearTimeout(clear)
  }, [coachQuote, coachQuoteKey])

  // Random idle chatter while waiting between shots (duel phase only).
  useEffect(() => {
    if (coachQuote || !ready || game.status !== 'playing') return
    const first = idleFirstRef.current
    idleFirstRef.current = false
    const gap = first
      ? COACH_IDLE_FIRST_MS
      : COACH_IDLE_GAP_MIN_MS +
        Math.random() * (COACH_IDLE_GAP_MAX_MS - COACH_IDLE_GAP_MIN_MS)
    const id = window.setTimeout(() => {
      const line = cattleshipIdleQuote(lastCoachLineRef.current)
      lastCoachLineRef.current = line.text
      setCoachQuote(line)
      setCoachQuoteKey((k) => k + 1)
    }, gap)
    return () => window.clearTimeout(id)
  }, [coachQuote, ready, game.status, game.roundId])

  const reactToShot = (kind: CattleshipShotKind) => {
    const line = cattleshipShotQuote(kind, lastCoachLineRef.current)
    lastCoachLineRef.current = line.text
    setCoachQuote(line)
    setCoachQuoteKey((k) => k + 1)
  }

  const statusLabel = (() => {
    if (!ready) return 'Syncing…'
    if (game.status === 'won') {
      if (game.hotseat) {
        return game.winnerUid === JENGA_PLAYER_UIDS[0] ? 'P1 wins!' : 'P2 wins!'
      }
      return game.winnerUid === uid ? 'You win!' : 'Opponent wins'
    }
    if (game.status === 'placing') {
      if (game.hotseat) {
        if (myBoard?.ready) return `${placeSeatLabel} locked — switch seats`
        if (!canPlaceSelected)
          return `${placeSeatLabel} fleet set — lock in when ready`
        return `${placeSeatLabel}: place ${selectedDef!.name}`
      }
      if (myBoard?.ready) return 'Waiting for opponent to lock in…'
      if (!canPlaceSelected) return 'Fleet set — lock in when ready'
      return `Place ${selectedDef!.name} · tap a ship to pick up`
    }
    if (canShoot) {
      if (game.hotseat) {
        const seat = actorUid === JENGA_PLAYER_UIDS[0] ? 'P1' : 'P2'
        return `${seat} — your shot`
      }
      return 'Your shot'
    }
    return 'Opponent shooting…'
  })()

  const draftPreview = useMemo(() => {
    if (!canPlaceSelected || !selectedDef || !hover || !myBoard || myBoard.ready)
      return null
    const draft: BsShip = {
      id: selectedDef.id,
      x: hover.x,
      y: hover.y,
      horizontal,
      length: selectedDef.length,
    }
    const fits = shipFits(myBoard.ships, draft)
    return { cells: shipCells(draft), fits, shipId: selectedDef.id }
  }, [canPlaceSelected, selectedDef, hover, myBoard, horizontal])

  const onOwnCell = (x: number, y: number) => {
    if (!myBoard || myBoard.ready) return
    const existing = shipAtCell(myBoard.ships, x, y)
    if (existing) {
      void commitGame(
        (prev) => removeShip(prev, seatUid, existing.id) ?? prev,
      )
      setSelectedId(existing.id)
      return
    }
    if (!canPlaceSelected || !selectedDef) return
    const ship: BsShip = {
      id: selectedDef.id,
      x,
      y,
      horizontal,
      length: selectedDef.length,
    }
    void commitGame((prev) => placeShip(prev, seatUid, ship) ?? prev)
  }

  const toggleReady = () => {
    if (!myBoard) return
    const next = !myBoard.ready
    void commitGame((prev) => setPlayerReady(prev, seatUid, next) ?? prev)
  }

  const shoot = (x: number, y: number) => {
    if (!canShoot) return
    void commitGame((prev) => {
      const next = applyBattleshipShot(prev, actorUid, x, y)
      if (!next) return prev
      const kind = classifyBattleshipShot(prev, next, actorUid, x, y)
      if (kind) queueMicrotask(() => reactToShot(kind))
      return next
    })
  }

  const ownCellClass = (x: number, y: number) => {
    const ship = myBoard ? shipAtCell(myBoard.ships, x, y) : null
    const mark = myBoard?.received[cellIndex(x, y)] ?? null
    const inPreview = draftPreview?.cells.some((c) => c.x === x && c.y === y)
    if (inPreview) {
      return draftPreview!.fits
        ? 'bg-emerald-500/20 border-emerald-400/40'
        : 'bg-rose-500/25 border-rose-400/40'
    }
    if (mark === 'miss') return 'bg-slate-600/60'
    if (ship) return 'border-white/20'
    return 'bg-[#152033]'
  }

  const ownCellContent = (x: number, y: number): ReactNode => {
    const ship = myBoard ? shipAtCell(myBoard.ships, x, y) : null
    const mark = myBoard?.received[cellIndex(x, y)] ?? null
    const inPreview = draftPreview?.cells.some((c) => c.x === x && c.y === y)

    if (inPreview && draftPreview) {
      const icon = game.shipCats[draftPreview.shipId]
      if (!icon) return null
      const theme = themeForCatIcon(icon)
      return (
        <CatTile
          icon={theme.icon}
          color={theme.color}
          dimmed={!draftPreview.fits}
        />
      )
    }

    if (ship) {
      const icon = game.shipCats[ship.id]
      if (!icon) return null
      const theme = themeForCatIcon(icon)
      return (
        <>
          <CatTile icon={theme.icon} color={theme.color} />
          {mark === 'hit' ? <HitX /> : null}
        </>
      )
    }
    if (mark === 'hit') return <HitX />
    return null
  }

  const enemyCellClass = (x: number, y: number) => {
    const mark = theirBoard?.received[cellIndex(x, y)] ?? null
    if (mark === 'miss') return 'bg-slate-600/55'
    return 'bg-[#152033]'
  }

  const enemyCellContent = (x: number, y: number): ReactNode => {
    const mark = theirBoard?.received[cellIndex(x, y)] ?? null
    if (mark === 'hit') return <HitX />
    return null
  }

  return (
    <ArcadeStage
      title="Cattleship"
      onClose={onClose}
      meta={<ArcadeStatus>{statusLabel}</ArcadeStatus>}
    >
      {({ immersive }) => (
        <div
          className={
            immersive ? 'flex min-h-0 flex-1 flex-col' : undefined
          }
        >
          {immersive ? null : (
            <div className="mt-2 rounded-xl border border-border bg-surface/60 px-3.5 py-3">
              <p className="text-[11px] leading-relaxed text-muted">
                Place your cat fleet — tap a placed ship to pick it up and move
                it. Each ship is a different cat; lock in when you&apos;re set.
              </p>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ['Place', 'tap empty · R to rotate'],
                    ['Move', 'tap a ship to pick up'],
                    ['Lock In', 'both players to start'],
                    ['Fire', 'tap enemy waters'],
                  ] as const
                ).map(([label, hint]) => (
                  <div
                    key={label}
                    className="flex items-baseline gap-2 text-[11px] leading-snug"
                  >
                    <span className="shrink-0 font-semibold text-white/85">
                      {label}
                    </span>
                    <span className="text-muted">{hint}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <img
                src={petIdleSrc(myPet)}
                alt=""
                className="h-7 w-7 rounded-full object-cover ring-2 ring-white/20"
              />
              <span className="text-[11px] text-muted">vs</span>
              <img
                src={petIdleSrc(theirPet)}
                alt=""
                className="h-7 w-7 rounded-full object-cover ring-2 ring-white/20"
              />
              {game.hotseat ? (
                <span className="rounded-md border border-amber-400/35 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-100">
                  Debug hotseat
                </span>
              ) : null}
              {game.hotseat && game.status === 'placing' ? (
                <div className="flex items-center gap-1">
                  {([0, 1] as const).map((seat) => {
                    const seatId = JENGA_PLAYER_UIDS[seat]!
                    const active = placeAsUid === seatId
                    const locked = Boolean(game.boards[seatId]?.ready)
                    return (
                      <button
                        key={seatId}
                        type="button"
                        onClick={() => setPlaceAsUid(seatId)}
                        className={[
                          'rounded-md border px-2 py-0.5 text-[10px] font-medium transition',
                          active
                            ? 'border-golden/50 bg-golden/15 text-golden'
                            : 'border-border bg-surface/60 text-muted hover:text-white',
                        ].join(' ')}
                      >
                        {seat === 0 ? 'P1' : 'P2'}
                        {locked ? ' ✓' : ''}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setNewGameOpen(true)}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-white hover:border-muted"
            >
              New game
            </button>
          </div>

          <NewGameConfirm
            open={newGameOpen}
            onClose={() => setNewGameOpen(false)}
            onConfirm={(opts) => void resetGame(opts)}
            blurb="Clears both fleets and starts a new round."
          />

          {game.status === 'placing' ? (
            <div
              className={[
                'mt-3 flex flex-col items-center gap-2',
                immersive ? 'min-h-0 flex-1' : 'gap-3',
              ].join(' ')}
            >
              <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={Boolean(myBoard?.ready) || !canPlaceSelected}
                  onClick={() => setHorizontal((h) => !h)}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-white hover:border-muted disabled:opacity-40"
                >
                  Rotate
                </button>
                <button
                  type="button"
                  disabled={
                    !myBoard ||
                    (!myBoard.ready && !isFleetComplete(myBoard.ships))
                  }
                  onClick={toggleReady}
                  className={[
                    'rounded-lg border px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-35',
                    myBoard?.ready
                      ? 'border-emerald-400/60 bg-emerald-500/30 text-emerald-50 ring-1 ring-emerald-300/40'
                      : 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25',
                  ].join(' ')}
                >
                  Lock In
                </button>
              </div>
              <div
                className={[
                  'grid grid-cols-3 gap-1.5',
                  immersive ? 'w-full max-w-lg shrink-0' : 'w-full max-w-md',
                ].join(' ')}
              >
                {BS_FLEET.map((d) => {
                  const icon = game.shipCats[d.id]
                  const theme = icon ? themeForCatIcon(icon) : null
                  const placed = placedIds.has(d.id)
                  const selected = selectedId === d.id
                  return (
                    <button
                      key={d.id}
                      type="button"
                      disabled={Boolean(myBoard?.ready)}
                      onClick={() => {
                        if (placed && myBoard) {
                          void commitGame(
                            (prev) =>
                              removeShip(prev, seatUid, d.id) ?? prev,
                          )
                        }
                        setSelectedId(d.id)
                      }}
                      className={[
                        'flex items-center gap-1.5 rounded-lg border px-1.5 py-1.5 text-left transition',
                        selected
                          ? 'border-golden/50 bg-golden/10'
                          : placed
                            ? 'border-emerald-400/30 bg-emerald-500/10'
                            : 'border-border bg-surface/60',
                        myBoard?.ready ? 'opacity-50' : 'hover:border-muted',
                      ].join(' ')}
                      title={
                        placed
                          ? `Pick up ${d.name}`
                          : `Select ${d.name} to place`
                      }
                    >
                      {theme ? (
                        <span
                          className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: theme.color }}
                        >
                          <span className="absolute inset-[15%] rounded-full bg-white/95" />
                          <img
                            src={petIdleSrc(theme.icon)}
                            alt=""
                            className="relative z-[1] h-[70%] w-[70%] rounded-full object-cover"
                            draggable={false}
                          />
                        </span>
                      ) : null}
                      <span className="text-[10px] leading-tight text-white/90">
                        {d.name}
                        <span className="block text-muted">
                          {d.length} · {placed ? 'tap to move' : 'place'}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
              <div
                className={[
                  'flex min-h-0 w-full items-center justify-center',
                  immersive ? 'flex-1' : '',
                ].join(' ')}
              >
                <div
                  className={
                    immersive
                      ? 'aspect-square h-full max-h-full w-auto max-w-full'
                      : undefined
                  }
                >
                  <GridBoard
                    label={
                      game.hotseat
                        ? `${placeSeatLabel} fleet placement`
                        : 'Your fleet placement'
                    }
                    disabled={Boolean(myBoard?.ready)}
                    onHover={(cell) => setHover(cell)}
                    onCell={onOwnCell}
                    cellClass={ownCellClass}
                    cellContent={ownCellContent}
                    fill={immersive}
                  />
                </div>
              </div>
              <p className="shrink-0 text-[11px] text-muted">
                {game.hotseat ? 'Other seat' : 'Opponent'}:{' '}
                {theirBoard?.ready ? 'locked in' : 'still placing…'}
              </p>
            </div>
          ) : (
            <div
              className={[
                'mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:gap-4',
                immersive
                  ? 'min-h-0 flex-1 items-stretch'
                  : '',
              ].join(' ')}
            >
              <div
                className={[
                  'flex min-h-0 flex-col items-center gap-2',
                  immersive ? 'h-full' : '',
                ].join(' ')}
              >
                <div className="w-full max-w-[min(100%,17rem)] shrink-0 sm:max-w-none">
                  <FleetVitalsBar
                    label={
                      game.hotseat
                        ? `${actorUid === JENGA_PLAYER_UIDS[0] ? 'P1' : 'P2'} waters`
                        : 'Your waters'
                    }
                    vitals={boardVitals(myBoard)}
                  />
                </div>
                <div
                  className={[
                    'flex min-h-0 w-full items-center justify-center',
                    immersive ? 'flex-1' : '',
                  ].join(' ')}
                >
                  <div
                    className={
                      immersive
                        ? 'aspect-square h-full max-h-full w-auto max-w-full'
                        : undefined
                    }
                  >
                    <GridBoard
                      label={
                        game.hotseat
                          ? `${actorUid === JENGA_PLAYER_UIDS[0] ? 'P1' : 'P2'} waters`
                          : 'Your waters'
                      }
                      disabled
                      cellClass={ownCellClass}
                      cellContent={ownCellContent}
                      fill={immersive}
                    />
                  </div>
                </div>
              </div>
              <div className="order-first flex shrink-0 items-center justify-center self-center sm:order-none">
                <CattleshipCoach
                  species={myPet}
                  quote={coachQuote}
                  quoteKey={coachQuoteKey}
                />
              </div>
              <div
                className={[
                  'flex min-h-0 flex-col items-center gap-2',
                  immersive ? 'h-full' : '',
                ].join(' ')}
              >
                <div className="w-full max-w-[min(100%,17rem)] shrink-0 sm:max-w-none">
                  <FleetVitalsBar
                    label={
                      game.hotseat
                        ? `${opponentUid === JENGA_PLAYER_UIDS[0] ? 'P1' : 'P2'} waters`
                        : 'Enemy waters'
                    }
                    vitals={boardVitals(theirBoard)}
                  />
                </div>
                <div
                  className={[
                    'flex min-h-0 w-full items-center justify-center',
                    immersive ? 'flex-1' : '',
                  ].join(' ')}
                >
                  <div
                    className={
                      immersive
                        ? 'aspect-square h-full max-h-full w-auto max-w-full'
                        : undefined
                    }
                  >
                    <GridBoard
                      label={
                        game.hotseat
                          ? `${opponentUid === JENGA_PLAYER_UIDS[0] ? 'P1' : 'P2'} waters`
                          : 'Enemy waters'
                      }
                      disabled={!canShoot}
                      onCell={shoot}
                      cellClass={enemyCellClass}
                      cellContent={enemyCellContent}
                      fill={immersive}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </ArcadeStage>
  )
}
