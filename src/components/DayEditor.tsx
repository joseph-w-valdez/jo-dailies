import { EXTRAS } from '../extras'
import { GAMES } from '../games'
import { parseKey } from '../lib/date'
import type { DayEntryId } from '../types'

interface DayEditorProps {
  dateKey: string
  isDone: (entryId: DayEntryId) => boolean
  onToggle: (entryId: DayEntryId) => void
}

export function DayEditor({ dateKey, isDone, onToggle }: DayEditorProps) {
  const label = parseKey(dateKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-4">
      <h2 className="text-sm font-semibold text-white">Edit day</h2>
      <p className="mt-1 text-xs text-muted">{label}</p>

      <ul className="mt-4 space-y-2">
        {[...GAMES, ...EXTRAS].map((item) => {
          const done = isDone(item.id)
          return (
            <li key={item.id}>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 hover:border-white/20">
                <span className="flex items-center gap-2 text-sm text-white">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: item.accent }}
                  />
                  {item.label}
                </span>
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => onToggle(item.id)}
                  className="size-4 accent-golden"
                />
              </label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
