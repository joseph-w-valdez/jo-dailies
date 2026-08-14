import { FIVE_LETTER_WORDS, VALORANT_WORDS } from './wordBankData'

export { FIVE_LETTER_WORDS, VALORANT_WORDS }

export const WORD_MIN_LEN = 3
export const WORD_MAX_LEN = 18

export type SharedWordLengthMode = 'standard' | 'variable' | 'all'

function normalizeWord(word: string): string {
  return word.trim().toLowerCase().replace(/[^a-z]/g, '')
}

function onlyLetters(
  words: readonly string[],
  min = WORD_MIN_LEN,
  max = WORD_MAX_LEN,
): string[] {
  return words
    .map(normalizeWord)
    .filter((w) => w.length >= min && w.length <= max)
}

const STANDARD_POOL = [...new Set(onlyLetters(FIVE_LETTER_WORDS, 5, 5))]
const VARIABLE_POOL = [...new Set(onlyLetters(VALORANT_WORDS))]
const ALL_POOL = [...new Set([...STANDARD_POOL, ...VARIABLE_POOL])]

const STANDARD_SET = new Set(STANDARD_POOL)
const VARIABLE_SET = new Set([...VARIABLE_POOL, ...STANDARD_POOL])
const ALL_SET = new Set(ALL_POOL)

export function normalizeSharedWord(word: string): string {
  return normalizeWord(word)
}

export function wordPool(mode: SharedWordLengthMode = 'all'): string[] {
  if (mode === 'standard') return STANDARD_POOL
  if (mode === 'variable') return VARIABLE_POOL
  return ALL_POOL
}

export function wordSet(mode: SharedWordLengthMode = 'all'): Set<string> {
  if (mode === 'standard') return STANDARD_SET
  if (mode === 'variable') return VARIABLE_SET
  return ALL_SET
}

export function pickSharedWord(
  random: () => number = Math.random,
  mode: SharedWordLengthMode = 'all',
): string {
  const pool = wordPool(mode)
  return pool[Math.floor(random() * pool.length)]!
}

export function isInWordBank(
  word: string,
  mode: SharedWordLengthMode = 'all',
): boolean {
  return wordSet(mode).has(normalizeWord(word))
}

export function isValidSecretWord(
  word: string,
  mode: SharedWordLengthMode = 'all',
): boolean {
  const w = normalizeWord(word)
  if (mode === 'standard') return w.length === 5 && /^[a-z]{5}$/.test(w)
  if (w.length < WORD_MIN_LEN || w.length > WORD_MAX_LEN) return false
  return /^[a-z]+$/.test(w)
}

export function secretMaxLen(lengthMode: SharedWordLengthMode | null): number {
  return lengthMode === 'variable' ? WORD_MAX_LEN : 5
}
