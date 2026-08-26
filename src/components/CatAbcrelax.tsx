import { useEffect, useState } from 'react'
import { useSharedAbcrelax } from '../hooks/useSharedAbcrelax'
import {
  ABCRELAX_LETTERS,
  ABCRELAX_THEMES,
  ABCRELAX_TIMER_OPTIONS_MS,
  challengeAbcrelaxLast,
  letterIsUsed,
  msLeft,
  pickAbcrelaxTheme,
  pickAbcrelaxTimer,
  resolveAbcrelaxTimeout,
  selectAbcrelaxFirst,
  submitAbcrelaxAnswer,
  surrenderAbcrelax,
  wordMatchesLetter,
} from '../lib/abcrelax'
import { householdName } from '../lib/household'
import { ArcadeStage, ArcadeStatus } from './ArcadeStage'
import { GameSeatPicker } from './GameSeatPicker'
import { NewGameConfirm } from './NewGameConfirm'
import { SurrenderButton } from './SurrenderButton'

const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] as const

export function CatAbcrelax({ onClose }: { onClose: () => void }) {
  const { game, ready, uid, actorUid, canAct, commitGame, resetGame } =
    useSharedAbcrelax()
  const [newGameOpen, setNewGameOpen] = useState(false)
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null)
  const [wordDraft, setWordDraft] = useState('')
  const [customTheme, setCustomTheme] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (game.phase !== 'playing' || game.deadlineAt == null) return
    let raf = 0
    const tick = () => {
      setNow(Date.now())
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [game.phase, game.deadlineAt])

  useEffect(() => {
    if (game.phase !== 'playing' || game.deadlineAt == null) return
    if (now < game.deadlineAt) return
    void commitGame((prev) => resolveAbcrelaxTimeout(prev) ?? prev)
  }, [game.phase, game.deadlineAt, now, commitGame])

  useEffect(() => {
    setSelectedLetter(null)
    setWordDraft('')
  }, [game.roundId, game.phase, game.turnUid, game.lastAnswer?.letter])

  const left = msLeft(game, now)
  const secondsLeft = left == null ? null : left / 1000
  const timerLabel =
    secondsLeft == null
      ? null
      : secondsLeft >= 9.95
        ? String(Math.ceil(secondsLeft))
        : secondsLeft.toFixed(1)
  const statusTimerLabel =
    secondsLeft == null ? null : String(Math.max(0, Math.ceil(secondsLeft)))

  const myTurnAnswer =
    canAct && game.phase === 'playing' && game.turnUid === actorUid
  const canChallenge =
    myTurnAnswer &&
    game.lastAnswer != null &&
    game.lastAnswer.uid !== actorUid

  const statusLabel = (() => {
    if (!ready) return 'Syncing…'
    if (game.firstUid == null) return 'Who goes first?'
    if (game.phase === 'pickTheme') return 'Pick a theme'
    if (game.phase === 'pickTimer') return 'Pick a timer'
    if (game.phase === 'finished') {
      if (game.status === 'draw') return 'Draw — alphabet cleared'
      return game.winnerUid === uid
        ? 'You win!'
        : `${householdName(game.winnerUid)} wins`
    }
    if (game.phase === 'playing' && statusTimerLabel != null) {
      const who = myTurnAnswer
        ? 'Your turn'
        : `${householdName(game.turnUid)}’s turn`
      return `${who} · ${statusTimerLabel}s`
    }
    if (myTurnAnswer) return 'Your turn — type, tap letter, hit GO'
    return `Waiting for ${householdName(game.turnUid)}…`
  })()

  const statusTone =
    game.phase === 'finished' && game.status === 'won'
      ? 'win'
      : left != null && left <= 3000 && game.phase === 'playing'
        ? 'danger'
        : 'ready'

  const canSubmit =
    myTurnAnswer &&
    selectedLetter &&
    wordDraft.trim().length > 0 &&
    wordMatchesLetter(wordDraft, selectedLetter) &&
    !letterIsUsed(game, selectedLetter)

  const submit = () => {
    if (!canSubmit || !selectedLetter) return
    void commitGame(
      (prev) =>
        submitAbcrelaxAnswer(prev, actorUid, selectedLetter, wordDraft) ??
        prev,
    )
  }

  const onWordChange = (v: string) => {
    setWordDraft(v)
    const first = v.trim().charAt(0).toUpperCase()
    if (
      first &&
      ABCRELAX_LETTERS.includes(first) &&
      !letterIsUsed(game, first)
    ) {
      setSelectedLetter(first)
    }
  }

  const inMatch =
    game.firstUid != null &&
    (game.phase === 'playing' || game.phase === 'finished')

  return (
    <ArcadeStage
      title="Abcrelax"
      onClose={onClose}
      meta={<ArcadeStatus tone={statusTone}>{statusLabel}</ArcadeStatus>}
    >
      {({ immersive }) => (
        <div
          className={
            immersive ? 'flex min-h-0 flex-1 flex-col gap-3' : 'space-y-3'
          }
        >
          {immersive ? null : (
            <div className="rounded-xl border border-border bg-surface/60 px-3.5 py-3">
              <p className="text-[11px] leading-relaxed text-muted">
                Pick a theme and timer. Type a word, tap its letter, hit GO —
                turn passes automatically. Challenge on the side if their last
                word was bunk. Miss the timer and you lose. Clear the alphabet
                for a draw.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-white/85">
              {game.theme
                ? `${game.theme} · ${(game.turnMs / 1000).toFixed(0)}s turns`
                : 'Abcrelax'}
              {game.usedLetters.length > 0
                ? ` · ${game.usedLetters.length}/26 used`
                : ''}
            </p>
            <div className="flex items-center gap-1.5">
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
                  game.firstUid == null ||
                  game.status !== 'playing' ||
                  game.phase !== 'playing'
                }
                onSurrender={() =>
                  void commitGame(
                    (prev) => surrenderAbcrelax(prev, actorUid) ?? prev,
                  )
                }
              />
            </div>
          </div>

          <NewGameConfirm
            open={newGameOpen}
            onClose={() => setNewGameOpen(false)}
            onConfirm={(opts) => void resetGame(opts)}
            blurb="Starts fresh — pick who goes first again."
          />

          {game.firstUid == null ? (
            <div className="mt-4">
              <GameSeatPicker
                prompt="Who goes first?"
                optionLabel={(name) => `${name} goes first`}
                onPick={(seat) =>
                  void commitGame(
                    (prev) => selectAbcrelaxFirst(prev, seat) ?? prev,
                  )
                }
              />
            </div>
          ) : null}

          {game.phase === 'pickTheme' ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-white">Choose a theme</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ABCRELAX_THEMES.map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() =>
                      void commitGame(
                        (prev) =>
                          pickAbcrelaxTheme(prev, actorUid, theme) ?? prev,
                      )
                    }
                    className="rounded-xl border border-border bg-surface px-3 py-2.5 text-left text-sm text-white hover:border-sky-400/50 hover:bg-sky-500/10"
                  >
                    {theme}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-[12rem] flex-1 text-[11px] text-muted">
                  Or type your own
                  <input
                    value={customTheme}
                    onChange={(e) => setCustomTheme(e.target.value)}
                    maxLength={80}
                    placeholder="Custom theme…"
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
                  />
                </label>
                <button
                  type="button"
                  disabled={!customTheme.trim()}
                  onClick={() =>
                    void commitGame(
                      (prev) =>
                        pickAbcrelaxTheme(prev, actorUid, customTheme) ??
                        prev,
                    )
                  }
                  className="rounded-lg border border-sky-400/40 bg-sky-500/20 px-3 py-2 text-sm font-medium text-sky-50 enabled:hover:bg-sky-500/30 disabled:opacity-40"
                >
                  Use theme
                </button>
              </div>
            </div>
          ) : null}

          {game.phase === 'pickTimer' ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-white">
                How long per turn?{' '}
                <span className="font-normal text-muted">({game.theme})</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {ABCRELAX_TIMER_OPTIONS_MS.map((ms) => (
                  <button
                    key={ms}
                    type="button"
                    onClick={() =>
                      void commitGame(
                        (prev) =>
                          pickAbcrelaxTimer(prev, actorUid, ms) ?? prev,
                      )
                    }
                    className="min-w-[5.5rem] rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-white hover:border-sky-400/50 hover:bg-sky-500/10"
                  >
                    {ms / 1000}s
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {inMatch ? (
            <div
              className={[
                'grid gap-3',
                immersive
                  ? 'min-h-0 flex-1 lg:grid-cols-[1fr_auto]'
                  : 'lg:grid-cols-[1fr_auto]',
              ].join(' ')}
            >
              <div className="flex min-w-0 flex-col gap-3">
                {game.theme ? (
                  <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-sky-200/80">
                      Theme
                    </p>
                    <p className="text-base font-semibold text-white">
                      {game.theme}
                    </p>
                  </div>
                ) : null}

                {game.phase === 'playing' &&
                secondsLeft != null &&
                game.deadlineAt != null ? (
                  <div className="mx-auto w-full max-w-[14rem]">
                    <div
                      className={[
                        'mx-auto flex h-20 w-20 flex-col items-center justify-center rounded-full border-2 tabular-nums',
                        left != null && left <= 3000
                          ? 'border-rose-400 bg-rose-500/20 text-rose-100'
                          : 'border-sky-400/50 bg-sky-500/15 text-sky-50',
                      ].join(' ')}
                      aria-live="polite"
                      aria-label={`${timerLabel} seconds remaining`}
                    >
                      <span className="text-3xl font-bold leading-none">
                        {timerLabel}
                      </span>
                      <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide opacity-70">
                        sec
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
                      <div
                        className={[
                          'h-full rounded-full transition-[width] duration-75 ease-linear',
                          left != null && left <= 3000
                            ? 'bg-rose-400'
                            : 'bg-sky-400',
                        ].join(' ')}
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(100, (left! / game.turnMs) * 100),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : null}

                {myTurnAnswer ? (
                  <label className="text-[11px] text-muted">
                    Your word
                    <input
                      value={wordDraft}
                      onChange={(e) => onWordChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && canSubmit) submit()
                      }}
                      autoFocus
                      maxLength={64}
                      placeholder="Type any length…"
                      className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-3 text-center text-lg font-semibold tracking-wide text-white outline-none focus:border-sky-400/60"
                    />
                  </label>
                ) : null}

                {game.phase === 'playing' ? (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      disabled={!canSubmit}
                      onClick={submit}
                      title="Submit answer"
                      className={[
                        'flex h-14 w-14 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors',
                        canSubmit
                          ? 'border-emerald-400/60 bg-emerald-500/25 text-emerald-50 hover:bg-emerald-500/40'
                          : 'border-border bg-surface/40 text-muted opacity-50',
                      ].join(' ')}
                    >
                      GO
                    </button>
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  {KEY_ROWS.map((row) => (
                    <div
                      key={row}
                      className="flex justify-center gap-1 sm:gap-1.5"
                    >
                      {row.split('').map((letter) => {
                        const used = letterIsUsed(game, letter)
                        const selected = selectedLetter === letter
                        return (
                          <button
                            key={letter}
                            type="button"
                            disabled={!myTurnAnswer || used}
                            onClick={() => {
                              if (!myTurnAnswer || used) return
                              setSelectedLetter(letter)
                            }}
                            className={[
                              'flex h-9 w-8 items-center justify-center rounded-md border text-sm font-semibold sm:h-10 sm:w-9',
                              used
                                ? 'border-transparent bg-zinc-800/90 text-zinc-500'
                                : selected
                                  ? 'border-sky-400/60 bg-sky-500/30 text-white'
                                  : myTurnAnswer
                                    ? 'border-border bg-surface text-white hover:border-muted'
                                    : 'border-border/60 bg-surface/50 text-muted',
                            ].join(' ')}
                          >
                            {letter}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>

                {game.lastAnswer && game.phase === 'playing' ? (
                  <p className="text-center text-[11px] text-muted">
                    Last: {householdName(game.lastAnswer.uid)} —{' '}
                    {game.lastAnswer.word} ({game.lastAnswer.letter})
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 lg:w-36">
                {canChallenge ? (
                  <button
                    type="button"
                    onClick={() =>
                      void commitGame(
                        (prev) =>
                          challengeAbcrelaxLast(prev, actorUid) ?? prev,
                      )
                    }
                    className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-3 py-3 text-sm font-medium text-rose-100 hover:bg-rose-500/25"
                  >
                    Challenge
                    <span className="mt-1 block text-[10px] font-normal text-rose-100/70">
                      “{game.lastAnswer?.word}”
                    </span>
                  </button>
                ) : (
                  <div className="rounded-xl border border-border/60 bg-surface/40 px-3 py-3 text-center text-[11px] text-muted lg:min-h-[5.5rem]">
                    Challenge is optional — only if their last word was bunk
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </ArcadeStage>
  )
}
