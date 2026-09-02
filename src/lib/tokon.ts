/** Marvel Tokon lab — shared notes (prototype; may move to its own repo). */

import { parseLegacyComboText } from '../data/tokonNotation'

export type TokonComboEntry = {
  id: string
  title: string
  sequence: string[]
  notes: string
}

export type TokonCharacterNotes = {
  notes: string
  comboEntries: TokonComboEntry[]
}

export type TokonTeam = {
  id: string
  name: string
  /** Roster character ids — up to 4. */
  slots: string[]
  notes: string
}

export type TokonData = {
  version: number
  updatedAt: number
  /** Notes keyed by roster id (`captain-america`, …). */
  characterNotes: Record<string, TokonCharacterNotes>
  teams: TokonTeam[]
}

const EMPTY_NOTES: TokonCharacterNotes = { notes: '', comboEntries: [] }

export function createInitialTokon(): TokonData {
  return {
    version: 1,
    updatedAt: Date.now(),
    characterNotes: {},
    teams: [],
  }
}

function normalizeComboEntry(raw: unknown): TokonComboEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' ? o.id.trim() : ''
  const title =
    typeof o.title === 'string' ? o.title.trim().slice(0, 120) : 'Combo'
  if (!id) return null
  const sequence = Array.isArray(o.sequence)
    ? o.sequence
        .filter((token): token is string => typeof token === 'string')
        .map((token) => token.trim())
        .filter(Boolean)
        .slice(0, 120)
    : []
  return {
    id,
    title: title || 'Combo',
    sequence,
    notes: typeof o.notes === 'string' ? o.notes.slice(0, 2000) : '',
  }
}

function normalizeNotes(raw: unknown): TokonCharacterNotes {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_NOTES }
  const o = raw as Record<string, unknown>
  const notes = typeof o.notes === 'string' ? o.notes.slice(0, 8000) : ''

  const comboEntries: TokonComboEntry[] = []
  if (Array.isArray(o.comboEntries)) {
    for (const item of o.comboEntries) {
      const entry = normalizeComboEntry(item)
      if (entry) comboEntries.push(entry)
    }
  }

  const legacyCombos = typeof o.combos === 'string' ? o.combos.trim() : ''
  if (legacyCombos && comboEntries.length === 0) {
    const parsed = parseLegacyComboText(legacyCombos)
    comboEntries.push({
      id: newTokonId('combo'),
      title: 'Imported',
      sequence: parsed.sequence,
      notes: parsed.notes,
    })
  }

  return { notes, comboEntries: comboEntries.slice(0, 80) }
}

export function normalizeTokon(raw: unknown): TokonData {
  const fallback = createInitialTokon()
  if (!raw || typeof raw !== 'object') return fallback
  const o = raw as Record<string, unknown>

  const characterNotes: Record<string, TokonCharacterNotes> = {}

  if (o.characterNotes && typeof o.characterNotes === 'object') {
    for (const [id, notes] of Object.entries(
      o.characterNotes as Record<string, unknown>,
    )) {
      if (!id.trim()) continue
      characterNotes[id.trim()] = normalizeNotes(notes)
    }
  }

  // Migrate legacy freeform `characters` array.
  if (Array.isArray(o.characters)) {
    for (const item of o.characters) {
      if (!item || typeof item !== 'object') continue
      const c = item as Record<string, unknown>
      const id = typeof c.id === 'string' ? c.id.trim() : ''
      if (!id) continue
      characterNotes[id] = normalizeNotes(c)
    }
  }

  const teams: TokonTeam[] = []
  if (Array.isArray(o.teams)) {
    for (const item of o.teams) {
      if (!item || typeof item !== 'object') continue
      const t = item as Record<string, unknown>
      const id = typeof t.id === 'string' ? t.id.trim() : ''
      const name = typeof t.name === 'string' ? t.name.trim().slice(0, 80) : ''
      if (!id || !name) continue
      const slots = Array.isArray(t.slots)
        ? t.slots.filter((s): s is string => typeof s === 'string').slice(0, 4)
        : []
      teams.push({
        id,
        name,
        slots,
        notes: typeof t.notes === 'string' ? t.notes.slice(0, 4000) : '',
      })
    }
  }

  return {
    version: Math.max(1, Math.floor(Number(o.version) || 1)),
    updatedAt: Math.floor(Number(o.updatedAt) || Date.now()),
    characterNotes,
    teams,
  }
}

export function newTokonId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function getCharacterNotes(
  data: TokonData,
  rosterId: string,
): TokonCharacterNotes {
  return data.characterNotes[rosterId] ?? { ...EMPTY_NOTES }
}

export function patchCharacterNotes(
  data: TokonData,
  rosterId: string,
  patch: Partial<TokonCharacterNotes>,
): TokonData {
  const prev = getCharacterNotes(data, rosterId)
  return {
    ...data,
    characterNotes: {
      ...data.characterNotes,
      [rosterId]: { ...prev, ...patch },
    },
  }
}

export function patchCharacterComboEntries(
  data: TokonData,
  rosterId: string,
  comboEntries: TokonComboEntry[],
): TokonData {
  return patchCharacterNotes(data, rosterId, {
    comboEntries: comboEntries.slice(0, 80),
  })
}
