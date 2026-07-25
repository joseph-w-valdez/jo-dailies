import type { ReactNode } from 'react'
import { GAME_COUNT } from '../games'
import { monthGrid, monthLabel } from '../lib/date'
import { FireIcon } from './FireIcon'

interface MonthCalendarProps {
  year: number
  month: number
  selectedKey: string
  todayKey: string
  dayCount: (dateKey: string) => number
  onSelect: (dateKey: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function MonthCalendar({
  year,
  month,
  selectedKey,
  todayKey,
  dayCount,
  onSelect,
  onPrevMonth,
  onNextMonth,
}: MonthCalendarProps) {
  const cells = monthGrid(year, month)

  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrevMonth}
          className="rounded-lg border border-border px-2.5 py-1.5 text-sm text-muted hover:bg-surface hover:text-white"
          aria-label="Previous month"
        >
          ‹
        </button>
        <h2 className="text-sm font-semibold text-white">
          {monthLabel(year, month)}
        </h2>
        <button
          type="button"
          onClick={onNextMonth}
          className="rounded-lg border border-border px-2.5 py-1.5 text-sm text-muted hover:bg-surface hover:text-white"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wide text-muted">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((key, i) => {
          if (!key) {
            return <div key={`pad-${i}`} className="aspect-square" />
          }

          const count = dayCount(key)
          const isSelected = key === selectedKey
          const isToday = key === todayKey
          const isGolden = count >= GAME_COUNT
          const isPartial = count > 0 && !isGolden
          const tone = isGolden
            ? 'bg-golden/30 ring-1 ring-golden/50'
            : isPartial
              ? 'bg-streak/20 ring-1 ring-streak/40'
              : 'bg-surface hover:bg-surface/80'

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={[
                'relative aspect-square overflow-hidden rounded-lg text-sm font-semibold tabular-nums text-white transition',
                tone,
                isSelected ? 'outline outline-2 outline-offset-1 outline-white' : '',
                isToday && !isSelected ? 'ring-1 ring-white/40' : '',
              ].join(' ')}
              aria-label={`${key}, ${count} of ${GAME_COUNT} done${isGolden ? ', golden' : isPartial ? ', partial' : ''}`}
              aria-pressed={isSelected}
            >
              {(isGolden || isPartial) && (
                <FireIcon
                  variant={isGolden ? 'golden' : 'streak'}
                  mood={isGolden ? 'golden' : count >= 2 ? 'happy' : 'normal'}
                  animated={isToday}
                  seed={Number(key.slice(-2))}
                  className={[
                    'pointer-events-none absolute -bottom-[6%] -left-[6%] z-0 opacity-90',
                    isToday && isGolden
                      ? 'calcifer-idle size-[80%]'
                      : 'size-[66%]',
                    isGolden
                      ? 'text-golden drop-shadow-[0_0_6px_rgba(251,191,36,0.55)]'
                      : 'text-orange-400',
                  ].join(' ')}
                />
              )}
              <span className="relative z-10 flex h-full items-center justify-center leading-none text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]">
                {Number(key.slice(-2))}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
        <Legend swatch="bg-surface border border-border" label="Empty" />
        <Legend
          swatch="bg-streak/30"
          label="Partial"
          icon={
            <FireIcon
              variant="streak"
              animated={false}
              className="size-3 text-orange-400"
            />
          }
        />
        <Legend
          swatch="bg-golden/40"
          label="Golden"
          icon={
            <FireIcon
              variant="golden"
              animated={false}
              className="size-3 text-golden"
            />
          }
        />
      </div>
    </section>
  )
}

function Legend({
  swatch,
  label,
  icon,
}: {
  swatch: string
  label: string
  icon?: ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-3 rounded ${swatch}`} />
      {icon}
      {label}
    </span>
  )
}
