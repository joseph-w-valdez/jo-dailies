import {
  arcadeGameTitle,
  computeArcadeStats,
  type ArcadeMatch,
} from '../lib/arcadeMatches'
import { householdName } from '../lib/household'
import { JENGA_PLAYER_UIDS } from '../lib/jenga'

function formatBestTurn(
  turn: { score: number; words: string } | null | undefined,
): string {
  if (!turn || turn.score <= 0) return '—'
  return turn.words
    ? `${turn.score} · ${turn.words}`
    : String(turn.score)
}

/** Lobby left-rail scoreboard + fun household stats. */
export function ArcadeStatsPanel({ matches }: { matches: ArcadeMatch[] }) {
  const stats = computeArcadeStats(matches)
  const a = JENGA_PLAYER_UIDS[0]!
  const b = JENGA_PLAYER_UIDS[1]!
  const aWins = stats.winsByUid[a] ?? 0
  const bWins = stats.winsByUid[b] ?? 0

  return (
    <aside className="w-full shrink-0">
      <section className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] sm:p-5">
        <h2 className="text-center text-lg font-semibold text-white">
          Scoreboard
        </h2>
        <p className="mt-0.5 text-center text-sm text-muted">
          Household arcade stats
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {[a, b].map((uid) => (
            <div
              key={uid}
              className="rounded-xl border border-border bg-surface/80 px-3 py-4 text-center"
            >
              <p className="text-sm font-semibold text-white">
                {householdName(uid)}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-white">
                {stats.winsByUid[uid] ?? 0}
              </p>
              <p className="mt-0.5 text-[11px] text-muted">
                {stats.winRateByUid[uid] ?? 0}% rate
              </p>
            </div>
          ))}
        </div>

        <p className="mt-3 text-center text-xs text-muted">
          {aWins === bWins
            ? 'Tied rivalry'
            : `${householdName(aWins > bWins ? a : b)} leads ${Math.max(aWins, bWins)}–${Math.min(aWins, bWins)}`}
        </p>
        <p className="mt-1 text-center text-[11px] italic text-muted">
          {stats.flavor}
        </p>

        <ul className="mt-4 max-h-[min(55vh,28rem)] space-y-2 overflow-y-auto border-t border-border pt-3 text-[11px] text-muted">
          <StatRow label="Matches played" value={String(stats.totalMatches)} />
          <StatRow label="This week" value={String(stats.matchesThisWeek)} />
          <StatRow
            label="Last match"
            value={
              stats.daysSinceLastMatch == null
                ? '—'
                : stats.daysSinceLastMatch === 0
                  ? 'Today'
                  : `${stats.daysSinceLastMatch}d ago`
            }
          />
          <StatRow label="Draws" value={String(stats.draws)} />
          <StatRow
            label="Chess mates"
            value={String(stats.chessCheckmates)}
          />
          <StatRow
            label="Chess flags"
            value={String(stats.chessTimeouts)}
          />
          <StatRow
            label="Scrabble high"
            value={
              stats.scrabbleHighScore != null
                ? `${stats.scrabbleHighScore}${
                    stats.scrabbleHighScoreUid
                      ? ` (${householdName(stats.scrabbleHighScoreUid)})`
                      : ''
                  }`
                : '—'
            }
          />
          <StatRow label="Scrabble bingos" value={String(stats.scrabbleBingos)} />
          <StatRow
            label="Scrabble margin"
            value={
              stats.scrabbleBiggestMargin != null
                ? String(stats.scrabbleBiggestMargin)
                : '—'
            }
          />
          {[a, b].map((uid) => (
            <StatRow
              key={`turn-${uid}`}
              label={`${householdName(uid)} best turn`}
              value={formatBestTurn(stats.scrabbleBestTurnByUid[uid])}
            />
          ))}
          {[a, b].map((uid) => (
            <StatRow
              key={`word-${uid}`}
              label={`${householdName(uid)} longest word`}
              value={stats.scrabbleLongestWordByUid[uid] ?? '—'}
            />
          ))}
          <StatRow
            label="Most played"
            value={
              stats.mostPlayed
                ? `${arcadeGameTitle(stats.mostPlayed.gameId)} (${stats.mostPlayed.count})`
                : '—'
            }
          />
          <StatRow
            label="Least played"
            value={
              stats.leastPlayed
                ? `${arcadeGameTitle(stats.leastPlayed.gameId)} (${stats.leastPlayed.count})`
                : '—'
            }
          />
          {[a, b].map((uid) => {
            const best = stats.bestGameByUid[uid]
            return (
              <StatRow
                key={`best-${uid}`}
                label={`${householdName(uid)}’s best`}
                value={
                  best
                    ? `${arcadeGameTitle(best.gameId)} (${best.wins})`
                    : '—'
                }
              />
            )
          })}
        </ul>
      </section>
    </aside>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-surface/60 px-2.5 py-1.5">
      <span>{label}</span>
      <span className="max-w-[55%] shrink-0 text-right font-medium text-white/90">
        {value}
      </span>
    </li>
  )
}
