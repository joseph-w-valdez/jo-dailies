import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { useSharedScrabble } from '../hooks/useSharedScrabble'
import { isDebugEnabled } from '../lib/debugFlags'
import {
  applyExchange,
  applyPass,
  applyPlay,
  applyBust,
  applyCatBurglar,
  applyBlankStare,
  applyShelfCheck,
  applyMeowtiply,
  beginPeekAPaw,
  finishPeekAPaw,
  shuffleRack,
  cellIndex,
  checkWords,
  DICTIONARY_ATTRIBUTION,
  letterValue,
  premiumAt,
  previewPlayWords,
  SCRABBLE_SIZE,
  type Placement,
  type Premium,
  type ScrabbleSkillId,
  type ScrabbleTile,
} from '../lib/scrabble'
import { JENGA_PLAYER_UIDS, nextTurnUid } from '../lib/jenga'
import { ArcadeStage } from './ArcadeStage'

interface DraftCell {
  row: number
  col: number
  tile: ScrabbleTile
  chosenLetter?: string
}

function premiumClass(p: Premium): string {
  switch (p) {
    case 'TW':
      return 'bg-rose-700/80 text-rose-100'
    case 'DW':
    case '★':
      return 'bg-rose-400/70 text-rose-950'
    case 'TL':
      return 'bg-sky-700/80 text-sky-100'
    case 'DL':
      return 'bg-sky-400/60 text-sky-950'
    default:
      return 'bg-board-cell text-muted/50'
  }
}

function premiumLabel(p: Premium): string {
  if (p === '★') return '★'
  return p ?? ''
}

function TileFace({
  letter,
  blank,
  selected,
  small,
}: {
  letter: string
  blank?: boolean
  selected?: boolean
  small?: boolean
}) {
  const points = letterValue(letter, Boolean(blank))
  return (
    <span
      className={[
        'relative inline-flex items-center justify-center rounded-md border font-semibold shadow-sm',
        small ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm',
        blank
          ? 'border-dashed border-amber-700/50 bg-amber-50/90 text-amber-900'
          : 'border-amber-800/30 bg-[#f3e6c8] text-amber-950',
        selected ? 'ring-2 ring-golden' : '',
      ].join(' ')}
    >
      <span className="leading-none">{letter || (blank ? '?' : '')}</span>
      <span
        className={[
          'absolute bottom-0.5 right-0.5 font-bold tabular-nums leading-none text-amber-950/70',
          small ? 'text-[8px]' : 'text-[10px]',
        ].join(' ')}
        aria-hidden
      >
        {points}
      </span>
    </span>
  )
}

function seatLabel(
  id: string,
  viewerUid: string,
  hotseat: boolean,
): string {
  const seat = JENGA_PLAYER_UIDS.indexOf(id as (typeof JENGA_PLAYER_UIDS)[number])
  if (hotseat) return seat === 0 ? 'P1' : 'P2'
  if (id === viewerUid) return 'You'
  return seat === 0 ? 'P1' : 'P2'
}

function moveHeadline(entry: {
  kind: string
  words: string[]
  note?: string
}): string {
  if (entry.kind === 'pass') return 'Pass'
  if (entry.kind === 'exchange') return 'Exchange'
  if (entry.kind === 'skill') return entry.note ?? 'Skill'
  if (entry.kind === 'bust') {
    return entry.note ?? `Tried ${entry.words.join(', ')} — not a word`
  }
  if (entry.kind === 'newGame') return 'New game'
  if (entry.words.length === 0) return 'Play'
  return entry.words.join(', ')
}

function moveCardClass(kind: string): string {
  switch (kind) {
    case 'bust':
      return 'border-rose-400/30 bg-rose-500/10'
    case 'pass':
      return 'border-border bg-surface-raised'
    case 'exchange':
      return 'border-sky-400/25 bg-sky-500/10'
    case 'skill':
      return 'border-violet-400/25 bg-violet-500/10'
    case 'play':
      return 'border-emerald-400/25 bg-emerald-500/10'
    default:
      return 'border-border bg-surface'
  }
}

const SKILL_BUTTONS: {
  id: ScrabbleSkillId
  label: string
  title: string
  cls: string
}[] = [
  {
    id: 'catBurglar',
    label: 'Cat Burglar',
    title: 'Steal a vowel from opponent’s rack',
    cls: 'border-amber-500/55 bg-amber-500/20 text-app-text hover:bg-amber-500/30',
  },
  {
    id: 'blankStare',
    label: 'Blank Stare',
    title: 'Turn one of your tiles into a blank',
    cls: 'border-zinc-400/55 bg-zinc-500/20 text-app-text hover:bg-zinc-500/30',
  },
  {
    id: 'shelfCheck',
    label: 'Shelf Check',
    title: 'Knock a random tile off opponent’s rack into the bag',
    cls: 'border-orange-500/55 bg-orange-500/20 text-app-text hover:bg-orange-500/30',
  },
  {
    id: 'peekAPaw',
    label: 'Peek-a-Paw',
    title: 'Peek at bag tiles and swap one onto your rack',
    cls: 'border-sky-500/55 bg-sky-500/20 text-app-text hover:bg-sky-500/30',
  },
  {
    id: 'meowtiply',
    label: 'Meowtiply',
    title: 'Your next valid play scores ×3',
    cls: 'border-fuchsia-500/55 bg-fuchsia-500/20 text-app-text hover:bg-fuchsia-500/30',
  },
]

function newGameScoreLine(
  finals: Record<string, number> | undefined,
  viewerUid: string,
  hotseat: boolean,
): string {
  return JENGA_PLAYER_UIDS.map((id) => {
    const label = seatLabel(id, viewerUid, hotseat)
    return `${label} ${finals?.[id] ?? 0}`
  }).join(' · ')
}

const SIDEBAR_STORAGE_KEY = 'jo-dailies:scrabble-theater-sidebar:v1'
const SIDEBAR_DEFAULT_PX = 320
const SIDEBAR_MIN_PX = 180
const HANDLE_PX = 8
const PLAY_GAP_PX = 12

function readSidebarWidth(): number {
  try {
    const n = Number(localStorage.getItem(SIDEBAR_STORAGE_KEY))
    if (Number.isFinite(n) && n >= SIDEBAR_MIN_PX) return Math.round(n)
  } catch {
    /* ignore */
  }
  return SIDEBAR_DEFAULT_PX
}

function writeSidebarWidth(px: number) {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(px))
  } catch {
    /* ignore */
  }
}

/** Largest square that fits above the rack and beside the moves panel. */
function useTheaterBoardPx(
  enabled: boolean,
  rowRef: RefObject<HTMLDivElement | null>,
  rackRef: RefObject<HTMLDivElement | null>,
  sidebarWidth: number,
): number | null {
  const [px, setPx] = useState<number | null>(null)

  useEffect(() => {
    if (!enabled) {
      setPx(null)
      return
    }
    const row = rowRef.current
    if (!row) return

    const measure = () => {
      const rackH = rackRef.current?.offsetHeight ?? 0
      const availableH = row.clientHeight - rackH - PLAY_GAP_PX
      const availableW =
        row.clientWidth - sidebarWidth - HANDLE_PX - PLAY_GAP_PX
      const next = Math.max(
        160,
        Math.floor(Math.min(availableH, availableW)),
      )
      setPx((prev) => (prev === next ? prev : next))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(row)
    const rack = rackRef.current
    if (rack) ro.observe(rack)
    return () => ro.disconnect()
  }, [enabled, rowRef, rackRef, sidebarWidth])

  return enabled ? px : null
}

function TheaterPlayRow({
  immersive,
  children,
}: {
  immersive: boolean
  children: (ctx: {
    boardPx: number | null
    rowRef: RefObject<HTMLDivElement | null>
    rackRef: RefObject<HTMLDivElement | null>
    sidebarWidth: number
    setSidebarWidth: (px: number) => void
    onResizePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  }) => ReactNode
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const rackRef = useRef<HTMLDivElement>(null)
  const [sidebarWidth, setSidebarWidth] = useState(readSidebarWidth)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startWidth: number
  } | null>(null)
  const boardPx = useTheaterBoardPx(
    immersive,
    rowRef,
    rackRef,
    sidebarWidth,
  )

  useEffect(() => {
    if (!immersive) return
    writeSidebarWidth(sidebarWidth)
  }, [immersive, sidebarWidth])

  const clampSidebar = (px: number) => {
    const row = rowRef.current
    const maxWidth = row
      ? Math.max(
          SIDEBAR_MIN_PX,
          row.clientWidth - 200 - HANDLE_PX - PLAY_GAP_PX,
        )
      : 640
    return Math.round(Math.min(maxWidth, Math.max(SIDEBAR_MIN_PX, px)))
  }

  const onResizePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!immersive) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: sidebarWidth,
    }
  }

  useEffect(() => {
    if (!immersive) return

    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      const row = rowRef.current
      const maxWidth = row
        ? Math.max(
            SIDEBAR_MIN_PX,
            row.clientWidth - 200 - HANDLE_PX - PLAY_GAP_PX,
          )
        : 640
      // Dragging the handle left widens the sidebar; right narrows it.
      const next = Math.round(
        Math.min(
          maxWidth,
          Math.max(
            SIDEBAR_MIN_PX,
            drag.startWidth - (event.clientX - drag.startX),
          ),
        ),
      )
      setSidebarWidth(next)
    }

    const onUp = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      dragRef.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [immersive])

  return children({
    boardPx,
    rowRef,
    rackRef,
    sidebarWidth,
    setSidebarWidth: (px) => setSidebarWidth(clampSidebar(px)),
    onResizePointerDown,
  })
}

export function CatScrabble({ onClose }: { onClose: () => void }) {
  const {
    game,
    ready,
    uid,
    actorUid,
    myRack,
    canAct,
    commitGame,
    resetGame,
  } = useSharedScrabble()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftCell[]>([])
  const [exchangeMode, setExchangeMode] = useState(false)
  const [exchangeIds, setExchangeIds] = useState<Set<string>>(new Set())
  const [blankStareMode, setBlankStareMode] = useState(false)
  const [peekKeepId, setPeekKeepId] = useState<string | null>(null)
  const [peekSwapId, setPeekSwapId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [newGameOpen, setNewGameOpen] = useState(false)
  const debug = isDebugEnabled()

  useEffect(() => {
    setDraft([])
    setSelectedId(null)
    setExchangeMode(false)
    setExchangeIds(new Set())
    setBlankStareMode(false)
    setMessage(null)
  }, [game.roundId, game.turnUid])

  useEffect(() => {
    if (!game.peek) {
      setPeekKeepId(null)
      setPeekSwapId(null)
    }
  }, [game.peek])

  const opponentUid =
    JENGA_PLAYER_UIDS.find((id) => id === actorUid) !== undefined
      ? nextTurnUid(actorUid)
      : JENGA_PLAYER_UIDS[1]!

  const draftIds = useMemo(() => new Set(draft.map((d) => d.tile.id)), [draft])
  const rackVisible = myRack.filter((t) => !draftIds.has(t.id))

  const statusLabel = (() => {
    if (!ready) return 'Syncing…'
    if (busy) return 'Checking words…'
    if (message) return message
    if (game.peek) {
      if (game.peek.uid === actorUid) return 'Peek-a-Paw — pick a tile'
      return 'Opponent is peeking…'
    }
    if (game.status === 'finished') {
      if (!game.winnerUid) return 'Draw'
      if (game.hotseat) {
        const seat =
          game.winnerUid === JENGA_PLAYER_UIDS[0] ? 'P1' : 'P2'
        return `${seat} wins`
      }
      return game.winnerUid === uid ? 'You win!' : 'Opponent wins'
    }
    if (canAct) {
      if (game.hotseat) {
        const seat = actorUid === JENGA_PLAYER_UIDS[0] ? 'P1' : 'P2'
        return `Hotseat — ${seat}'s turn`
      }
      return 'Your turn'
    }
    return 'Waiting for opponent'
  })()

  const letterOnBoard = (row: number, col: number): string | null => {
    const d = draft.find((x) => x.row === row && x.col === col)
    if (d) return d.chosenLetter || d.tile.letter || '?'
    return game.board[cellIndex(row, col)]?.letter ?? null
  }

  const blankOnBoard = (row: number, col: number): boolean => {
    const d = draft.find((x) => x.row === row && x.col === col)
    if (d) return d.tile.blank
    return Boolean(game.board[cellIndex(row, col)]?.blank)
  }

  const placeSelectedAt = (row: number, col: number) => {
    if (!canAct || exchangeMode || blankStareMode || busy) return
    if (game.peek) return
    if (game.board[cellIndex(row, col)]) return
    if (draft.some((d) => d.row === row && d.col === col)) return
    if (!selectedId) return
    const tile = rackVisible.find((t) => t.id === selectedId)
    if (!tile) return

    let chosenLetter: string | undefined
    if (tile.blank) {
      const raw = window.prompt('Letter for blank tile?', 'A')
      if (!raw) return
      const ch = raw.trim().toUpperCase().slice(0, 1)
      if (!/^[A-Z]$/.test(ch)) {
        setMessage('Blank needs A–Z')
        return
      }
      chosenLetter = ch
    }

    setDraft((prev) => [...prev, { row, col, tile, chosenLetter }])
    setSelectedId(null)
    setMessage(null)
  }

  const recall = () => {
    setDraft([])
    setSelectedId(null)
    setMessage(null)
  }

  const toPlacements = (): Placement[] | null => {
    return draft.map((d) => ({
      row: d.row,
      col: d.col,
      letter: d.tile.blank
        ? (d.chosenLetter ?? '').toUpperCase()
        : d.tile.letter,
      tileId: d.tile.id,
      blank: d.tile.blank,
    }))
  }

  const play = async () => {
    if (!canAct || busy) return
    const placements = toPlacements()
    if (!placements || placements.length === 0) {
      setMessage('Place tiles first')
      return
    }
    const preview = previewPlayWords(game, placements)
    if (preview.error) {
      setMessage(preview.error)
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const check = await checkWords(preview.words)
      if (!check.ok) {
        if (check.reason === 'invalid') {
          setMessage(`Not a word: ${check.invalid.join(', ')}`)
          void commitGame(
            (prev) => applyBust(prev, actorUid, check.invalid) ?? prev,
          )
        } else {
          setMessage('Dictionary unreachable — try again')
        }
        return
      }
      await commitGame(
        (prev) =>
          applyPlay(prev, actorUid, placements, {
            definitions: check.definitions,
          }) ?? prev,
      )
      setDraft([])
      setSelectedId(null)
    } finally {
      setBusy(false)
    }
  }

  const pass = () => {
    if (!canAct || busy) return
    recall()
    void commitGame((prev) => applyPass(prev, actorUid) ?? prev)
  }

  const confirmExchange = () => {
    if (!canAct || busy) return
    if (exchangeIds.size === 0) {
      setMessage('Select tiles to exchange')
      return
    }
    void commitGame(
      (prev) => applyExchange(prev, actorUid, [...exchangeIds]) ?? prev,
    )
    setExchangeMode(false)
    setExchangeIds(new Set())
    setDraft([])
  }

  const mySkills = game.skills[actorUid] ?? {
    catBurglar: 0,
    blankStare: 0,
    shelfCheck: 0,
    peekAPaw: 0,
    meowtiply: 0,
  }

  const runSkill = (id: ScrabbleSkillId) => {
    if (!canAct || busy || game.peek) return
    if (draft.length > 0) {
      setMessage('Recall tiles before using a skill')
      return
    }
    if ((mySkills[id] ?? 0) <= 0) return

    if (id === 'blankStare') {
      setBlankStareMode(true)
      setExchangeMode(false)
      setSelectedId(null)
      setMessage('Blank Stare — tap a rack tile')
      return
    }
    if (id === 'peekAPaw') {
      void commitGame((prev) => {
        const next = beginPeekAPaw(prev, actorUid)
        if (!next) setMessage('Peek-a-Paw failed (empty bag)')
        return next ?? prev
      })
      return
    }
    if (id === 'catBurglar') {
      void commitGame((prev) => {
        const next = applyCatBurglar(prev, actorUid)
        if (!next) setMessage('Cat Burglar failed (no vowels / rack full)')
        return next ?? prev
      })
      return
    }
    if (id === 'shelfCheck') {
      void commitGame((prev) => {
        const next = applyShelfCheck(prev, actorUid)
        if (!next) setMessage('Shelf Check failed (empty rack)')
        return next ?? prev
      })
      return
    }
    if (id === 'meowtiply') {
      void commitGame((prev) => {
        const next = applyMeowtiply(prev, actorUid)
        if (!next) setMessage('Meowtiply already armed')
        return next ?? prev
      })
    }
  }

  const onRackTileClick = (tile: ScrabbleTile) => {
    if (!canAct || busy) return
    if (blankStareMode) {
      if (tile.blank) {
        setMessage('Pick a non-blank tile')
        return
      }
      void commitGame((prev) => {
        const next = applyBlankStare(prev, actorUid, tile.id)
        if (!next) setMessage('Blank Stare failed')
        return next ?? prev
      })
      setBlankStareMode(false)
      setMessage(null)
      return
    }
    if (exchangeMode) {
      setExchangeIds((prev) => {
        const next = new Set(prev)
        if (next.has(tile.id)) next.delete(tile.id)
        else next.add(tile.id)
        return next
      })
      return
    }
    setSelectedId((id) => (id === tile.id ? null : tile.id))
  }

  const shuffle = () => {
    if (!canAct || busy || game.peek) return
    void commitGame((prev) => shuffleRack(prev, actorUid) ?? prev)
  }

  const peekMine = Boolean(game.peek && game.peek.uid === actorUid)
  const rackFull = myRack.length >= 7
  const canConfirmPeek =
    peekMine &&
    peekKeepId != null &&
    (!rackFull || peekSwapId != null)

  const confirmPeek = () => {
    if (!canConfirmPeek || !peekKeepId) return
    void commitGame(
      (prev) =>
        finishPeekAPaw(prev, actorUid, peekKeepId, peekSwapId) ?? prev,
    )
  }

  return (
    <ArcadeStage
      title="Scrabble"
      onClose={onClose}
      meta={<p className="text-sm font-medium text-golden">{statusLabel}</p>}
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
                Shared Scrabble — your rack is private. Place tiles, then Play
                (words checked online). Exchange or Pass when stuck. Shuffle
                rearranges your rack for free.
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                Skills (2 uses each, no refill):{' '}
                <span className="text-white/80">Cat Burglar</span> steals a
                vowel; <span className="text-white/80">Blank Stare</span> makes
                one tile blank;{' '}
                <span className="text-white/80">Shelf Check</span> knocks an
                opponent tile into the bag;{' '}
                <span className="text-white/80">Peek-a-Paw</span> peeks the bag
                and swaps one tile;{' '}
                <span className="text-white/80">Meowtiply</span> triples your
                next valid play.
              </p>
            </div>
          )}

          <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted">
              <span>Bag {game.bag.length}</span>
              {game.hotseat ? (
                <span>
                  Playing as{' '}
                  {actorUid === JENGA_PLAYER_UIDS[0] ? 'P1' : 'P2'}
                </span>
              ) : (
                <span>
                  Opponent rack: {game.racks[opponentUid]?.length ?? 0}
                </span>
              )}
              {game.meowtiplyFor === actorUid ? (
                <span className="rounded-md border border-fuchsia-500/40 bg-fuchsia-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-app-text">
                  Meowtiply armed
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {SKILL_BUTTONS.map((btn) => {
                const left = mySkills[btn.id] ?? 0
                return (
                  <button
                    key={btn.id}
                    type="button"
                    title={btn.title}
                    disabled={
                      !canAct ||
                      busy ||
                      left <= 0 ||
                      Boolean(game.peek) ||
                      (btn.id === 'meowtiply' &&
                        game.meowtiplyFor === actorUid)
                    }
                    onClick={() => runSkill(btn.id)}
                    className={[
                      'rounded-md border px-2 py-1 text-[10px] font-medium leading-tight transition disabled:opacity-40',
                      btn.cls,
                    ].join(' ')}
                  >
                    {btn.label} ({left})
                  </button>
                )
              })}
              {game.hotseat ? (
                <span className="rounded-md border border-amber-500/55 bg-amber-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-app-text">
                  Debug hotseat
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setNewGameOpen(true)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-white hover:border-muted"
              >
                New game
              </button>
            </div>
          </div>

          <TheaterPlayRow immersive={immersive}>
            {({
              boardPx,
              rowRef,
              rackRef,
              sidebarWidth,
              setSidebarWidth,
              onResizePointerDown,
            }) => (
          <div
            ref={rowRef}
            className={[
              'mt-3 flex min-h-0',
              immersive
                ? 'flex-1 justify-center'
                : 'items-stretch gap-3',
            ].join(' ')}
          >
            {/* Theater: pack board + panel as one unit, then center the unit. */}
            <div
              className={
                immersive
                  ? 'flex h-full min-h-0 max-w-full items-stretch gap-2'
                  : 'contents'
              }
            >
            <div className="flex min-h-0 shrink-0 flex-col">
              <div
                className="grid shrink-0 gap-0.5 rounded-xl border border-border bg-board-frame p-1.5"
                style={
                  immersive
                    ? {
                        width: boardPx ?? 160,
                        height: boardPx ?? 160,
                        gridTemplateColumns: `repeat(${SCRABBLE_SIZE}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${SCRABBLE_SIZE}, minmax(0, 1fr))`,
                      }
                    : {
                        gridTemplateColumns: `repeat(${SCRABBLE_SIZE}, 2.25rem)`,
                        gridTemplateRows: `repeat(${SCRABBLE_SIZE}, 2.25rem)`,
                      }
                }
                role="grid"
                aria-label="Scrabble board"
              >
                  {Array.from(
                    { length: SCRABBLE_SIZE * SCRABBLE_SIZE },
                    (_, i) => {
                      const row = Math.floor(i / SCRABBLE_SIZE)
                      const col = i % SCRABBLE_SIZE
                      const prem = premiumAt(row, col)
                      const letter = letterOnBoard(row, col)
                      const blank = letter ? blankOnBoard(row, col) : false
                      const isDraft = draft.some(
                        (d) => d.row === row && d.col === col,
                      )
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={!canAct || exchangeMode || busy}
                          onClick={() => placeSelectedAt(row, col)}
                          className={[
                            'relative flex min-h-0 min-w-0 items-center justify-center rounded-md border border-black/20 text-sm font-semibold uppercase leading-none',
                            letter
                              ? isDraft
                                ? 'border-amber-800/30 bg-[#f3e6c8] text-amber-950 ring-2 ring-golden'
                                : 'border-amber-800/30 bg-[#f3e6c8] text-amber-950 shadow-sm'
                              : premiumClass(prem),
                          ].join(' ')}
                        >
                          {letter ? (
                            <>
                              <span className="leading-none">{letter}</span>
                              <span
                                className="absolute bottom-0.5 right-0.5 text-[9px] font-bold tabular-nums leading-none text-amber-950/70"
                                aria-hidden
                              >
                                {letterValue(letter, blank)}
                              </span>
                            </>
                          ) : (
                            <span className="text-[9px] font-bold opacity-80">
                              {premiumLabel(prem)}
                            </span>
                          )}
                        </button>
                      )
                    },
                  )}
                </div>

              <div
                ref={rackRef}
                className="mt-3 flex shrink-0 flex-col items-start gap-2"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  {(exchangeMode || blankStareMode
                    ? myRack
                    : rackVisible
                  ).map((tile) => {
                    const selected = exchangeMode
                      ? exchangeIds.has(tile.id)
                      : blankStareMode
                        ? false
                        : selectedId === tile.id
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        disabled={
                          !canAct ||
                          busy ||
                          Boolean(game.peek) ||
                          (!exchangeMode &&
                            !blankStareMode &&
                            draftIds.has(tile.id))
                        }
                        onClick={() => onRackTileClick(tile)}
                      >
                        <TileFace
                          letter={tile.letter}
                          blank={tile.blank}
                          selected={selected}
                        />
                      </button>
                    )
                  })}
                  {draft.map((d) => (
                    <button
                      key={`draft-${d.tile.id}`}
                      type="button"
                      disabled={!canAct || busy}
                      title="Return to rack"
                      onClick={() =>
                        setDraft((prev) =>
                          prev.filter((x) => x.tile.id !== d.tile.id),
                        )
                      }
                    >
                      <TileFace
                        letter={d.chosenLetter || d.tile.letter}
                        blank={d.tile.blank}
                        small
                      />
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {exchangeMode ? (
                    <>
                      <button
                        type="button"
                        disabled={!canAct || busy || game.bag.length === 0}
                        onClick={confirmExchange}
                        className="rounded-lg border border-sky-500/55 bg-sky-500/20 px-2.5 py-1 text-xs font-medium text-app-text hover:bg-sky-500/30 disabled:opacity-40"
                      >
                        Confirm exchange
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExchangeMode(false)
                          setExchangeIds(new Set())
                        }}
                        className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-muted hover:text-white"
                      >
                        Cancel
                      </button>
                    </>
                  ) : blankStareMode ? (
                    <button
                      type="button"
                      onClick={() => {
                        setBlankStareMode(false)
                        setMessage(null)
                      }}
                      className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-muted hover:text-white"
                    >
                      Cancel Blank Stare
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={!canAct || busy || draft.length === 0}
                        onClick={() => void play()}
                        className="rounded-lg border border-emerald-500/55 bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-app-text hover:bg-emerald-500/30 disabled:opacity-40"
                      >
                        Play
                      </button>
                      <button
                        type="button"
                        disabled={
                          !canAct ||
                          busy ||
                          Boolean(game.peek) ||
                          rackVisible.length < 2
                        }
                        onClick={shuffle}
                        className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-white hover:border-muted disabled:opacity-40"
                      >
                        Shuffle
                      </button>
                      <button
                        type="button"
                        disabled={!canAct || busy || draft.length === 0}
                        onClick={recall}
                        className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-white hover:border-muted disabled:opacity-40"
                      >
                        Recall
                      </button>
                      <button
                        type="button"
                        disabled={
                          !canAct ||
                          busy ||
                          game.bag.length === 0 ||
                          Boolean(game.peek)
                        }
                        onClick={() => {
                          recall()
                          setBlankStareMode(false)
                          setExchangeMode(true)
                        }}
                        className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-white hover:border-muted disabled:opacity-40"
                      >
                        Exchange
                      </button>
                      <button
                        type="button"
                        disabled={!canAct || busy || Boolean(game.peek)}
                        onClick={pass}
                        className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-muted hover:text-white disabled:opacity-40"
                      >
                        Pass
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {immersive ? (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize moves panel"
                aria-valuenow={sidebarWidth}
                tabIndex={0}
                onPointerDown={onResizePointerDown}
                onKeyDown={(event) => {
                  const step = event.shiftKey ? 32 : 16
                  if (event.key === 'ArrowLeft') {
                    event.preventDefault()
                    setSidebarWidth(sidebarWidth + step)
                  } else if (event.key === 'ArrowRight') {
                    event.preventDefault()
                    setSidebarWidth(sidebarWidth - step)
                  }
                }}
                className="group relative w-2 shrink-0 cursor-col-resize touch-none"
              >
                <span
                  aria-hidden
                  className="absolute inset-y-3 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-white/15 transition group-hover:bg-golden/70 group-active:bg-golden"
                />
              </div>
            ) : null}

            <aside
              className={[
                'flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface/70',
                immersive ? 'shrink-0' : 'min-w-0 flex-1',
              ].join(' ')}
              style={immersive ? { width: sidebarWidth } : undefined}
            >
              <div className="shrink-0 border-b border-border px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Score
                </p>
                <div className="mt-2 space-y-1.5">
                  {JENGA_PLAYER_UIDS.map((id) => {
                    const turn =
                      game.turnUid === id && game.status === 'playing'
                    return (
                      <div
                        key={id}
                        className={[
                          'flex items-baseline justify-between gap-2 rounded-lg border px-2 py-1.5',
                          turn
                            ? 'border-golden/45 bg-golden/10'
                            : 'border-transparent bg-surface',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'text-[11px] font-medium',
                            turn ? 'text-golden' : 'text-white/85',
                          ].join(' ')}
                        >
                          {seatLabel(id, uid, game.hotseat)}
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-white">
                          {game.scores[id] ?? 0}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <p className="shrink-0 px-3 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Moves
                </p>
                <div className="relative mt-2 min-h-0 flex-1">
                  <ul className="jo-scroll absolute inset-0 space-y-1.5 overflow-y-auto overscroll-contain px-3 pb-2">
                    {game.moveLog.length === 0 ? (
                      <li className="text-[11px] text-muted">No moves yet</li>
                    ) : (
                      [...game.moveLog].reverse().map((entry, i) =>
                        entry.kind === 'newGame' ? (
                          <li
                            key={`${entry.at}-newGame-${i}`}
                            className="rounded-lg border border-dashed border-border bg-surface px-2.5 py-2"
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                              New game
                            </p>
                            <p className="mt-0.5 text-[11px] tabular-nums text-muted">
                              {newGameScoreLine(
                                entry.finals,
                                uid,
                                game.hotseat,
                              )}
                            </p>
                          </li>
                        ) : (
                          <li
                            key={`${entry.at}-${entry.uid}-${i}`}
                            className={[
                              'overflow-hidden rounded-lg border',
                              moveCardClass(entry.kind),
                            ].join(' ')}
                          >
                            <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="shrink-0 self-start text-[10px] font-medium text-muted">
                                  {seatLabel(entry.uid, uid, game.hotseat)}
                                </span>
                                {entry.kind === 'bust' ? (
                                  <p className="min-w-0 text-[11px] leading-snug text-rose-200">
                                    {moveHeadline(entry)}
                                  </p>
                                ) : (
                                  <span
                                    className={[
                                      'text-sm font-semibold leading-none',
                                      entry.kind === 'play'
                                        ? 'text-white'
                                        : entry.kind === 'skill'
                                          ? 'text-violet-100'
                                          : 'text-muted',
                                    ].join(' ')}
                                  >
                                    {moveHeadline(entry)}
                                  </span>
                                )}
                                {entry.kind === 'play' && entry.score > 0 ? (
                                  <span className="self-start rounded bg-emerald-500 px-1.5 py-0.5 text-sm font-bold tabular-nums leading-none text-white shadow-sm shadow-emerald-900/40">
                                    +{entry.score}
                                  </span>
                                ) : null}
                                {entry.kind === 'pass' ? (
                                  <span className="self-start rounded bg-zinc-600/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-100">
                                    skip
                                  </span>
                                ) : null}
                                {entry.kind === 'exchange' ? (
                                  <span className="self-start rounded bg-sky-500/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                                    swap
                                  </span>
                                ) : null}
                                {entry.kind === 'skill' ? (
                                  <span className="self-start rounded bg-violet-500/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                                    skill
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 items-center gap-1 self-start">
                                <img
                                  src={catForEntry(entry.at, entry.uid)}
                                  alt=""
                                  aria-hidden
                                  className="scrabble-move-cat h-5 w-5 shrink-0 select-none object-contain"
                                  style={{
                                    animationDelay: `${
                                      wiggleDelay(entry.at, entry.uid)
                                    }ms`,
                                  }}
                                  draggable={false}
                                />
                                <span
                                  className="text-[11px] font-medium tabular-nums text-muted"
                                  title={
                                    entry.kind === 'bust'
                                      ? undefined
                                      : 'Score after this move'
                                  }
                                >
                                  {entry.kind === 'bust' ? 'lol' : entry.total}
                                </span>
                              </div>
                            </div>
                            {entry.kind === 'play' &&
                            entry.definitions.length > 0 ? (
                              <ul className="space-y-1 border-t border-black/10 bg-white/35 px-2.5 py-1.5">
                                {entry.definitions.map((d) => (
                                  <li
                                    key={`${entry.at}-${d.word}`}
                                    className="text-[11px] leading-snug text-black"
                                  >
                                    {d.definition}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </li>
                        ),
                      )
                    )}
                  </ul>
                </div>
                <p className="shrink-0 border-t border-border px-3 py-2 text-[9px] leading-snug text-muted/80">
                  {DICTIONARY_ATTRIBUTION}
                </p>
              </div>
            </aside>
            </div>
          </div>
            )}
          </TheaterPlayRow>

          {peekMine && game.peek ? (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-md rounded-2xl border border-sky-500/40 bg-surface-raised p-4 shadow-xl">
                <h3 className="text-sm font-semibold text-white">Peek-a-Paw</h3>
                <p className="mt-1 text-[11px] text-muted">
                  Pick a tile to keep
                  {rackFull
                    ? ', then choose a rack tile to send back to the bag.'
                    : '. Optionally swap a rack tile back into the bag.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {game.peek.tiles.map((tile) => (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => setPeekKeepId(tile.id)}
                    >
                      <TileFace
                        letter={tile.letter}
                        blank={tile.blank}
                        selected={peekKeepId === tile.id}
                      />
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {rackFull ? 'Swap from rack' : 'Optional rack swap'}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {myRack.map((tile) => (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() =>
                        setPeekSwapId((id) =>
                          id === tile.id ? null : tile.id,
                        )
                      }
                    >
                      <TileFace
                        letter={tile.letter}
                        blank={tile.blank}
                        selected={peekSwapId === tile.id}
                        small
                      />
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!canConfirmPeek || busy}
                    onClick={confirmPeek}
                    className="rounded-lg border border-sky-500/55 bg-sky-500/20 px-3 py-2 text-sm font-medium text-app-text hover:bg-sky-500/30 disabled:opacity-40"
                  >
                    Keep tile
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {newGameOpen ? (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-raised p-4 shadow-xl">
                <h3 className="text-sm font-semibold text-white">New game?</h3>
                <p className="mt-1 text-[11px] text-muted">
                  This clears the board, racks, and scores for both players.
                  {debug
                    ? ' Debug is on — choose a mode below.'
                    : ''}
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {debug ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setNewGameOpen(false)
                          void resetGame({ hotseat: false })
                        }}
                        className="rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm text-white hover:border-muted"
                      >
                        Confirm — Normal (2P)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewGameOpen(false)
                          void resetGame({ hotseat: true })
                        }}
                        className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-left text-sm text-amber-50 hover:bg-amber-500/25"
                      >
                        Confirm — Debug hotseat
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setNewGameOpen(false)
                        void resetGame({ hotseat: false })
                      }}
                      className="rounded-lg border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-100 hover:bg-rose-500/25"
                    >
                      Confirm new game
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setNewGameOpen(false)}
                    className="rounded-lg px-3 py-2 text-xs text-muted hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </ArcadeStage>
  )
}
