import { useCallback, useMemo, useRef, useState } from 'react'
import { CatWallpaper } from '../components/CatWallpaper'
import { TokonCharacterPanel } from '../components/TokonCharacterPanel'
import { TokonNotationPaletteRail } from '../components/TokonNotationPalette'
import { TokonSelectGrid } from '../components/TokonSelectGrid'
import type { TokonNotationTokenId } from '../data/tokonNotation'
import {
  TOKON_ROSTER,
  TOKON_TEAMS,
  tokonRosterById,
  type TokonTeamId,
} from '../data/tokonRoster'
import { useTokon } from '../hooks/useTokon'
import {
  getCharacterNotes,
  newTokonId,
  type TokonTeam,
} from '../lib/tokon'

type Tab = 'characters' | 'teams'

const TOKON_SHELL =
  'grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,64rem)_minmax(0,1fr)]'

function TokonRosterRail({
  selectedId,
  onSelect,
}: {
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <aside className="w-full max-w-[22rem] shrink-0 lg:h-[calc(100dvh-5.5rem)]">
      <section className="flex h-full flex-col rounded-2xl border border-border bg-surface-raised p-3 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] sm:p-4">
        <h2 className="shrink-0 text-sm font-semibold text-white">Roster</h2>
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-border bg-surface/40 p-2 lg:overflow-visible">
          <TokonSelectGrid
            variant="rail"
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </div>
      </section>
    </aside>
  )
}

export function TokonPage() {
  const { data, ready, signedIn, commit } = useTokon()
  const [tab, setTab] = useState<Tab>('characters')
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [comboPaletteOpen, setComboPaletteOpen] = useState(false)
  const comboInsertRef = useRef<((tokenId: TokonNotationTokenId) => void) | null>(
    null,
  )

  const onComboInsertChange = useCallback(
    (insert: ((tokenId: TokonNotationTokenId) => void) | null) => {
      comboInsertRef.current = insert
      setComboPaletteOpen(Boolean(insert))
    },
    [],
  )

  const pickPaletteToken = useCallback((tokenId: TokonNotationTokenId) => {
    comboInsertRef.current?.(tokenId)
  }, [])

  const selectedEntry = selectedCharId ? tokonRosterById(selectedCharId) : null
  const selectedNotes = selectedCharId
    ? getCharacterNotes(data, selectedCharId)
    : null
  const selectedTeam = data.teams.find((t) => t.id === selectedTeamId) ?? null

  const showComboPalette =
    tab === 'characters' && ready && comboPaletteOpen && Boolean(selectedEntry)

  const rosterById = useMemo(
    () => new Map(TOKON_ROSTER.map((c) => [c.id, c])),
    [],
  )

  const upsertTeam = (patch: TokonTeam) => {
    void commit((prev) => {
      const i = prev.teams.findIndex((t) => t.id === patch.id)
      const teams =
        i === -1
          ? [...prev.teams, patch]
          : prev.teams.map((t) => (t.id === patch.id ? patch : t))
      return { ...prev, teams }
    })
  }

  const addTeam = () => {
    const name = window.prompt('Team name')?.trim()
    if (!name) return
    const id = newTokonId('team')
    upsertTeam({ id, name, slots: [], notes: '' })
    setSelectedTeamId(id)
    setTab('teams')
  }

  const addPresetTeam = (teamId: TokonTeamId) => {
    const meta = TOKON_TEAMS[teamId]
    const slots = TOKON_ROSTER.filter((c) => c.team === teamId).map((c) => c.id)
    const id = newTokonId('team')
    upsertTeam({ id, name: meta.label, slots, notes: '' })
    setSelectedTeamId(id)
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center text-muted">
        Sign in to use Tokon notes.
      </div>
    )
  }

  return (
    <>
      <CatWallpaper />
      <div className="relative z-10 mx-auto w-full px-4 py-6 sm:px-6">
        <div className={TOKON_SHELL}>
          <div className="hidden min-w-0 justify-center self-start lg:flex lg:sticky lg:top-4">
            {tab === 'characters' && ready ? (
              <TokonRosterRail
                selectedId={selectedCharId}
                onSelect={setSelectedCharId}
              />
            ) : null}
          </div>

          <div className="mx-auto w-full min-w-0">
            {tab === 'characters' && ready ? (
              <div className="mb-4 lg:hidden">
                <TokonRosterRail
                  selectedId={selectedCharId}
                  onSelect={setSelectedCharId}
                />
              </div>
            ) : null}

            <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-lg font-semibold text-white">Tokon lab</h1>
                  <p className="mt-1 text-sm text-muted">
                    Shared character notes and teams for Marvel Tokon.
                  </p>
                </div>
                <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
                  {(['characters', 'teams'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={[
                        'rounded-md px-3 py-1.5 text-sm font-medium capitalize transition',
                        tab === t
                          ? 'bg-white/10 text-white'
                          : 'text-muted hover:text-white',
                      ].join(' ')}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {!ready ? (
                <p className="mt-8 text-center text-sm text-muted">Syncing…</p>
              ) : tab === 'characters' ? (
                <div className="mt-4 min-w-0">
                  {selectedEntry && selectedNotes ? (
                    <TokonCharacterPanel
                      key={selectedEntry.id}
                      entry={selectedEntry}
                      notes={selectedNotes}
                      commit={commit}
                      onComboInsertChange={onComboInsertChange}
                    />
                  ) : (
                    <div className="flex min-h-[16rem] items-center justify-center rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center">
                      <p className="text-sm text-muted">
                        Pick a fighter from the roster to edit notes.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 grid gap-4 lg:grid-cols-[14rem_1fr]">
                  <aside className="flex min-h-[20rem] flex-col gap-2">
                    <button
                      type="button"
                      onClick={addTeam}
                      className="rounded-lg border border-violet-400/40 bg-violet-500/15 px-3 py-2 text-sm font-medium text-violet-50 hover:bg-violet-500/25"
                    >
                      + Team
                    </button>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      Presets
                    </p>
                    <div className="flex flex-col gap-1">
                      {(Object.keys(TOKON_TEAMS) as TokonTeamId[]).map((teamId) => (
                        <button
                          key={teamId}
                          type="button"
                          onClick={() => addPresetTeam(teamId)}
                          className="rounded-lg border border-border bg-surface/60 px-3 py-2 text-left text-xs text-white/90 hover:border-muted"
                        >
                          {TOKON_TEAMS[teamId].label}
                        </button>
                      ))}
                    </div>
                    <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                      {data.teams.map((t) => (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedTeamId(t.id)}
                            className={[
                              'w-full rounded-lg border px-3 py-2 text-left text-sm transition',
                              selectedTeamId === t.id
                                ? 'border-violet-400/50 bg-violet-500/15 text-white'
                                : 'border-border bg-surface/60 text-white/90 hover:border-muted',
                            ].join(' ')}
                          >
                            {t.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </aside>

                  <div className="min-w-0">
                    {selectedTeam ? (
                      <div className="space-y-4">
                        <label className="block text-sm text-muted">
                          Team name
                          <input
                            value={selectedTeam.name}
                            onChange={(e) =>
                              upsertTeam({ ...selectedTeam, name: e.target.value })
                            }
                            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-base text-white outline-none focus:border-muted"
                          />
                        </label>
                        <div>
                          <p className="text-sm text-muted">Lineup (4)</p>
                          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {[0, 1, 2, 3].map((slot) => (
                              <select
                                key={slot}
                                value={selectedTeam.slots[slot] ?? ''}
                                onChange={(e) => {
                                  const slots = [...selectedTeam.slots]
                                  while (slots.length <= slot) slots.push('')
                                  slots[slot] = e.target.value
                                  upsertTeam({
                                    ...selectedTeam,
                                    slots: slots.filter(Boolean),
                                  })
                                }}
                                className="rounded-lg border border-border bg-surface px-2 py-2 text-sm text-white outline-none focus:border-muted"
                              >
                                <option value="">— empty —</option>
                                {TOKON_ROSTER.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            ))}
                          </div>
                        </div>
                        <label className="block text-sm text-muted">
                          Team notes
                          <textarea
                            value={selectedTeam.notes}
                            onChange={(e) =>
                              upsertTeam({ ...selectedTeam, notes: e.target.value })
                            }
                            rows={6}
                            placeholder="Game plan, synergies…"
                            className="mt-1 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-white outline-none focus:border-muted"
                          />
                        </label>
                        {selectedTeam.slots.length > 0 ? (
                          <p className="text-xs text-muted">
                            Lineup:{' '}
                            {selectedTeam.slots
                              .map((id) => rosterById.get(id)?.name ?? '?')
                              .join(' · ')}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm(`Delete ${selectedTeam.name}?`)) {
                              return
                            }
                            void commit((prev) => ({
                              ...prev,
                              teams: prev.teams.filter((t) => t.id !== selectedTeam.id),
                            }))
                            setSelectedTeamId(null)
                          }}
                          className="text-sm text-rose-300/80 hover:text-rose-200"
                        >
                          Delete team
                        </button>
                      </div>
                    ) : (
                      <p className="py-12 text-center text-sm text-muted">
                        Pick a team or create one.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="hidden min-w-0 justify-center self-start lg:flex lg:sticky lg:top-4">
            {showComboPalette ? (
              <TokonNotationPaletteRail onPick={pickPaletteToken} />
            ) : null}
          </div>
        </div>

        {showComboPalette ? (
          <div className="mt-4 flex justify-center lg:hidden">
            <TokonNotationPaletteRail onPick={pickPaletteToken} />
          </div>
        ) : null}
      </div>
    </>
  )
}
