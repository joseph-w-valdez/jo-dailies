import { useEffect, useState } from 'react'
import {
  checkNoteAnswer,
  ledgerStepsFor,
  noteHandLabel,
  noteModeLabel,
  NOTE_LETTERS,
  pickStaffPrompt,
  playStaffNote,
  type NoteHandMode,
  type NoteLetter,
  type StaffPrompt,
} from '../lib/notes'
import { ArcadeStage, ArcadeStatus } from './ArcadeStage'

const HAND_PREF_KEY = 'jo-dailies:notes-hand:v1'

const LINE_GAP = 18
const STAFF_LEFT = 72
const STAFF_RIGHT = 280
const NOTE_X = 200
const SVG_W = 320
const SVG_H = 200
/** Y of the top staff line. */
const STAFF_TOP = 48

function loadHandPref(): NoteHandMode {
  try {
    const raw = localStorage.getItem(HAND_PREF_KEY)
    if (raw === 'left' || raw === 'right' || raw === 'both') return raw
  } catch {
    /* ignore */
  }
  return 'right'
}

function saveHandPref(mode: NoteHandMode): void {
  try {
    localStorage.setItem(HAND_PREF_KEY, mode)
  } catch {
    /* ignore */
  }
}

function stepY(staffStep: number): number {
  return STAFF_TOP + 4 * LINE_GAP - staffStep * (LINE_GAP / 2)
}

function StaffView({
  prompt,
  reveal,
}: {
  prompt: StaffPrompt
  reveal: boolean
}) {
  const y = stepY(prompt.staffStep)
  const ledgers = ledgerStepsFor(prompt.staffStep)

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="mx-auto h-auto w-full max-w-md select-none"
      role="img"
      aria-label={
        reveal
          ? `${prompt.letter}${prompt.octave} on ${noteHandLabel(prompt.hand)}`
          : `Mystery note on ${noteHandLabel(prompt.hand)}`
      }
    >
      <rect width={SVG_W} height={SVG_H} fill="transparent" />
      {[0, 1, 2, 3, 4].map((i) => {
        const ly = STAFF_TOP + i * LINE_GAP
        return (
          <line
            key={i}
            x1={STAFF_LEFT}
            x2={STAFF_RIGHT}
            y1={ly}
            y2={ly}
            stroke="currentColor"
            strokeWidth={1.5}
            className="text-white/80"
          />
        )
      })}
      {prompt.hand === 'right' ? (
        <text
          x={STAFF_LEFT + 6}
          y={STAFF_TOP + 3.35 * LINE_GAP}
          className="fill-white"
          fontSize={64}
          fontFamily="Georgia, 'Times New Roman', serif"
        >
          𝄞
        </text>
      ) : (
        <g className="fill-white stroke-white" transform={`translate(${STAFF_LEFT + 18}, ${STAFF_TOP + LINE_GAP})`}>
          {/* Bass clef: spiral on F line + two dots */}
          <path
            d="M12 28c0-14 12-22 22-22 8 0 14 5 14 12 0 10-12 14-20 18-6 3-10 8-10 14 0 9 8 16 18 16 11 0 20-7 22-18"
            fill="none"
            strokeWidth={3.2}
            strokeLinecap="round"
          />
          <circle cx={42} cy={6} r={3.2} />
          <circle cx={42} cy={20} r={3.2} />
        </g>
      )}
      {ledgers.map((step) => {
        const ly = stepY(step)
        return (
          <line
            key={step}
            x1={NOTE_X - 16}
            x2={NOTE_X + 16}
            y1={ly}
            y2={ly}
            stroke="currentColor"
            strokeWidth={1.5}
            className="text-white/80"
          />
        )
      })}
      <ellipse
        cx={NOTE_X}
        cy={y}
        rx={11}
        ry={8}
        transform={`rotate(-18 ${NOTE_X} ${y})`}
        className="fill-sky-300"
      />
      {reveal ? (
        <text
          x={NOTE_X + 28}
          y={y + 5}
          className="fill-amber-200"
          fontSize={18}
          fontWeight={700}
          fontFamily="ui-monospace, monospace"
        >
          {prompt.letter}
        </text>
      ) : null}
    </svg>
  )
}

export function CatNotes({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<'setup' | 'playing'>('setup')
  const [handDraft, setHandDraft] = useState<NoteHandMode>(() => loadHandPref())
  const [mode, setMode] = useState<NoteHandMode>('right')
  const [prompt, setPrompt] = useState<StaffPrompt | null>(null)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [picked, setPicked] = useState<NoteLetter | null>(null)
  const [locked, setLocked] = useState(false)

  const nextPrompt = (currentMode: NoteHandMode, excludeId?: string) => {
    setPrompt(pickStaffPrompt(currentMode, Math.random, excludeId))
    setFeedback(null)
    setPicked(null)
    setLocked(false)
  }

  const begin = () => {
    saveHandPref(handDraft)
    setMode(handDraft)
    setStreak(0)
    setAnswered(0)
    setCorrectCount(0)
    setFeedback(null)
    setPicked(null)
    setLocked(false)
    setPrompt(pickStaffPrompt(handDraft, Math.random))
    setPhase('playing')
  }

  const openSetup = () => {
    setPhase('setup')
    setPrompt(null)
    setFeedback(null)
    setPicked(null)
    setLocked(false)
  }

  const answer = (letter: NoteLetter) => {
    if (!prompt || locked) return
    const ok = checkNoteAnswer(prompt, letter)
    setLocked(true)
    setPicked(letter)
    setFeedback(ok ? 'correct' : 'wrong')
    setAnswered((n) => n + 1)
    if (ok) {
      setCorrectCount((n) => n + 1)
      setStreak((s) => {
        const next = s + 1
        setBest((b) => Math.max(b, next))
        return next
      })
    } else {
      setStreak(0)
    }
  }

  useEffect(() => {
    if (!feedback || !prompt) return
    const t = window.setTimeout(() => {
      nextPrompt(mode, prompt.id)
    }, feedback === 'correct' ? 550 : 1100)
    return () => window.clearTimeout(t)
  }, [feedback, prompt, mode])

  useEffect(() => {
    if (phase !== 'playing' || !prompt || feedback) return
    playStaffNote(prompt.letter, prompt.octave)
  }, [phase, prompt?.id, feedback])

  useEffect(() => {
    if (phase !== 'playing' || locked) return
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toUpperCase()
      if ((NOTE_LETTERS as readonly string[]).includes(key)) {
        event.preventDefault()
        answer(key as NoteLetter)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, locked, prompt])

  const statusLabel =
    phase === 'setup'
      ? 'New game setup'
      : feedback === 'correct'
        ? 'Correct'
        : feedback === 'wrong' && prompt
          ? `It's ${prompt.letter}`
          : streak > 0
            ? `Streak ${streak}`
            : 'Name the note'

  const accuracy =
    answered === 0 ? null : Math.round((correctCount / answered) * 100)

  return (
    <ArcadeStage
      title="Notes"
      onClose={onClose}
      meta={
        <ArcadeStatus
          tone={
            feedback === 'correct'
              ? 'win'
              : feedback === 'wrong'
                ? 'danger'
                : 'ready'
          }
        >
          {statusLabel}
        </ArcadeStatus>
      }
    >
      {({ immersive }) => (
        <div className={immersive ? 'flex min-h-0 flex-1 flex-col' : undefined}>
          {immersive ? null : (
            <p className="mt-2 text-xs text-muted">
              Unlimited staff flashcards — local only. Pick left (bass) or
              right (treble) hand, then name each note. Each prompt also plays
              its pitch. Keys A–G work too.
            </p>
          )}

          {phase === 'setup' ? (
            <div className="mx-auto mt-6 w-full max-w-md space-y-4 rounded-xl border border-border bg-surface/60 p-4">
              <div>
                <h2 className="text-sm font-semibold text-white">New game</h2>
                <p className="mt-1 text-xs text-muted">
                  Right hand reads treble clef. Left hand reads bass clef. Both
                  mixes them.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['right', 'left', 'both'] as const).map((option) => {
                  const selected = handDraft === option
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setHandDraft(option)}
                      className={[
                        'rounded-lg border px-2 py-2.5 text-xs font-medium transition',
                        selected
                          ? 'border-sky-500/55 bg-sky-500/20 text-app-text'
                          : 'border-border bg-surface text-muted hover:text-white',
                      ].join(' ')}
                    >
                      {option === 'right'
                        ? 'Right'
                        : option === 'left'
                          ? 'Left'
                          : 'Both'}
                    </button>
                  )
                })}
              </div>
              <p className="text-center text-[11px] text-muted">
                {noteModeLabel(handDraft)}
              </p>
              <button
                type="button"
                onClick={begin}
                className="w-full rounded-lg border border-sky-500/55 bg-sky-500/20 px-3 py-2.5 text-sm font-medium text-app-text hover:bg-sky-500/30"
              >
                Start
              </button>
            </div>
          ) : !prompt ? null : (
            <div
              className={[
                'mx-auto mt-3 w-full max-w-lg space-y-3',
                immersive ? 'flex min-h-0 flex-1 flex-col justify-center' : '',
              ].join(' ')}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                <span>{noteHandLabel(prompt.hand)}</span>
                <span className="tabular-nums">
                  Streak {streak}
                  {best > 0 ? ` · best ${best}` : ''}
                  {accuracy != null ? ` · ${accuracy}%` : ''}
                </span>
              </div>

              <div
                className={[
                  'rounded-xl border bg-[#0b1220] px-2 py-3 text-white transition',
                  feedback === 'correct'
                    ? 'border-emerald-500/55'
                    : feedback === 'wrong'
                      ? 'border-rose-500/55'
                      : 'border-border',
                ].join(' ')}
              >
                <StaffView prompt={prompt} reveal={feedback === 'wrong'} />
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {NOTE_LETTERS.map((letter) => {
                  const isCorrectLetter = letter === prompt.letter
                  const isPicked = picked === letter
                  const showCorrect =
                    feedback != null && isCorrectLetter
                  const showWrongPick =
                    feedback === 'wrong' && isPicked && !isCorrectLetter
                  return (
                    <button
                      key={letter}
                      type="button"
                      disabled={locked}
                      onClick={() => answer(letter)}
                      className={[
                        'rounded-lg border py-3 text-sm font-semibold tabular-nums transition',
                        showCorrect
                          ? 'border-emerald-500/55 bg-emerald-500/25 text-app-text'
                          : showWrongPick
                            ? 'border-rose-500/55 bg-rose-500/20 text-app-text'
                            : 'border-border bg-surface text-white hover:border-sky-500/50 hover:bg-sky-500/15 disabled:opacity-60',
                      ].join(' ')}
                    >
                      {letter}
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => playStaffNote(prompt.letter, prompt.octave)}
                  className="rounded-lg border border-sky-500/45 bg-sky-500/15 px-3 py-2 text-xs font-medium text-app-text hover:bg-sky-500/25"
                >
                  Hear again
                </button>
                <button
                  type="button"
                  onClick={openSetup}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted hover:text-white"
                >
                  New
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </ArcadeStage>
  )
}
