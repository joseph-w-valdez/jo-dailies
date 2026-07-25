import type { ExtraDef, ExtraId } from './types'

/** Fun edit-day checkboxes — stored per day, ignored by streak math. */
export const EXTRAS: ExtraDef[] = [
  { id: 'text-jo', label: 'Text Jo (just because I want to)', accent: '#f9a8d4' },
  { id: 'valorant-store', label: 'Play Valorant and check store', accent: '#f87171' },
  { id: 'ask-jo-day', label: 'Ask Jo how her day was', accent: '#67e8f9' },
  { id: 'cry-corner', label: 'Cry in a corner after Jo ditches me for work', accent: '#818cf8' },
  { id: 'gn-slep-wal', label: 'Tell Jo “gn slep wal”', accent: '#c4b5fd' },
]

export const EXTRA_IDS: ExtraId[] = EXTRAS.map((e) => e.id)
