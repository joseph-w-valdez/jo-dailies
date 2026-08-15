import { useState } from 'react'
import { useSharedHangman } from '../hooks/useSharedHangman'
import {
  applyHangmanGuess,
  hangmanMask,
  HANGMAN_MAX_MISSES,
  selectHangmanLength,
  selectHangmanMode,
  submitHangmanWord,
  surrenderHangman,
} from '../lib/hangman'
import { householdName } from '../lib/household'
import { otherPlayerUid } from '../lib/jenga'
import { isValidSecretWord, secretMaxLen } from '../lib/wordBank'
import { ArcadeStage, ArcadeStatus } from './ArcadeStage'
import { NewGameConfirm } from './NewGameConfirm'
import { SurrenderButton } from './SurrenderButton'
import {
  WordGameLengthPicker,
  WordGameModePicker,
  WordGameSecretSetup,
} from './WordGameSetup'

const ALPHA = 'abcdefghijklmnopqrstuvwxyz'

function Gallows({ misses }: { misses: number }) {
  return (
    <svg viewBox="0 0 100 120" className="mx-auto h-28 w-24 text-muted">
      <line x1="10" y1="110" x2="70" y2="110" stroke="currentColor" strokeWidth="4" />
      <line x1="30" y1="110" x2="30" y2="10" stroke="currentColor" strokeWidth="4" />
      <line x1="30" y1="10" x2="70" y2="10" stroke="currentColor" strokeWidth="4" />
      <line x1="70" y1="10" x2="70" y2="25" stroke="currentColor" strokeWidth="3" />
      {misses >= 1 ? (
        <circle cx="70" cy="35" r="10" fill="none" stroke="var(--color-app-text)" strokeWidth="3" />
      ) : null}
      {misses >= 2 ? (
        <line x1="70" y1="45" x2="70" y2="75" stroke="var(--color-app-text)" strokeWidth="3" />
      ) : null}
      {misses >= 3 ? (
        <line x1="70" y1="55" x2="55" y2="65" stroke="var(--color-app-text)" strokeWidth="3" />
      ) : null}
      {misses >= 4 ? (
        <line x1="70" y1="55" x2="85" y2="65" stroke="var(--color-app-text)" strokeWidth="3" />
      ) : null}
      {misses >= 5 ? (
        <line x1="70" y1="75" x2="55" y2="95" stroke="var(--color-app-text)" strokeWidth="3" />
      ) : null}
      {misses >= 6 ? (
        <line x1="70" y1="75" x2="85" y2="95" stroke="var(--color-app-text)" strokeWidth="3" />
      ) : null}
    </svg>
  )
}

export function CatHangman({ onClose }: { onClose: () => void }) {
  const { game, ready, uid, actorUid, commitGame, resetGame } =
    useSharedHangman()
  const [secretDraft, setSecretDraft] = useState('')
  const [newGameOpen, setNewGameOpen] = useState(false)

  const otherUid = otherPlayerUid(actorUid)
  const lengthMode = game.lengthMode ?? 'standard'
  const mySeat = game.seats[actorUid]
  const theirSeat = game.seats[otherUid]

  const myTurn =
    game.phase === 'playing' &&
    game.status === 'playing' &&
    game.turnUid === actorUid &&
    (game.hotseat || game.turnUid === uid)

  const statusLabel = (() => {
    if (!ready) return 'Syncing…'
    if (game.phase === 'pickMode') return 'Pick a mode'
    if (game.phase === 'pickLength') {
      return game.mode === 'coop' ? 'Co-op — pick word length' : 'Versus — pick word length'
    }
    if (game.phase === 'versusSetup') {
      return game.submittedFor[actorUid]
        ? 'Waiting for opponent’s word…'
        : 'Enter a word for your opponent'
    }
    if (game.phase === 'finished') {
      if (game.mode === 'coop') {
        return game.status === 'won' ? 'Solved!' : `Hung — ${game.word}`
      }
      if (game.status === 'draw') return 'Draw'
      if (game.winnerUid === uid) return 'You win!'
      return `${householdName(game.winnerUid)} wins`
    }
    if (myTurn) return 'Your turn — pick a letter'
    return 'Waiting…'
  })()

  const guessLetter = (letter: string) => {
    if (!myTurn) return
    void commitGame((prev) => applyHangmanGuess(prev, actorUid, letter) ?? prev)
  }

  return (
    <ArcadeStage
      title="Hangman"
      onClose={onClose}
      meta={<ArcadeStatus>{statusLabel}</ArcadeStatus>}
    >
      {() => (
        <div className="space-y-4">
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setNewGameOpen(true)}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-white hover:border-muted"
            >
              New game
            </button>
            <SurrenderButton
              disabled={
                !uid ||
                game.mode !== 'versus' ||
                game.phase !== 'playing' ||
                game.status !== 'playing'
              }
              onSurrender={() =>
                void commitGame(
                  (prev) => surrenderHangman(prev, actorUid) ?? prev,
                )
              }
            />
          </div>

          {game.phase === 'pickMode' ? (
            <WordGameModePicker
              onCoop={() =>
                void commitGame((prev) => selectHangmanMode(prev, 'coop'))
              }
              onVersus={() =>
                void commitGame((prev) => selectHangmanMode(prev, 'versus'))
              }
              coopBlurb="One random word — take turns guessing letters."
              versusBlurb="Each picks a word for the other. Race — progress is visible."
            />
          ) : null}

          {game.phase === 'pickLength' ? (
            <WordGameLengthPicker
              modeLabel={game.mode === 'coop' ? 'Co-op' : 'Versus'}
              onStandard={() =>
                void commitGame(
                  (prev) => selectHangmanLength(prev, 'standard') ?? prev,
                )
              }
              onVariable={() =>
                void commitGame(
                  (prev) => selectHangmanLength(prev, 'variable') ?? prev,
                )
              }
            />
          ) : null}

          {game.phase === 'versusSetup' ? (
            <WordGameSecretSetup
              otherName={householdName(otherUid)}
              lengthMode={lengthMode}
              submitted={Boolean(game.submittedFor[actorUid])}
              draft={secretDraft}
              onDraftChange={setSecretDraft}
              maxLen={secretMaxLen(lengthMode)}
              canLock={isValidSecretWord(secretDraft, lengthMode)}
              onLock={() =>
                void commitGame(
                  (prev) =>
                    submitHangmanWord(prev, actorUid, secretDraft) ?? prev,
                )
              }
            />
          ) : null}

          {(game.phase === 'playing' || game.phase === 'finished') &&
          game.mode === 'coop' ? (
            <div className="space-y-3 text-center">
              <Gallows misses={game.misses} />
              <p className="font-mono text-2xl tracking-[0.35em] text-white">
                {game.word
                  ? hangmanMask(
                      game.phase === 'finished' && game.status === 'lost'
                        ? game.word
                        : game.word,
                      game.phase === 'finished' && game.status === 'lost'
                        ? game.word.split('')
                        : game.guessed,
                    )
                  : ''}
              </p>
              <p className="text-xs text-muted">
                Misses {game.misses}/{HANGMAN_MAX_MISSES}
              </p>
            </div>
          ) : null}

          {(game.phase === 'playing' || game.phase === 'finished') &&
          game.mode === 'versus' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { uid: actorUid, seat: mySeat, label: 'You' },
                { uid: otherUid, seat: theirSeat, label: householdName(otherUid) },
              ].map(({ uid: seatUid, seat, label }) => (
                <div
                  key={seatUid}
                  className={[
                    'rounded-xl border border-border bg-surface/50 p-3 text-center',
                    myTurn && seatUid === actorUid ? 'ring-2 ring-golden/40' : '',
                  ].join(' ')}
                >
                  <p className="text-[11px] font-semibold uppercase text-muted">
                    {label}
                  </p>
                  <Gallows misses={seat?.misses ?? 0} />
                  <p className="mt-1 font-mono text-lg tracking-[0.3em] text-white">
                    {seat?.word
                      ? hangmanMask(
                          seat.word,
                          game.phase === 'finished'
                            ? seat.word.split('')
                            : seat.guessed,
                        )
                      : '—'}
                  </p>
                  <p className="text-[11px] text-muted">
                    Misses {seat?.misses ?? 0}/{HANGMAN_MAX_MISSES}
                    {seat?.solved ? ' · solved' : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {myTurn ? (
            <div className="flex flex-wrap justify-center gap-1.5">
              {ALPHA.split('').map((ch) => {
                const used =
                  game.mode === 'coop'
                    ? game.guessed.includes(ch)
                    : (mySeat?.guessed.includes(ch) ?? false)
                return (
                  <button
                    key={ch}
                    type="button"
                    disabled={used}
                    onClick={() => guessLetter(ch)}
                    className="h-9 w-8 rounded-md border border-border bg-surface text-xs font-semibold uppercase text-white disabled:opacity-30"
                  >
                    {ch}
                  </button>
                )
              })}
            </div>
          ) : null}

          <NewGameConfirm
            open={newGameOpen}
            onClose={() => setNewGameOpen(false)}
            onConfirm={(opts) => void resetGame(opts)}
            blurb="Starts a fresh Hangman round for both of you."
          />
        </div>
      )}
    </ArcadeStage>
  )
}
