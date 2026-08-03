/** WordSoHard: Scrabble validity + definition, with memory + localStorage cache. */

const STORAGE_KEY = 'jo-dailies:scrabble-words:v2'
const CACHE_CAP = 5_000
const API_URL = 'https://wordsohard.com/api/v1/define'

export interface WordLookup {
  valid: boolean
  /** Primary short definition when available. */
  definition: string | null
}

type PersistShape = { order: string[]; map: Record<string, WordLookup> }

const memory = new Map<string, WordLookup>()
let persistLoaded = false

function normalizeWord(word: string): string | null {
  const w = word.trim().toUpperCase()
  if (!/^[A-Z]+$/.test(w) || w.length < 2) return null
  return w
}

function isLookup(value: unknown): value is WordLookup {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.valid === 'boolean' &&
    (v.definition === null || typeof v.definition === 'string')
  )
}

function loadPersist(): void {
  if (persistLoaded) return
  persistLoaded = true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as PersistShape
    if (!parsed?.map || typeof parsed.map !== 'object') return
    const order = Array.isArray(parsed.order)
      ? parsed.order
      : Object.keys(parsed.map)
    for (const key of order) {
      const entry = parsed.map[key]
      if (isLookup(entry)) memory.set(key, entry)
    }
  } catch {
    /* ignore corrupt cache */
  }
}

function savePersist(): void {
  try {
    const order = [...memory.keys()]
    while (order.length > CACHE_CAP) {
      const drop = order.shift()
      if (drop) memory.delete(drop)
    }
    const map: Record<string, WordLookup> = {}
    for (const k of order) {
      map[k] = memory.get(k)!
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ order, map }))
  } catch {
    /* quota / private mode */
  }
}

function remember(word: string, lookup: WordLookup): void {
  if (memory.has(word)) memory.delete(word)
  memory.set(word, lookup)
  if (memory.size > CACHE_CAP) {
    const first = memory.keys().next().value
    if (first !== undefined) memory.delete(first)
  }
  savePersist()
}

async function fetchWord(word: string): Promise<WordLookup> {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), 8_000)
  try {
    const res = await fetch(`${API_URL}/${encodeURIComponent(word.toLowerCase())}`, {
      method: 'GET',
      signal: ctrl.signal,
    })
    if (!res.ok) {
      throw new Error(`dictionary HTTP ${res.status}`)
    }
    const data = (await res.json()) as {
      scrabble?: { valid?: boolean }
      definitions?: { definition?: string }[]
    }
    const valid = Boolean(data.scrabble?.valid)
    const definition =
      valid &&
      Array.isArray(data.definitions) &&
      typeof data.definitions[0]?.definition === 'string'
        ? data.definitions[0]!.definition!.trim() || null
        : null
    return { valid, definition }
  } finally {
    window.clearTimeout(timer)
  }
}

export type WordDefinition = { word: string; definition: string }

export type CheckWordsResult =
  | { ok: true; definitions: WordDefinition[] }
  | { ok: false; reason: 'invalid'; invalid: string[] }
  | { ok: false; reason: 'network'; message: string }

/** Validate words via WordSoHard; cache validity + first definition. */
export async function checkWords(
  words: readonly string[],
): Promise<CheckWordsResult> {
  loadPersist()
  const unique: string[] = []
  const seen = new Set<string>()
  for (const raw of words) {
    const w = normalizeWord(raw)
    if (!w) {
      return { ok: false, reason: 'invalid', invalid: [raw] }
    }
    if (!seen.has(w)) {
      seen.add(w)
      unique.push(w)
    }
  }

  const invalid: string[] = []
  const misses: string[] = []
  const lookups = new Map<string, WordLookup>()

  for (const w of unique) {
    if (memory.has(w)) {
      const hit = memory.get(w)!
      lookups.set(w, hit)
      if (!hit.valid) invalid.push(w)
    } else {
      misses.push(w)
    }
  }

  if (misses.length > 0) {
    try {
      const results = await Promise.all(
        misses.map(async (w) => {
          const lookup = await fetchWord(w)
          remember(w, lookup)
          return { w, lookup }
        }),
      )
      for (const { w, lookup } of results) {
        lookups.set(w, lookup)
        if (!lookup.valid) invalid.push(w)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not reach dictionary'
      return { ok: false, reason: 'network', message }
    }
  }

  if (invalid.length > 0) {
    return { ok: false, reason: 'invalid', invalid }
  }

  const definitions: WordDefinition[] = []
  for (const w of unique) {
    const def = lookups.get(w)?.definition
    if (def) definitions.push({ word: w, definition: def })
  }
  return { ok: true, definitions }
}

/** Credit line when definitions are shown (WordSoHard license). */
export const DICTIONARY_ATTRIBUTION =
  'Definitions by WordSoHard (wordsohard.com)'

/** Test helper — seed cache without network. */
export function __setCachedWordForTests(
  word: string,
  valid: boolean,
  definition: string | null = null,
): void {
  const w = normalizeWord(word)
  if (w) memory.set(w, { valid, definition: valid ? definition : null })
}

export function __clearDictionaryCacheForTests(): void {
  memory.clear()
  persistLoaded = false
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('jo-dailies:scrabble-words:v1')
  } catch {
    /* ignore */
  }
}
