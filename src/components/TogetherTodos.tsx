import { useEffect, useRef, useState } from 'react'
import { useTogetherTodos } from '../hooks/useTogetherTodos'

const PANEL_COLLAPSE_KEY = 'jo-dailies:together-todos-panel-collapsed:v1'

function loadPanelCollapsed(): boolean {
  try {
    return localStorage.getItem(PANEL_COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

function savePanelCollapsed(value: boolean): void {
  try {
    localStorage.setItem(PANEL_COLLAPSE_KEY, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={[
        'size-3 shrink-0 transition-transform duration-200',
        open ? 'rotate-90' : 'rotate-0',
      ].join(' ')}
      aria-hidden="true"
    >
      <path
        d="M4 2.5 L8.5 6 L4 9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TogetherTodos() {
  const { items, add, toggle, remove } = useTogetherTodos()
  const [panelCollapsed, setPanelCollapsed] = useState(() => loadPanelCollapsed())
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)

  const openCount = items.filter((item) => !item.done).length

  useEffect(() => {
    savePanelCollapsed(panelCollapsed)
  }, [panelCollapsed])

  useEffect(() => {
    if (!adding) return
    inputRef.current?.focus()
  }, [adding])

  const submitDraft = () => {
    if (submittingRef.current) return
    const text = draft.trim()
    if (!text) {
      setAdding(false)
      setDraft('')
      return
    }
    submittingRef.current = true
    add(text)
    setDraft('')
    setAdding(false)
    queueMicrotask(() => {
      submittingRef.current = false
    })
  }

  const cancelDraft = () => {
    setDraft('')
    setAdding(false)
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setPanelCollapsed((value) => !value)}
          aria-expanded={!panelCollapsed}
          className="flex min-w-0 items-center gap-1.5 text-left transition hover:opacity-90"
        >
          <ChevronIcon open={!panelCollapsed} />
          <h2 className="text-sm font-semibold text-white">To Do Together</h2>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[11px] text-muted tabular-nums">
            {openCount} open
          </span>
          {!panelCollapsed ? (
            <button
              type="button"
              onClick={() => {
                setAdding(true)
                setPanelCollapsed(false)
              }}
              aria-label="Add together todo"
              className="flex size-7 items-center justify-center rounded-lg border border-border bg-surface text-sm font-semibold text-white transition hover:border-white/25"
            >
              +
            </button>
          ) : null}
        </div>
      </div>

      {!panelCollapsed ? (
        <>
          <p className="mt-1 text-xs text-muted">
            Things to do with each other.
          </p>

          {adding ? (
            <form
              className="mt-3"
              onSubmit={(event) => {
                event.preventDefault()
                submitDraft()
              }}
            >
              <input
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    cancelDraft()
                  }
                }}
                onBlur={() => {
                  if (!draft.trim()) cancelDraft()
                }}
                placeholder="e.g. translate gym workouts from Spanish to English"
                aria-label="New together todo"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-white outline-none placeholder:text-muted focus:border-white/25"
              />
            </form>
          ) : null}

          {items.length === 0 && !adding ? (
            <div className="mt-3 rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted">
              Nothing yet — hit + to add something.
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {items.map((item) => {
                const confirming = confirmRemoveId === item.id
                return (
                  <li key={item.id}>
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 hover:border-white/20">
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => toggle(item.id)}
                          className="size-4 shrink-0 accent-golden"
                        />
                        <span
                          className={[
                            'min-w-0 text-sm',
                            item.done
                              ? 'text-muted line-through'
                              : 'text-white',
                          ].join(' ')}
                        >
                          {item.text}
                        </span>
                      </label>
                      {confirming ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmRemoveId(null)
                              remove(item.id)
                            }}
                            className="rounded-lg border border-rose-400/40 bg-rose-500/15 px-2 py-1 text-[11px] font-medium text-rose-200 transition hover:bg-rose-500/25"
                          >
                            Remove
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveId(null)}
                            className="rounded-lg px-2 py-1 text-[11px] text-muted transition hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveId(item.id)}
                          aria-label={`Remove ${item.text}`}
                          className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-sm font-semibold text-muted transition hover:border-white/25 hover:text-white"
                        >
                          −
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      ) : null}
    </section>
  )
}
