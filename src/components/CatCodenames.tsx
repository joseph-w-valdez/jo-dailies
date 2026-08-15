import { useState } from 'react'
import { useSharedCodenames } from '../hooks/useSharedCodenames'
import { householdName } from '../lib/household'
import {
  applyCodenamesGuess,
  endCodenamesGuesses,
  remainingAgents,
  remainingForUid,
  roleFor,
  selectCodenamesFirstClue,
  selectCodenamesPack,
  submitCodenamesClue,
  surrenderCodenames,
  type CodenamesCard,
  type DuetRole,
} from '../lib/codenames'
import { otherPlayerUid } from '../lib/jenga'
import { ArcadeStage, ArcadeStatus } from './ArcadeStage'
import { GameSeatPicker } from './GameSeatPicker'
import { NewGameConfirm } from './NewGameConfirm'
import { SurrenderButton } from './SurrenderButton'

const choiceClass =
  'rounded-xl border border-border bg-surface/80 px-4 py-8 text-left hover:border-muted'

function roleColor(role: DuetRole, revealed: boolean): string {
  if (!revealed) return 'border-border bg-surface text-app-text'
  if (role === 'agent')
    return 'border-emerald-500/40 bg-emerald-500/25 text-emerald-50'
  if (role === 'assassin')
    return 'border-cn-assassin-ink/20 bg-cn-assassin text-cn-assassin-ink'
  return 'border-cn-neutral-ink/20 bg-cn-neutral text-cn-neutral-ink'
}

function cardClass(
  card: CodenamesCard,
  viewUid: string,
  showKey: boolean,
  gameOver: boolean,
): string {
  if (card.contacted) {
    return roleColor('agent', true)
  }
  if (card.bystanderFrom.length >= 2) {
    return roleColor('neutral', true)
  }
  if (showKey || gameOver) {
    return roleColor(roleFor(card, viewUid), true)
  }
  return roleColor('neutral', false)
}

export function CatCodenames({ onClose }: { onClose: () => void }) {
  const {
    game,
    ready,
    uid,
    actorUid,
    canClue,
    canGuess,
    canSudden,
    commitGame,
    resetGame,
  } = useSharedCodenames()
  const [clue, setClue] = useState('')
  const [count, setCount] = useState(1)
  const [newGameOpen, setNewGameOpen] = useState(false)

  const keyUid =
    game.phase === 'guess' && game.clueUid ? game.clueUid : actorUid
  const showKey =
    game.status === 'playing' &&
    Boolean(game.clueUid) &&
    (game.phase === 'clue' || game.phase === 'guess') &&
    actorUid === game.clueUid
  const gameOver = game.status !== 'playing'
  const agentsLeft = remainingAgents(game.cards)
  const myAgentsLeft = remainingForUid(game.cards, uid)

  const statusLabel = (() => {
    if (!ready) return 'Syncing…'
    if (game.wordPack == null) return 'Pick a word pack'
    if (game.clueUid == null) return 'Who clues first?'
    if (game.status === 'won') return 'Mission complete'
    if (game.status === 'lost') {
      return game.phase === 'finished' && game.turnsLeft <= 0
        ? 'Out of time'
        : 'Assassin — you both lose'
    }
    if (game.phase === 'sudden') {
      return canSudden
        ? `Sudden death — ${remainingForUid(game.cards, otherPlayerUid(actorUid))} left for you to find`
        : 'Sudden death — partner is guessing'
    }
    if (game.phase === 'clue') {
      return canClue
        ? 'Your clue — look at the key, then submit'
        : `${householdName(game.clueUid)} is writing a clue…`
    }
    if (canGuess) {
      return `Guess — clue: ${game.clue} ${game.clueCount}`
    }
    return `Waiting — clue ${game.clue} ${game.clueCount}`
  })()

  const pickingPack =
    game.status === 'playing' && game.wordPack == null
  const pickingClue =
    game.status === 'playing' && game.wordPack != null && game.clueUid == null

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
                You’re on one team. Each of you sees a different key — 9 agents
                and 3 assassins. Take turns giving a one-word clue; your
                partner guesses against your key. Contact all 15 agents (3
                overlap) before the 9 timers run out. Hit an assassin and you
                both lose.
              </p>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ['Clue', 'one word + how many agents you mean'],
                    ['Agent', 'green; keep guessing (old clues count too)'],
                    [
                      'Bystander',
                      'turn ends, spends a timer; partner may still need that word',
                    ],
                    ['Assassin', 'instant loss for both of you'],
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
              {game.clueUid ? (
                <span className="inline-flex items-center rounded-md border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-app-text">
                  {actorUid === game.clueUid && game.phase !== 'sudden'
                    ? 'You clue'
                    : actorUid === uid
                      ? 'You guess'
                      : householdName(actorUid)}
                </span>
              ) : null}
              <span className="text-app-text">
                {agentsLeft} agents left
              </span>
              <span aria-hidden="true">·</span>
              <span>{game.turnsLeft} timers</span>
              {game.wordPack === 'full' ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Full pack</span>
                </>
              ) : null}
              {game.hotseat ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Hotseat</span>
                </>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setNewGameOpen(true)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-app-text hover:border-muted"
              >
                New game
              </button>
              <SurrenderButton
                disabled={
                  !uid ||
                  game.status !== 'playing' ||
                  game.phase === 'finished' ||
                  game.wordPack == null ||
                  game.clueUid == null
                }
                body="Concede this round — you both lose."
                onSurrender={() =>
                  void commitGame((prev) => surrenderCodenames(prev) ?? prev)
                }
              />
            </div>
          </div>

          {pickingPack ? (
            <div className="mt-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className={choiceClass}
                  onClick={() =>
                    void commitGame(
                      (prev) =>
                        selectCodenamesPack(prev, 'standard') ?? prev,
                    )
                  }
                >
                  <span className="block font-semibold text-white">
                    Standard
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    Classic Codenames words.
                  </span>
                </button>
                <button
                  type="button"
                  className={choiceClass}
                  onClick={() =>
                    void commitGame(
                      (prev) => selectCodenamesPack(prev, 'full') ?? prev,
                    )
                  }
                >
                  <span className="block font-semibold text-white">Full</span>
                  <span className="mt-1 block text-xs text-muted">
                    Classic plus Valorant names and terms.
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {pickingClue ? (
                <div className="mt-6">
                  <GameSeatPicker
                    prompt="Who clues first?"
                    optionLabel={(name) => `${name} clues first`}
                    onPick={(seat) =>
                      void commitGame(
                        (prev) => selectCodenamesFirstClue(prev, seat) ?? prev,
                      )
                    }
                  />
                </div>
              ) : null}
              <div
                className={[
                  'grid grid-cols-5 gap-1.5 sm:gap-2',
                  immersive ? 'mt-3 min-h-0 flex-1 content-center' : '',
                ].join(' ')}
              >
                {game.cards.map((card) => {
                  const clickable =
                    (canGuess || canSudden) &&
                    !card.contacted &&
                    card.bystanderFrom.length < 2 &&
                    !(
                      game.clueUid &&
                      card.bystanderFrom.includes(
                        canSudden ? otherPlayerUid(actorUid) : game.clueUid,
                      )
                    )
                  const timers = card.bystanderFrom.length
                  return (
                    <button
                      key={card.id}
                      type="button"
                      disabled={!clickable}
                      onClick={() =>
                        void commitGame(
                          (prev) =>
                            applyCodenamesGuess(prev, actorUid, card.id) ??
                            prev,
                        )
                      }
                      className={[
                        'relative min-h-[3.25rem] rounded-lg border px-1 py-2 text-center text-[10px] font-bold uppercase leading-tight sm:min-h-[4rem] sm:text-xs',
                        cardClass(card, keyUid, showKey, gameOver),
                        clickable ? 'hover:brightness-110' : '',
                      ].join(' ')}
                    >
                      {card.word}
                      {timers > 0 && !card.contacted ? (
                        <span className="absolute right-1 top-1 text-[9px] text-amber-200">
                          {timers === 1 ? '⏱' : '⏱⏱'}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>

              {showKey ? (
                <p className="text-center text-[11px] text-muted">
                  Your key — {myAgentsLeft} of your agents still uncovered.
                </p>
              ) : null}

              {canClue ? (
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

              {canGuess ? (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      void commitGame(
                        (prev) =>
                          endCodenamesGuesses(prev, actorUid) ?? prev,
                      )
                    }
                    className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-muted hover:text-app-text"
                  >
                    End guesses
                  </button>
                </div>
              ) : null}
            </>
          )}

          <NewGameConfirm
            open={newGameOpen}
            onClose={() => setNewGameOpen(false)}
            onConfirm={(opts) => void resetGame(opts)}
            blurb="Deals a new 5×5 Duet board. Pick the word pack, then who clues first."
          />
        </div>
      )}
    </ArcadeStage>
  )
}
