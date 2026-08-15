import {
  arcadeMatchSummary,
  computeScrabbleGameStats,
  scrabbleMatchTopTurn,
  type ArcadeMatch,
  type MatchHistoryGameId,
} from '../lib/arcadeMatches'
import { householdName } from '../lib/household'
import { JENGA_PLAYER_UIDS } from '../lib/jenga'

function winCounts(matches: ArcadeMatch[]): { uid: string; wins: number }[] {
  const counts: Record<string, number> = {
    [JENGA_PLAYER_UIDS[0]!]: 0,
    [JENGA_PLAYER_UIDS[1]!]: 0,
  }
  for (const match of matches) {
    if (match.winnerUid && counts[match.winnerUid] != null) {
      counts[match.winnerUid] += 1
    }
  }
  return JENGA_PLAYER_UIDS.map((uid) => ({
    uid,
    wins: counts[uid] ?? 0,
  }))
}

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

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-surface/60 px-2.5 py-1.5 text-[11px] text-muted">
      <span>{label}</span>
      <span className="shrink-0 text-right font-medium text-white/90">
        {value}
      </span>
    </li>
  )
}

/** Always-visible right-side per-game scoreboard + recent matches. */
export function ArcadeHistoryDrawer({
  gameId,
  gameTitle,
  matches,
}: {
  gameId: MatchHistoryGameId
  gameTitle: string
  matches: ArcadeMatch[]
}) {
  const scores = winCounts(matches)
  const scrabble = gameId === 'scrabble' ? computeScrabbleGameStats(matches) : null

  return (
    <aside className="w-full shrink-0">
      <section className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] sm:p-5">
        <h2 className="text-center text-lg font-semibold text-white">History</h2>
        <p className="mt-0.5 text-center text-sm text-muted">{gameTitle}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {scores.map(({ uid, wins }) => (
            <div
              key={uid}
              className="rounded-xl border border-border bg-surface/80 px-3 py-4 text-center"
            >
              <p className="text-sm font-semibold text-white">
                {householdName(uid)}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-white">
                {wins}
              </p>
              <p className="mt-0.5 text-[11px] text-muted">
                {wins === 1 ? 'win' : 'wins'}
              </p>
            </div>
          ))}
        </div>

        {scrabble && scrabble.games > 0 ? (
          <ul className="mt-4 max-h-[min(28vh,12rem)] space-y-1.5 overflow-y-auto border-t border-border pt-3">
            <StatRow
              label="Game high"
              value={
                scrabble.highScore != null
                  ? `${scrabble.highScore}${
                      scrabble.highScoreUid
                        ? ` · ${householdName(scrabble.highScoreUid)}`
                        : ''
                    }`
                  : '—'
              }
            />
            <StatRow label="Bingos" value={String(scrabble.bingos)} />
            <StatRow
              label="Biggest margin"
              value={
                scrabble.biggestMargin != null
                  ? String(scrabble.biggestMargin)
                  : '—'
              }
            />
            {JENGA_PLAYER_UIDS.map((uid) => {
              const turn = scrabble.bestTurnByUid[uid]
              return (
                <StatRow
                  key={`turn-${uid}`}
                  label={`${householdName(uid)} best turn`}
                  value={
                    turn && turn.score > 0
                      ? turn.words
                        ? `${turn.score} · ${turn.words}`
                        : String(turn.score)
                      : '—'
                  }
                />
              )
            })}
            {JENGA_PLAYER_UIDS.map((uid) => (
              <StatRow
                key={`word-${uid}`}
                label={`${householdName(uid)} longest`}
                value={scrabble.longestWordByUid[uid] ?? '—'}
              />
            ))}
            <StatRow label="Plays logged" value={String(scrabble.totalPlays)} />
            <StatRow label="Passes" value={String(scrabble.totalPasses)} />
            <StatRow
              label="Exchanges"
              value={String(scrabble.totalExchanges)}
            />
            <StatRow label="Skills used" value={String(scrabble.totalSkills)} />
          </ul>
        ) : null}

        <div className="mt-4 border-t border-border pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            Recent
          </p>
          {matches.length === 0 ? (
            <p className="mt-2 text-xs text-muted">No matches for this game yet.</p>
          ) : (
            <ul className="mt-2 max-h-[min(40vh,16rem)] space-y-1.5 overflow-y-auto">
              {matches.map((match) => {
                const topTurn = match.scrabble
                  ? scrabbleMatchTopTurn(match.scrabble)
                  : 0
                return (
                <li
                  key={match.id}
                  className="rounded-xl border border-border bg-surface/80 px-3 py-2"
                >
                  <p className="text-sm font-medium text-white">
                    {arcadeMatchSummary(match)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {match.detail ? `${match.detail} · ` : ''}
                    {topTurn > 0 ? `top ${topTurn} · ` : ''}
                    {formatEndedAt(match.endedAt)}
                  </p>
                </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </aside>
  )
}
