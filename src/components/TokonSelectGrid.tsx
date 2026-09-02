import {
  TOKON_CHAMPION,
  TOKON_ROSTER,
  tokonPortraitUrl,
  type TokonRosterEntry,
} from '../data/tokonRoster'

export function TokonPortrait({
  entry,
  className,
  alt,
}: {
  entry: TokonRosterEntry
  className?: string
  alt?: string
}) {
  return (
    <img
      src={tokonPortraitUrl(entry)}
      alt={alt ?? entry.name}
      className={className}
      loading="lazy"
    />
  )
}

export function TokonSelectGrid({
  selectedId,
  onSelect,
  variant = 'default',
}: {
  selectedId: string | null
  onSelect: (id: string) => void
  variant?: 'default' | 'rail'
}) {
  const gridCols = 'grid-cols-4'
  const gridGap = variant === 'rail' ? 'gap-1' : 'gap-1.5 sm:gap-2'
  const labelClass =
    variant === 'rail'
      ? 'text-[8px] pb-0.5 pt-2'
      : 'text-[9px] pb-0.5 pt-3'

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => onSelect(TOKON_CHAMPION.id)}
        title={TOKON_CHAMPION.name}
        className={[
          'relative aspect-[5/1] w-full overflow-hidden rounded-md border-2 border-black/30 transition hover:border-white/40',
        ].join(' ')}
      >
        <TokonPortrait
          entry={TOKON_CHAMPION}
          className="h-full w-full object-cover object-[center_20%]"
        />
      </button>
      <div className={['grid', gridCols, gridGap].join(' ')}>
        {TOKON_ROSTER.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelect(entry.id)}
            title={entry.name}
            className={[
              'group relative aspect-[3/4] overflow-hidden rounded-md border-2 bg-black/40 transition',
              selectedId === entry.id
                ? 'border-sky-400 ring-2 ring-sky-400/40'
                : 'border-black/30 hover:border-white/40',
            ].join(' ')}
          >
            <TokonPortrait
              entry={entry}
              className="h-full w-full object-cover object-top"
            />
            <span
              className={[
                'pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-0.5 text-center font-medium leading-tight text-white',
                labelClass,
              ].join(' ')}
            >
              {entry.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
