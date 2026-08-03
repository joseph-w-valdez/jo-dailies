/** Official English Scrabble tile distribution and values. */

export type Letter = string // A–Z or '' for blank face before assignment

export interface ScrabbleTile {
  id: string
  /** Face letter; blank tiles use '' until placed with a chosen letter. */
  letter: string
  blank: boolean
}

export const LETTER_VALUES: Record<string, number> = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 8,
  Y: 4,
  Z: 10,
}

/** Count of each letter in a fresh bag (100 tiles). */
const BAG_COUNTS: Record<string, number> = {
  A: 9,
  B: 2,
  C: 2,
  D: 4,
  E: 12,
  F: 2,
  G: 3,
  H: 2,
  I: 9,
  J: 1,
  K: 1,
  L: 4,
  M: 2,
  N: 6,
  O: 8,
  P: 2,
  Q: 1,
  R: 6,
  S: 4,
  T: 6,
  U: 4,
  V: 2,
  W: 2,
  X: 1,
  Y: 2,
  Z: 1,
  _: 2, // blanks
}

let tileSeq = 0

function nextTileId(): string {
  tileSeq += 1
  return `t${tileSeq.toString(36)}`
}

export function letterValue(letter: string, blank: boolean): number {
  if (blank) return 0
  return LETTER_VALUES[letter.toUpperCase()] ?? 0
}

export function createFullBag(random: () => number = Math.random): ScrabbleTile[] {
  const tiles: ScrabbleTile[] = []
  for (const [ch, n] of Object.entries(BAG_COUNTS)) {
    for (let i = 0; i < n; i += 1) {
      if (ch === '_') {
        tiles.push({ id: nextTileId(), letter: '', blank: true })
      } else {
        tiles.push({ id: nextTileId(), letter: ch, blank: false })
      }
    }
  }
  // Fisher–Yates
  for (let i = tiles.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const tmp = tiles[i]!
    tiles[i] = tiles[j]!
    tiles[j] = tmp
  }
  return tiles
}

export function drawTiles(
  bag: ScrabbleTile[],
  count: number,
): { drawn: ScrabbleTile[]; bag: ScrabbleTile[] } {
  const n = Math.min(count, bag.length)
  return {
    drawn: bag.slice(0, n),
    bag: bag.slice(n),
  }
}

export function rackTilePoints(tiles: ScrabbleTile[]): number {
  return tiles.reduce((sum, t) => sum + letterValue(t.letter, t.blank), 0)
}

export function normalizeTile(raw: unknown): ScrabbleTile | null {
  if (!raw || typeof raw !== 'object') return null
  const t = raw as Record<string, unknown>
  const id = typeof t.id === 'string' && t.id ? t.id : nextTileId()
  const blank = Boolean(t.blank)
  let letter = typeof t.letter === 'string' ? t.letter.toUpperCase() : ''
  if (blank) {
    letter = letter && /^[A-Z]$/.test(letter) ? letter : ''
  } else if (!/^[A-Z]$/.test(letter)) {
    return null
  }
  return { id, letter, blank }
}
