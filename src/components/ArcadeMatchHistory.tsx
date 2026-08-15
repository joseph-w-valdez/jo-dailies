import {
  arcadeGameTitle,
  arcadeMatchSummary,
  type ArcadeMatch,
} from '../lib/arcadeMatches'

function formatEndedAt(endedAt: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(endedAt))
  } catch {
    return new Date(endedAt).toLocaleString()
  }
}

/** Shared match list — styled like the Arcade minigame lobby card. */
export function ArcadeMatchHistory({
  matches,
  title,
  emptyLabel = 'No matches yet.',
  onSelectGame,
}: {
  matches: ArcadeMatch[]
  title: string
  emptyLabel?: string
  onSelectGame?: (gameId: ArcadeMatch['gameId']) => void
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] sm:p-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-muted">Recent finished games across Arcade.</p>
      {matches.length === 0 ? (
        <p className="mt-4 text-xs text-muted">{emptyLabel}</p>
      ) : (
        <ul className="mt-4 max-h-64 space-y-1.5 overflow-y-auto">
          {matches.map((match) => {
            const body = (
              <>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-white">
                    {arcadeGameTitle(match.gameId)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {arcadeMatchSummary(match)}
                    {match.detail ? ` · ${match.detail}` : ''}
                  </p>
                </div>
                <time
                  className="shrink-0 text-[10px] tabular-nums text-muted"
                  dateTime={new Date(match.endedAt).toISOString()}
                >
                  {formatEndedAt(match.endedAt)}
                </time>
              </>
            )
            const rowClass =
              'flex w-full items-start justify-between gap-3 rounded-xl border border-border bg-surface/80 px-3 py-3 text-left'
            return (
              <li key={match.id}>
                {onSelectGame ? (
                  <button
                    type="button"
                    onClick={() => onSelectGame(match.gameId)}
                    className={`${rowClass} transition hover:border-muted hover:bg-surface`}
                  >
                    {body}
                  </button>
                ) : (
                  <div className={rowClass}>{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
