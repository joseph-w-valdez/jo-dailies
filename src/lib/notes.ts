/** Piano staff flashcards — letter names only (no accidentals). */

export type NoteLetter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'

export type NoteHand = 'left' | 'right'

export type NoteHandMode = NoteHand | 'both'

export const NOTE_LETTERS: readonly NoteLetter[] = [
  'C',
  'D',
  'E',
  'F',
  'G',
  'A',
  'B',
]

export const NOTE_HAND_MODES: readonly NoteHandMode[] = [
  'left',
  'right',
  'both',
]

/** Staff step: 0 = bottom line, +1 each line/space upward. */
export type StaffPrompt = {
  id: string
  hand: NoteHand
  letter: NoteLetter
  /** Scientific octave (C4 = middle C). */
  octave: number
  staffStep: number
}

const LETTER_INDEX: Record<NoteLetter, number> = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
}

/** Treble bottom line is E4 (step 0). */
function trebleStep(letter: NoteLetter, octave: number): number {
  const fromC0 = octave * 7 + LETTER_INDEX[letter]
  const e4 = 4 * 7 + LETTER_INDEX.E
  return fromC0 - e4
}

/** Bass bottom line is G2 (step 0). */
function bassStep(letter: NoteLetter, octave: number): number {
  const fromC0 = octave * 7 + LETTER_INDEX[letter]
  const g2 = 2 * 7 + LETTER_INDEX.G
  return fromC0 - g2
}

/** Right hand / treble: C4–A5 (ledger through high A). */
const RIGHT_NOTES: ReadonlyArray<{ letter: NoteLetter; octave: number }> = [
  { letter: 'C', octave: 4 },
  { letter: 'D', octave: 4 },
  { letter: 'E', octave: 4 },
  { letter: 'F', octave: 4 },
  { letter: 'G', octave: 4 },
  { letter: 'A', octave: 4 },
  { letter: 'B', octave: 4 },
  { letter: 'C', octave: 5 },
  { letter: 'D', octave: 5 },
  { letter: 'E', octave: 5 },
  { letter: 'F', octave: 5 },
  { letter: 'G', octave: 5 },
  { letter: 'A', octave: 5 },
]

/** Left hand / bass: E2–C4 (ledger through middle C). */
const LEFT_NOTES: ReadonlyArray<{ letter: NoteLetter; octave: number }> = [
  { letter: 'E', octave: 2 },
  { letter: 'F', octave: 2 },
  { letter: 'G', octave: 2 },
  { letter: 'A', octave: 2 },
  { letter: 'B', octave: 2 },
  { letter: 'C', octave: 3 },
  { letter: 'D', octave: 3 },
  { letter: 'E', octave: 3 },
  { letter: 'F', octave: 3 },
  { letter: 'G', octave: 3 },
  { letter: 'A', octave: 3 },
  { letter: 'B', octave: 3 },
  { letter: 'C', octave: 4 },
]

export function noteHandLabel(hand: NoteHand): string {
  return hand === 'right' ? 'Right hand · treble' : 'Left hand · bass'
}

export function noteModeLabel(mode: NoteHandMode): string {
  if (mode === 'both') return 'Both hands'
  return noteHandLabel(mode)
}

export function staffStepFor(
  hand: NoteHand,
  letter: NoteLetter,
  octave: number,
): number {
  return hand === 'right' ? trebleStep(letter, octave) : bassStep(letter, octave)
}

function promptId(hand: NoteHand, letter: NoteLetter, octave: number): string {
  return `${hand}-${letter}${octave}`
}

export function buildStaffPrompt(
  hand: NoteHand,
  letter: NoteLetter,
  octave: number,
): StaffPrompt {
  return {
    id: promptId(hand, letter, octave),
    hand,
    letter,
    octave,
    staffStep: staffStepFor(hand, letter, octave),
  }
}

export function notePoolForHand(hand: NoteHand): StaffPrompt[] {
  const source = hand === 'right' ? RIGHT_NOTES : LEFT_NOTES
  return source.map(({ letter, octave }) =>
    buildStaffPrompt(hand, letter, octave),
  )
}

export function notePoolForMode(mode: NoteHandMode): StaffPrompt[] {
  if (mode === 'both') {
    return [...notePoolForHand('left'), ...notePoolForHand('right')]
  }
  return notePoolForHand(mode)
}

export function pickStaffPrompt(
  mode: NoteHandMode,
  random: () => number = Math.random,
  excludeId?: string,
): StaffPrompt {
  const pool = notePoolForMode(mode)
  const filtered =
    excludeId == null ? pool : pool.filter((p) => p.id !== excludeId)
  const list = filtered.length > 0 ? filtered : pool
  const i = Math.floor(random() * list.length)
  return list[i] ?? list[0]!
}

export function checkNoteAnswer(
  prompt: StaffPrompt,
  answer: NoteLetter,
): boolean {
  return prompt.letter === answer
}

const LETTER_SEMITONE: Record<NoteLetter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

/** MIDI note number (A4 = 69). */
export function noteMidi(letter: NoteLetter, octave: number): number {
  return (octave + 1) * 12 + LETTER_SEMITONE[letter]
}

/** Equal-temperament frequency in Hz (A4 = 440). */
export function noteFrequencyHz(letter: NoteLetter, octave: number): number {
  return 440 * 2 ** ((noteMidi(letter, octave) - 69) / 12)
}

type AudioContextCtor = typeof AudioContext

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & { webkitAudioContext?: AudioContextCtor }
  return window.AudioContext ?? w.webkitAudioContext ?? null
}

let sharedAudioCtx: AudioContext | null = null

function getSharedAudioContext(): AudioContext | null {
  const Ctor = getAudioContextCtor()
  if (!Ctor) return null
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new Ctor()
  }
  return sharedAudioCtx
}

/** Soft triangle blip for the written pitch. Safe no-op without Web Audio. */
export function playStaffNote(
  letter: NoteLetter,
  octave: number,
  durationSec = 0.55,
): void {
  const ctx = getSharedAudioContext()
  if (!ctx) return
  void ctx.resume()
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(noteFrequencyHz(letter, octave), now)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.2, now + 0.025)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + durationSec + 0.02)
}

/** Ledger line staff-steps needed around a note (even steps only). */
export function ledgerStepsFor(staffStep: number): number[] {
  const out: number[] = []
  if (staffStep < 0) {
    let s = staffStep % 2 === 0 ? staffStep : staffStep - 1
    for (; s < 0; s += 2) out.push(s)
  } else if (staffStep > 8) {
    for (let s = 10; s <= staffStep; s += 2) out.push(s)
  }
  return out
}
