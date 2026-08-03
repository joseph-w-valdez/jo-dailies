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
import { cattleshipShotQuote, type PetQuoteResult } from '../lib/petQuotes'
import { speakDurationMs, SPEAK_FRAME_MS } from '../lib/petSpeak'
import { ArcadeStage } from './ArcadeStage'
import { PetSprite } from './PetSprite'

const COACH_QUOTE_MS = 3_800

function GridBoard({
  size = BS_SIZE,
  cellClass,
  cellStyle,
  cellContent,
  onCell,
  onHover,
  disabled,
  label,
}: {
  size?: number
  cellClass: (x: number, y: number) => string
  cellStyle?: (x: number, y: number) => CSSProperties | undefined
  cellContent?: (x: number, y: number) => ReactNode
  onCell?: (x: number, y: number) => void
  onHover?: (cell: { x: number; y: number } | null) => void
  disabled?: boolean
  label: string
}) {
  return (
    <div
      className="inline-grid gap-0.5 rounded-xl border border-border bg-surface/80 p-1.5"
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
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
              'relative aspect-square min-h-[1.35rem] min-w-[1.35rem] overflow-hidden rounded-sm border border-black/20 p-0 sm:min-h-[1.55rem] sm:min-w-[1.55rem]',
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
    <div className="relative mx-auto flex w-[5.5rem] flex-col items-center">
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
        className="relative aspect-square w-full drop-shadow-lg"
      />
    </div>
  )
}

export function CatBattleship({ onClose }: { onClose: () => void }) {
  const { game, ready, uid, canShoot, commitGame, resetGame } =
    useSharedBattleship()

  const [horizontal, setHorizontal] = useState(true)
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [coachQuote, setCoachQuote] = useState<PetQuoteResult | null>(null)
  const [coachQuoteKey, setCoachQuoteKey] = useState(0)
  const lastCoachLineRef = useRef<string | undefined>(undefined)

  const myPet = cattleshipPetForUid(uid)
  const opponentUid =
    JENGA_PLAYER_UIDS.find((id) => id === uid) !== undefined
      ? nextTurnUid(uid)
      : JENGA_PLAYER_UIDS[1]!
  const theirPet = cattleshipPetForUid(opponentUid)
  const myBoard = game.boards[uid]
  const theirBoard = game.boards[opponentUid]

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

  const reactToShot = (kind: CattleshipShotKind) => {
    const line = cattleshipShotQuote(kind, lastCoachLineRef.current)
    lastCoachLineRef.current = line.text
    setCoachQuote(line)
    setCoachQuoteKey((k) => k + 1)
  }

  const statusLabel = (() => {
    if (!ready) return 'Syncing…'
    if (game.status === 'won') {
      return game.winnerUid === uid ? 'You win!' : 'Opponent wins'
    }
    if (game.status === 'placing') {
      if (myBoard?.ready) return 'Waiting for opponent to lock in…'
      if (!canPlaceSelected) return 'Fleet set — lock in when ready'
      return `Place ${selectedDef!.name} · tap a ship to pick up`
    }
    if (canShoot) return 'Your shot'
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
      void commitGame((prev) => removeShip(prev, uid, existing.id) ?? prev)
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
    void commitGame((prev) => placeShip(prev, uid, ship) ?? prev)
  }

  const toggleReady = () => {
    if (!myBoard) return
    const next = !myBoard.ready
    void commitGame((prev) => setPlayerReady(prev, uid, next) ?? prev)
  }

  const shoot = (x: number, y: number) => {
    if (!canShoot) return
    void commitGame((prev) => {
      const next = applyBattleshipShot(prev, uid, x, y)
      if (!next) return prev
      const kind = classifyBattleshipShot(prev, next, uid, x, y)
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
    if (mark === 'hit') return 'bg-rose-500/50'
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
          {mark === 'hit' ? (
            <span className="absolute inset-0 z-[2] bg-rose-500/45" />
          ) : null}
        </>
      )
    }
    return null
  }

  const enemyCellClass = (x: number, y: number) => {
    const mark = theirBoard?.received[cellIndex(x, y)] ?? null
    if (mark === 'hit') return 'bg-rose-500/55'
    if (mark === 'miss') return 'bg-slate-600/55'
    return 'bg-[#152033]'
  }

  return (
    <ArcadeStage
      title="Cattleship"
      onClose={onClose}
      meta={<p className="text-sm font-medium text-golden">{statusLabel}</p>}
    >
      {({ immersive }) => (
        <>
          {immersive ? null : (
            <div className="mt-2 rounded-xl border border-white/10 bg-black/25 px-3.5 py-3">
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

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
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
            </div>
            <button
              type="button"
              onClick={() => void resetGame()}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-white hover:border-white/30"
            >
              New game
            </button>
          </div>

          {game.status === 'placing' ? (
            <div
              className={[
                'mt-3 flex flex-col items-center gap-3',
                immersive ? 'min-h-0 flex-1 justify-center' : '',
              ].join(' ')}
            >
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={Boolean(myBoard?.ready) || !canPlaceSelected}
                  onClick={() => setHorizontal((h) => !h)}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-white hover:border-white/30 disabled:opacity-40"
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
              <div className="grid w-full max-w-md grid-cols-3 gap-1.5">
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
                            (prev) => removeShip(prev, uid, d.id) ?? prev,
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
                        myBoard?.ready ? 'opacity-50' : 'hover:border-white/30',
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
              <GridBoard
                  label="Your fleet placement"
                  disabled={Boolean(myBoard?.ready)}
                  onHover={(cell) => setHover(cell)}
                  onCell={onOwnCell}
                  cellClass={ownCellClass}
                  cellContent={ownCellContent}
                />
              <p className="text-[11px] text-muted">
                Opponent:{' '}
                {theirBoard?.ready ? 'locked in' : 'still placing…'}
              </p>
            </div>
          ) : (
            <div
              className={[
                'mt-3 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr]',
                immersive ? 'min-h-0 flex-1 content-center' : '',
              ].join(' ')}
            >
              <div className="flex flex-col items-center gap-2">
                <FleetVitalsBar
                  label="Your waters"
                  vitals={boardVitals(myBoard)}
                />
                <GridBoard
                  label="Your waters"
                  disabled
                  cellClass={ownCellClass}
                  cellContent={ownCellContent}
                />
              </div>
              <div className="order-first flex items-end justify-center self-center pb-1 sm:order-none sm:pb-2">
                <CattleshipCoach
                  species={myPet}
                  quote={coachQuote}
                  quoteKey={coachQuoteKey}
                />
              </div>
              <div className="flex flex-col items-center gap-2">
                <FleetVitalsBar
                  label="Enemy waters"
                  vitals={boardVitals(theirBoard)}
                />
                <GridBoard
                  label="Enemy waters"
                  disabled={!canShoot}
                  onCell={shoot}
                  cellClass={enemyCellClass}
                />
              </div>
            </div>
          )}
        </>
      )}
    </ArcadeStage>
  )
}
