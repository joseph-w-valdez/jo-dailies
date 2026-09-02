import { useCallback, useEffect, useState } from 'react'
import type { TokonNotationTokenId } from '../data/tokonNotation'
import type { TokonRosterEntry } from '../data/tokonRoster'
import { TOKON_TEAMS } from '../data/tokonRoster'
import {
  patchCharacterComboEntries,
  patchCharacterNotes,
  type TokonCharacterNotes,
  type TokonData,
} from '../lib/tokon'
import { TokonComboBuilder } from './TokonComboBuilder'
import { TokonDustloopPanel } from './TokonDustloopPanel'
import { TokonNotationSequence } from './TokonNotationChip'

type CharacterTab = 'all' | 'combos' | 'notes' | 'dustloop'

const CHARACTER_TABS: { id: CharacterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'combos', label: 'Combos' },
  { id: 'notes', label: 'Notes' },
  { id: 'dustloop', label: 'Dustloop' },
]

export function TokonCharacterPanel({
  entry,
  notes,
  commit,
  onComboInsertChange,
}: {
  entry: TokonRosterEntry
  notes: TokonCharacterNotes
  commit: (next: TokonData | ((prev: TokonData) => TokonData)) => void
  onComboInsertChange?: (
    insert: ((tokenId: TokonNotationTokenId) => void) | null,
  ) => void
}) {
  const [characterTab, setCharacterTab] = useState<CharacterTab>('all')

  const patchNotes = (patch: Partial<TokonCharacterNotes>) => {
    void commit((prev) => patchCharacterNotes(prev, entry.id, patch))
  }

  const patchCombos = (comboEntries: TokonCharacterNotes['comboEntries']) => {
    void commit((prev) => patchCharacterComboEntries(prev, entry.id, comboEntries))
  }

  const handleInsertToken = useCallback(
    (insert: ((tokenId: TokonNotationTokenId) => void) | null) => {
      onComboInsertChange?.(insert)
    },
    [onComboInsertChange],
  )

  useEffect(() => {
    return () => onComboInsertChange?.(null)
  }, [onComboInsertChange])

  const setTab = (tab: CharacterTab) => {
    if (tab !== 'combos') onComboInsertChange?.(null)
    setCharacterTab(tab)
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface/40 p-4 sm:p-5">
      <div>
        <h2 className="text-xl font-semibold text-white">{entry.name}</h2>
        <p className="mt-0.5 text-xs text-muted">{TOKON_TEAMS[entry.team].label}</p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1">
        {CHARACTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={[
              'rounded-md px-3 py-1.5 text-sm font-medium transition',
              characterTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-muted hover:text-white',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {characterTab === 'all' ? (
        <div className="space-y-4">
          <TokonDustloopPanel entry={entry} />

          <section>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">Notes</h3>
              <button
                type="button"
                onClick={() => setTab('notes')}
                className="text-xs text-sky-300/90 hover:text-sky-200"
              >
                Edit
              </button>
            </div>
            {notes.notes.trim() ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/90">
                {notes.notes}
              </p>
            ) : (
              <p className="mt-2 text-sm italic text-muted">No notes yet.</p>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">
                Combos ({notes.comboEntries.length})
              </h3>
              <button
                type="button"
                onClick={() => setTab('combos')}
                className="text-xs text-sky-300/90 hover:text-sky-200"
              >
                Open builder
              </button>
            </div>
            {notes.comboEntries.length === 0 ? (
              <p className="mt-2 text-sm italic text-muted">No saved combos yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {notes.comboEntries.map((combo) => (
                  <li
                    key={combo.id}
                    className="rounded-lg border border-border bg-surface/50 px-3 py-2"
                  >
                    <p className="text-sm font-medium text-white">{combo.title}</p>
                    <div className="mt-1">
                      <TokonNotationSequence sequence={combo.sequence} size="sm" />
                    </div>
                    {combo.notes.trim() ? (
                      <p className="mt-2 text-xs leading-relaxed text-muted">
                        {combo.notes}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {characterTab === 'combos' ? (
        <TokonComboBuilder
          entries={notes.comboEntries}
          onChange={patchCombos}
          onInsertToken={handleInsertToken}
        />
      ) : null}

      {characterTab === 'notes' ? (
        <label className="block text-sm text-muted">
          Notes
          <textarea
            value={notes.notes}
            onChange={(e) => patchNotes({ notes: e.target.value })}
            rows={14}
            placeholder="Matchups, assists, general thoughts…"
            className="mt-1 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-white outline-none focus:border-muted"
          />
        </label>
      ) : null}

      {characterTab === 'dustloop' ? (
        <TokonDustloopPanel entry={entry} embedded />
      ) : null}
    </div>
  )
}
