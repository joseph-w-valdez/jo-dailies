import { useEffect, useRef, useState } from 'react'
import { useSharedSpike } from '../hooks/useSharedSpike'
import { householdName } from '../lib/household'
import { JENGA_PLAYER_UIDS } from '../lib/jenga'
import {
  buySpikeGun,
  canPlaySpikeCard,
  canPlaySpikeSite,
  confirmSpikeBuyIfReady,
  fighter,
  persistLabel,
  playSpikeCard,
  playSpikeSite,
  roundReasonLabel,
  selectSpikeFirst,
  setSpikeAgent,
  setSpikeAgentReady,
  setSpikeBuyReady,
  siteLine,
  spikeAgents,
  spikeAgentsLocked,
  spikeAgentUniques,
  spikeCard,
  spikeCardEffectSummary,
  spikeCardNeed,
  spikeGun,
  spikeUltCard,
  SPIKE_DRAW_PER_TURN,
  SPIKE_ENCOUNTERS_TO_SITE,
  SPIKE_GUNS,
  SPIKE_HAND_SIZE,
  SPIKE_LOSS_INCOME,
  SPIKE_MAX_HP,
  SPIKE_ROUNDS_TO_WIN,
  SPIKE_SPECIAL_ORB_CHANCE,
  SPIKE_START_CREDITS,
  SPIKE_ULT_COST,
  SPIKE_WIN_INCOME,
  startNextSpikeRound,
  type SpikeFighter,
  type SpikeGunId,
  type SpikeMatch,
  type SpikeSiteAction,
} from '../lib/spike'
import { spikeCardFlavor } from '../lib/spikeCardFlavor'
import { agentById } from '../lib/valorantAgents'
import { ArcadeStage, ArcadeStatus } from './ArcadeStage'
import { GameSeatPicker } from './GameSeatPicker'
import { NewGameConfirm } from './NewGameConfirm'
import { SpikeD20, type SpikeDiceRoll } from './SpikeD20'

/** Fixed match board width — height can grow with buy / play / round-over. */
const SPIKE_BOARD_W = 512

const SPIKE_KIND_CARD_TONE: Record<
  string,
  { idle: string; hover: string }
> = {
  action: {
    idle: 'border-rose-500/45 bg-rose-500/15',
    hover: 'hover:border-rose-500/65 hover:bg-rose-500/25',
  },
  util: {
    idle: 'border-amber-500/45 bg-amber-500/15',
    hover: 'hover:border-amber-500/65 hover:bg-amber-500/25',
  },
  info: {
    idle: 'border-sky-500/45 bg-sky-500/15',
    hover: 'hover:border-sky-500/65 hover:bg-sky-500/25',
  },
  persist: {
    idle: 'border-violet-500/45 bg-violet-500/15',
    hover: 'hover:border-violet-500/65 hover:bg-violet-500/25',
  },
  heal: {
    idle: 'border-emerald-500/45 bg-emerald-500/15',
    hover: 'hover:border-emerald-500/65 hover:bg-emerald-500/25',
  },
  plant: {
    idle: 'border-orange-500/45 bg-orange-500/15',
    hover: 'hover:border-orange-500/65 hover:bg-orange-500/25',
  },
  defuse: {
    idle: 'border-teal-500/45 bg-teal-500/15',
    hover: 'hover:border-teal-500/65 hover:bg-teal-500/25',
  },
  ult: {
    idle: 'border-fuchsia-500/45 bg-fuchsia-500/15',
    hover: 'hover:border-fuchsia-500/65 hover:bg-fuchsia-500/25',
  },
}

function spikeKindCardClass(kind: string, disabled: boolean): string {
  const tone = SPIKE_KIND_CARD_TONE[kind] ?? {
    idle: 'border-border bg-surface',
    hover: 'hover:border-sky-500/50 hover:bg-sky-500/10',
  }
  if (disabled) {
    return `cursor-default opacity-55 ${tone.idle}`
  }
  return `${tone.idle} ${tone.hover}`
}

const SPIKE_KIND_LEGEND: { kind: string; label: string; blurb: string }[] = [
  {
    kind: 'action',
    label: 'Action',
    blurb: 'Gun peeks & swings. Damage / need scale with your gun.',
  },
  {
    kind: 'util',
    label: 'Util',
    blurb: 'Abilities that chip or clear their hold / smoke / trap.',
  },
  {
    kind: 'info',
    label: 'Info',
    blurb: 'Soft peeks, intel, orbs, stalls — usually lighter damage.',
  },
  {
    kind: 'persist',
    label: 'Persist',
    blurb: 'Set a hold: angle, smoke, trap, or molly.',
  },
  {
    kind: 'heal',
    label: 'Heal',
    blurb: 'Patch your HP on a successful roll.',
  },
  {
    kind: 'plant',
    label: 'Plant (site)',
    blurb: 'ATK site button after encounter unlock. Starts the timer.',
  },
  {
    kind: 'defuse',
    label: 'Defuse / Tap',
    blurb: 'DEF site buttons after unlock. Defuse wins; Tap fakes pressure.',
  },
  {
    kind: 'ult',
    label: 'Ult',
    blurb: 'Sticky agent power. Costs a full ult meter to cast.',
  },
]

function SpikeRulesPanel({ className }: { className?: string }) {
  return (
    <aside
      className={[
        'w-full rounded-xl border border-border bg-surface/50 p-3 lg:max-w-none lg:justify-self-end',
        className ?? '',
      ].join(' ')}
    >
      <div className="space-y-3 text-xs leading-relaxed text-muted">
        <section>
          <p className="font-medium text-white">Goal</p>
          <p>
            Shared 2P card duel. First to {SPIKE_ROUNDS_TO_WIN} rounds wins the
            match. Each turn you play one card and roll a d20 — hit the
            card&apos;s <span className="text-white">need</span> (or higher) to
            succeed.
          </p>
        </section>
        <section>
          <p className="font-medium text-white">Win a round by</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>Dropping the enemy to 0 HP (elimination)</li>
            <li>Planting the spike and letting the timer hit 0 (ATK)</li>
            <li>Defusing a live spike (DEF)</li>
          </ul>
        </section>
        <section>
          <p className="font-medium text-white">Spike plant / defuse</p>
          <p>
            Land{' '}
            <span className="text-white">
              {SPIKE_ENCOUNTERS_TO_SITE} successful card hits
            </span>{' '}
            this round to unlock site tools. ATK unlocks{' '}
            <span className="text-white">Plant</span>; DEF unlocks{' '}
            <span className="text-white">Defuse</span> and{' '}
            <span className="text-white">Tap</span> (fake pressure that can shave
            the timer). Site buttons stay available once unlocked — they are not
            deck cards.
          </p>
        </section>
        <section>
          <p className="font-medium text-white">Money & guns</p>
          <p>
            Start with ${SPIKE_START_CREDITS} and a Classic. Each round has a
            buy phase — pick a gun; better guns raise damage and can change
            need. Credits carry. Round win +${SPIKE_WIN_INCOME}, loss +$
            {SPIKE_LOSS_INCOME}.
          </p>
        </section>
        <section>
          <p className="font-medium text-white">Hands & uniques</p>
          <p>
            Hand size {SPIKE_HAND_SIZE}. After each play you draw{' '}
            {SPIKE_DRAW_PER_TURN}, then trim back to {SPIKE_HAND_SIZE}. One card
            in every deal/refill is special:{' '}
            {Math.round(SPIKE_SPECIAL_ORB_CHANCE * 100)}% Grab Ult Orb, otherwise
            one of your agent uniques. Uniques are yours only. Plant / Defuse / Tap are site buttons
            unlocked by encounter hits — not deck cards.
          </p>
        </section>
        <section>
          <p className="font-medium text-white">Ult meter</p>
          <p>
            Fill {SPIKE_ULT_COST} orbs (orb / plant / defuse / round results).
            When full, your sticky ult appears — spend the meter to cast it.
          </p>
        </section>
        <section>
          <p className="mb-1.5 font-medium text-white">Card colors</p>
          <ul className="grid grid-cols-2 gap-1.5">
            {SPIKE_KIND_LEGEND.map((row) => (
              <li
                key={row.kind}
                className={[
                  'rounded-md border px-2 py-1.5',
                  SPIKE_KIND_CARD_TONE[row.kind]?.idle ??
                    'border-border bg-surface',
                ].join(' ')}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white">
                  {row.label}
                </p>
                <p className="text-[11px] text-muted">{row.blurb}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  )
}

function HpBar({ hp }: { hp: number }) {
  const pct = Math.max(0, Math.min(100, (hp / SPIKE_MAX_HP) * 100))
  const color =
    pct > 55 ? 'bg-emerald-500' : pct > 25 ? 'bg-amber-400' : 'bg-rose-500'
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function UltOrbs({
  charge,
  encounters,
}: {
  charge: number
  encounters: number
}) {
  const ready = charge >= SPIKE_ULT_COST
  const siteReady = encounters >= SPIKE_ENCOUNTERS_TO_SITE
  return (
    <div className="mt-1.5 flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-[#57534e]">Ult</span>
        <div
          className="flex items-center gap-1"
          aria-label={`Ult ${charge} of ${SPIKE_ULT_COST}`}
        >
          {Array.from({ length: SPIKE_ULT_COST }, (_, i) => {
            const filled = i < charge
            return (
              <span
                key={i}
                className={[
                  'inline-block size-2.5 rounded-full border',
                  filled
                    ? ready
                      ? 'border-sky-600 bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.45)]'
                      : 'border-violet-500 bg-violet-500'
                    : 'border-stone-400/70 bg-white/50',
                ].join(' ')}
              />
            )
          })}
        </div>
      </div>
      <span
        className={[
          'shrink-0 text-[10px] tabular-nums',
          siteReady ? 'font-medium text-[#0f766e]' : 'text-[#57534e]',
        ].join(' ')}
        aria-label={`Site ${encounters} of ${SPIKE_ENCOUNTERS_TO_SITE}`}
      >
        Site {encounters}/{SPIKE_ENCOUNTERS_TO_SITE}
      </span>
    </div>
  )
}

type SpikeLogEntry = SpikeMatch['log'][number]
type LogTone = 'p0' | 'p1' | 'system'

const P0 = JENGA_PLAYER_UIDS[0]!
const P1 = JENGA_PLAYER_UIDS[1]!
const P0_NAME = householdName(P0)
const P1_NAME = householdName(P1)

/** Start a new visual group on each decision / phase break. */
function isLogDecisionStart(text: string): boolean {
  return (
    new RegExp(`^(${P0_NAME}|${P1_NAME}) play `).test(text) ||
    new RegExp(`^(${P0_NAME}|${P1_NAME}) equips? `).test(text) ||
    new RegExp(`^(${P0_NAME}|${P1_NAME}) ult `).test(text) ||
    /^Buy phase —/.test(text) ||
    /^— Buy phase —/.test(text) ||
    /^Sides locked —/.test(text) ||
    /^Round live —/.test(text) ||
    /^Income —/.test(text) ||
    /^Round over/.test(text) ||
    /^Match over/.test(text) ||
    /wins the round/.test(text) ||
    /eliminated/.test(text) ||
    /Spike detonates/.test(text) ||
    /Spike defused/.test(text)
  )
}

function groupSpikeLog(log: SpikeLogEntry[]): SpikeLogEntry[][] {
  const groups: SpikeLogEntry[][] = []
  for (const entry of log) {
    if (groups.length === 0 || isLogDecisionStart(entry.text)) {
      groups.push([entry])
    } else {
      groups[groups.length - 1]!.push(entry)
    }
  }
  return groups
}

function logGroupTone(group: SpikeLogEntry[]): LogTone {
  const head = group[0]?.text ?? ''
  if (head.startsWith(P0_NAME)) return 'p0'
  if (head.startsWith(P1_NAME)) return 'p1'
  return 'system'
}

const LOG_TONE_CARD: Record<LogTone, string> = {
  p0: 'border-sky-400/55 bg-[#e8eef6]',
  p1: 'border-rose-400/50 bg-[#f3eaea]',
  system: 'border-border bg-[#eceae6]',
}

function seatTone(uid: string): LogTone {
  return uid === P0 ? 'p0' : uid === P1 ? 'p1' : 'system'
}

/** Light accents on paper cards — keep sparse for readability. */
function logLineClass(text: string, hasRoll: boolean): string {
  if (hasRoll || /^d20=/.test(text)) return 'text-[#0369a1]'
  if (/\$|Income —|equips? /.test(text)) return 'text-[#0f766e]'
  if (/\bult\b/i.test(text)) return 'text-[#6b21a8]'
  if (/^Heal /.test(text)) return 'text-[#166534]'
  if (
    /^(Hit |Graze )|Trap springs|Molly chips|Reaction hits|eliminated|detonates/.test(
      text,
    )
  ) {
    return 'text-[#9f1239]'
  }
  if (/fails|whiffs|Reaction whiffs/.test(text)) return 'text-[#78716c]'
  if (
    /Persist:|Spike |timer|Clock wasted|hold cleared|Safe orb|Round live|Buy phase|Sides locked|Match over|wins the round|defused|planted/.test(
      text,
    )
  ) {
    return 'text-[#0c4a6e]'
  }
  if (
    new RegExp(`^(${P0_NAME}|${P1_NAME}) play |ult spent`).test(text)
  ) {
    return 'font-medium text-[#1c1917]'
  }
  return 'text-[#1c1917]'
}

function newLogEntries(
  prev: SpikeLogEntry[],
  next: SpikeLogEntry[],
): SpikeLogEntry[] {
  if (prev.length === 0) return next
  const maxK = Math.min(prev.length, next.length)
  for (let k = maxK; k >= 0; k -= 1) {
    let ok = true
    for (let i = 0; i < k; i += 1) {
      const a = prev[prev.length - k + i]!
      const b = next[i]!
      if (a.text !== b.text || a.roll !== b.roll) {
        ok = false
        break
      }
    }
    if (ok) return next.slice(k)
  }
  return next
}

function FighterPanel({
  seatUid,
  f,
}: {
  seatUid: string
  f: SpikeFighter
}) {
  const agent = agentById(f.agentId)
  return (
    <div
      className={[
        'rounded-xl border border-l-[3px] p-3',
        LOG_TONE_CARD[seatTone(seatUid)],
      ].join(' ')}
    >
      <div className="mb-2 flex items-center gap-2">
        {agent ? (
          <img
            src={agent.icon}
            alt=""
            className="size-8 rounded object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#1c1917]">
            {householdName(seatUid)} · {agent?.name ?? '—'} (
            {f.side.toUpperCase()})
          </p>
          <p className="text-[11px] tabular-nums text-[#57534e]">
            {f.hp} HP · {spikeGun(f.gunId).name} · ${f.credits}
            {f.persist ? ` · ${persistLabel(f.persist)}` : ''}
          </p>
        </div>
      </div>
      <HpBar hp={f.hp} />
      <UltOrbs charge={f.ultCharge} encounters={f.encounters} />
    </div>
  )
}

export function CatSpike({ onClose }: { onClose: () => void }) {
  const {
    game,
    ready,
    uid,
    actorUid,
    me,
    canPlay,
    canBuy,
    commitGame,
    resetGame,
  } = useSharedSpike()
  const agents = spikeAgents()
  const [newGameOpen, setNewGameOpen] = useState(true)
  const [hotseatBuyUid, setHotseatBuyUid] = useState<string>(P0)
  const [diceRoll, setDiceRoll] = useState<SpikeDiceRoll | null>(null)
  const [pendingCardId, setPendingCardId] = useState<string | null>(null)
  const [pendingSiteAction, setPendingSiteAction] =
    useState<SpikeSiteAction | null>(null)
  const pendingRollRef = useRef<number | null>(null)
  const logPanelRef = useRef<HTMLElement | null>(null)
  const prevLogRef = useRef<SpikeLogEntry[]>([])
  const rollQueue = useRef<number[]>([])
  const diceBusy = useRef(false)
  const diceKey = useRef(0)
  const settleTimer = useRef<number | null>(null)
  const skipNextLogRollRef = useRef<number | null>(null)

  const buyUid = game.hotseat ? hotseatBuyUid : uid
  const buyFighter =
    buyUid && game.fighters[buyUid] ? fighter(game, buyUid) : null

  const clearSettleTimer = () => {
    if (settleTimer.current != null) {
      window.clearTimeout(settleTimer.current)
      settleTimer.current = null
    }
  }

  const pumpDice = () => {
    if (
      diceBusy.current ||
      pendingCardId != null ||
      pendingSiteAction != null
    )
      return
    const next = rollQueue.current.shift()
    if (next == null) return
    diceBusy.current = true
    diceKey.current += 1
    setDiceRoll({ result: next, key: diceKey.current })
  }

  const onDiceSettled = () => {
    if (pendingSiteAction != null && actorUid) {
      const action = pendingSiteAction
      const roll = pendingRollRef.current ?? 1
      pendingRollRef.current = null
      setPendingSiteAction(null)
      skipNextLogRollRef.current = roll
      const rollRng = () => (roll - 1) / 20
      void commitGame(
        (prev) => playSpikeSite(prev, actorUid, action, rollRng) ?? prev,
      )
    } else if (pendingCardId != null && actorUid) {
      const cardId = pendingCardId
      const roll = pendingRollRef.current ?? 1
      pendingRollRef.current = null
      setPendingCardId(null)
      skipNextLogRollRef.current = roll
      const rollRng = () => (roll - 1) / 20
      void commitGame(
        (prev) => playSpikeCard(prev, actorUid, cardId, rollRng) ?? prev,
      )
    }
    clearSettleTimer()
    settleTimer.current = window.setTimeout(() => {
      settleTimer.current = null
      diceBusy.current = false
      pumpDice()
    }, 180)
  }

  useEffect(() => {
    logPanelRef.current?.scrollTo({ top: 0 })
  }, [game.log.length])

  useEffect(() => {
    const added = newLogEntries(prevLogRef.current, game.log)
    prevLogRef.current = game.log
    const rolls = added
      .map((e) => e.roll)
      .filter((r): r is number => typeof r === 'number')
    if (!rolls.length) return
    if (
      skipNextLogRollRef.current != null &&
      rolls[0] === skipNextLogRollRef.current
    ) {
      rolls.shift()
      skipNextLogRollRef.current = null
    }
    if (!rolls.length) return
    rollQueue.current.push(...rolls)
    pumpDice()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pumpDice is stable enough via refs
  }, [game.log])

  useEffect(() => () => clearSettleTimer(), [])

  useEffect(() => {
    if (game.firstUid && game.hotseat) {
      setHotseatBuyUid(game.firstUid)
    }
  }, [game.firstUid, game.hotseat, game.roundId])

  const pickAgent = (agentId: string) => {
    if (!canBuy || !buyUid) return
    void commitGame((prev) => setSpikeAgent(prev, buyUid, agentId) ?? prev)
  }

  const lockAgent = () => {
    if (!canBuy || !buyUid || !buyFighter) return
    const nextReady = !buyFighter.agentReady
    void commitGame(
      (prev) => setSpikeAgentReady(prev, buyUid, nextReady) ?? prev,
    )
  }

  const equipGun = (gunId: SpikeGunId) => {
    if (!canBuy || !buyUid) return
    void commitGame((prev) => buySpikeGun(prev, buyUid, gunId) ?? prev)
  }

  const readyBuy = () => {
    if (!canBuy || !buyUid) return
    void commitGame((prev) => {
      const marked = setSpikeBuyReady(prev, buyUid, true) ?? prev
      return confirmSpikeBuyIfReady(marked, Math.random)
    })
  }

  const agentsLocked = spikeAgentsLocked(game)

  const queueSiteAction = (action: SpikeSiteAction) => {
    if (!actorUid || !canPlay) return
    if (canPlaySpikeSite(game, actorUid, action) != null) return
    if (diceBusy.current || pendingCardId != null || pendingSiteAction != null)
      return
    const roll = 1 + Math.floor(Math.random() * 20)
    pendingRollRef.current = roll
    setPendingSiteAction(action)
    diceBusy.current = true
    diceKey.current += 1
    setDiceRoll({ result: roll, key: diceKey.current })
  }

  const play = (cardId: string) => {
    if (
      !canPlay ||
      !actorUid ||
      pendingCardId != null ||
      pendingSiteAction != null
    )
      return
    if (canPlaySpikeCard(game, actorUid, cardId) != null) return
    if (diceBusy.current) return
    const roll = 1 + Math.floor(Math.random() * 20)
    pendingRollRef.current = roll
    setPendingCardId(cardId)
    diceBusy.current = true
    diceKey.current += 1
    setDiceRoll({ result: roll, key: diceKey.current })
  }

  const nextRound = () => {
    void commitGame((prev) => startNextSpikeRound(prev, Math.random))
  }

  const previewAgentId =
    game.phase === 'buy' && buyFighter
      ? buyFighter.agentId
      : (me?.agentId ?? agents[0]?.id ?? '')
  const setupAgent = agentById(previewAgentId)
  const setupUlt = spikeUltCard(previewAgentId)
  const setupUniques = spikeAgentUniques(previewAgentId)

  const scoreLabel = `${householdName(P0)} ${game.rounds[P0] ?? 0}–${
    game.rounds[P1] ?? 0
  } ${householdName(P1)}`

  const statusLabel = (() => {
    if (!ready) return 'Syncing…'
    if (game.firstUid == null) return 'Who attacks first?'
    if (game.phase === 'match_over') {
      return (
        game.matchEnd?.summary ??
        `${householdName(game.winnerUid)} wins`
      )
    }
    if (game.phase === 'round_over') {
      if (game.roundEnd) {
        return `${roundReasonLabel(game.roundEnd.reason)} — ${householdName(
          game.roundEnd.winnerUid,
        )}`
      }
      return 'Round over'
    }
    if (game.phase === 'buy') {
      if (canBuy && buyFighter) {
        if (!agentsLocked) {
          return buyFighter.agentReady
            ? `Agent locked · ${householdName(buyUid)}`
            : `Pick agent · ${householdName(buyUid)}`
        }
        return `Buy · ${householdName(buyUid)} · $${buyFighter.credits}`
      }
      return agentsLocked
        ? 'Buy guns — waiting'
        : 'Pick agents — waiting'
    }
    if (canPlay) {
      if (game.hotseat) {
        return `${householdName(game.turnUid)} — your turn`
      }
      return 'Your turn'
    }
    if (game.hotseat) {
      return `${householdName(game.turnUid)} — playing`
    }
    return `Waiting for ${householdName(game.turnUid)}`
  })()

  const tone =
    game.phase === 'match_over'
      ? game.winnerUid === uid
        ? 'win'
        : 'danger'
      : game.phase === 'round_over'
        ? game.roundEnd?.winnerUid === uid
          ? 'win'
          : 'danger'
        : 'ready'

  const showSetupColumns =
    game.firstUid != null && game.phase === 'buy'

  return (
    <ArcadeStage
      title="Spike"
      onClose={onClose}
      meta={<ArcadeStatus tone={tone}>{statusLabel}</ArcadeStatus>}
    >
      {({ immersive }) => (
        <div className={immersive ? 'flex min-h-0 flex-1 flex-col' : undefined}>
          {immersive ? null : (
            <p className="mt-2 text-xs text-muted">
              Shared Valorant card duel — Joseph vs Joha. Buy a gun each round;
              action cards scale with your loadout. First to {SPIKE_ROUNDS_TO_WIN}.
            </p>
          )}

          <div className="mt-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="tabular-nums text-white/85">{scoreLabel}</span>
              <span>(first to {game.roundsToWin})</span>
              {game.hotseat ? (
                <span className="rounded-md border border-amber-400/35 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-100">
                  Debug hotseat
                </span>
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
            blurb="Fresh Spike match — Joseph vs Joha. Pick who attacks first, then agents and guns."
          />

          {game.firstUid == null ? (
            <div className="mt-6">
              <GameSeatPicker
                prompt="Who attacks first?"
                optionLabel={(name) => `${name} ATK`}
                onPick={(seat) =>
                  void commitGame(
                    (prev) => selectSpikeFirst(prev, seat) ?? prev,
                  )
                }
              />
            </div>
          ) : (
            <div
              className={[
                'mt-3 w-full',
                immersive ? 'min-h-0 flex-1' : '',
                'flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch lg:gap-6',
              ].join(' ')}
            >
              <SpikeRulesPanel
                className={immersive ? 'min-h-0 lg:self-start' : undefined}
              />

              <div
                className={[
                  'mx-auto box-border flex w-full flex-col rounded-xl border border-border bg-surface/50 p-4',
                  immersive
                    ? 'min-h-0 flex-1 overflow-hidden'
                    : 'shrink-0',
                ].join(' ')}
                style={{ width: SPIKE_BOARD_W, maxWidth: '100%' }}
              >
                <div
                  className={[
                    'flex flex-col gap-2',
                    immersive ? 'min-h-0 flex-1' : '',
                    immersive && game.phase !== 'buy'
                      ? 'overflow-y-auto'
                      : '',
                  ].join(' ')}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                    <span className="tabular-nums">{scoreLabel}</span>
                    <span>{siteLine(game, actorUid ?? uid ?? undefined)}</span>
                  </div>

                  <div className="flex shrink-0 justify-center">
                    <SpikeD20
                      roll={diceRoll}
                      onSettled={onDiceSettled}
                      className={
                        game.phase === 'buy'
                          ? 'h-24 w-24 sm:h-28 sm:w-28'
                          : 'h-36 w-36 sm:h-40 sm:w-40'
                      }
                    />
                  </div>

                  <div className="grid shrink-0 gap-2 sm:grid-cols-2">
                    {JENGA_PLAYER_UIDS.map((seatUid) => (
                      <FighterPanel
                        key={seatUid}
                        seatUid={seatUid}
                        f={fighter(game, seatUid)}
                      />
                    ))}
                  </div>

                  {game.phase === 'buy' ? (
                    <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-xl border border-border bg-surface/60 p-3">
                      <div className="shrink-0">
                        <h2 className="text-sm font-semibold text-white">
                          {agentsLocked ? 'Buy guns' : 'Pick agents'}
                        </h2>
                        <p className="mt-1 text-xs text-muted">
                          {agentsLocked
                            ? 'Both agents are locked. Buy a gun, then Ready. Round starts when both are ready.'
                            : 'Each player locks an agent first. Gun shop opens after both lock in.'}
                        </p>
                      </div>

                      {game.hotseat ? (
                        <div className="flex shrink-0 flex-wrap gap-1.5">
                          {JENGA_PLAYER_UIDS.map((seatUid) => {
                            const f = fighter(game, seatUid)
                            const active = hotseatBuyUid === seatUid
                            return (
                              <button
                                key={seatUid}
                                type="button"
                                onClick={() => setHotseatBuyUid(seatUid)}
                                className={[
                                  'rounded-md border px-2 py-0.5 text-[10px] font-medium transition',
                                  active
                                    ? 'border-golden/55 bg-golden/25 text-app-text'
                                    : 'border-border bg-surface/60 text-muted hover:text-white',
                                ].join(' ')}
                              >
                                {householdName(seatUid)}
                                {agentsLocked
                                  ? f.buyReady
                                    ? ' ✓'
                                    : ''
                                  : f.agentReady
                                    ? ' ✓'
                                    : ''}
                              </button>
                            )
                          })}
                        </div>
                      ) : null}

                      {buyFighter && canBuy ? (
                        !agentsLocked ? (
                          <>
                            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border/60 bg-surface/40 p-1.5">
                              <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
                                {agents.map((agent) => {
                                  const selected =
                                    buyFighter.agentId === agent.id
                                  return (
                                    <button
                                      key={agent.id}
                                      type="button"
                                      disabled={buyFighter.agentReady}
                                      onClick={() => pickAgent(agent.id)}
                                      title={agent.name}
                                      className={[
                                        'flex flex-col items-center gap-1 rounded-md border px-1.5 py-2 text-[11px] leading-tight',
                                        selected
                                          ? 'border-sky-500/55 bg-sky-500/20 text-white'
                                          : 'border-border bg-surface text-muted hover:text-white',
                                        buyFighter.agentReady
                                          ? 'cursor-default opacity-55'
                                          : '',
                                      ].join(' ')}
                                    >
                                      <img
                                        src={agent.icon}
                                        alt=""
                                        className="size-9 rounded object-cover sm:size-10"
                                      />
                                      <span className="line-clamp-1 w-full text-center">
                                        {agent.name}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={lockAgent}
                              className={[
                                'w-full shrink-0 rounded-lg border px-3 py-2.5 text-sm font-medium text-rose-50 transition',
                                buyFighter.agentReady
                                  ? 'border-rose-900/70 bg-rose-950 hover:bg-rose-900'
                                  : 'border-rose-500/60 bg-rose-600 hover:bg-rose-500',
                              ].join(' ')}
                            >
                              Lock In
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs text-muted">
                                Locked ·{' '}
                                {agentById(buyFighter.agentId)?.name ??
                                  buyFighter.agentId}{' '}
                                ({buyFighter.side.toUpperCase()})
                              </p>
                              <button
                                type="button"
                                disabled={buyFighter.buyReady}
                                onClick={lockAgent}
                                className="rounded-md border border-amber-400/40 bg-amber-500/15 px-2 py-1 text-[11px] font-medium text-amber-50 hover:bg-amber-500/25 disabled:cursor-default disabled:opacity-55"
                              >
                                Change agent
                              </button>
                            </div>

                            <div>
                              <p className="mb-2 text-xs text-muted">Gun</p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {SPIKE_GUNS.map((gun) => {
                                  const current = spikeGun(buyFighter.gunId)
                                  const purse =
                                    buyFighter.credits + current.cost
                                  const canAfford = gun.cost <= purse
                                  const selected = buyFighter.gunId === gun.id
                                  return (
                                    <button
                                      key={gun.id}
                                      type="button"
                                      disabled={
                                        buyFighter.buyReady ||
                                        (!canAfford && !selected)
                                      }
                                      onClick={() => equipGun(gun.id)}
                                      className={[
                                        'rounded-lg border p-2.5 text-left transition',
                                        selected
                                          ? 'border-amber-500/55 bg-amber-500/15 text-app-text'
                                          : canAfford && !buyFighter.buyReady
                                            ? 'border-border bg-surface hover:border-amber-500/40'
                                            : 'cursor-default border-border/60 bg-surface/40 opacity-45',
                                      ].join(' ')}
                                    >
                                      <p className="text-sm font-medium text-white">
                                        {gun.name}{' '}
                                        <span className="tabular-nums text-muted">
                                          ${gun.cost}
                                        </span>
                                      </p>
                                      <p className="mt-0.5 text-[11px] text-muted">
                                        {gun.blurb}
                                      </p>
                                      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted">
                                        dmg ×{gun.damageMult}
                                        {gun.dcMod !== 0
                                          ? ` · DC ${gun.dcMod > 0 ? '+' : ''}${gun.dcMod}`
                                          : ''}
                                      </p>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={buyFighter.buyReady}
                              onClick={readyBuy}
                              className="w-full rounded-lg border border-sky-500/55 bg-sky-500/20 px-3 py-2.5 text-sm font-medium text-app-text hover:bg-sky-500/30 disabled:cursor-default disabled:opacity-55"
                            >
                              {buyFighter.buyReady
                                ? 'Ready — waiting for foe'
                                : 'Ready'}
                            </button>
                          </>
                        )
                      ) : (
                        <p className="text-xs text-muted">
                          Waiting for buy…
                          {JENGA_PLAYER_UIDS.map((id) => {
                            const f = fighter(game, id)
                            return (
                              <span key={id} className="ml-2">
                                {householdName(id)}
                                {agentsLocked
                                  ? f.buyReady
                                    ? ' ✓'
                                    : ' …'
                                  : f.agentReady
                                    ? ' ✓'
                                    : ' …'}
                              </span>
                            )
                          })}
                        </p>
                      )}
                    </div>
                  ) : game.phase === 'playing' && me && actorUid ? (
                    <div className="space-y-2">
                      {(() => {
                        const ult = spikeUltCard(me.agentId)
                        if (!ult || me.ultCharge < SPIKE_ULT_COST) return null
                        const blocked = canPlaySpikeCard(game, actorUid, ult.id)
                        const disabled =
                          blocked != null ||
                          !canPlay ||
                          pendingCardId != null
                        const need = spikeCardNeed(
                          ult,
                          me.agentId,
                          me.gunId,
                          me.hp,
                        )
                        return (
                          <button
                            type="button"
                            disabled={disabled}
                            title={blocked ?? undefined}
                            onClick={() => play(ult.id)}
                            className={[
                              'w-full rounded-lg border p-3 text-left transition',
                              disabled
                                ? 'cursor-default border-violet-500/30 bg-violet-500/10 opacity-55'
                                : 'border-violet-500/55 bg-violet-500/20 hover:bg-violet-500/30',
                            ].join(' ')}
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-200">
                              Ult ready
                            </p>
                            <p className="text-sm font-medium text-white">
                              {ult.name}
                            </p>
                            <p className="mt-0.5 text-[11px] leading-snug text-muted">
                              {spikeCardEffectSummary(ult)}
                            </p>
                            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted">
                              ult · need {need}+
                            </p>
                          </button>
                        )
                      })()}
                                            {me && actorUid && canPlay ? (
                        <div className="mb-2 flex flex-wrap gap-2">
                          {me.side === 'atk' ? (
                            <button
                              type="button"
                              disabled={
                                canPlaySpikeSite(game, actorUid, 'plant') !=
                                  null ||
                                pendingCardId != null ||
                                pendingSiteAction != null
                              }
                              title={
                                canPlaySpikeSite(game, actorUid, 'plant') ??
                                'Plant the spike'
                              }
                              onClick={() => queueSiteAction('plant')}
                              className="rounded-lg border border-orange-500/55 bg-orange-500/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-500/30 disabled:cursor-default disabled:opacity-55"
                            >
                              Plant
                              {me.encounters < SPIKE_ENCOUNTERS_TO_SITE
                                ? ` (${me.encounters}/${SPIKE_ENCOUNTERS_TO_SITE})`
                                : ''}
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={
                                  canPlaySpikeSite(game, actorUid, 'defuse') !=
                                    null ||
                                  pendingCardId != null ||
                                  pendingSiteAction != null
                                }
                                title={
                                  canPlaySpikeSite(game, actorUid, 'defuse') ??
                                  'Defuse the spike'
                                }
                                onClick={() => queueSiteAction('defuse')}
                                className="rounded-lg border border-teal-500/55 bg-teal-500/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-500/30 disabled:cursor-default disabled:opacity-55"
                              >
                                Defuse
                                {me.encounters < SPIKE_ENCOUNTERS_TO_SITE
                                  ? ` (${me.encounters}/${SPIKE_ENCOUNTERS_TO_SITE})`
                                  : ''}
                              </button>
                              <button
                                type="button"
                                disabled={
                                  canPlaySpikeSite(game, actorUid, 'tap') !=
                                    null ||
                                  pendingCardId != null ||
                                  pendingSiteAction != null
                                }
                                title={
                                  canPlaySpikeSite(game, actorUid, 'tap') ??
                                  'Fake tap the spike'
                                }
                                onClick={() => queueSiteAction('tap')}
                                className="rounded-lg border border-amber-500/55 bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500/30 disabled:cursor-default disabled:opacity-55"
                              >
                                Tap
                              </button>
                            </>
                          )}
                        </div>
                      ) : null}
<p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        {householdName(actorUid)} hand ·{' '}
                        {spikeGun(me.gunId).name}
                      </p>
                      <p className="text-[11px] text-muted">
                        Need = roll that or higher on the d20 to succeed. Gun can
                        raise or lower it.
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {me.hand.map((id, index) => {
                          const card = spikeCard(id)
                          if (!card) return null
                          const blocked = canPlaySpikeCard(game, actorUid, id)
                          const disabled =
                            blocked != null ||
                            !canPlay ||
                            pendingCardId != null
                          const need = spikeCardNeed(
                            card,
                            me.agentId,
                            me.gunId,
                            me.hp,
                          )
                          const flavor = spikeCardFlavor(
                            card.id,
                            card.kind,
                            (game.rounds[P0] ?? 0) * 31 +
                              (game.rounds[P1] ?? 0) * 17 +
                              index * 7 +
                              card.id.length,
                          )
                          return (
                            <button
                              key={`${id}-${index}`}
                              type="button"
                              disabled={disabled}
                              title={blocked ?? spikeCardEffectSummary(card)}
                              onClick={() => play(id)}
                              className={[
                                'rounded-lg border p-2.5 text-left transition',
                                spikeKindCardClass(card.kind, disabled),
                              ].join(' ')}
                            >
                              <p className="text-sm font-medium text-white">
                                {card.name}
                              </p>
                              <p className="mt-0.5 text-[11px] italic text-muted">
                                {flavor}
                              </p>
                              <hr className="my-1.5 border-border" />
                              <p className="text-[11px] leading-snug text-muted">
                                {spikeCardEffectSummary(card)}
                              </p>
                              <hr className="my-1.5 border-border" />
                              <p className="text-[10px] uppercase tracking-wide text-muted">
                                {card.kind}
                                {` · need ${need}+`}
                                {card.dcGraze != null
                                  ? ` · graze ${card.dcGraze}+`
                                  : ''}
                                {card.usesGun || card.kind === 'action'
                                  ? ' · gun'
                                  : ''}
                                {card.agentId ? ' · unique' : ''}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : game.phase === 'playing' ? (
                    <p className="text-xs text-muted">
                      Waiting for {householdName(game.turnUid)}…
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {game.phase === 'round_over' && !game.matchEnd ? (
                        <button
                          type="button"
                          onClick={nextRound}
                          className="rounded-lg border border-emerald-500/55 bg-emerald-500/20 px-3 py-2 text-sm font-medium text-app-text hover:bg-emerald-500/30"
                        >
                          Next round — buy
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setNewGameOpen(true)}
                        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted hover:text-white"
                      >
                        New game
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {showSetupColumns && setupAgent ? (
                <aside className="mx-auto w-full max-w-sm rounded-xl border border-border bg-surface/50 p-4 lg:mx-0 lg:max-w-none">
                  <p className="text-[10px] uppercase tracking-wide text-muted">
                    Agent preview
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={setupAgent.icon}
                      alt=""
                      className="size-16 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
                    />
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold text-white">
                        {setupAgent.name}
                      </h3>
                      <p className="text-xs text-muted">
                        {setupAgent.role}
                        {setupAgent.origin !== 'Unknown'
                          ? ` · ${setupAgent.origin}`
                          : ''}
                      </p>
                    </div>
                  </div>
                  {setupUlt ? (
                    <div className="mt-4 rounded-lg border border-sky-500/35 bg-sky-500/10 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-black">
                        Ultimate · {SPIKE_ULT_COST} orbs
                      </p>
                      <p className="mt-1 text-sm font-medium text-white">
                        {setupUlt.name}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        {spikeCardEffectSummary(setupUlt)}
                      </p>
                      <p className="mt-2 text-[10px] uppercase tracking-wide text-muted">
                        Need {setupUlt.dc}+
                        {setupUlt.usesGun ? ' · scales with gun' : ''}
                      </p>
                    </div>
                  ) : null}
                  {setupUniques.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted">
                        Unique kit · {setupUniques.length}
                      </p>
                      <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                        {setupUniques.map((card) => (
                          <div
                            key={card.id}
                            className={[
                              'rounded-lg border p-2.5',
                              spikeKindCardClass(card.kind, false),
                            ].join(' ')}
                          >
                            <p className="text-sm font-medium text-white">
                              {card.name}
                            </p>
                            <p className="mt-0.5 text-[11px] leading-snug text-muted">
                              {spikeCardEffectSummary(card)}
                            </p>
                            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted">
                              {card.kind}
                              {` · need ${card.dc}+`}
                              {card.usesGun || card.kind === 'action'
                                ? ' · gun'
                                : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </aside>
              ) : (
                <aside
                  ref={logPanelRef}
                  className={[
                    'w-full rounded-xl border border-border bg-surface/50 p-2.5 lg:max-w-[28rem] lg:justify-self-start',
                    immersive
                      ? 'min-h-0 flex-1 overflow-y-auto lg:min-h-0 lg:flex-none lg:self-stretch'
                      : 'max-h-56 overflow-y-auto lg:max-h-none',
                  ].join(' ')}
                >
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Round log
                  </p>
                  <div className="space-y-2">
                    {[...groupSpikeLog(game.log)].reverse().map((group, gi) => {
                      const groupTone = logGroupTone(group)
                      return (
                        <div
                          key={`g-${gi}-${group[0]?.text ?? ''}`}
                          className={[
                            'space-y-0.5 rounded-md border border-l-[3px] px-2.5 py-2 text-xs leading-snug',
                            LOG_TONE_CARD[groupTone],
                          ].join(' ')}
                        >
                          {group.map((entry, i) => (
                            <p
                              key={`${entry.text}-${i}`}
                              className={logLineClass(
                                entry.text,
                                entry.roll != null,
                              )}
                            >
                              {entry.roll != null ? (
                                <span className="mr-1.5 font-semibold tabular-nums text-[#0284c7]">
                                  [{entry.roll}]
                                </span>
                              ) : null}
                              {entry.text}
                            </p>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </aside>
              )}
            </div>
          )}
        </div>
      )}
    </ArcadeStage>
  )
}
