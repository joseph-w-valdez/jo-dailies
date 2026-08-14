import { useMemo, useState } from 'react'
import { useSharedWordle } from '../hooks/useSharedWordle'
import { householdName } from '../lib/household'
import { hostSeatUid, otherPlayerUid } from '../lib/jenga'
import {
  applyWordleGuess,
  selectWordleLength,
  selectWordleMode,
  submitVersusWord,
  WORDLE_MAX_GUESSES,
  type WordleGuessRow,
} from '../lib/wordle'
import {
  isValidWordleAnswer,
  secretMaxLen,
  wordleAnswerLength,
  type LetterMark,
} from '../lib/wordleWords'
import { ArcadeStage, ArcadeStatus } from './ArcadeStage'
import { NewGameConfirm } from './NewGameConfirm'
import {
  WordGameLengthPicker,
  WordGameModePicker,
  WordGameSecretSetup,
} from './WordGameSetup'

const KEYS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

function markClass(mark: LetterMark | undefined): string {
  if (mark === 'correct') return 'bg-emerald-600 border-emerald-500 text-white'
  if (mark === 'present') return 'bg-amber-500 border-amber-400 text-white'
  if (mark === 'absent') return 'bg-zinc-700 border-zinc-600 text-zinc-300'
  return 'bg-surface border-border text-white'
}

function Grid({
  rows,
  title,
  highlight,
  wordLen,
}: {
  rows: WordleGuessRow[]
  title: string
  highlight?: boolean
  wordLen: number
}) {
  const empties = Math.max(0, WORDLE_MAX_GUESSES - rows.length)
  const cell =
    wordLen > 8
      ? 'h-8 w-8 text-xs'
      : wordLen > 6
        ? 'h-9 w-9 text-sm'
        : 'h-10 w-10 text-sm'
  return (
    <div className={highlight ? 'rounded-xl ring-2 ring-golden/50 p-2' : 'p-2'}>
      <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
        {title}
        <span className="ml-1 font-normal normal-case text-muted/80">
          ({wordLen} letters)
        </span>
      </p>
      <div className="mx-auto grid w-fit gap-1.5">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-1.5">
            {row.word.split('').map((ch, j) => (
              <span
                key={j}
                className={[
                  'flex items-center justify-center rounded-md border font-bold uppercase',
                  cell,
                  markClass(row.marks[j]),
                ].join(' ')}
              >
                {ch}
              </span>
            ))}
          </div>
        ))}
        {Array.from({ length: empties }, (_, i) => (
          <div key={`e-${i}`} className="flex gap-1.5">
            {Array.from({ length: wordLen }, (_, j) => (
              <span
                key={j}
                className={`rounded-md border border-border bg-surface/40 ${cell}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CatWordle({ onClose }: { onClose: () => void }) {
  const { game, ready, uid, actorUid, commitGame, resetGame } = useSharedWordle()
  const [draft, setDraft] = useState('')
  const [secretDraft, setSecretDraft] = useState('')
  const [newGameOpen, setNewGameOpen] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const host = hostSeatUid()
  const coopRows = game.guessesByUid[host] ?? []
  const myRows = game.guessesByUid[actorUid] ?? []
  const otherUid = otherPlayerUid(actorUid)
  const theirRows = game.guessesByUid[otherUid] ?? []

  const myAnswerLen =
    game.mode === 'coop'
      ? wordleAnswerLength(game.answer)
      : wordleAnswerLength(game.answersByUid[actorUid])
  const theirAnswerLen = wordleAnswerLength(game.answersByUid[otherUid])

  const letterMarks = useMemo(() => {
    const map = new Map<string, LetterMark>()
    const rows =
      game.mode === 'coop' ? coopRows : [...myRows, ...theirRows]
    for (const row of rows) {
      row.word.split('').forEach((ch, i) => {
        const m = row.marks[i]
        if (!m) return
        const prev = map.get(ch)
        if (prev === 'correct') return
        if (m === 'correct' || prev !== 'present') map.set(ch, m)
      })
    }
    return map
  }, [game.mode, coopRows, myRows, theirRows])

  const myTurn =
    game.phase === 'playing' &&
    game.status === 'playing' &&
    (game.hotseat || game.turnUid === uid) &&
    game.turnUid === actorUid

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
        return game.status === 'won' ? 'You solved it!' : 'Out of guesses'
      }
      if (game.status === 'draw') return 'Draw'
      if (game.winnerUid === uid) return 'You win!'
      return `${householdName(game.winnerUid)} wins`
    }
    if (myTurn) return 'Your turn'
    return 'Waiting…'
  })()

  const lengthMode = game.lengthMode ?? 'standard'

  const submitGuess = () => {
    const g = draft.trim().toLowerCase().replace(/[^a-z]/g, '')
    if (g.length !== myAnswerLen) {
      setMsg(`Need ${myAnswerLen} letters`)
      return
    }
    void commitGame((prev) => {
      const next = applyWordleGuess(prev, actorUid, g)
      if (!next) {
        setMsg('Could not apply guess')
        return prev
      }
      setMsg(null)
      setDraft('')
      return next
    })
  }

  const typeLetter = (ch: string) => {
    if (!myTurn) return
    setDraft((d) => (d.length >= myAnswerLen ? d : d + ch))
  }

  return (
    <ArcadeStage
      title="Wordle"
      onClose={onClose}
      meta={<ArcadeStatus>{statusLabel}</ArcadeStatus>}
    >
      {() => (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setNewGameOpen(true)}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-white hover:border-muted"
            >
              New game
            </button>
          </div>

          {game.phase === 'pickMode' ? (
            <WordGameModePicker
              onCoop={() =>
                void commitGame((prev) => selectWordleMode(prev, 'coop'))
              }
              onVersus={() =>
                void commitGame((prev) => selectWordleMode(prev, 'versus'))
              }
              coopBlurb="Shared random word — alternate guesses on one grid."
              versusBlurb="Each picks a word for the other. Race — both grids visible."
            />
          ) : null}

          {game.phase === 'pickLength' ? (
            <WordGameLengthPicker
              modeLabel={game.mode === 'coop' ? 'Co-op' : 'Versus'}
              onStandard={() =>
                void commitGame(
                  (prev) => selectWordleLength(prev, 'standard') ?? prev,
                )
              }
              onVariable={() =>
                void commitGame(
                  (prev) => selectWordleLength(prev, 'variable') ?? prev,
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
              canLock={isValidWordleAnswer(secretDraft, lengthMode)}
              onLock={() =>
                void commitGame((prev) => {
                  const next = submitVersusWord(prev, actorUid, secretDraft)
                  return next ?? prev
                })
              }
            />
          ) : null}

          {game.phase === 'playing' || game.phase === 'finished' ? (
            <>
              {game.mode === 'coop' ? (
                <Grid
                  rows={coopRows}
                  title="Shared board"
                  highlight={myTurn}
                  wordLen={myAnswerLen}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Grid
                    rows={myRows}
                    title={`You (${householdName(actorUid)})`}
                    highlight={myTurn}
                    wordLen={myAnswerLen}
                  />
                  <Grid
                    rows={theirRows}
                    title={householdName(otherUid)}
                    wordLen={theirAnswerLen}
                  />
                </div>
              )}

              {game.phase === 'finished' ? (
                <p className="text-center text-sm text-muted">
                  {game.mode === 'coop'
                    ? `Answer: ${game.answer?.toUpperCase()}`
                    : `Answers — ${householdName(host)}: ${game.answersByUid[host]?.toUpperCase() ?? '?'} · ${householdName(otherPlayerUid(host))}: ${game.answersByUid[otherPlayerUid(host)]?.toUpperCase() ?? '?'}`}
                </p>
              ) : null}

              {myTurn ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {Array.from({ length: myAnswerLen }, (_, i) => (
                      <span
                        key={i}
                        className={[
                          'flex items-center justify-center rounded-md border border-border bg-surface font-bold uppercase text-white',
                          myAnswerLen > 8
                            ? 'h-8 w-8 text-sm'
                            : myAnswerLen > 6
                              ? 'h-10 w-10 text-base'
                              : 'h-11 w-11 text-lg',
                        ].join(' ')}
                      >
                        {draft[i] ?? ''}
                      </span>
                    ))}
                  </div>
                  {msg ? (
                    <p className="text-center text-xs text-rose-300">{msg}</p>
                  ) : null}
                  <div className="space-y-1.5">
                    {KEYS.map((row) => (
                      <div key={row} className="flex justify-center gap-1">
                        {row.split('').map((ch) => (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => typeLetter(ch)}
                            className={[
                              'h-10 min-w-[1.6rem] rounded-md border px-1.5 text-xs font-semibold uppercase',
                              markClass(letterMarks.get(ch)),
                            ].join(' ')}
                          >
                            {ch}
                          </button>
                        ))}
                      </div>
                    ))}
                    <div className="flex justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setDraft((d) => d.slice(0, -1))}
                        className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-white"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={submitGuess}
                        className="rounded-md border border-emerald-500/55 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-app-text"
                      >
                        Enter
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          <NewGameConfirm
            open={newGameOpen}
            onClose={() => setNewGameOpen(false)}
            onConfirm={(opts) => void resetGame(opts)}
            blurb="Starts a fresh Wordle round for both of you."
          />
        </div>
      )}
    </ArcadeStage>
  )
}
