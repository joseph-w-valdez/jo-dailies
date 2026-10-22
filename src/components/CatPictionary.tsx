import { useEffect, useRef, useState } from 'react'
import { usePictionaryLive } from '../hooks/usePictionaryLive'
import { useSharedPictionary } from '../hooks/useSharedPictionary'
import { householdName } from '../lib/household'
import { JENGA_PLAYER_UIDS, otherPlayerUid } from '../lib/jenga'
import {
  addPictionaryCustomCard,
  markPictionaryGotIt,
  nextPictionaryRound,
  pickPictionaryCard,
  pickPictionaryDeck,
  pickPictionaryDeckRandom,
  pictionaryGuesserUid,
  pictionaryHintAvailableAt,
  pictionaryRerollsLeft,
  pictionaryTurnMs,
  pictionaryWordMask,
  playPictionaryAgain,
  removePictionaryCustomCard,
  resolvePictionaryTimeout,
  revealPictionaryHint,
  selectPictionaryFirst,
  rerollPictionaryHand,
  submitPictionaryGuess,
  surrenderPictionary,
  PICTIONARY_HINT_PENALTY,
  PICTIONARY_TIMEOUT_GRACE_MS,
  type PictionaryState,
} from '../lib/pictionary'
import {
  pictionaryDeckLabel,
  pictionaryDeckPool,
  pictionaryModifier,
  pictionaryModifierMultiplier,
  pictionaryThemeEmoji,
  pictionaryThemeLabel,
  PICTIONARY_DIFFICULTY_LABEL,
  PICTIONARY_DIFFICULTY_POINTS,
  PICTIONARY_THEMES,
  PICTIONARY_TIER_LABEL,
  PICTIONARY_TIER_MULTIPLIER,
  type PictionaryChallengeTier,
  type PictionaryDeckId,
  type PictionaryDifficulty,
  type PictionaryModifier,
} from '../lib/pictionaryDeck'
import { uploadSnapshot } from '../lib/scrapbook'
import { WHITEBOARD_COLORS, type WhiteboardStroke } from '../lib/whiteboard'
import { ArcadeStage, ArcadeStatus } from './ArcadeStage'
import { ConfirmDialog } from './ConfirmDialog'
import { GameSeatPicker } from './GameSeatPicker'
import { NewGameConfirm } from './NewGameConfirm'
import { pictionaryDrawingBlob } from '../lib/pictionaryImage'
import { PictionaryCanvas, type PictionaryTool } from './PictionaryCanvas'
import { PictionaryDeckEditor } from './PictionaryDeckEditor'
import { SurrenderButton } from './SurrenderButton'

/** Whiteboard palette plus brown, three skin tones, and white. */
const COLORS: readonly string[] = [
  ...WHITEBOARD_COLORS,
  '#8b5a2b',
  '#f3d2b3',
  '#c68e5a',
  '#6b3f22',
  '#ffffff',
]
const BRUSHES = [
  { id: 'S', width: 3 },
  { id: 'M', width: 6 },
  { id: 'L', width: 14 },
  { id: 'XL', width: 28 },
] as const

const DIFF_STYLE: Record<PictionaryDifficulty, string> = {
  easy: 'border-emerald-500/55 bg-emerald-500/20 text-app-text hover:bg-emerald-500/30',
  medium: 'border-amber-500/55 bg-amber-500/20 text-app-text hover:bg-amber-500/30',
  hard: 'border-rose-500/55 bg-rose-500/20 text-app-text hover:bg-rose-500/30',
}

const chip =
  'inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-app-text'
const smallBtn =
  'rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-app-text hover:border-muted disabled:opacity-40'

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}

function TimerRing({ msLeft, totalMs }: { msLeft: number; totalMs: number }) {
  const r = 44
  const circumference = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(1, msLeft / totalMs))
  const danger = msLeft <= 10_000
  return (
    <div
      className={[
        'relative mx-auto h-28 w-28 shrink-0',
        danger && msLeft > 0 ? 'animate-pulse' : '',
      ].join(' ')}
      aria-live="polite"
      aria-label={`${Math.ceil(msLeft / 1000)} seconds left`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-surface" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - frac)}
          className={danger ? 'stroke-rose-400' : 'stroke-sky-400'}
          style={{ transition: 'stroke-dashoffset 100ms linear' }}
        />
      </svg>
      <span
        className={[
          'absolute inset-0 flex items-center justify-center text-4xl font-bold tabular-nums',
          danger ? 'text-rose-500' : 'text-app-text',
        ].join(' ')}
      >
        {Math.ceil(msLeft / 1000)}
      </span>
    </div>
  )
}

const TIER_STYLE: Record<PictionaryChallengeTier, string> = {
  mild: 'border-sky-500/55 bg-sky-500/20',
  spicy: 'border-amber-500/55 bg-amber-500/20',
  wild: 'border-fuchsia-500/55 bg-fuchsia-500/20',
}

function ModifierBanner({ modifier }: { modifier: PictionaryModifier }) {
  return (
    <div
      className={[
        'rounded-xl border px-3 py-2 text-sm text-app-text',
        TIER_STYLE[modifier.tier],
      ].join(' ')}
    >
      <span className="font-semibold">
        🎴 {modifier.label} · ×{PICTIONARY_TIER_MULTIPLIER[modifier.tier]}
      </span>
      <span className="text-app-text/80"> — {modifier.blurb}</span>
    </div>
  )
}

function ScoreChip({ game, seat }: { game: PictionaryState; seat: string }) {
  const drawing =
    game.drawerUid === seat &&
    (game.phase === 'pickCard' || game.phase === 'drawing')
  return (
    <span
      className={[
        chip,
        game.winnerUid === seat ? 'border-amber-400/60 bg-amber-500/15' : '',
      ].join(' ')}
    >
      {drawing ? '✏️ ' : ''}
      {householdName(seat)}
      <span className="tabular-nums text-sky-500">{game.scores[seat] ?? 0}</span>
    </span>
  )
}

function WordMask({ word, hintIndex }: { word: string; hintIndex: number | null }) {
  const cells = pictionaryWordMask(word, hintIndex)
  return (
    <div className="flex flex-wrap justify-center gap-x-1 gap-y-2 font-mono text-2xl font-bold text-app-text">
      {cells.map((cell, i) =>
        cell.ch === ' ' ? (
          <span key={i} className="w-3" />
        ) : (
          <span
            key={i}
            className={[
              'inline-flex h-9 min-w-[1.25rem] items-end justify-center',
              cell.hidden ? 'border-b-2 border-current' : '',
            ].join(' ')}
          >
            {cell.hidden ? '' : cell.ch}
          </span>
        ),
      )}
    </div>
  )
}

export function CatPictionary({ onClose }: { onClose: () => void }) {
  const { game, ready, uid, signedIn, commitGame, resetGame } = useSharedPictionary()
  const live = usePictionaryLive({
    roundId: game.roundId,
    roundIndex: game.roundIndex,
    ready,
  })
  const [newGameOpen, setNewGameOpen] = useState(false)
  const [deckOpen, setDeckOpen] = useState(false)
  const [gotItOpen, setGotItOpen] = useState(false)
  const [tool, setTool] = useState<PictionaryTool>('pen')
  const [color, setColor] = useState<string>('#111827')
  const [brush, setBrush] = useState(6)
  const [guessDraft, setGuessDraft] = useState('')
  /** Drawer's opt-in challenge while picking a card — always starts off. */
  const [challengePick, setChallengePick] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [saved, setSaved] = useState<Record<number, 'saving' | 'saved' | 'error'>>({})
  const feedRef = useRef<HTMLDivElement>(null)
  const timeoutKeyRef = useRef('')

  const guesserUid = pictionaryGuesserUid(game)
  const isDrawer = game.hotseat || uid === game.drawerUid
  const isGuesser = game.hotseat || uid === guesserUid
  const drawerActor = game.hotseat ? game.drawerUid : uid
  const guesserActor = game.hotseat ? guesserUid : uid
  const modifier = pictionaryModifier(game.modifierId)
  const drawing = game.phase === 'drawing'
  const turnMs = pictionaryTurnMs(game.modifierId)
  const serverNow = now + live.serverOffset
  const msLeft =
    drawing && game.drawEndsAt != null ? Math.max(0, game.drawEndsAt - serverNow) : null
  const hintAt = pictionaryHintAvailableAt(game)
  const lastRound = game.rounds[game.rounds.length - 1] ?? null
  const otherUid = otherPlayerUid(uid)
  const otherOffline =
    !game.hotseat && live.liveEnabled && signedIn && live.presence[otherUid] === false

  const act = (fn: (prev: PictionaryState) => PictionaryState | null) => {
    void commitGame((prev) => fn(prev) ?? prev)
  }

  useEffect(() => {
    if (!drawing) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(id)
  }, [drawing])

  // Drawer resolves at the buzzer; the guesser only after a grace period.
  const liveServerNow = live.serverNow
  useEffect(() => {
    if (!drawing || game.drawEndsAt == null || !signedIn) return
    const grace = isDrawer ? 0 : PICTIONARY_TIMEOUT_GRACE_MS
    if (serverNow < game.drawEndsAt + grace) return
    const key = `${game.roundId}:${game.roundIndex}`
    if (timeoutKeyRef.current === key) return
    timeoutKeyRef.current = key
    void commitGame((prev) => resolvePictionaryTimeout(prev, liveServerNow()) ?? prev)
  }, [
    drawing,
    game.drawEndsAt,
    game.roundId,
    game.roundIndex,
    serverNow,
    isDrawer,
    signedIn,
    commitGame,
    liveServerNow,
  ])

  useEffect(() => {
    setTool('pen')
    setGuessDraft('')
    setChallengePick(null)
  }, [game.roundId, game.roundIndex])

  // A rerolled offer set may no longer contain the picked challenge.
  const offersKey = game.challengeOffers.join('|')
  useEffect(() => {
    setChallengePick(null)
  }, [offersKey])

  useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [game.guesses.length])

  const locks = modifier?.locks
  const eraserLocked = Boolean(locks?.eraser)
  const fillLocked = Boolean(locks?.fill)
  const activeTool: PictionaryTool =
    (eraserLocked && tool === 'erase') || (fillLocked && tool === 'fill') ? 'pen' : tool
  const activeColor = locks?.color ?? color
  const activeWidth = locks?.size ?? brush
  const strokesLeft =
    locks?.maxStrokes != null
      ? Math.max(0, locks.maxStrokes - live.currentStrokes.length)
      : null
  const blindDrawer = Boolean(modifier?.blind) && isDrawer && !game.hotseat
  const canDrawNow =
    isDrawer && drawing && signedIn && live.liveEnabled && strokesLeft !== 0
  const pickMultiplier = challengePick
    ? PICTIONARY_TIER_MULTIPLIER[pictionaryModifier(challengePick)?.tier ?? 'mild']
    : 1
  const peerDraft =
    !game.hotseat && game.drawerUid !== uid ? (live.drafts[game.drawerUid] ?? null) : null

  const startNewGame = (opts: { hotseat: boolean }) => {
    live.clearAll()
    setSaved({})
    void resetGame(opts)
  }

  const playAgain = () => {
    live.clearAll()
    setSaved({})
    act((prev) => playPictionaryAgain(prev))
  }

  const submitGuess = () => {
    const text = guessDraft.trim()
    if (!text) return
    setGuessDraft('')
    act((prev) => submitPictionaryGuess(prev, guesserActor, text, live.serverNow()))
  }

  const saveDrawing = async (index: number, word: string, drawerUid: string) => {
    setSaved((s) => ({ ...s, [index]: 'saving' }))
    try {
      const out = await pictionaryDrawingBlob(
        live.strokesForRound(index),
        `${word} — drawn by ${householdName(drawerUid)}`,
      )
      if (!out) throw new Error('render failed')
      await uploadSnapshot(out.blob, out.width, out.height)
      setSaved((s) => ({ ...s, [index]: 'saved' }))
    } catch (error) {
      console.error('Could not save Pictionary drawing', error)
      setSaved((s) => ({ ...s, [index]: 'error' }))
    }
  }

  const inMatch = game.firstUid != null && game.phase !== 'pickDeck'

  const statusLabel = (() => {
    if (!ready) return 'Syncing…'
    if (game.firstUid == null) return 'Who draws first?'
    if (game.phase === 'pickDeck') return 'Pick a deck'
    if (game.phase === 'pickCard') {
      return isDrawer ? 'Pick a card' : `${householdName(game.drawerUid)} is picking`
    }
    if (game.phase === 'drawing' && msLeft != null) {
      const who = isDrawer && !game.hotseat ? 'You’re drawing' : `${householdName(game.drawerUid)} drawing`
      return `${who} · ${Math.ceil(msLeft / 1000)}s`
    }
    if (game.phase === 'reveal') return lastRound?.guessed ? 'Got it!' : 'Time’s up'
    if (game.status === 'draw') return 'Tie game'
    return game.winnerUid === uid ? 'You win!' : `${householdName(game.winnerUid)} wins`
  })()

  const statusTone =
    game.phase === 'finished' && game.status === 'won'
      ? 'win'
      : msLeft != null && msLeft <= 10_000
        ? 'danger'
        : 'ready'

  return (
    <ArcadeStage
      title="Pictionary"
      onClose={onClose}
      startInTheater
      meta={<ArcadeStatus tone={statusTone}>{statusLabel}</ArcadeStatus>}
    >
      {({ immersive }) => (
        <div className={immersive ? 'flex min-h-0 flex-1 flex-col gap-3' : 'space-y-4'}>
          {immersive ? null : (
            <div className="rounded-xl border border-border bg-surface/60 px-4 py-3">
              <p className="text-sm leading-relaxed text-app-text/80">
                Take turns: one draws, one guesses. The guesser scores more the
                faster they get it; the drawer earns half. 60 seconds a round,
                10 rounds.
              </p>
            </div>
          )}

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {game.deck ? (
                <span className={chip}>
                  {game.deck === 'all' ? '🎲' : pictionaryThemeEmoji(game.deck)}{' '}
                  {pictionaryDeckLabel(game.deck)}
                </span>
              ) : null}
              {inMatch && game.phase !== 'finished' ? (
                <span className={chip}>
                  Round {Math.min(game.roundIndex + 1, game.totalRounds)}/{game.totalRounds}
                </span>
              ) : null}
              {inMatch
                ? JENGA_PLAYER_UIDS.map((seat) => (
                    <ScoreChip key={seat} game={game} seat={seat} />
                  ))
                : null}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setDeckOpen(true)} className={smallBtn}>
                Custom cards
              </button>
              <button type="button" onClick={() => setNewGameOpen(true)} className={smallBtn}>
                New game
              </button>
              <SurrenderButton
                disabled={
                  !signedIn ||
                  game.firstUid == null ||
                  game.status !== 'playing' ||
                  game.phase === 'pickDeck' ||
                  game.phase === 'finished'
                }
                onSurrender={() => act((prev) => surrenderPictionary(prev, uid))}
              />
            </div>
          </div>

          <NewGameConfirm
            open={newGameOpen}
            onClose={() => setNewGameOpen(false)}
            onConfirm={startNewGame}
            blurb="Starts fresh — pick who draws first and a deck."
          />
          <PictionaryDeckEditor
            open={deckOpen}
            cards={game.customCards}
            onAdd={(word, difficulty) =>
              act((prev) => addPictionaryCustomCard(prev, word, difficulty))
            }
            onRemove={(cardId) => act((prev) => removePictionaryCustomCard(prev, cardId))}
            onClose={() => setDeckOpen(false)}
          />
          <ConfirmDialog
            open={gotItOpen}
            title="They got it?"
            body="Ends the round and scores it as a correct guess."
            confirmLabel="Yes — they said it"
            onConfirm={() =>
              act((prev) => markPictionaryGotIt(prev, drawerActor, live.serverNow()))
            }
            onClose={() => setGotItOpen(false)}
          />

          {!live.liveEnabled ? (
            <p className="rounded-xl border border-amber-500/55 bg-amber-500/20 px-3 py-2 text-sm text-app-text">
              Live drawing needs the Realtime Database (VITE_FIREBASE_DATABASE_URL).
            </p>
          ) : null}
          {live.writeBlocked ? (
            <p className="rounded-xl border border-rose-500/55 bg-rose-500/20 px-3 py-2 text-sm text-app-text">
              Drawings aren’t saving — the Realtime Database rejected them. Publish
              database.rules.json in the Firebase console (Realtime Database → Rules).
            </p>
          ) : null}

          {game.firstUid == null ? (
            <GameSeatPicker
              prompt="Who draws first?"
              optionLabel={(name) => `${name} draws first`}
              onPick={(seat) => act((prev) => selectPictionaryFirst(prev, seat))}
            />
          ) : null}

          {game.firstUid != null && game.phase === 'pickDeck' ? (
            <DeckPicker
              game={game}
              immersive={immersive}
              onPick={(deck) => act((prev) => pickPictionaryDeck(prev, deck))}
              onRandom={() => act((prev) => pickPictionaryDeckRandom(prev))}
              onEditCustom={() => setDeckOpen(true)}
            />
          ) : null}

          {game.phase === 'pickCard' ? (
            <div className="mx-auto w-full max-w-3xl space-y-4">
              {isDrawer ? (
                <>
                  <p className="text-center text-lg font-semibold text-app-text">
                    {game.hotseat ? `${householdName(game.drawerUid)}, pick` : 'Pick'} a card
                    to draw
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {game.choices.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() =>
                          act((prev) =>
                            pickPictionaryCard(
                              prev,
                              drawerActor,
                              card.id,
                              live.serverNow(),
                              challengePick,
                            ),
                          )
                        }
                        className={[
                          'flex min-h-[9rem] flex-col items-center justify-between gap-2 rounded-2xl border px-4 py-4 text-center transition-colors',
                          DIFF_STYLE[card.difficulty],
                        ].join(' ')}
                      >
                        <span className="text-xs font-bold uppercase tracking-wide text-app-text/85">
                          {PICTIONARY_DIFFICULTY_LABEL[card.difficulty]} · up to{' '}
                          {Math.round(PICTIONARY_DIFFICULTY_POINTS[card.difficulty] * pickMultiplier)}
                        </span>
                        <span className="text-2xl font-bold leading-tight text-app-text">
                          {card.word}
                        </span>
                        <span className="text-sm font-medium text-app-text/85">
                          {pictionaryThemeEmoji(card.theme)} {pictionaryThemeLabel(card.theme)}
                        </span>
                      </button>
                    ))}
                  </div>
                  {game.challengeOffers.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-center text-sm font-medium text-app-text/80">
                        Optional challenge for bonus points — pick one before your card, or skip it
                      </p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {game.challengeOffers.map((id) => {
                          const offer = pictionaryModifier(id)
                          if (!offer) return null
                          const on = challengePick === id
                          return (
                            <button
                              key={id}
                              type="button"
                              aria-pressed={on}
                              onClick={() => setChallengePick(on ? null : id)}
                              className={[
                                'flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition',
                                on
                                  ? `${TIER_STYLE[offer.tier]} ring-2 ring-sky-500/50`
                                  : 'border-border bg-surface hover:border-muted',
                              ].join(' ')}
                            >
                              <span className="text-xs font-bold uppercase tracking-wide text-app-text/85">
                                {PICTIONARY_TIER_LABEL[offer.tier]} · ×
                                {PICTIONARY_TIER_MULTIPLIER[offer.tier]} points
                              </span>
                              <span className="text-sm font-semibold text-app-text">
                                {on ? '✓ ' : ''}
                                {offer.label}
                              </span>
                              <span className="text-xs text-app-text/80">{offer.blurb}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      disabled={pictionaryRerollsLeft(game) <= 0}
                      onClick={() => act((prev) => rerollPictionaryHand(prev, drawerActor))}
                      title="New cards and new challenges"
                      className={smallBtn}
                    >
                      🎲 Reroll (
                      {pictionaryRerollsLeft(game) > 0
                        ? `${pictionaryRerollsLeft(game)} reroll${pictionaryRerollsLeft(game) === 1 ? '' : 's'} left`
                        : 'no rerolls left'}
                      )
                    </button>
                  </div>
                </>
              ) : (
                <p className="py-10 text-center text-lg text-app-text/80">
                  {householdName(game.drawerUid)} is picking a card…
                </p>
              )}
            </div>
          ) : null}

          {drawing || game.phase === 'reveal' ? (
            <div
              className={[
                'grid gap-4 md:grid-cols-[minmax(0,1fr)_17rem] xl:grid-cols-[minmax(0,1fr)_20rem]',
                immersive ? 'min-h-0 flex-1' : '',
              ].join(' ')}
            >
              <div className={['flex min-w-0 flex-col gap-3', immersive ? 'min-h-0' : ''].join(' ')}>
                <div
                  className={[
                    'relative',
                    immersive ? 'min-h-[16rem] flex-1' : 'h-[min(62vh,600px)]',
                  ].join(' ')}
                >
                  <PictionaryCanvas
                    className="h-full w-full"
                    strokes={live.currentStrokes}
                    peerDraft={peerDraft}
                    interactive={canDrawNow}
                    tool={activeTool}
                    color={activeColor}
                    width={activeWidth}
                    onStroke={live.addStroke}
                    onDraft={live.publishDraft}
                    hideInk={blindDrawer && drawing}
                  />
                  {blindDrawer && drawing ? (
                    <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
                      <span className="rounded-full border border-fuchsia-500/55 bg-fuchsia-500/20 px-3 py-1 text-xs font-semibold text-app-text">
                        🙈 Blindfold — only {householdName(guesserUid)} can see this
                      </span>
                    </div>
                  ) : null}
                  {game.phase === 'reveal' && lastRound ? (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/45 p-4">
                      <div className="w-full max-w-sm rounded-2xl bg-surface-raised/95 shadow-xl">
                        <div
                          className={[
                            'rounded-2xl border p-5 text-center',
                            lastRound.guessed
                              ? 'border-emerald-500/55 bg-emerald-500/20'
                              : 'border-rose-500/55 bg-rose-500/20',
                          ].join(' ')}
                        >
                          <p className="text-sm font-medium text-app-text/80">
                            {lastRound.guessed
                              ? `${householdName(lastRound.guesserUid)} got it${
                                  lastRound.guessMs != null
                                    ? ` in ${formatSeconds(lastRound.guessMs)}`
                                    : ''
                                }!`
                              : 'Time’s up!'}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-wide text-app-text/80">It was</p>
                          <p className="text-3xl font-bold text-app-text">{lastRound.card.word}</p>
                          <p className="mt-3 text-sm font-medium text-app-text">
                            {lastRound.guessed
                              ? `+${lastRound.guesserPoints} ${householdName(lastRound.guesserUid)} · +${lastRound.drawerPoints} ${householdName(lastRound.drawerUid)}`
                              : 'No points this round'}
                            {lastRound.hintUsed ? ' · hint used' : ''}
                            {pictionaryModifier(lastRound.modifierId)
                              ? ` · ${pictionaryModifier(lastRound.modifierId)!.label} ×${pictionaryModifierMultiplier(lastRound.modifierId)}`
                              : ''}
                          </p>
                          <button
                            type="button"
                            onClick={() => act((prev) => nextPictionaryRound(prev))}
                            className="mt-4 w-full rounded-xl border border-sky-500/55 bg-sky-500/20 px-4 py-2.5 text-base font-semibold text-app-text hover:bg-sky-500/30"
                          >
                            {game.roundIndex + 1 >= game.totalRounds ? 'See results' : 'Next round'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                {isDrawer && drawing ? (
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <div className="flex overflow-hidden rounded-lg border border-border">
                      {(
                        [
                          ['pen', 'Pen'],
                          ['erase', 'Eraser'],
                          ['fill', 'Fill'],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          disabled={(id === 'erase' && eraserLocked) || (id === 'fill' && fillLocked)}
                          onClick={() => setTool(id)}
                          aria-pressed={activeTool === id}
                          className={[
                            'px-3 py-1.5 text-sm font-medium disabled:opacity-30',
                            activeTool === id ? 'bg-sky-500/25 text-app-text' : 'bg-surface text-app-text/80 hover:text-app-text',
                          ].join(' ')}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          disabled={Boolean(locks?.color) && c !== locks?.color}
                          onClick={() => setColor(c)}
                          aria-label={`Color ${c}`}
                          aria-pressed={activeColor === c}
                          className={[
                            'h-6 w-6 rounded-full border-2 disabled:opacity-20',
                            activeColor === c
                              ? 'border-sky-500 ring-2 ring-sky-500/40'
                              : 'border-border',
                          ].join(' ')}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <label
                        title="Custom color"
                        className={[
                          'relative h-6 w-6 overflow-hidden rounded-full border-2',
                          locks?.color ? 'opacity-20' : 'cursor-pointer',
                          !COLORS.includes(activeColor)
                            ? 'border-sky-500 ring-2 ring-sky-500/40'
                            : 'border-border',
                        ].join(' ')}
                        style={{
                          background: COLORS.includes(activeColor)
                            ? 'conic-gradient(#ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ec4899, #ef4444)'
                            : activeColor,
                        }}
                      >
                        <input
                          type="color"
                          aria-label="Custom color"
                          value={activeColor}
                          disabled={Boolean(locks?.color)}
                          onChange={(e) => setColor(e.target.value)}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                        />
                      </label>
                    </div>
                    <div className="flex overflow-hidden rounded-lg border border-border">
                      {BRUSHES.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          disabled={locks?.size != null && b.width !== locks.size}
                          onClick={() => setBrush(b.width)}
                          aria-pressed={activeWidth === b.width}
                          className={[
                            'px-2.5 py-1.5 text-xs font-semibold disabled:opacity-30',
                            activeWidth === b.width ? 'bg-sky-500/25 text-app-text' : 'bg-surface text-app-text/80 hover:text-app-text',
                          ].join(' ')}
                        >
                          {b.id}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={eraserLocked || live.currentStrokes.length === 0}
                      onClick={live.undoLast}
                      className={smallBtn}
                    >
                      Undo
                    </button>
                    <button
                      type="button"
                      disabled={eraserLocked || live.currentStrokes.length === 0}
                      onClick={live.clearCurrent}
                      className={smallBtn}
                    >
                      Clear
                    </button>
                    {modifier ? (
                      <span
                        className={[
                          'rounded-lg border px-2.5 py-1.5 text-xs font-medium text-app-text',
                          TIER_STYLE[modifier.tier],
                        ].join(' ')}
                      >
                        🔒 {modifier.label}
                        {strokesLeft != null
                          ? ` · ${strokesLeft} stroke${strokesLeft === 1 ? '' : 's'} left`
                          : ''}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <aside className={['flex min-w-0 flex-col gap-3', immersive ? 'min-h-0' : ''].join(' ')}>
                {drawing && msLeft != null ? <TimerRing msLeft={msLeft} totalMs={turnMs} /> : null}

                {drawing && game.card ? (
                  <div className="rounded-2xl border border-sky-500/55 bg-sky-500/20 px-4 py-3 text-center">
                    <p className="text-xs uppercase tracking-wide text-app-text/80">
                      {pictionaryThemeEmoji(game.card.theme)} {pictionaryThemeLabel(game.card.theme)}
                    </p>
                    {isDrawer && !game.hotseat ? (
                      <>
                        <p className="mt-1 text-xs text-app-text/80">Draw this</p>
                        <p className="text-2xl font-bold text-app-text">{game.card.word}</p>
                        <p className="mt-1 text-xs text-app-text/80">
                          {PICTIONARY_DIFFICULTY_LABEL[game.card.difficulty]}
                        </p>
                      </>
                    ) : (
                      <div className="mt-2">
                        <WordMask word={game.card.word} hintIndex={game.hintIndex} />
                        <p className="mt-2 text-xs text-app-text/80">
                          {game.card.word
                            .split(/\s+/)
                            .map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length)
                            .join(' · ')}{' '}
                          letters
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}

                {drawing && modifier ? <ModifierBanner modifier={modifier} /> : null}

                {otherOffline && drawing ? (
                  <p className="rounded-xl border border-amber-500/55 bg-amber-500/20 px-3 py-2 text-sm text-app-text">
                    {householdName(otherUid)} looks offline.
                  </p>
                ) : null}

                <div
                  ref={feedRef}
                  className={[
                    'jo-scroll space-y-1.5 overflow-y-auto rounded-2xl border border-border bg-surface/60 p-3',
                    immersive ? 'min-h-[6rem] flex-1' : 'max-h-64 min-h-[6rem]',
                  ].join(' ')}
                >
                  {game.guesses.length === 0 ? (
                    <p className="text-center text-xs text-app-text/80">Guesses show up here.</p>
                  ) : (
                    game.guesses.map((g, i) => (
                      <p
                        key={`${g.at}-${i}`}
                        className={[
                          'text-sm',
                          g.correct ? 'font-semibold text-emerald-500' : 'text-app-text',
                        ].join(' ')}
                      >
                        <span className="text-app-text/80">{householdName(g.uid)}:</span> {g.text}
                        {g.correct ? ' ✓' : g.close ? (
                          <span className="ml-1 rounded border border-amber-500/55 bg-amber-500/20 px-1.5 text-xs text-app-text">
                            close!
                          </span>
                        ) : null}
                      </p>
                    ))
                  )}
                </div>

                {drawing && isGuesser ? (
                  <div className="space-y-2">
                    <form
                      className="flex gap-2"
                      onSubmit={(event) => {
                        event.preventDefault()
                        submitGuess()
                      }}
                    >
                      <input
                        value={guessDraft}
                        onChange={(e) => setGuessDraft(e.target.value)}
                        maxLength={60}
                        autoFocus
                        placeholder="Type a guess…"
                        disabled={msLeft === 0}
                        className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-base text-app-text outline-none focus:border-sky-400/60"
                      />
                      <button
                        type="submit"
                        disabled={!guessDraft.trim() || msLeft === 0}
                        className="rounded-xl border border-emerald-500/55 bg-emerald-500/20 px-4 text-sm font-semibold text-app-text enabled:hover:bg-emerald-500/30 disabled:opacity-40"
                      >
                        Guess
                      </button>
                    </form>
                    <button
                      type="button"
                      disabled={game.hintIndex != null || hintAt == null || serverNow < hintAt}
                      onClick={() =>
                        act((prev) => revealPictionaryHint(prev, guesserActor, live.serverNow()))
                      }
                      className={`${smallBtn} w-full`}
                    >
                      {game.hintIndex != null
                        ? 'Hint used'
                        : hintAt != null && serverNow < hintAt
                          ? `Hint in ${Math.ceil((hintAt - serverNow) / 1000)}s`
                          : `Reveal a letter (−${PICTIONARY_HINT_PENALTY * 100}%)`}
                    </button>
                  </div>
                ) : null}

                {drawing && isDrawer ? (
                  <button
                    type="button"
                    onClick={() => setGotItOpen(true)}
                    className="rounded-2xl border border-emerald-500/55 bg-emerald-500/20 px-4 py-3 text-base font-semibold text-app-text hover:bg-emerald-500/30"
                  >
                    They said it! ✓
                  </button>
                ) : null}
              </aside>
            </div>
          ) : null}

          {game.phase === 'finished' ? (
            <Recap
              game={game}
              uid={uid}
              immersive={immersive}
              strokesForRound={live.strokesForRound}
              saved={saved}
              onSave={(i, word, drawer) => void saveDrawing(i, word, drawer)}
              onPlayAgain={playAgain}
              onNewSetup={() => setNewGameOpen(true)}
            />
          ) : null}
        </div>
      )}
    </ArcadeStage>
  )
}

function DeckPicker({
  game,
  immersive,
  onPick,
  onRandom,
  onEditCustom,
}: {
  game: PictionaryState
  immersive: boolean
  onPick: (deck: PictionaryDeckId) => void
  onRandom: () => void
  onEditCustom: () => void
}) {
  const allCount = pictionaryDeckPool('all', game.customCards).length
  const customCount = game.customCards.length
  const tile =
    'flex flex-col items-start gap-1 rounded-xl border border-border bg-surface px-3.5 py-3 text-left hover:border-sky-400/50 hover:bg-sky-500/10'
  return (
    <div className={immersive ? 'flex min-h-0 flex-1 flex-col gap-4' : 'space-y-4'}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="text-lg font-semibold text-app-text">
          Choose a deck{' '}
          <span className="text-sm font-normal text-app-text/80">
            · {householdName(game.firstUid)} draws first
          </span>
        </p>
        <button
          type="button"
          onClick={onRandom}
          className="rounded-xl border border-violet-500/55 bg-violet-500/20 px-4 py-2.5 text-sm font-medium text-app-text hover:bg-violet-500/30"
        >
          Random theme
        </button>
      </div>
      <div
        className={[
          'jo-scroll grid grid-cols-2 gap-2 overflow-y-auto overscroll-contain pr-1 sm:grid-cols-3 lg:grid-cols-4',
          immersive ? 'min-h-0 flex-1 content-start' : 'max-h-[min(60vh,30rem)]',
        ].join(' ')}
      >
        <button
          type="button"
          onClick={() => onPick('all')}
          className="col-span-2 flex flex-col items-start gap-1 rounded-xl border border-sky-400/50 bg-sky-500/15 px-4 py-3 text-left hover:bg-sky-500/25"
        >
          <span className="text-lg font-semibold text-app-text">🎲 All themes</span>
          <span className="text-xs text-app-text/80">{allCount} cards, every theme mixed</span>
        </button>
        {PICTIONARY_THEMES.map((theme) => (
          <button key={theme.id} type="button" onClick={() => onPick(theme.id)} className={tile}>
            <span className="text-base font-semibold text-app-text">
              {theme.emoji} {theme.label}
            </span>
            <span className="text-xs text-app-text/80">{theme.cards.length} cards</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => (customCount > 0 ? onPick('custom') : onEditCustom())}
          className={tile}
        >
          <span className="text-base font-semibold text-app-text">✏️ Custom</span>
          <span className="text-xs text-app-text/80">
            {customCount > 0 ? `${customCount} cards` : 'Add your own cards'}
          </span>
        </button>
      </div>
    </div>
  )
}

function Recap({
  game,
  uid,
  immersive,
  strokesForRound,
  saved,
  onSave,
  onPlayAgain,
  onNewSetup,
}: {
  game: PictionaryState
  uid: string
  immersive: boolean
  strokesForRound: (index: number) => WhiteboardStroke[]
  saved: Record<number, 'saving' | 'saved' | 'error'>
  onSave: (index: number, word: string, drawerUid: string) => void
  onPlayAgain: () => void
  onNewSetup: () => void
}) {
  const headline =
    game.status === 'draw'
      ? 'Tie game!'
      : game.winnerUid === uid
        ? 'You win!'
        : `${householdName(game.winnerUid)} wins!`
  return (
    <div className={immersive ? 'flex min-h-0 flex-1 flex-col gap-4' : 'space-y-4'}>
      <div className="shrink-0 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-4 text-center">
        <p className="text-2xl font-bold text-app-text">{headline}</p>
        {game.surrenderUid ? (
          <p className="mt-1 text-sm text-app-text/80">{householdName(game.surrenderUid)} surrendered</p>
        ) : null}
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          {JENGA_PLAYER_UIDS.map((seat) => {
            const guessed = game.rounds.filter((r) => r.guesserUid === seat && r.guessed).length
            const asGuesser = game.rounds.filter((r) => r.guesserUid === seat).length
            return (
              <div key={seat} className="min-w-[9rem] rounded-xl border border-border bg-surface px-4 py-2">
                <p className="text-sm text-app-text/80">{householdName(seat)}</p>
                <p className="text-2xl font-bold tabular-nums text-app-text">{game.scores[seat] ?? 0}</p>
                <p className="text-xs text-app-text/80">
                  guessed {guessed}/{asGuesser}
                </p>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {game.deck ? (
            <button
              type="button"
              onClick={onPlayAgain}
              className="rounded-xl border border-sky-500/55 bg-sky-500/20 px-4 py-2.5 text-sm font-semibold text-app-text hover:bg-sky-500/30"
            >
              Play again · {pictionaryDeckLabel(game.deck)}
            </button>
          ) : null}
          <button type="button" onClick={onNewSetup} className={smallBtn}>
            New setup
          </button>
        </div>
      </div>

      {game.rounds.length > 0 ? (
        <div
          className={[
            'jo-scroll grid gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
            immersive ? 'min-h-0 flex-1 content-start' : '',
          ].join(' ')}
        >
          {game.rounds.map((round) => {
            const state = saved[round.index]
            return (
              <div
                key={round.index}
                className="flex flex-col gap-2 rounded-xl border border-border bg-surface/70 p-2"
              >
                <PictionaryCanvas className="h-36 w-full" strokes={strokesForRound(round.index)} />
                <div className="px-1">
                  <p className="truncate text-sm font-semibold text-app-text">{round.card.word}</p>
                  <p className="text-xs text-app-text/80">
                    {householdName(round.drawerUid)} drew ·{' '}
                    {round.guessed
                      ? `+${round.guesserPoints} / +${round.drawerPoints}${
                          round.guessMs != null ? ` · ${formatSeconds(round.guessMs)}` : ''
                        }`
                      : 'missed'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={state === 'saving' || state === 'saved'}
                  onClick={() => onSave(round.index, round.card.word, round.drawerUid)}
                  className="rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-app-text hover:border-muted disabled:opacity-50"
                >
                  {state === 'saved'
                    ? 'Saved to Scrapbook'
                    : state === 'saving'
                      ? 'Saving…'
                      : state === 'error'
                        ? 'Retry save'
                        : 'Save to Scrapbook'}
                </button>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
