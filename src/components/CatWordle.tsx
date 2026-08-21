import { useEffect, useMemo, useRef, useState } from 'react'
import { useSharedWordle } from '../hooks/useSharedWordle'
import { householdName } from '../lib/household'
import { hostSeatUid, otherPlayerUid } from '../lib/jenga'
import {
  applyWordleGuess,
  selectWordleLength,
  selectWordleMode,
  submitVersusWord,
  surrenderWordle,
  WORDLE_MAX_GUESSES,
  type WordleGuessRow,
} from '../lib/wordle'
import {
  isValidWordleAnswer,
  isValidWordleGuess,
  secretMaxLen,
  wordleAnswerLength,
  type LetterMark,
} from '../lib/wordleWords'
import { ArcadeStage, ArcadeStatus } from './ArcadeStage'
import { NewGameConfirm } from './NewGameConfirm'
import { SurrenderButton } from './SurrenderButton'
import {
  WordGameLengthPicker,
  WordGameModePicker,
  WordGameSecretSetup,
} from './WordGameSetup'

const KEYS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

function markClass(mark: LetterMark | undefined): string {
  if (mark === 'correct') return 'bg-emerald-600 border-emerald-500 text-white'
  if (mark === 'present') return 'bg-amber-500 border-amber-400 text-white'
  if (mark === 'absent') return 'bg-zinc-700 border-zinc-600 text-zinc-300'
  return 'bg-surface border-border text-white'
}

function marksFromRows(rows: WordleGuessRow[]): Map<string, LetterMark> {
  const map = new Map<string, LetterMark>()
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
}

function WordleKeyboard({
  letterMarks,
  interactive,
  onLetter,
  onDelete,
  onEnter,
  canEnter,
}: {
  letterMarks: Map<string, LetterMark>
  interactive: boolean
  onLetter?: (ch: string) => void
  onDelete?: () => void
  onEnter?: () => void
  canEnter?: boolean
}) {
  const keyClass = interactive
    ? 'h-11 w-9 shrink-0 rounded-lg border text-sm font-semibold uppercase sm:h-12 sm:w-10 sm:text-base'
    : 'h-8 w-6 shrink-0 rounded-md border text-[10px] font-semibold uppercase sm:h-9 sm:w-7 sm:text-xs'

  return (
    <div className="space-y-1.5 sm:space-y-2">
      {KEYS.map((row) => (
        <div key={row} className="flex justify-center gap-1 sm:gap-1.5">
          {row.split('').map((ch) =>
            interactive ? (
              <button
                key={ch}
                type="button"
                onClick={() => onLetter?.(ch)}
                className={[keyClass, markClass(letterMarks.get(ch))].join(' ')}
              >
                {ch}
              </button>
            ) : (
              <span
                key={ch}
                className={[
                  'flex items-center justify-center',
                  keyClass,
                  markClass(letterMarks.get(ch)),
                ].join(' ')}
              >
                {ch}
              </span>
            ),
          )}
        </div>
      ))}
      {interactive ? (
        <div className="flex justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={onDelete}
            className="h-11 min-w-[5rem] rounded-lg border border-border bg-surface px-4 text-sm font-medium text-white sm:h-12 sm:text-base"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={onEnter}
            disabled={!canEnter}
            title={canEnter ? 'Submit guess' : 'Wait for your turn to submit'}
            className={[
              'h-11 min-w-[5rem] rounded-lg border px-5 text-sm font-semibold sm:h-12 sm:text-base',
              canEnter
                ? 'border-emerald-500/55 bg-emerald-500/20 text-app-text hover:bg-emerald-500/30'
                : 'cursor-default border-border/60 bg-surface/50 text-muted opacity-60',
            ].join(' ')}
          >
            Enter
          </button>
        </div>
      ) : null}
    </div>
  )
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

  const myLetterMarks = useMemo(
    () => marksFromRows(game.mode === 'coop' ? coopRows : myRows),
    [game.mode, coopRows, myRows],
  )
  const theirLetterMarks = useMemo(
    () => marksFromRows(theirRows),
    [theirRows],
  )

  const playing =
    game.phase === 'playing' && game.status === 'playing'
  const myTurn =
    playing &&
    (game.hotseat || game.turnUid === uid) &&
    game.turnUid === actorUid
  const canDraft = playing && myAnswerLen > 0

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
    if (draft) return 'Drafting…'
    return 'Waiting…'
  })()

  const lengthMode = game.lengthMode ?? 'standard'

  useEffect(() => {
    setDraft((d) => (d.length > myAnswerLen ? d.slice(0, myAnswerLen) : d))
  }, [myAnswerLen])

  const typeLetter = (ch: string) => {
    if (!canDraft) return
    const letter = ch.toLowerCase()
    if (!/^[a-z]$/.test(letter)) return
    setDraft((d) => (d.length >= myAnswerLen ? d : d + letter))
    setMsg(null)
  }

  const deleteLetter = () => {
    if (!canDraft) return
    setDraft((d) => d.slice(0, -1))
    setMsg(null)
  }

  const submitGuess = () => {
    if (!myTurn) {
      setMsg('Wait for your turn to submit')
      return
    }
    const g = draft.trim().toLowerCase().replace(/[^a-z]/g, '')
    if (g.length !== myAnswerLen) {
      setMsg(`Need ${myAnswerLen} letters`)
      return
    }
    if (!isValidWordleGuess(g, myAnswerLen, lengthMode)) {
      const answer =
        game.mode === 'coop' ? game.answer : game.answersByUid[actorUid]
      if (g !== answer) {
        setMsg('Not a word')
        return
      }
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

  const keyHandlersRef = useRef({ typeLetter, deleteLetter, submitGuess })
  keyHandlersRef.current = { typeLetter, deleteLetter, submitGuess }

  useEffect(() => {
    if (!canDraft) return
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      const handlers = keyHandlersRef.current
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault()
        handlers.deleteLetter()
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        handlers.submitGuess()
        return
      }
      if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault()
        handlers.typeLetter(event.key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canDraft])

  return (
    <ArcadeStage
      title="Wordle"
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
                  (prev) => surrenderWordle(prev, actorUid) ?? prev,
                )
              }
            />
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
                  <div className="space-y-3">
                    <Grid
                      rows={myRows}
                      title={`You (${householdName(actorUid)})`}
                      highlight={myTurn}
                      wordLen={myAnswerLen}
                    />
                    {canDraft ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {Array.from({ length: myAnswerLen }, (_, i) => (
                            <span
                              key={i}
                              className={[
                                'flex items-center justify-center rounded-md border font-bold uppercase text-white',
                                myTurn
                                  ? 'border-border bg-surface'
                                  : 'border-border bg-zinc-200/80 text-zinc-900',
                                myAnswerLen > 8
                                  ? 'h-9 w-9 text-sm'
                                  : myAnswerLen > 6
                                    ? 'h-11 w-11 text-base'
                                    : 'h-12 w-12 text-lg',
                              ].join(' ')}
                            >
                              {draft[i] ?? ''}
                            </span>
                          ))}
                        </div>
                        {!myTurn ? (
                          <p className="text-center text-xs text-app-text">
                            Draft a word — submits when it’s your turn
                          </p>
                        ) : null}
                        {msg ? (
                          <p className="text-center text-xs text-rose-300">
                            {msg}
                          </p>
                        ) : null}
                        <WordleKeyboard
                          letterMarks={myLetterMarks}
                          interactive
                          onLetter={typeLetter}
                          onDelete={deleteLetter}
                          onEnter={submitGuess}
                          canEnter={myTurn}
                        />
                      </div>
                    ) : (
                      <WordleKeyboard
                        letterMarks={myLetterMarks}
                        interactive={false}
                      />
                    )}
                  </div>
                  <div className="space-y-3">
                    <Grid
                      rows={theirRows}
                      title={householdName(otherUid)}
                      wordLen={theirAnswerLen}
                    />
                    <div>
                      <p className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted">
                        {householdName(otherUid)} keys
                      </p>
                      <WordleKeyboard
                        letterMarks={theirLetterMarks}
                        interactive={false}
                      />
                    </div>
                  </div>
                </div>
              )}

              {game.phase === 'finished' ? (
                <p className="text-center text-sm text-muted">
                  {game.mode === 'coop'
                    ? `Answer: ${game.answer?.toUpperCase()}`
                    : `Answers — ${householdName(host)}: ${game.answersByUid[host]?.toUpperCase() ?? '?'} · ${householdName(otherPlayerUid(host))}: ${game.answersByUid[otherPlayerUid(host)]?.toUpperCase() ?? '?'}`}
                </p>
              ) : null}

              {game.mode === 'coop' && canDraft ? (
                <div className="mx-auto w-full max-w-xl space-y-3">
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {Array.from({ length: myAnswerLen }, (_, i) => (
                      <span
                        key={i}
                        className={[
                          'flex items-center justify-center rounded-md border font-bold uppercase text-white',
                          myTurn
                            ? 'border-border bg-surface'
                            : 'border-border bg-zinc-200/80 text-zinc-900',
                          myAnswerLen > 8
                            ? 'h-9 w-9 text-sm'
                            : myAnswerLen > 6
                              ? 'h-11 w-11 text-base'
                              : 'h-12 w-12 text-lg',
                        ].join(' ')}
                      >
                        {draft[i] ?? ''}
                      </span>
                    ))}
                  </div>
                  {!myTurn ? (
                    <p className="text-center text-xs text-app-text">
                      Draft a word — submits when it’s your turn
                    </p>
                  ) : null}
                  {msg ? (
                    <p className="text-center text-xs text-rose-300">{msg}</p>
                  ) : null}
                  <WordleKeyboard
                    letterMarks={myLetterMarks}
                    interactive
                    onLetter={typeLetter}
                    onDelete={deleteLetter}
                    onEnter={submitGuess}
                    canEnter={myTurn}
                  />
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
