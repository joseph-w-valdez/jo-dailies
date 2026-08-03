/** Placement geometry, word extraction, scoring. */

import {
  CENTER,
  SCRABBLE_SIZE,
  cellIndex,
  inBounds,
  premiumAt,
} from './board'
import { letterValue, type ScrabbleTile } from './tiles'

export interface BoardCell {
  letter: string
  blank: boolean
}

export type ScrabbleBoard = (BoardCell | null)[]

export interface Placement {
  row: number
  col: number
  /** Chosen face (required for blanks). */
  letter: string
  tileId: string
  blank: boolean
}

export interface FormedWord {
  word: string
  cells: { row: number; col: number }[]
}

export function emptyBoard(): ScrabbleBoard {
  return Array.from({ length: SCRABBLE_SIZE * SCRABBLE_SIZE }, () => null)
}

function cellAt(board: ScrabbleBoard, row: number, col: number): BoardCell | null {
  if (!inBounds(row, col)) return null
  return board[cellIndex(row, col)] ?? null
}

function isNewCover(
  placements: Placement[],
  row: number,
  col: number,
): boolean {
  return placements.some((p) => p.row === row && p.col === col)
}

/** Validate geometry only (no dictionary). Returns error message or null. */
export function validatePlacementGeometry(
  board: ScrabbleBoard,
  placements: Placement[],
): string | null {
  if (placements.length === 0) return 'Place at least one tile'
  const seen = new Set<string>()
  for (const p of placements) {
    if (!inBounds(p.row, p.col)) return 'Out of bounds'
    if (cellAt(board, p.row, p.col)) return 'Cell already occupied'
    const key = `${p.row},${p.col}`
    if (seen.has(key)) return 'Duplicate cell'
    seen.add(key)
    if (!/^[A-Z]$/.test(p.letter)) return 'Invalid letter'
  }

  const rows = new Set(placements.map((p) => p.row))
  const cols = new Set(placements.map((p) => p.col))
  const horizontal = rows.size === 1
  const vertical = cols.size === 1
  if (!horizontal && !vertical) {
    return 'Tiles must be in a single row or column'
  }

  // Contiguous through existing tiles
  if (horizontal) {
    const row = placements[0]!.row
    const minC = Math.min(...placements.map((p) => p.col))
    const maxC = Math.max(...placements.map((p) => p.col))
    for (let c = minC; c <= maxC; c += 1) {
      const covered =
        isNewCover(placements, row, c) || Boolean(cellAt(board, row, c))
      if (!covered) return 'Tiles must form a contiguous line'
    }
  } else {
    const col = placements[0]!.col
    const minR = Math.min(...placements.map((p) => p.row))
    const maxR = Math.max(...placements.map((p) => p.row))
    for (let r = minR; r <= maxR; r += 1) {
      const covered =
        isNewCover(placements, r, col) || Boolean(cellAt(board, r, col))
      if (!covered) return 'Tiles must form a contiguous line'
    }
  }

  const isEmpty = board.every((c) => c === null)
  if (isEmpty) {
    const onCenter = placements.some(
      (p) => p.row === CENTER && p.col === CENTER,
    )
    if (!onCenter) return 'First word must cover the center star'
  } else {
    // Must touch existing tile
    const touches = placements.some((p) => {
      const neighbors = [
        [p.row - 1, p.col],
        [p.row + 1, p.col],
        [p.row, p.col - 1],
        [p.row, p.col + 1],
      ]
      return neighbors.some(([r, c]) => Boolean(cellAt(board, r!, c!)))
    })
    if (!touches) return 'Word must connect to existing tiles'
  }

  return null
}

function letterAt(
  board: ScrabbleBoard,
  placements: Placement[],
  row: number,
  col: number,
): string | null {
  const place = placements.find((p) => p.row === row && p.col === col)
  if (place) return place.letter
  return cellAt(board, row, col)?.letter ?? null
}

function expandWord(
  board: ScrabbleBoard,
  placements: Placement[],
  row: number,
  col: number,
  dRow: number,
  dCol: number,
): FormedWord | null {
  let r = row
  let c = col
  while (letterAt(board, placements, r - dRow, c - dCol)) {
    r -= dRow
    c -= dCol
  }
  const cells: { row: number; col: number }[] = []
  let word = ''
  while (true) {
    const ch = letterAt(board, placements, r, c)
    if (!ch) break
    cells.push({ row: r, col: c })
    word += ch
    r += dRow
    c += dCol
  }
  if (word.length < 2) return null
  return { word, cells }
}

/** All newly formed words (main + crosses), deduped by cell span. */
export function extractFormedWords(
  board: ScrabbleBoard,
  placements: Placement[],
): FormedWord[] {
  const words: FormedWord[] = []
  const seen = new Set<string>()
  const add = (w: FormedWord | null) => {
    if (!w) return
    const key = w.cells.map((c) => `${c.row},${c.col}`).join('|')
    if (seen.has(key)) return
    seen.add(key)
    words.push(w)
  }

  const rows = new Set(placements.map((p) => p.row))
  const horizontal = rows.size === 1

  // Main word through placements
  const anchor = placements[0]!
  if (horizontal) {
    add(expandWord(board, placements, anchor.row, anchor.col, 0, 1))
  } else {
    add(expandWord(board, placements, anchor.row, anchor.col, 1, 0))
  }

  // Cross words through each new tile
  for (const p of placements) {
    if (horizontal) {
      add(expandWord(board, placements, p.row, p.col, 1, 0))
    } else {
      add(expandWord(board, placements, p.row, p.col, 0, 1))
    }
  }

  // Single-tile play on non-empty board: both directions may form words;
  // if only length-1 in main dir, expandWord returns null — crosses still count.
  // If somehow no words of length≥2, invalid (lonely tile next to nothing usable).
  return words
}

export function scorePlay(
  board: ScrabbleBoard,
  placements: Placement[],
  words: FormedWord[],
): number {
  let total = 0
  for (const w of words) {
    let wordScore = 0
    let wordMult = 1
    for (const { row, col } of w.cells) {
      const place = placements.find((p) => p.row === row && p.col === col)
      const existing = cellAt(board, row, col)
      const letter = place?.letter ?? existing?.letter ?? ''
      const blank = place ? place.blank : Boolean(existing?.blank)
      let pts = letterValue(letter, blank)
      if (place) {
        const prem = premiumAt(row, col)
        if (prem === 'DL') pts *= 2
        if (prem === 'TL') pts *= 3
        if (prem === 'DW' || prem === '★') wordMult *= 2
        if (prem === 'TW') wordMult *= 3
      }
      wordScore += pts
    }
    total += wordScore * wordMult
  }
  if (placements.length === 7) total += 50
  return total
}

export function applyPlacementsToBoard(
  board: ScrabbleBoard,
  placements: Placement[],
): ScrabbleBoard {
  const next = board.slice()
  for (const p of placements) {
    next[cellIndex(p.row, p.col)] = { letter: p.letter, blank: p.blank }
  }
  return next
}

/** Build placements from rack tiles + board targets. */
export function placementsFromDraft(
  draft: {
    row: number
    col: number
    tile: ScrabbleTile
    chosenLetter?: string
  }[],
): Placement[] | string {
  const out: Placement[] = []
  for (const d of draft) {
    let letter = d.tile.blank
      ? (d.chosenLetter ?? '').toUpperCase()
      : d.tile.letter
    if (d.tile.blank && !/^[A-Z]$/.test(letter)) {
      return 'Choose a letter for each blank'
    }
    out.push({
      row: d.row,
      col: d.col,
      letter,
      tileId: d.tile.id,
      blank: d.tile.blank,
    })
  }
  return out
}
