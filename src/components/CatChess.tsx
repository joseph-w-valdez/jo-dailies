import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { useSharedChess } from '../hooks/useSharedChess'
import { useSharedTheme } from '../hooks/useSharedTheme'
import {
  applyChessMove,
  applyChessPromo,
  CHESS_KIND_ICON,
  CHESS_SPRITE_FILES,
  chessIndex,
  chessPieceSrc,
  chessSpriteUrlsForTheme,
  colorForUid,
  indexToAlg,
  isPromoDest,
  kingIndex,
  legalDests,
  themeForCatIcon,
  uidForColor,
  undoChessMove,
  flagChessOnTime,
  selectChessClockMode,
  selectChessWhite,
  surrenderChess,
  type ChessKind,
  type ChessMoveLogEntry,
  type ChessPiece,
} from '../lib/chess'
import { CHESS_CLOCK_PRESETS, liveClockMs } from '../lib/gameClock'
import { petIdleSrc } from '../lib/petAssets'
import { pickChessQuote } from '../lib/chessQuotes'
import { ArcadeStage, ArcadeStatus } from './ArcadeStage'
import { ConfirmDialog } from './ConfirmDialog'
import {
  GameClockReadout,
  GameClockSetupPicker,
  useClockNow,
} from './GameClockModePicker'
import { GameSeatPicker } from './GameSeatPicker'
import { NewGameConfirm } from './NewGameConfirm'
import { SurrenderButton } from './SurrenderButton'

const PROMO_KINDS: ChessKind[] = ['q', 'r', 'b', 'n']
const QUOTE_SHOW_MS = 3_800
const QUOTE_GAP_MS = 900
const ILLEGAL_TOAST_MS = 1_200

function ChessQuoteBubble({ text, quoteKey }: { text: string; quoteKey: number }) {
  return (
    <span
      key={quoteKey}
      className="chess-piece-quote pointer-events-none absolute bottom-[118%] left-1/2 z-20 w-max max-w-[14rem] -translate-x-1/2 rounded-full border border-border bg-surface px-2.5 py-1 text-center text-[10px] font-medium leading-snug text-muted shadow-lg"
    >
      {text}
    </span>
  )
}

function useChessSpriteFiles(): ReadonlySet<string> {
  const [files, setFiles] = useState<ReadonlySet<string>>(CHESS_SPRITE_FILES)
  useEffect(() => {
    let cancelled = false
    void fetch('/chess/manifest.json')
      .then((r) => {
        const ct = r.headers.get('content-type') ?? ''
        if (!r.ok || !ct.includes('application/json')) return null
        return r.json() as Promise<unknown>
      })
      .then((list) => {
        if (cancelled || !Array.isArray(list) || list.length === 0) return
        const next = list.filter((item): item is string => typeof item === 'string')
        if (next.length === 0) return
        setFiles(new Set(next))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  return files
}

function ChessPieceView({
  piece,
  size,
  theme,
  sprites,
}: {
  piece: ChessPiece
  size: 'sm' | 'fill'
  theme: string
  sprites: ReadonlySet<string>
}) {
  const src =
    chessPieceSrc(piece.color, piece.kind, theme, sprites) ??
    petIdleSrc(CHESS_KIND_ICON[piece.kind])
  const dim =
    size === 'sm' ? 'h-7 w-7' : 'h-full w-full origin-center scale-[0.99]'
  return (
    <img
      src={src}
      alt=""
      decoding="async"
      className={`${dim} block object-contain`}
      draggable={false}
      aria-hidden
    />
  )
}

function storedIndex(
  visualRow: number,
  visualCol: number,
  flipped: boolean,
): number {
  const row = flipped ? 7 - visualRow : visualRow
  const col = flipped ? 7 - visualCol : visualCol
  return chessIndex(row, col)
}

const DRAG_THRESHOLD = 8

function squareAtPoint(
  board: HTMLElement,
  clientX: number,
  clientY: number,
  flipped: boolean,
): number | null {
  const rect = board.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  const x = (clientX - rect.left) / rect.width
  const y = (clientY - rect.top) / rect.height
  if (x < 0 || x >= 1 || y < 0 || y >= 1) return null
  return storedIndex(Math.floor(y * 8), Math.floor(x * 8), flipped)
}

function chessSeatLabel(
  color: 'white' | 'black',
  viewerUid: string,
  hotseat: boolean,
  whiteUid: string | null,
): string {
  if (hotseat) return color === 'white' ? 'P1' : 'P2'
  if (uidForColor(color, whiteUid) === viewerUid) return 'You'
  return color === 'white' ? 'White' : 'Black'
}

function ChessMoveLog({
  log,
  uid,
  hotseat,
  whiteUid,
}: {
  log: ChessMoveLogEntry[]
  uid: string
  hotseat: boolean
  whiteUid: string | null
}) {
  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface/70">
      <p className="shrink-0 px-3 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
        Moves
      </p>
      <div className="relative mt-2 min-h-0 flex-1">
        <ul className="jo-scroll absolute inset-0 space-y-1.5 overflow-y-auto overscroll-contain px-3 pb-2">
          {log.length === 0 ? (
            <li className="text-[11px] text-muted">No moves yet</li>
          ) : (
            [...log].reverse().map((entry, i) =>
              entry.kind === 'newGame' ? (
                <li
                  key={`${entry.at}-newGame-${i}`}
                  className="rounded-lg border border-dashed border-border bg-surface px-2.5 py-2"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    New game
                  </p>
                </li>
              ) : (
                <li
                  key={`${entry.at}-${entry.uid}-${i}`}
                  className="rounded-lg border border-border bg-surface px-2.5 py-2"
                >
                  <p className="text-[10px] font-medium text-muted">
                    {chessSeatLabel(entry.color, uid, hotseat, whiteUid)}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium leading-snug text-white">
                    {entry.san}
                  </p>
                </li>
              ),
            )
          )}
        </ul>
      </div>
    </aside>
  )
}

export function CatChess({ onClose }: { onClose: () => void }) {
  const { game, ready, uid, actorUid, canPlay, canUndo, commitGame, resetGame } =
    useSharedChess()
  const { theme: roomTheme } = useSharedTheme()
  const sprites = useChessSpriteFiles()
  const boardRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    from: number
    pointerId: number
    startX: number
    startY: number
    lastX: number
    lastY: number
    dragging: boolean
    alreadySelected: boolean
    piece: ChessPiece
  } | null>(null)
  const suppressClickRef = useRef(false)
  const ghostRef = useRef<HTMLDivElement>(null)
  const illegalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [draggingFrom, setDraggingFrom] = useState<number | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [promoPick, setPromoPick] = useState<{
    from: number
    to: number
  } | null>(null)
  const [newGameOpen, setNewGameOpen] = useState(false)
  const [undoOpen, setUndoOpen] = useState(false)
  const [boardShake, setBoardShake] = useState(false)
  const [illegalToast, setIllegalToast] = useState(false)
  const [activeQuote, setActiveQuote] = useState<string | null>(null)
  const [quoteKey, setQuoteKey] = useState(0)
  const quoteRef = useRef<string | null>(null)

  useEffect(() => {
    setSelected(null)
    setPromoPick(null)
    setDraggingFrom(null)
    setHoverIndex(null)
    setUndoOpen(false)
    dragRef.current = null
  }, [game.roundId])

  useEffect(() => {
    return () => {
      if (illegalTimerRef.current) clearTimeout(illegalTimerRef.current)
    }
  }, [])
  useEffect(() => {
    for (const url of chessSpriteUrlsForTheme(roomTheme, sprites)) {
      const img = new Image()
      img.src = url
    }
  }, [roomTheme, sprites])

  useEffect(() => {
    const drag = dragRef.current
    if (draggingFrom === null || !drag) return
    placeGhost(drag.lastX, drag.lastY)
  }, [draggingFrom])

  useEffect(() => {
    if (selected === null || promoPick || game.pendingPromo) return
    const onDocPointerDown = (event: Event) => {
      if (dragRef.current) return
      const target = event.target
      if (!(target instanceof Node)) return
      if (boardRef.current?.contains(target)) return
      setSelected(null)
    }
    document.addEventListener('pointerdown', onDocPointerDown, true)
    return () =>
      document.removeEventListener('pointerdown', onDocPointerDown, true)
  }, [selected, promoPick, game.pendingPromo])

  useEffect(() => {
    if (selected === null) {
      quoteRef.current = null
      setActiveQuote(null)
      return
    }
    const piece = game.board[selected]
    if (!piece) {
      quoteRef.current = null
      setActiveQuote(null)
      return
    }
    const { color, kind } = piece
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const speak = () => {
      if (cancelled) return
      const next = pickChessQuote(color, kind, quoteRef.current)
      quoteRef.current = next
      setActiveQuote(next)
      setQuoteKey((k) => k + 1)
      timer = setTimeout(speak, QUOTE_SHOW_MS + QUOTE_GAP_MS)
    }
    speak()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
    // Restart when the selected square/piece identity changes, not every board sync.
  }, [selected, game.board[selected ?? -1]?.color, game.board[selected ?? -1]?.kind, game.roundId])

  const actorColor = colorForUid(actorUid, game.whiteUid)
  const myColor = colorForUid(uid, game.whiteUid)
  const flipped = actorColor === 'black'
  const dests = useMemo(
    () => (selected !== null && canPlay ? legalDests(game, selected) : []),
    [canPlay, game, selected],
  )
  const destSet = useMemo(() => new Set(dests), [dests])
  const checkKing =
    game.inCheck && game.status === 'playing'
      ? kingIndex(game.board, game.turn)
      : -1

  const clockRunning =
    game.clockMode === 'timed' && game.status === 'playing'
  const clockNow = useClockNow(clockRunning)

  useEffect(() => {
    if (!clockRunning) return
    const left = liveClockMs(
      game,
      game.turnUid,
      game.turnUid,
      true,
      clockNow,
    )
    if (left > 0) return
    void commitGame((prev) => flagChessOnTime(prev) ?? prev)
  }, [clockRunning, clockNow, game.turnUid, game.clockMs, game.clockTurnStartedAt, commitGame])

  const themes = useMemo(
    () =>
      [themeForCatIcon(game.cats[0]!), themeForCatIcon(game.cats[1]!)] as const,
    [game.cats],
  )

  const statusLabel = (() => {
    if (!ready) return 'Syncing…'
    if (game.whiteUid == null) return 'Who is White?'
    if (game.clockMode == null) return 'Sweaty or grass?'
    if (game.status === 'timeout') {
      if (game.hotseat) {
        return game.winnerUid === uidForColor('white', game.whiteUid)
          ? 'Time — P1 wins'
          : 'Time — P2 wins'
      }
      return game.winnerUid === uid ? 'Time — you win' : 'Time — opponent wins'
    }
    if (game.status === 'resign') {
      if (game.hotseat) {
        return game.winnerUid === uidForColor('white', game.whiteUid)
          ? 'Surrender — P1 wins'
          : 'Surrender — P2 wins'
      }
      return game.winnerUid === uid
        ? 'Surrender — you win'
        : 'Surrender — opponent wins'
    }
    if (game.status === 'checkmate') {
      if (game.hotseat) {
        return game.winnerUid === uidForColor('white', game.whiteUid)
          ? 'Checkmate — P1 wins'
          : 'Checkmate — P2 wins'
      }
      return game.winnerUid === uid
        ? 'Checkmate — you win'
        : 'Checkmate — opponent wins'
    }
    if (game.status === 'stalemate') return 'Stalemate'
    if (game.status === 'draw') return 'Draw'
    if (game.pendingPromo) {
      return canPlay ? 'Promote your pawn' : 'Opponent promoting…'
    }
    const side = game.turn === 'white' ? 'White' : 'Black'
    const check = game.inCheck ? ' — check' : ''
    if (canPlay) {
      if (game.hotseat) return `${side} to move${check}`
      return `Your turn${check}`
    }
    return `${side} to move${check}`
  })()

  const endBanner = (() => {
    if (game.status === 'timeout') {
      if (game.hotseat) {
        return game.winnerUid === uidForColor('white', game.whiteUid)
          ? { title: 'Time', detail: 'P1 wins' }
          : { title: 'Time', detail: 'P2 wins' }
      }
      return game.winnerUid === uid
        ? { title: 'Time', detail: 'You win' }
        : { title: 'Time', detail: 'Opponent wins' }
    }
    if (game.status === 'checkmate') {
      if (game.hotseat) {
        return game.winnerUid === uidForColor('white', game.whiteUid)
          ? { title: 'Checkmate', detail: 'P1 wins' }
          : { title: 'Checkmate', detail: 'P2 wins' }
      }
      return game.winnerUid === uid
        ? { title: 'Checkmate', detail: 'You win' }
        : { title: 'Checkmate', detail: 'Opponent wins' }
    }
    if (game.status === 'stalemate') {
      return { title: 'Stalemate', detail: 'Draw' }
    }
    if (game.status === 'draw') {
      return { title: 'Draw', detail: 'Game over' }
    }
    return null
  })()

  const flashIllegal = () => {
    setBoardShake(true)
    setIllegalToast(true)
    if (illegalTimerRef.current) clearTimeout(illegalTimerRef.current)
    illegalTimerRef.current = setTimeout(() => {
      setBoardShake(false)
      setIllegalToast(false)
      illegalTimerRef.current = null
    }, ILLEGAL_TOAST_MS)
  }

  const clickSquare = (index: number) => {
    if (!canPlay) return
    if (game.pendingPromo) return
    const piece = game.board[index]
    if (selected !== null) {
      if (tryMove(selected, index)) return
      if (index !== selected && canMovePiece(piece)) {
        setSelected(index)
        return
      }
      setSelected(null)
      return
    }
    if (canMovePiece(piece)) setSelected(index)
  }

  const canMovePiece = (piece: ChessPiece | null | undefined) => {
    if (!piece || !canPlay || game.pendingPromo) return false
    if (piece.color !== game.turn) return false
    return game.hotseat || piece.color === myColor || piece.color === actorColor
  }

  const tryMove = (from: number, to: number) => {
    if (!canPlay || game.pendingPromo || from === to) return false
    if (!legalDests(game, from).includes(to)) return false
    if (isPromoDest(game, from, to)) {
      setPromoPick({ from, to })
      setSelected(from)
      return true
    }
    void commitGame(
      (prev) => applyChessMove(prev, actorUid, from, to) ?? prev,
    )
    setSelected(null)
    return true
  }

  const placeGhost = (clientX: number, clientY: number) => {
    const ghost = ghostRef.current
    const board = boardRef.current
    if (!ghost || !board) return
    const size = board.getBoundingClientRect().width / 8
    ghost.style.width = `${size}px`
    ghost.style.height = `${size}px`
    ghost.style.left = `${clientX}px`
    ghost.style.top = `${clientY}px`
  }

  const onBoardPointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (!canPlay || game.pendingPromo) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    suppressClickRef.current = false
    const piece = game.board[index]
    if (!canMovePiece(piece) || !piece) return
    dragRef.current = {
      from: index,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      dragging: false,
      alreadySelected: selected === index,
      piece,
    }
    setSelected(index)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onBoardPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    drag.lastX = event.clientX
    drag.lastY = event.clientY
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.dragging) {
      if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return
      drag.dragging = true
      setDraggingFrom(drag.from)
    }
    placeGhost(event.clientX, event.clientY)
    const board = boardRef.current
    if (!board) return
    const over = squareAtPoint(board, event.clientX, event.clientY, flipped)
    setHoverIndex(over)
  }

  const onBoardPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    suppressClickRef.current = true
    if (drag.dragging) {
      const board = boardRef.current
      const to = board
        ? squareAtPoint(board, event.clientX, event.clientY, flipped)
        : null
      if (to !== null && to !== drag.from) {
        if (!legalDests(game, drag.from).includes(to)) flashIllegal()
        else tryMove(drag.from, to)
      }
      setDraggingFrom(null)
      setHoverIndex(null)
      return
    }
    if (drag.alreadySelected) setSelected(null)
  }

  const onBoardPointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    setDraggingFrom(null)
    setHoverIndex(null)
  }

  const confirmPromo = (kind: ChessKind) => {
    if (!promoPick) return
    void commitGame(
      (prev) =>
        applyChessMove(prev, actorUid, promoPick.from, promoPick.to, kind) ??
        prev,
    )
    setPromoPick(null)
    setSelected(null)
  }

  const finishPendingPromo = (kind: ChessKind) => {
    void commitGame((prev) => applyChessPromo(prev, actorUid, kind) ?? prev)
  }

  const promoOpen = promoPick ?? game.pendingPromo
  const promoColor = promoOpen
    ? (game.board[promoOpen.from]?.color ??
      game.board[promoOpen.to]?.color ??
      game.turn)
    : game.turn

  return (
    <ArcadeStage
      title="Chess"
      onClose={onClose}
      meta={<ArcadeStatus>{statusLabel}</ArcadeStatus>}
    >
      {({ immersive }) => (
        <div className={immersive ? 'flex min-h-0 flex-1 flex-col' : undefined}>
          {immersive ? null : (
            <div className="mt-2 rounded-xl border border-border bg-surface/60 px-3.5 py-3">
              <p className="text-[11px] leading-relaxed text-muted">
                Shared board — White (P1) vs Black (P2). Cat faces are
                placeholders until piece art lands. Castling, en passant, and
                promotion included.
              </p>
            </div>
          )}

          <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              {(['white', 'black'] as const).map((color, seat) => {
                const theme = themes[seat]!
                const isTurn = game.status === 'playing' && game.turn === color
                const label = game.hotseat
                  ? color === 'white'
                    ? 'P1'
                    : 'P2'
                  : uidForColor(color, game.whiteUid) === uid
                    ? 'You'
                    : color === 'white'
                      ? 'P1'
                      : 'P2'
                return (
                  <div
                    key={color}
                    className={[
                      'flex items-center gap-2 rounded-lg border px-2 py-1',
                      isTurn
                        ? 'border-golden/50 bg-golden/10'
                        : 'border-border bg-surface/60',
                    ].join(' ')}
                  >
                    <ChessPieceView
                      piece={{ color, kind: 'k' }}
                      size="sm"
                      theme={roomTheme}
                      sprites={sprites}
                    />
                    <span className="text-[11px] font-medium text-white/90">
                      {label}
                    </span>
                    {game.clockMode === 'timed' ? (
                      <GameClockReadout
                        ms={liveClockMs(
                          game,
                          uidForColor(color, game.whiteUid),
                          game.turnUid,
                          game.status === 'playing',
                          clockNow,
                        )}
                        active={isTurn}
                      />
                    ) : null}
                    <span
                      className="size-2.5 rounded-full ring-1 ring-white/20"
                      style={{ backgroundColor: theme.color }}
                      aria-hidden
                    />
                  </div>
                )
              })}
              {game.hotseat ? (
                <span className="rounded-md border border-amber-400/35 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-100">
                  Debug hotseat
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {canUndo && !promoPick ? (
                <button
                  type="button"
                  onClick={() => setUndoOpen(true)}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-white hover:border-muted"
                >
                  Undo
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setNewGameOpen(true)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-white hover:border-muted"
              >
                New game
              </button>
              <SurrenderButton
                disabled={
                  !uid ||
                  game.status !== 'playing' ||
                  game.whiteUid == null ||
                  game.clockMode == null
                }
                onSurrender={() =>
                  void commitGame(
                    (prev) => surrenderChess(prev, actorUid) ?? prev,
                  )
                }
              />
            </div>
          </div>

          <NewGameConfirm
            open={newGameOpen}
            onClose={() => setNewGameOpen(false)}
            onConfirm={(opts) => {
              setSelected(null)
              setPromoPick(null)
              void resetGame(opts)
            }}
            blurb="Starts a fresh chess game. You’ll pick who is White, then Sweaty or Grass."
          />

          <ConfirmDialog
            open={undoOpen}
            title="Undo last move?"
            body="Takes back the last move on the board."
            confirmLabel="Undo"
            onClose={() => setUndoOpen(false)}
            onConfirm={() => {
              setSelected(null)
              setPromoPick(null)
              void commitGame(
                (prev) => undoChessMove(prev, actorUid) ?? prev,
              )
            }}
          />
          {game.whiteUid == null ? (
            <div className="mt-6">
              <GameSeatPicker
                prompt="Who is White?"
                optionLabel={(name) => `${name} is White`}
                onPick={(seat) =>
                  void commitGame(
                    (prev) => selectChessWhite(prev, seat) ?? prev,
                  )
                }
              />
            </div>
          ) : game.clockMode == null ? (
            <div className="mt-6">
              <GameClockSetupPicker
                key={game.roundId}
                presets={CHESS_CLOCK_PRESETS}
                customPlaceholder="e.g. 1+0 or 3+2"
                onGrass={() =>
                  void commitGame(
                    (prev) => selectChessClockMode(prev, 'off') ?? prev,
                  )
                }
                onSweaty={(control) =>
                  void commitGame(
                    (prev) =>
                      selectChessClockMode(prev, 'timed', Date.now(), control) ??
                      prev,
                  )
                }
              />
            </div>
          ) : (
            <>
          <div
            className={[
              'mt-3 flex min-h-0 justify-center gap-3',
              immersive
                ? 'flex-1 items-stretch'
                : 'flex-col sm:flex-row sm:items-stretch',
            ].join(' ')}
          >
            <div
              className={[
                'relative overflow-visible rounded-2xl border border-chess-frame bg-chess-frame p-1.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.18)] sm:p-2',
                boardShake ? 'chess-board-shake' : '',
                immersive
                  ? 'aspect-square h-full max-h-full w-auto max-w-full'
                  : 'aspect-square w-[36rem] max-w-full shrink-0',
              ].join(' ')}
            >
              <div
                ref={boardRef}
                className="relative grid h-full w-full touch-none grid-cols-8 grid-rows-8 overflow-visible rounded-xl select-none"
                role="grid"
                aria-label="Chess board"
              >
                {Array.from({ length: 64 }, (_, visual) => {
                  const visualRow = Math.floor(visual / 8)
                  const visualCol = visual % 8
                  const index = storedIndex(visualRow, visualCol, flipped)
                  const piece = game.board[index]
                  const lightSq = (visualRow + visualCol) % 2 === 0
                  const isLast =
                    index === game.lastFrom || index === game.lastTo
                  const isSel = index === selected
                  const isDest = destSet.has(index)
                  const isHoverDest =
                    draggingFrom !== null && hoverIndex === index && isDest
                  const isCheck = index === checkKing
                  const movable = canMovePiece(piece)
                  const fileLabel =
                    visualRow === 7
                      ? 'abcdefgh'[flipped ? 7 - visualCol : visualCol]
                      : null
                  const rankLabel =
                    visualCol === 0
                      ? String(flipped ? visualRow + 1 : 8 - visualRow)
                      : null
                  return (
                    <button
                      key={index}
                      type="button"
                      disabled={!canPlay}
                      onPointerDown={(event) => onBoardPointerDown(event, index)}
                      onPointerMove={onBoardPointerMove}
                      onPointerUp={onBoardPointerUp}
                      onPointerCancel={onBoardPointerCancel}
                      onClick={() => {
                        if (suppressClickRef.current) {
                          suppressClickRef.current = false
                          return
                        }
                        clickSquare(index)
                      }}
                      aria-label={
                        piece
                          ? `${piece.color} ${piece.kind} on ${indexToAlg(index)}`
                          : indexToAlg(index)
                      }
                      className={[
                        'relative min-h-0 min-w-0 overflow-visible p-[2%]',
                        lightSq ? 'bg-chess-light' : 'bg-chess-dark',
                        isSel ? 'z-10 ring-2 ring-inset ring-sky-400' : '',
                        isHoverDest ? 'ring-2 ring-inset ring-emerald-400' : '',
                        isCheck ? 'ring-2 ring-inset ring-rose-500' : '',
                        isLast && !isSel && !isCheck ? 'arcade-last-move' : '',
                        canPlay ? 'hover:brightness-105' : '',
                        movable ? 'cursor-grab' : '',
                        draggingFrom !== null ? 'cursor-grabbing' : '',
                      ].join(' ')}
                    >
                      {piece ? (
                        <span className="relative block h-full w-full">
                          {isSel && activeQuote && draggingFrom !== index ? (
                            <ChessQuoteBubble
                              text={activeQuote}
                              quoteKey={quoteKey}
                            />
                          ) : null}
                          <span
                            className={[
                              'block h-full w-full',
                              draggingFrom === index ? 'opacity-0' : '',
                              isSel && draggingFrom !== index
                                ? 'chess-piece-active'
                                : '',
                            ].join(' ')}
                          >
                            <ChessPieceView
                              piece={piece}
                              size="fill"
                              theme={roomTheme}
                              sprites={sprites}
                            />
                          </span>
                        </span>
                      ) : null}
                      {isDest ? (
                        <span
                          className={[
                            'absolute z-[2] rounded-full',
                            piece
                              ? 'inset-[8%] border-2 border-emerald-600/70'
                              : 'left-1/2 top-1/2 size-[28%] -translate-x-1/2 -translate-y-1/2 bg-emerald-700/45',
                          ].join(' ')}
                          aria-hidden
                        />
                      ) : null}
                      {fileLabel ? (
                        <span
                          className={[
                            'absolute bottom-0.5 right-1 text-[8px] font-semibold',
                            lightSq ? 'text-chess-dark/50' : 'text-chess-light/60',
                          ].join(' ')}
                        >
                          {fileLabel}
                        </span>
                      ) : null}
                      {rankLabel ? (
                        <span
                          className={[
                            'absolute left-0.5 top-0.5 text-[8px] font-semibold',
                            lightSq ? 'text-chess-dark/50' : 'text-chess-light/60',
                          ].join(' ')}
                        >
                          {rankLabel}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>

              {promoOpen && canPlay ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/55 p-3">
                  <div className="rounded-2xl border border-border bg-surface-raised p-3">
                    <p className="mb-2 text-center text-[11px] font-medium text-white">
                      Promote to
                    </p>
                    <div className="flex gap-2">
                      {PROMO_KINDS.map((kind) => (
                        <button
                          key={kind}
                          type="button"
                          onClick={() =>
                            promoPick
                              ? confirmPromo(kind)
                              : finishPendingPromo(kind)
                          }
                          className="size-12 rounded-xl border border-border bg-surface p-1 hover:border-muted"
                          aria-label={`Promote to ${kind}`}
                        >
                          <ChessPieceView
                            piece={{ color: promoColor, kind }}
                            size="fill"
                            theme={roomTheme}
                            sprites={sprites}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {endBanner && !promoOpen ? (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/50 p-4">
                  <div className="chess-end-banner rounded-2xl border border-border bg-surface-raised/95 px-5 py-4 text-center shadow-xl">
                    <p className="text-lg font-semibold text-white">
                      {endBanner.title}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">{endBanner.detail}</p>
                  </div>
                </div>
              ) : null}

              {illegalToast ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
                  <span className="rounded-full border border-rose-400/40 bg-rose-500/20 px-3 py-1 text-[11px] font-medium text-rose-100 shadow-lg">
                    Can’t move there
                  </span>
                </div>
              ) : null}
            </div>
            <div
              className={
                immersive
                  ? 'h-full w-56 shrink-0'
                  : 'h-64 w-full sm:h-auto sm:w-56 sm:shrink-0'
              }
            >
              <ChessMoveLog
                log={game.moveLog}
                uid={uid}
                hotseat={game.hotseat}
                whiteUid={game.whiteUid}
              />
            </div>
          </div>
          {draggingFrom !== null && game.board[draggingFrom] ? (
            <div
              ref={ghostRef}
              className="pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-1/2"
              style={{
                left: dragRef.current?.lastX,
                top: dragRef.current?.lastY,
              }}
            >
              <span className="relative block h-full w-full">
                {activeQuote ? (
                  <ChessQuoteBubble text={activeQuote} quoteKey={quoteKey} />
                ) : null}
                <span className="chess-piece-active block h-full w-full">
                  <ChessPieceView
                    piece={game.board[draggingFrom]}
                    size="fill"
                    theme={roomTheme}
                    sprites={sprites}
                  />
                </span>
              </span>
            </div>
          ) : null}
            </>
          )}
        </div>
      )}
    </ArcadeStage>
  )
}
