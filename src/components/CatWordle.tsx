import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useSharedWordle } from '../hooks/useSharedWordle'
import { householdName } from '../lib/household'
import { hostSeatUid, otherPlayerUid } from '../lib/jenga'
import {
  applyWordleGuess,
  selectWordleFirst,
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
import { GameSeatPicker } from './GameSeatPicker'
import { NewGameConfirm } from './NewGameConfirm'
import { SurrenderButton } from './SurrenderButton'
import {
  WordGameLengthPicker,
  WordGameModePicker,
  WordGameSecretSetup,
} from './WordGameSetup'

const KEYS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

type DragPayload =
  | { kind: 'key'; letter: string }
  | { kind: 'slot'; index: number; letter: string }

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

function emptySlots(len: number): string[] {
  return Array.from({ length: Math.max(0, len) }, () => '')
}

function slotCellClass(wordLen: number): string {
  if (wordLen > 8) return 'h-9 w-9 text-sm'
  if (wordLen > 6) return 'h-11 w-11 text-base'
  return 'h-12 w-12 text-lg'
}

function LetterTile({
  letter,
  className,
}: {
  letter: string
  className?: string
}) {
  return (
    <span
      className={[
        'flex items-center justify-center rounded-md border font-bold uppercase',
        className,
      ].join(' ')}
    >
      {letter}
    </span>
  )
}

function DraftSlot({
  index,
  letter,
  myTurn,
  wordLen,
}: {
  index: number
  letter: string
  myTurn: boolean
  wordLen: number
}) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${index}`,
    data: { index },
  })
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `slot-${index}`,
    data: { kind: 'slot', index, letter } satisfies DragPayload,
    disabled: !letter,
  })

  const setRefs = (node: HTMLButtonElement | null) => {
    setDropRef(node)
    setNodeRef(node)
  }

  return (
    <button
      ref={setRefs}
      type="button"
      {...(letter ? { ...listeners, ...attributes } : {})}
      className={[
        'flex items-center justify-center rounded-md border font-bold uppercase touch-none',
        slotCellClass(wordLen),
        myTurn
          ? 'border-border bg-surface text-white'
          : 'border-border bg-zinc-200/80 text-zinc-900',
        letter ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
        isOver ? 'ring-2 ring-sky-400/80' : '',
        isDragging ? 'opacity-30' : '',
      ].join(' ')}
      aria-label={
        letter
          ? `Guess letter ${letter.toUpperCase()}, position ${index + 1}`
          : `Empty guess slot ${index + 1}`
      }
    >
      {isDragging ? '' : letter}
    </button>
  )
}

function KeyboardKey({
  ch,
  mark,
  onLetter,
}: {
  ch: string
  mark: LetterMark | undefined
  onLetter: (ch: string) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `key-${ch}`,
    data: { kind: 'key', letter: ch } satisfies DragPayload,
  })

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={() => onLetter(ch)}
      className={[
        'h-11 w-9 shrink-0 touch-none rounded-lg border text-sm font-semibold uppercase sm:h-12 sm:w-10 sm:text-base',
        'cursor-grab active:cursor-grabbing',
        markClass(mark),
        isDragging ? 'opacity-40' : '',
      ].join(' ')}
    >
      {ch}
    </button>
  )
}

function WordleGuessComposer({
  slots,
  wordLen,
  myTurn,
  letterMarks,
  msg,
  onLetter,
  onDelete,
  onEnter,
  onPlace,
  onSwap,
  onClear,
}: {
  slots: string[]
  wordLen: number
  myTurn: boolean
  letterMarks: Map<string, LetterMark>
  msg: string | null
  onLetter: (ch: string) => void
  onDelete: () => void
  onEnter: () => void
  onPlace: (index: number, letter: string) => void
  onSwap: (from: number, to: number) => void
  onClear: (index: number) => void
}) {
  const [activeDrag, setActiveDrag] = useState<DragPayload | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const onDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragPayload | undefined
    setActiveDrag(data ?? null)
  }

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null)
    const payload = event.active.data.current as DragPayload | undefined
    if (!payload) return
    const over = event.over
    if (!over) {
      // Dragged off the guess row — remove that tile.
      if (payload.kind === 'slot') onClear(payload.index)
      return
    }
    const to =
      typeof over.data.current?.index === 'number'
        ? over.data.current.index
        : Number(String(over.id).replace('drop-', ''))
    if (!Number.isInteger(to) || to < 0 || to >= wordLen) {
      if (payload.kind === 'slot') onClear(payload.index)
      return
    }
    if (payload.kind === 'key') {
      onPlace(to, payload.letter)
      return
    }
    if (payload.kind === 'slot' && payload.index !== to) {
      onSwap(payload.index, to)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div className="space-y-2">
        <div className="flex flex-wrap justify-center gap-1.5">
          {Array.from({ length: wordLen }, (_, i) => (
            <DraftSlot
              key={i}
              index={i}
              letter={slots[i] ?? ''}
              myTurn={myTurn}
              wordLen={wordLen}
            />
          ))}
        </div>
        <p className="text-center text-[10px] text-muted">
          Drag onto slots · reorder tiles · drag off to delete
        </p>
        {!myTurn ? (
          <p className="text-center text-xs text-app-text">
            Draft a word — submits when it’s your turn
          </p>
        ) : null}
        {msg ? (
          <p className="text-center text-xs text-rose-300">{msg}</p>
        ) : null}
        <div className="space-y-1.5 sm:space-y-2">
          {KEYS.map((row) => (
            <div key={row} className="flex justify-center gap-1 sm:gap-1.5">
              {row.split('').map((ch) => (
                <KeyboardKey
                  key={ch}
                  ch={ch}
                  mark={letterMarks.get(ch)}
                  onLetter={onLetter}
                />
              ))}
            </div>
          ))}
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
              disabled={!myTurn}
              title={
                myTurn ? 'Submit guess' : 'Wait for your turn to submit'
              }
              className={[
                'h-11 min-w-[5rem] rounded-lg border px-5 text-sm font-semibold sm:h-12 sm:text-base',
                myTurn
                  ? 'border-emerald-500/55 bg-emerald-500/20 text-app-text hover:bg-emerald-500/30'
                  : 'cursor-default border-border/60 bg-surface/50 text-muted opacity-60',
              ].join(' ')}
            >
              Enter
            </button>
          </div>
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeDrag ? (
          <LetterTile
            letter={activeDrag.letter}
            className={[
              slotCellClass(wordLen),
              'border-sky-400/70 bg-sky-500/30 text-white shadow-lg',
            ].join(' ')}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
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
  const [draftSlots, setDraftSlots] = useState<string[]>(() => emptySlots(5))
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

  const playing =
    game.phase === 'playing' && game.status === 'playing'
  const myTurn =
    playing &&
    (game.hotseat || game.turnUid === uid) &&
    game.turnUid === actorUid
  const canDraft = playing && myAnswerLen > 0
  const hasDraft = draftSlots.some(Boolean)

  const statusLabel = (() => {
    if (!ready) return 'Syncing…'
    if (game.firstUid == null) return 'Who goes first?'
    if (game.phase === 'pickMode') return 'Pick a mode'
    if (game.phase === 'pickLength') {
      return game.mode === 'coop'
        ? 'Co-op — pick word length'
        : 'Versus — pick word length'
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
    if (hasDraft) return 'Drafting…'
    return 'Waiting…'
  })()

  const lengthMode = game.lengthMode ?? 'standard'

  useEffect(() => {
    setDraftSlots((prev) => {
      if (prev.length === myAnswerLen) return prev
      return Array.from({ length: myAnswerLen }, (_, i) => prev[i] ?? '')
    })
  }, [myAnswerLen])

  const typeLetter = (ch: string) => {
    if (!canDraft) return
    const letter = ch.toLowerCase()
    if (!/^[a-z]$/.test(letter)) return
    setDraftSlots((slots) => {
      const next = [...slots]
      const emptyAt = next.findIndex((s) => !s)
      if (emptyAt < 0) return slots
      next[emptyAt] = letter
      return next
    })
    setMsg(null)
  }

  const deleteLetter = () => {
    if (!canDraft) return
    setDraftSlots((slots) => {
      const next = [...slots]
      for (let i = next.length - 1; i >= 0; i -= 1) {
        if (next[i]) {
          next[i] = ''
          return next
        }
      }
      return slots
    })
    setMsg(null)
  }

  const placeLetter = (index: number, ch: string) => {
    if (!canDraft) return
    const letter = ch.toLowerCase()
    if (!/^[a-z]$/.test(letter)) return
    if (index < 0 || index >= myAnswerLen) return
    setDraftSlots((slots) => {
      const next = [...slots]
      next[index] = letter
      return next
    })
    setMsg(null)
  }

  const swapSlots = (from: number, to: number) => {
    if (!canDraft) return
    setDraftSlots((slots) => {
      if (
        from < 0 ||
        to < 0 ||
        from >= slots.length ||
        to >= slots.length ||
        from === to
      ) {
        return slots
      }
      const next = [...slots]
      const tmp = next[from]!
      next[from] = next[to]!
      next[to] = tmp
      return next
    })
    setMsg(null)
  }

  const clearSlot = (index: number) => {
    if (!canDraft) return
    if (index < 0 || index >= myAnswerLen) return
    setDraftSlots((slots) => {
      if (!slots[index]) return slots
      const next = [...slots]
      next[index] = ''
      return next
    })
    setMsg(null)
  }

  const submitGuess = () => {
    if (!myTurn) {
      setMsg('Wait for your turn to submit')
      return
    }
    if (draftSlots.some((s) => !s) || draftSlots.length !== myAnswerLen) {
      setMsg(`Need ${myAnswerLen} letters`)
      return
    }
    const g = draftSlots.join('').toLowerCase()
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
      setDraftSlots(emptySlots(myAnswerLen))
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

  const composer = canDraft ? (
    <div className="mx-auto w-full max-w-xl">
      <WordleGuessComposer
        slots={draftSlots}
        wordLen={myAnswerLen}
        myTurn={myTurn}
        letterMarks={myLetterMarks}
        msg={msg}
        onLetter={typeLetter}
        onDelete={deleteLetter}
        onEnter={submitGuess}
        onPlace={placeLetter}
        onSwap={swapSlots}
        onClear={clearSlot}
      />
    </div>
  ) : null

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

          <NewGameConfirm
            open={newGameOpen}
            onClose={() => setNewGameOpen(false)}
            onConfirm={(opts) => void resetGame(opts)}
            blurb="Starts a fresh Wordle round. Pick who goes first."
          />

          {game.firstUid == null ? (
            <GameSeatPicker
              prompt="Who goes first?"
              optionLabel={(name) => `${name} goes first`}
              onPick={(seat) =>
                void commitGame(
                  (prev) => selectWordleFirst(prev, seat) ?? prev,
                )
              }
            />
          ) : (
            <>
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
                      const next = submitVersusWord(
                        prev,
                        actorUid,
                        secretDraft,
                      )
                      return next ?? prev
                    })
                  }
                />
              ) : null}

              {game.phase === 'playing' || game.phase === 'finished' ? (
                <>
                  {game.mode === 'coop' ? (
                    <>
                      <Grid
                        rows={coopRows}
                        title="Shared board"
                        highlight={myTurn}
                        wordLen={myAnswerLen}
                      />
                      {composer}
                    </>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-3">
                        <Grid
                          rows={myRows}
                          title={`You (${householdName(actorUid)})`}
                          highlight={myTurn}
                          wordLen={myAnswerLen}
                        />
                        {composer}
                      </div>
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
                </>
              ) : null}
            </>
          )}
        </div>
      )}
    </ArcadeStage>
  )
}
