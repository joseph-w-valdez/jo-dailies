import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSharedGuessWho } from '../hooks/useSharedGuessWho'
import { isGuessWhoDebugEnabled } from '../lib/debugFlags'
import {
  GUESS_WHO_SKILLS,
  guessGuessWhoAgent,
  hasUsedGuessWhoSkill,
  passGuessWhoTurn,
  pickGuessWhoSecret,
  remainingAgentCount,
  seatForUid,
  selectGuessWhoFirst,
  surrenderGuessWho,
  toggleGuessWhoFlip,
  useGuessWhoSkill,
  type GuessWhoSkillId,
} from '../lib/guessWho'
import { householdName } from '../lib/household'
import { JENGA_PLAYER_UIDS } from '../lib/jenga'
import {
  agentById,
  roleMeta,
  VALORANT_AGENTS,
  VALORANT_ROLE_META,
  type ValorantAgent,
  type ValorantRole,
} from '../lib/valorantAgents'
import { ArcadeStage, ArcadeStatus } from './ArcadeStage'
import { ConfirmDialog } from './ConfirmDialog'
import { GameSeatPicker } from './GameSeatPicker'
import { GuessWhoBoard3D } from './GuessWhoBoard3D'
import { NewGameConfirm } from './NewGameConfirm'
import { SurrenderButton } from './SurrenderButton'

const ROLES: readonly (ValorantRole | 'All')[] = [
  'All',
  'Duelist',
  'Initiator',
  'Controller',
  'Sentinel',
]

/** Card fills its slot; caps at 140 so the 3-row board can shrink on small viewports. */
const GW_CARD_MAX_PX = 140
const GW_CARD_MIN_PX = 72
const GW_CARD_GAP_PX = 6
const GW_CARD_BORDER_PX = 6
/** Name + role + single origin — kind line. */
const GW_INFO_STRIP_PX = 62
/** Reclaim the old second meta line as breathing room above the bust. */
const GW_PORTRAIT_TOP_PX = 11
const GW_PORTRAIT_MIN_PX = 48
const GW_PORTRAIT_RATIO = 5 / 4

function idealGuessWhoPortraitH(sizePx: number): number {
  return Math.max(0, sizePx - GW_CARD_BORDER_PX) * GW_PORTRAIT_RATIO
}

/** How many max-width cards fit in availW with space-evenly side margins. */
function colsForWidth(
  availW: number,
  sizePx: number,
  count: number,
  gap: number,
): number {
  // n * size + (n + 1) * gap <= availW  →  n <= (availW - gap) / (size + gap)
  const fit = Math.floor((availW - gap) / (sizePx + gap))
  return Math.max(1, Math.min(count, fit))
}

/**
 * Pack as many cards as fit across the width (up to 140px), then wrap rows.
 * availH is an optional ceiling — portraits only shrink if content would overflow it.
 */
function fitGuessWhoLayout(
  availW: number,
  availH: number,
  count: number,
  gap = GW_CARD_GAP_PX,
): { sizePx: number; cols: number; gapX: number; portraitH: number } {
  if (count <= 0 || availW <= 0) {
    return {
      sizePx: GW_CARD_MAX_PX,
      cols: 1,
      gapX: gap,
      portraitH: idealGuessWhoPortraitH(GW_CARD_MAX_PX),
    }
  }

  // Start at max card width; how many fit in one row?
  let sizePx = Math.min(
    GW_CARD_MAX_PX,
    Math.max(GW_CARD_MIN_PX, availW - 2 * gap),
  )
  let cols = colsForWidth(availW, sizePx, count, gap)

  // Grow toward max width within that column count (fill leftover).
  sizePx = Math.floor(
    Math.max(
      GW_CARD_MIN_PX,
      Math.min(GW_CARD_MAX_PX, (availW - gap * (cols + 1)) / cols),
    ),
  )
  // Smaller size might allow one more column — take it when possible.
  cols = colsForWidth(availW, sizePx, count, gap)
  sizePx = Math.floor(
    Math.max(
      GW_CARD_MIN_PX,
      Math.min(GW_CARD_MAX_PX, (availW - gap * (cols + 1)) / cols),
    ),
  )

  const rows = Math.ceil(count / cols)
  let portraitH = idealGuessWhoPortraitH(sizePx)
  if (availH > 0 && rows > 0) {
    // availH is a max ceiling (shelf), not a forced board height.
    const maxCardH =
      (availH - gap * Math.max(0, rows - 1)) / rows
    const portraitBudget =
      maxCardH - GW_CARD_BORDER_PX - GW_PORTRAIT_TOP_PX - GW_INFO_STRIP_PX
    if (portraitBudget < portraitH) {
      portraitH = Math.floor(
        Math.max(GW_PORTRAIT_MIN_PX, portraitBudget),
      )
    }
  }

  const gapX = Math.max(gap, (availW - cols * sizePx) / (cols + 1))
  return { sizePx, cols, gapX, portraitH }
}

function chunkRows<T>(items: T[], cols: number): T[][] {
  if (cols <= 0) return [items]
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += cols) {
    rows.push(items.slice(i, i + cols))
  }
  return rows
}

function AgentCard({
  agent,
  sizePx = GW_CARD_MAX_PX,
  portraitH = idealGuessWhoPortraitH(GW_CARD_MAX_PX),
  flipped,
  selected,
  secret,
  disabled,
  guessArmed,
  onClick,
}: {
  agent: ValorantAgent
  sizePx?: number
  portraitH?: number
  flipped?: boolean
  selected?: boolean
  secret?: boolean
  disabled?: boolean
  guessArmed?: boolean
  onClick?: () => void
}) {
  const theme = roleMeta(agent.role)
  const compact = sizePx < 120

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{ width: sizePx, maxWidth: GW_CARD_MAX_PX }}
      className={[
        'group relative flex w-full max-w-[140px] flex-col gap-0 justify-self-center overflow-hidden rounded-md border-[3px] text-left shadow-sm transition duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-golden/60',
        flipped
          ? 'border-[#1e3a5f]/80 opacity-55'
          : selected
            ? 'border-amber-300 shadow-[0_0_0_2px_rgba(251,191,36,0.45)]'
            : secret
              ? 'border-emerald-400'
              : guessArmed
                ? 'border-rose-400'
                : 'border-white/90',
        disabled && !flipped ? 'cursor-not-allowed opacity-50' : '',
        !disabled && !flipped ? 'hover:-translate-y-0.5 hover:shadow-md' : '',
      ].join(' ')}
    >
      {/* Portrait on soft white — classic Guess Who face plate */}
      <div
        className="relative w-full shrink-0 overflow-hidden"
        style={{
          height: portraitH + GW_PORTRAIT_TOP_PX,
          paddingTop: GW_PORTRAIT_TOP_PX,
          background: flipped
            ? theme.bar
            : 'linear-gradient(180deg, #cfcfcf 0%, #ffffff 6%, #ffffff 94%, #cfcfcf 100%)',
        }}
      >
        <img
          src={agent.icon}
          alt=""
          className={[
            // Sit on the name bar; scale clips transparent padding (top stays tight)
            'absolute inset-x-0 bottom-0 h-[108%] w-full origin-bottom object-contain object-bottom transition duration-200',
            'scale-[1.08]',
            flipped
              ? 'opacity-25 grayscale'
              : 'group-hover:scale-[1.12]',
          ].join(' ')}
          draggable={false}
          loading="lazy"
        />
        {secret && !flipped ? (
          <span className="absolute left-1 top-1 z-[1] rounded bg-emerald-500 px-1 py-px text-[8px] font-bold tracking-wide text-white shadow">
            YOU
          </span>
        ) : null}
        {flipped ? (
          <span
            className="absolute inset-0 z-[1] flex items-center justify-center text-2xl font-black text-white/35"
            style={{ backgroundColor: `${theme.bar}b3` }}
          >
            ?
          </span>
        ) : null}
      </div>

      {/* Info strip — role-colored bg; forced white copy (theme remaps .text-white) */}
      <div
        className={compact ? 'shrink-0 px-0.5 py-1' : 'shrink-0 px-1 py-1.5'}
        style={{ backgroundColor: theme.bar }}
      >
        <div
          className={[
            'truncate text-center font-bold uppercase tracking-wide',
            compact ? 'text-[9px]' : 'text-[11px] sm:text-xs',
          ].join(' ')}
          style={{ color: '#ffffff' }}
        >
          {agent.name}
        </div>
        <div className="mt-0.5 flex items-center justify-center gap-1">
          <img
            src={theme.icon}
            alt=""
            className="size-3 shrink-0 object-contain opacity-95"
            draggable={false}
          />
          <span
            className="truncate text-[8px] font-semibold uppercase tracking-wider"
            style={{ color: theme.accent }}
          >
            {agent.role}
          </span>
        </div>
        <div
          className={[
            'border-t border-white/15',
            compact ? 'mt-0.5 pt-0.5' : 'mt-1 pt-1',
          ].join(' ')}
        >
          <div
            className="truncate text-center text-[8px] leading-tight"
            style={{ color: '#ffffff' }}
          >
            {agent.origin} — {agent.kind}
          </div>
        </div>
      </div>
    </button>
  )
}

function FitAgentGrid({
  immersive,
  count,
  children,
}: {
  immersive: boolean
  count: number
  children: (layout: {
    sizePx: number
    portraitH: number
  }) => ReactNode[]
}) {
  const shelfRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState({
    sizePx: GW_CARD_MAX_PX,
    cols: Math.max(1, count),
    gapX: GW_CARD_GAP_PX,
    portraitH: idealGuessWhoPortraitH(GW_CARD_MAX_PX),
  })

  useLayoutEffect(() => {
    const board = boardRef.current
    const shelf = shelfRef.current
    if (!board) return

    const measure = () => {
      const style = getComputedStyle(board)
      const padX =
        parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      const padY =
        parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
      const availW = board.clientWidth - padX
      // Ceiling from the shelf (remaining theater space), not the board itself —
      // so the board can hug content and only shrink portraits when it would overflow.
      const availH =
        immersive && shelf
          ? Math.max(0, shelf.clientHeight - padY)
          : 0
      setLayout(fitGuessWhoLayout(availW, availH, count))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(board)
    if (shelf) ro.observe(shelf)
    return () => ro.disconnect()
  }, [immersive, count])

  const rows = chunkRows(
    children({ sizePx: layout.sizePx, portraitH: layout.portraitH }),
    layout.cols,
  )

  return (
    <div
      ref={shelfRef}
      className={
        immersive ? 'mt-2 flex min-h-0 flex-1 flex-col' : 'mt-2'
      }
    >
      <div
        ref={boardRef}
        className={[
          'rounded-2xl border-2 border-[#2a5a8f]/80 bg-[#1e4d7b]/35 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-2.5',
          immersive ? 'max-h-full overflow-y-auto' : '',
        ].join(' ')}
      >
        <div
          className="flex w-full flex-col"
          style={{ gap: GW_CARD_GAP_PX }}
        >
          {rows.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className="flex w-full justify-center"
              style={{ gap: layout.gapX }}
            >
              {row}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CatGuessWho({ onClose }: { onClose: () => void }) {
  const {
    game,
    ready,
    uid,
    actorUid,
    mySeat,
    bothPicked,
    awaitingFirst,
    canPick,
    canFlip,
    canGuess,
    canPass,
    commitGame,
    resetGame,
  } = useSharedGuessWho()
  const [newGameOpen, setNewGameOpen] = useState(false)
  const [draftSecret, setDraftSecret] = useState<string | null>(null)
  const [guessMode, setGuessMode] = useState(false)
  const [pendingGuessId, setPendingGuessId] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<ValorantRole | 'All'>('All')
  const [query, setQuery] = useState('')
  const [razeArmed, setRazeArmed] = useState(false)
  const debugSolo = isGuessWhoDebugEnabled()
  const debugSeededRef = useRef(false)

  // TEMP: overwrite room doc into a solo playable board once per mount.
  useEffect(() => {
    if (!debugSolo || !ready || debugSeededRef.current) return
    debugSeededRef.current = true
    if (game.hotseat && game.phase === 'playing' && bothPicked) return
    void resetGame({ hotseat: true })
  }, [debugSolo, ready, game.hotseat, game.phase, bothPicked, resetGame])

  const boardSeat: 0 | 1 | null = (() => {
    if (game.hotseat) {
      if (game.phase === 'picking' && !bothPicked) {
        return game.seats[0].secretId ? 1 : 0
      }
      return seatForUid(game.turnUid)
    }
    return mySeat
  })()

  const board = boardSeat != null ? game.seats[boardSeat] : game.seats[0]
  const flipUid =
    boardSeat != null
      ? game.hotseat
        ? JENGA_PLAYER_UIDS[boardSeat]!
        : actorUid
      : actorUid

  const mySecret =
    mySeat != null ? agentById(game.seats[mySeat].secretId) : null
  const hotseatSecret =
    game.hotseat && boardSeat != null
      ? agentById(game.seats[boardSeat].secretId)
      : null
  const shownSecret = game.hotseat ? hotseatSecret : mySecret

  const skillActorUid = game.hotseat
    ? (boardSeat != null ? JENGA_PLAYER_UIDS[boardSeat]! : actorUid)
    : actorUid

  const filteredAgents = useMemo(() => {
    const q = query.trim().toLowerCase()
    return VALORANT_AGENTS.filter((a) => {
      if (roleFilter !== 'All' && a.role !== roleFilter) return false
      if (
        q &&
        !a.name.toLowerCase().includes(q) &&
        !a.role.toLowerCase().includes(q) &&
        !a.origin.toLowerCase().includes(q) &&
        !a.kind.toLowerCase().includes(q)
      ) {
        return false
      }
      return true
    })
  }, [roleFilter, query])

  const turnSeat = seatForUid(game.turnUid)
  const winnerSeat =
    game.winnerUid != null ? seatForUid(game.winnerUid) : null
  const remaining = remainingAgentCount(board)
  const remainingPct = Math.round((remaining / VALORANT_AGENTS.length) * 100)

  const oppUid =
    mySeat != null
      ? JENGA_PLAYER_UIDS[mySeat === 0 ? 1 : 0]!
      : game.hotseat && boardSeat != null
        ? JENGA_PLAYER_UIDS[boardSeat === 0 ? 1 : 0]!
        : null
  const intelRole = oppUid ? game.revealedRoleByUid[oppUid] : undefined
  const intelHalf = oppUid ? game.nameHalfByUid[oppUid] : undefined

  useEffect(() => {
    if (!guessMode) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setGuessMode(false)
        setPendingGuessId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [guessMode])

  useEffect(() => {
    if (game.phase !== 'playing') {
      setGuessMode(false)
      setPendingGuessId(null)
      setRazeArmed(false)
    }
  }, [game.phase, game.roundId])

  const statusLabel = (() => {
    if (!ready) return 'Syncing…'
    if (game.phase === 'finished') {
      if (game.lastGuess && !game.lastGuess.correct) {
        const name = agentById(game.lastGuess.agentId)?.name ?? 'agent'
        return `Wrong guess (${name}) — ${
          winnerSeat === mySeat ? 'you win' : 'opponent wins'
        }`
      }
      if (game.hotseat && winnerSeat != null) {
        return `P${winnerSeat + 1} wins!`
      }
      return mySeat === winnerSeat ? 'You win!' : 'Opponent wins'
    }
    if (game.phase === 'picking') {
      if (awaitingFirst) return 'Who asks first?'
      if (game.hotseat) {
        return boardSeat === 0
          ? 'P1 — pick your secret agent'
          : 'P2 — pick your secret agent'
      }
      if (mySeat != null && game.seats[mySeat].secretId) {
        return 'Waiting for opponent to pick…'
      }
      return 'Pick your secret agent'
    }
    if (razeArmed) return 'Raze — tap a role chip to nuke'
    if (canGuess) {
      return guessMode
        ? 'Guess armed — tap their agent'
        : 'Your turn — ask, flip, or guess'
    }
    if (turnSeat != null) {
      return game.hotseat
        ? `P${turnSeat + 1}'s turn`
        : 'Waiting for opponent'
    }
    return 'Waiting…'
  })()

  const statusTone =
    game.phase === 'finished'
      ? mySeat === winnerSeat
        ? 'win'
        : 'danger'
      : guessMode
        ? 'danger'
        : 'ready'

  const onAgentClick = (agentId: string) => {
    if (canPick) {
      setDraftSecret(agentId)
      return
    }
    if (game.phase !== 'playing' || boardSeat == null) return
    if (guessMode && canGuess) {
      setPendingGuessId(agentId)
      return
    }
    if (canFlip) {
      void commitGame(
        (prev) => toggleGuessWhoFlip(prev, flipUid, agentId) ?? prev,
      )
    }
  }

  const lockSecret = () => {
    if (!canPick || !draftSecret) return
    void commitGame(
      (prev) => pickGuessWhoSecret(prev, actorUid, draftSecret) ?? prev,
    )
    setDraftSecret(null)
  }

  const pickRandomSecret = () => {
    if (!canPick) return
    const pool = VALORANT_AGENTS
    const pick = pool[Math.floor(Math.random() * pool.length)]
    if (pick) setDraftSecret(pick.id)
  }

  const fireSkill = (skill: GuessWhoSkillId, role?: ValorantRole) => {
    if (skill === 'raze' && !role) {
      setRazeArmed(true)
      setGuessMode(false)
      return
    }
    void commitGame(
      (prev) => useGuessWhoSkill(prev, skillActorUid, skill, { role }) ?? prev,
    )
    setRazeArmed(false)
  }

  const pendingGuessAgent = agentById(pendingGuessId)

  return (
    <ArcadeStage
      title="Guess Who"
      onClose={onClose}
      meta={<ArcadeStatus tone={statusTone}>{statusLabel}</ArcadeStatus>}
    >
      {({ immersive }) => (
        <div
          className={[
            immersive ? 'flex min-h-0 flex-1 flex-col' : '',
            'gap-0',
          ].join(' ')}
        >
          {immersive ? null : (
            <div className="mt-2 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent px-3.5 py-3">
              <p className="text-[11px] leading-relaxed text-muted">
                Secret agent. Yes/no questions. Flip faces. Final guess is
                sudden death — wrong answer loses. Skills are optional chaos.
              </p>
            </div>
          )}

          {debugSolo ? (
            <div className="mt-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-[11px] text-amber-100">
              DEBUG Guess Who solo — hotseat board auto-seeded. Flip{' '}
              <code className="text-amber-50">appConfig.debugGuessWho</code> (and{' '}
              <code className="text-amber-50">debug</code>) off in{' '}
              <code className="text-amber-50">src/config.ts</code> before shipping.
            </div>
          ) : null}

          <NewGameConfirm
            open={newGameOpen}
            onClose={() => setNewGameOpen(false)}
            onConfirm={(opts) => {
              setDraftSecret(null)
              setGuessMode(false)
              setPendingGuessId(null)
              setRazeArmed(false)
              void resetGame(opts)
            }}
            blurb="Fresh board — both of you pick new secret agents."
          />

          <ConfirmDialog
            open={pendingGuessAgent != null}
            title={`Guess ${pendingGuessAgent?.name ?? 'them'}?`}
            body="Wrong final guess loses the round. No take-backs."
            confirmLabel="Lock guess"
            danger
            onConfirm={() => {
              if (!pendingGuessId) return
              void commitGame(
                (prev) =>
                  guessGuessWhoAgent(prev, actorUid, pendingGuessId) ?? prev,
              )
              setPendingGuessId(null)
              setGuessMode(false)
            }}
            onClose={() => setPendingGuessId(null)}
          />

          {awaitingFirst ? (
            <div className="mt-6">
              <GameSeatPicker
                prompt="Who asks first?"
                optionLabel={(name) => `${name} asks first`}
                onPick={(seat) =>
                  void commitGame(
                    (prev) => selectGuessWhoFirst(prev, seat) ?? prev,
                  )
                }
              />
            </div>
          ) : (
            <>
              {/* Status + controls in one compact bar */}
              <div className="mt-2 shrink-0 space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    {([0, 1] as const).map((seat) => {
                      const isTurn =
                        game.phase === 'playing' && turnSeat === seat
                      const picked = Boolean(game.seats[seat].secretId)
                      const label = game.hotseat
                        ? seat === 0
                          ? 'P1'
                          : 'P2'
                        : JENGA_PLAYER_UIDS[seat] === uid
                          ? 'You'
                          : householdName(JENGA_PLAYER_UIDS[seat]!)
                      const left = remainingAgentCount(game.seats[seat])
                      const status =
                        game.phase === 'picking'
                          ? picked
                            ? 'Locked'
                            : 'Picking…'
                          : `${left} up`
                      return (
                        <span
                          key={seat}
                          className={[
                            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
                            isTurn
                              ? 'border-golden/45 bg-golden/10 text-golden'
                              : 'border-white/10 bg-white/[0.04] text-white',
                          ].join(' ')}
                        >
                          <span className="font-semibold">{label}</span>
                          <span className="text-muted">{status}</span>
                        </span>
                      )
                    })}
                    {shownSecret ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-50">
                        <img
                          src={shownSecret.icon}
                          alt=""
                          className="size-4 rounded object-cover"
                          draggable={false}
                        />
                        <span className="font-semibold">{shownSecret.name}</span>
                      </span>
                    ) : null}
                    {game.hotseat ? (
                      <span className="rounded-full border border-amber-400/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-100">
                        Hotseat
                      </span>
                    ) : null}
                    {intelRole ? (
                      <span className="rounded-full border border-sky-400/35 bg-sky-500/15 px-2 py-0.5 text-[10px] text-sky-100">
                        Role {intelRole}
                      </span>
                    ) : null}
                    {intelHalf ? (
                      <span className="rounded-full border border-amber-400/35 bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-100">
                        Name {intelHalf === 'early' ? 'A–M' : 'N–Z'}
                      </span>
                    ) : null}
                    {game.lastSkill ? (
                      <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[10px] text-muted">
                        {game.lastSkill.uid === uid
                          ? 'You'
                          : householdName(game.lastSkill.uid)}
                        : {game.lastSkill.note}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setNewGameOpen(true)}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-white hover:border-white/25"
                    >
                      New game
                    </button>
                    <SurrenderButton
                      disabled={!uid || game.phase !== 'playing'}
                      className="rounded-lg border px-2 py-1 text-[11px] font-medium disabled:opacity-40"
                      style={{
                        backgroundColor: '#4c0519',
                        borderColor: '#fb7185',
                        color: '#ffffff',
                      }}
                      onSurrender={() =>
                        void commitGame(
                          (prev) =>
                            surrenderGuessWho(prev, actorUid) ?? prev,
                        )
                      }
                    />
                  </div>
                </div>

                {game.phase === 'picking' ? (
                  <>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search agents…"
                        className="min-w-[8rem] flex-1 rounded-xl border border-white/10 bg-black/20 px-2.5 py-1.5 text-xs text-white placeholder:text-muted focus:border-white/25 focus:outline-none"
                      />
                      {canPick ? (
                        <>
                          <button
                            type="button"
                            onClick={pickRandomSecret}
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-muted hover:text-white"
                          >
                            Random
                          </button>
                          <button
                            type="button"
                            disabled={!draftSecret}
                            onClick={lockSecret}
                            className="rounded-xl border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40"
                            style={{
                              backgroundColor: '#064e3b',
                              borderColor: '#34d399',
                              color: '#ffffff',
                            }}
                          >
                            Lock in
                          </button>
                        </>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {ROLES.map((role) => {
                        const meta =
                          role === 'All' ? null : VALORANT_ROLE_META[role]
                        const active = roleFilter === role
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setRoleFilter(role)}
                            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition"
                            style={
                              meta
                                ? {
                                    backgroundColor: active
                                      ? meta.bar
                                      : meta.barDark,
                                    borderColor: meta.border,
                                    color: '#ffffff',
                                  }
                                : {
                                    backgroundColor: active
                                      ? '#1a3d6d'
                                      : '#0f3d72',
                                    borderColor: active
                                      ? '#5ba3e0'
                                      : '#3d7ab8',
                                    color: '#ffffff',
                                  }
                            }
                          >
                            {meta ? (
                              <img
                                src={meta.icon}
                                alt=""
                                className="size-3.5 object-contain"
                                draggable={false}
                              />
                            ) : null}
                            {role}
                          </button>
                        )
                      })}
                    </div>
                  </>
                ) : null}

                {game.phase === 'playing' ? (
                  <>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className="flex min-w-[7rem] max-w-[14rem] flex-1 items-center gap-2">
                        <span className="shrink-0 text-[10px] text-muted">
                          {remaining}/{VALORANT_AGENTS.length}
                        </span>
                        <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400/80 to-golden/80 transition-[width] duration-300"
                            style={{ width: `${remainingPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {razeArmed ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {(
                          [
                            'Duelist',
                            'Initiator',
                            'Controller',
                            'Sentinel',
                          ] as const
                        ).map((role) => {
                          const meta = VALORANT_ROLE_META[role]
                          return (
                            <button
                              key={role}
                              type="button"
                              onClick={() => fireSkill('raze', role)}
                              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                              style={{
                                backgroundColor: '#7c2d12',
                                borderColor: '#fb923c',
                                color: '#ffffff',
                              }}
                            >
                              <img
                                src={meta.icon}
                                alt=""
                                className="size-3.5 object-contain"
                                draggable={false}
                              />
                              Nuke {role}
                            </button>
                          )
                        })}
                        <button
                          type="button"
                          onClick={() => setRazeArmed(false)}
                          className="rounded-full border px-2.5 py-1 text-[11px]"
                          style={{
                            backgroundColor: '#0b1220',
                            borderColor: '#475569',
                            color: '#ffffff',
                          }}
                        >
                          Cancel Raze
                        </button>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-1">
                      {GUESS_WHO_SKILLS.map((skill) => {
                        const used = hasUsedGuessWhoSkill(
                          game,
                          skillActorUid,
                          skill.id,
                        )
                        const skillDisabled =
                          used ||
                          game.phase !== 'playing' ||
                          (!game.hotseat && uid !== skillActorUid)
                        return (
                          <button
                            key={skill.id}
                            type="button"
                            disabled={skillDisabled}
                            title={skill.blurb}
                            onClick={() => fireSkill(skill.id)}
                            className={[
                              'rounded-full border px-2 py-0.5 text-[11px] font-medium transition',
                              used
                                ? 'border-white/5 bg-transparent text-muted/50 line-through'
                                : skill.cls,
                              skillDisabled && !used ? 'opacity-40' : '',
                            ].join(' ')}
                          >
                            {skill.label}
                          </button>
                        )
                      })}
                    </div>
                  </>
                ) : null}
              </div>

              {game.phase === 'finished' &&
              game.seats[0].secretId &&
              game.seats[1].secretId ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {([0, 1] as const).map((seat) => {
                    const agent = agentById(game.seats[seat].secretId)
                    if (!agent) return null
                    const won = winnerSeat === seat
                    return (
                      <div
                        key={seat}
                        className={[
                          'flex items-center gap-3 rounded-2xl border px-3 py-2.5',
                          won
                            ? 'border-golden/40 bg-golden/10'
                            : 'border-white/10 bg-white/[0.04]',
                        ].join(' ')}
                      >
                        <img
                          src={agent.icon}
                          alt=""
                          className="size-12 rounded-xl object-cover ring-1 ring-white/15"
                          draggable={false}
                        />
                        <div className="min-w-0">
                          <div className="text-[10px] text-muted">
                            {game.hotseat
                              ? `P${seat + 1}`
                              : JENGA_PLAYER_UIDS[seat] === uid
                                ? 'You'
                                : householdName(JENGA_PLAYER_UIDS[seat]!)}
                            {won ? ' · winner' : ''}
                          </div>
                          <div className="truncate text-sm font-semibold text-white">
                            {agent.name}
                          </div>
                          <div className="text-[11px] text-muted">
                            {agent.role}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : null}

              {game.phase === 'picking' ? (
                <>
                  <FitAgentGrid
                    immersive={immersive}
                    count={filteredAgents.length}
                  >
                    {({ sizePx, portraitH }) =>
                      filteredAgents.map((agent) => {
                        const isDraft = draftSecret === agent.id
                        return (
                          <AgentCard
                            key={agent.id}
                            agent={agent}
                            sizePx={sizePx}
                            portraitH={portraitH}
                            selected={isDraft}
                            disabled={!canPick}
                            onClick={() => onAgentClick(agent.id)}
                          />
                        )
                      })
                    }
                  </FitAgentGrid>
                  {filteredAgents.length === 0 ? (
                    <p className="mt-4 text-center text-xs text-muted">
                      No agents match — clear search or role filter.
                    </p>
                  ) : null}
                </>
              ) : (
                <GuessWhoBoard3D
                  immersive={immersive}
                  agents={VALORANT_AGENTS}
                  flippedIds={board.flipped}
                  secretId={
                    game.hotseat || mySeat === boardSeat
                      ? board.secretId
                      : null
                  }
                  selectedId={null}
                  guessArmed={guessMode && canGuess}
                  canGuess={canGuess}
                  canPass={canPass}
                  canToggleFlip={canFlip}
                  disabled={
                    game.phase === 'finished' ||
                    (!canFlip && !(guessMode && canGuess))
                  }
                  onAgentClick={onAgentClick}
                  onToggleGuess={() => {
                    setRazeArmed(false)
                    setGuessMode((v) => !v)
                  }}
                  onPass={() => {
                    setGuessMode(false)
                    setRazeArmed(false)
                    void commitGame(
                      (prev) => passGuessWhoTurn(prev, actorUid) ?? prev,
                    )
                  }}
                  onToggleFlip={(agentId) => {
                    if (!canFlip) return
                    void commitGame(
                      (prev) =>
                        toggleGuessWhoFlip(prev, flipUid, agentId) ?? prev,
                    )
                  }}
                />
              )}
            </>
          )}
        </div>
      )}
    </ArcadeStage>
  )
}
