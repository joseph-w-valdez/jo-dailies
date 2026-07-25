import type { KeyboardEvent, MouseEvent } from 'react'
import type { GameDef } from '../types'

interface DailyCardProps {
  game: GameDef
  done: boolean
  active?: boolean
  onOpen: () => void
  onToggle: () => void
}

export function DailyCard({
  game,
  done,
  active = false,
  onOpen,
  onToggle,
}: DailyCardProps) {
  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen()
    }
  }

  const stopCardOpen = (event: MouseEvent | KeyboardEvent) => {
    event.stopPropagation()
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleCardKeyDown}
      className={[
        'flex cursor-pointer flex-col gap-4 rounded-2xl border p-4 transition-colors',
        done
          ? 'border-transparent bg-surface-raised'
          : 'border-border bg-surface',
      ].join(' ')}
      style={{
        ...(done
          ? {
              boxShadow: `inset 0 0 0 1px ${game.accent}55`,
              background: `linear-gradient(160deg, ${game.accent}18, transparent 55%), #1f2937`,
            }
          : undefined),
        ...(active
          ? {
              outline: `2px solid ${game.accent}`,
              outlineOffset: '3px',
            }
          : undefined),
      }}
      aria-label={`Open ${game.label}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className="mb-2 h-1.5 w-10 rounded-full"
            style={{ backgroundColor: game.accent }}
          />
          <h2 className="text-base font-semibold text-white">{game.label}</h2>
          <p className="mt-1 text-xs text-muted">
            {done ? 'Marked done for today' : 'Not done yet'}
          </p>
        </div>

        <label
          className="relative z-10 flex cursor-pointer items-center gap-2 text-sm text-muted"
          onClick={stopCardOpen}
          onKeyDown={stopCardOpen}
        >
          <input
            type="checkbox"
            checked={done}
            onChange={onToggle}
            onClick={stopCardOpen}
            className="size-4 accent-golden"
            aria-label={`Mark ${game.label} ${done ? 'not done' : 'done'}`}
          />
          Done
        </label>
      </div>

      <div
        className="mt-auto rounded-xl px-3 py-2 text-center text-sm font-medium text-slate-950 transition hover:brightness-110"
        style={{ backgroundColor: game.accent }}
        aria-hidden="true"
      >
        {active ? 'Playing' : 'Open'}
      </div>
    </article>
  )
}
