import { useState } from 'react'
import { useSharedCodenames } from '../hooks/useSharedCodenames'
import { householdName } from '../lib/household'
import {
  applyCodenamesGuess,
  endCodenamesGuesses,
  remainingForTeam,
  submitCodenamesClue,
  type CodenameTeam,
} from '../lib/codenames'
import { ArcadeStage, ArcadeStatus } from './ArcadeStage'
import { NewGameConfirm } from './NewGameConfirm'

function teamColor(team: CodenameTeam, revealed: boolean, showKey: boolean): string {
  // Theme tokens (--color-cn-*) keep agent colors soft and readable on every
  // chrome; ink is paired per theme so we never rely on remapped text-white.
  if (!revealed && !showKey) return 'border-border bg-surface text-app-text'
  if (team === 'red') return 'border-cn-red-ink/20 bg-cn-red text-cn-red-ink'
  if (team === 'blue') return 'border-cn-blue-ink/20 bg-cn-blue text-cn-blue-ink'
  if (team === 'assassin')
    return 'border-cn-assassin-ink/20 bg-cn-assassin text-cn-assassin-ink'
  return 'border-cn-neutral-ink/20 bg-cn-neutral text-cn-neutral-ink'
}

export function CatCodenames({ onClose }: { onClose: () => void }) {
  const {
    game,
    ready,
    uid,
    actorUid,
    actorTeam,
    myTeam,
    canAct,
    commitGame,
    resetGame,
  } = useSharedCodenames()
  const [clue, setClue] = useState('')
  const [count, setCount] = useState(1)
  const [newGameOpen, setNewGameOpen] = useState(false)

  const showKey =
    canAct &&
    game.phase === 'clue' &&
    game.status === 'playing' &&
    actorTeam === game.turnTeam

  const statusLabel = (() => {
    if (!ready) return 'Syncing…'
    if (game.status === 'won') {
      return `${game.winnerTeam === 'red' ? 'Red' : 'Blue'} wins!`
    }
    if (game.phase === 'clue') {
      return canAct
        ? 'Your clue — look at the key, then submit'
        : `${game.turnTeam === 'red' ? 'Red' : 'Blue'} is writing a clue…`
    }
    if (canAct) {
      return `Guess (${game.guessesLeft} left) — clue: ${game.clue} ${game.clueCount}`
    }
    return `Waiting — clue ${game.clue} ${game.clueCount}`
  })()

  return (
    <ArcadeStage
      title="Codenames"
      onClose={onClose}
      meta={<ArcadeStatus>{statusLabel}</ArcadeStatus>}
    >
      {({ immersive }) => (
        <div
          className={
            immersive ? 'flex min-h-0 flex-1 flex-col' : 'space-y-4'
          }
        >
          {immersive ? null : (
            <div className="mt-2 rounded-xl border border-border bg-surface/60 px-3.5 py-3">
              <p className="text-[11px] leading-relaxed text-muted">
                A 5×5 grid of words hides agents for Red and Blue, plus
                bystanders and one assassin. Give a one-word clue that links
                some of your agents — and a number for how many you mean — then
                try to pick those words. First team to contact all their agents
                wins; hit the assassin and you lose instantly.
              </p>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ['Clue', 'one word + how many agents it covers'],
                    ['Your agents', 'safe guesses — keep going'],
                    ['Bystander / foe', 'wrong guess — turn ends'],
                    ['Assassin', 'instant loss for your team'],
                  ] as const
                ).map(([label, hint]) => (
                  <div
                    key={label}
                    className="flex items-baseline gap-2 text-[11px] leading-snug"
                  >
                    <span className="shrink-0 font-semibold text-app-text">
                      {label}
                    </span>
                    <span className="text-muted">{hint}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            className={[
              'flex flex-wrap items-center justify-between gap-2',
              immersive ? 'mt-3 shrink-0' : '',
            ].join(' ')}
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              {myTeam === 'red' || myTeam === 'blue' ? (
                <span
                  className={[
                    'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold',
                    myTeam === 'red'
                      ? 'border-cn-red-ink/25 bg-cn-red text-cn-red-ink'
                      : 'border-cn-blue-ink/25 bg-cn-blue text-cn-blue-ink',
                  ].join(' ')}
                >
                  You are {myTeam === 'red' ? 'Red' : 'Blue'}
                </span>
              ) : (
                <span className="font-semibold text-app-text">
                  You are {householdName(uid)}
                </span>
              )}
              <span className="text-cn-red-mark">
                Red {remainingForTeam(game.cards, 'red')} left
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-cn-blue-mark">
                Blue {remainingForTeam(game.cards, 'blue')} left
              </span>
              {game.hotseat ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Hotseat</span>
                </>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setNewGameOpen(true)}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-app-text hover:border-muted"
            >
              New game
            </button>
          </div>

          <div
            className={[
              'grid grid-cols-5 gap-1.5 sm:gap-2',
              immersive ? 'mt-3 min-h-0 flex-1 content-center' : '',
            ].join(' ')}
          >
            {game.cards.map((card) => {
              const clickable =
                canAct &&
                game.phase === 'guess' &&
                !card.revealed &&
                game.status === 'playing'
              return (
                <button
                  key={card.id}
                  type="button"
                  disabled={!clickable}
                  onClick={() =>
                    void commitGame(
                      (prev) =>
                        applyCodenamesGuess(prev, actorUid, card.id) ?? prev,
                    )
                  }
                  className={[
                    'min-h-[3.25rem] rounded-lg border px-1 py-2 text-center text-[10px] font-bold uppercase leading-tight sm:min-h-[4rem] sm:text-xs',
                    teamColor(card.team, card.revealed, showKey),
                    clickable ? 'hover:brightness-110' : '',
                    card.revealed ? 'opacity-90' : '',
                  ].join(' ')}
                >
                  {card.word}
                </button>
              )
            })}
          </div>

          {showKey ? (
            <p className="text-center text-[11px] text-muted">
              Key visible — give a one-word clue, then you’ll guess without the
              colors.
            </p>
          ) : null}

          {canAct && game.phase === 'clue' ? (
            <div className="mx-auto flex max-w-md flex-wrap items-end gap-2 rounded-xl border border-border bg-surface/60 p-3">
              <label className="min-w-0 flex-1 text-xs text-muted">
                Clue (one word)
                <input
                  value={clue}
                  onChange={(e) =>
                    setClue(e.target.value.replace(/\s+/g, ''))
                  }
                  className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm uppercase text-app-text"
                />
              </label>
              <label className="text-xs text-muted">
                #
                <input
                  type="number"
                  min={0}
                  max={9}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value) || 0)}
                  className="mt-1 w-14 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-app-text"
                />
              </label>
              <button
                type="button"
                disabled={!clue.trim()}
                onClick={() => {
                  void commitGame((prev) => {
                    const next = submitCodenamesClue(
                      prev,
                      actorUid,
                      clue,
                      count,
                    )
                    if (next) setClue('')
                    return next ?? prev
                  })
                }}
                className="rounded-lg border border-emerald-500/55 bg-emerald-500/20 px-3 py-2 text-sm text-app-text disabled:opacity-40"
              >
                Give clue
              </button>
            </div>
          ) : null}

          {canAct && game.phase === 'guess' ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() =>
                  void commitGame(
                    (prev) => endCodenamesGuesses(prev, actorUid) ?? prev,
                  )
                }
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-muted hover:text-app-text"
              >
                End guesses
              </button>
            </div>
          ) : null}

          <NewGameConfirm
            open={newGameOpen}
            onClose={() => setNewGameOpen(false)}
            onConfirm={(opts) => void resetGame(opts)}
            blurb="Deals a new 5×5 board. Red goes first (9 agents)."
          />
        </div>
      )}
    </ArcadeStage>
  )
}
