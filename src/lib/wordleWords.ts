import {
  isInWordBank,
  isValidSecretWord,
  normalizeSharedWord,
  pickSharedWord,
  secretMaxLen as sharedSecretMaxLen,
  WORD_MAX_LEN,
  WORD_MIN_LEN,
  type SharedWordLengthMode,
} from './wordBank'

export const WORDLE_MIN_LEN = WORD_MIN_LEN
export const WORDLE_MAX_LEN = WORD_MAX_LEN

export type WordleLengthMode = Extract<SharedWordLengthMode, 'standard' | 'variable'>

export function isValidWordleGuess(
  word: string,
  expectedLen: number,
  lengthMode: WordleLengthMode = 'standard',
): boolean {
  const w = normalizeSharedWord(word)
  if (w.length !== expectedLen) return false
  return isInWordBank(w, lengthMode)
}

/** Versus secret validation for the chosen length mode. */
export function isValidWordleAnswer(
  word: string,
  lengthMode: WordleLengthMode = 'standard',
): boolean {
  return isValidSecretWord(word, lengthMode)
}

export function pickWordleAnswer(
  random: () => number = Math.random,
  lengthMode: WordleLengthMode = 'standard',
): string {
  return pickSharedWord(random, lengthMode)
}

export function wordleAnswerLength(answer: string | null | undefined): number {
  const w = answer ? normalizeSharedWord(answer) : ''
  return w.length >= WORD_MIN_LEN ? w.length : 5
}

export function secretMaxLen(lengthMode: WordleLengthMode | null): number {
  return sharedSecretMaxLen(lengthMode)
}

export type LetterMark = 'correct' | 'present' | 'absent'

export function markWordleGuess(guess: string, answer: string): LetterMark[] {
  const g = normalizeSharedWord(guess).split('')
  const a = normalizeSharedWord(answer).split('')
  const len = a.length
  const marks: LetterMark[] = Array.from({ length: len }, () => 'absent')
  if (g.length !== len) return marks
  const remaining = [...a]

  for (let i = 0; i < len; i += 1) {
    if (g[i] === a[i]) {
      marks[i] = 'correct'
      remaining[i] = ''
    }
  }
  for (let i = 0; i < len; i += 1) {
    if (marks[i] === 'correct') continue
    const idx = remaining.indexOf(g[i]!)
    if (idx >= 0) {
      marks[i] = 'present'
      remaining[idx] = ''
    }
  }
  return marks
}
