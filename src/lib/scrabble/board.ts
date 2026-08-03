/** Standard Scrabble 15×15 premium layout. */

export const SCRABBLE_SIZE = 15
export const CENTER = 7

export type Premium = null | 'DL' | 'TL' | 'DW' | 'TW' | '★'

/** Row-major premiums; null = plain. */
export const PREMIUMS: readonly Premium[] = (() => {
  const g: Premium[] = Array.from({ length: SCRABBLE_SIZE * SCRABBLE_SIZE }, () => null)
  const set = (r: number, c: number, p: Premium) => {
    g[r * SCRABBLE_SIZE + c] = p
  }
  // Triple word
  for (const [r, c] of [
    [0, 0],
    [0, 7],
    [0, 14],
    [7, 0],
    [7, 14],
    [14, 0],
    [14, 7],
    [14, 14],
  ] as const) {
    set(r, c, 'TW')
  }
  // Double word
  for (const [r, c] of [
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [1, 13],
    [2, 12],
    [3, 11],
    [4, 10],
    [13, 1],
    [12, 2],
    [11, 3],
    [10, 4],
    [13, 13],
    [12, 12],
    [11, 11],
    [10, 10],
  ] as const) {
    set(r, c, 'DW')
  }
  // Triple letter
  for (const [r, c] of [
    [1, 5],
    [1, 9],
    [5, 1],
    [5, 5],
    [5, 9],
    [5, 13],
    [9, 1],
    [9, 5],
    [9, 9],
    [9, 13],
    [13, 5],
    [13, 9],
  ] as const) {
    set(r, c, 'TL')
  }
  // Double letter
  for (const [r, c] of [
    [0, 3],
    [0, 11],
    [2, 6],
    [2, 8],
    [3, 0],
    [3, 7],
    [3, 14],
    [6, 2],
    [6, 6],
    [6, 8],
    [6, 12],
    [7, 3],
    [7, 11],
    [8, 2],
    [8, 6],
    [8, 8],
    [8, 12],
    [11, 0],
    [11, 7],
    [11, 14],
    [12, 6],
    [12, 8],
    [14, 3],
    [14, 11],
  ] as const) {
    set(r, c, 'DL')
  }
  set(CENTER, CENTER, '★')
  return g
})()

export function cellIndex(row: number, col: number): number {
  return row * SCRABBLE_SIZE + col
}

export function premiumAt(row: number, col: number): Premium {
  if (row < 0 || col < 0 || row >= SCRABBLE_SIZE || col >= SCRABBLE_SIZE) {
    return null
  }
  return PREMIUMS[cellIndex(row, col)] ?? null
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && col >= 0 && row < SCRABBLE_SIZE && col < SCRABBLE_SIZE
}
