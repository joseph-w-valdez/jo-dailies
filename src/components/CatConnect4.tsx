import { useMemo, useState } from 'react'
import { useSharedConnect4 } from '../hooks/useSharedConnect4'
import {
  applyConnect4Drop,
  C4_COLS,
  C4_ROWS,
  colRowToIndex,
  dropRow,
  seatForUid,
  themeForCatIcon,
  type C4Cell,
} from '../lib/connect4'
import { JENGA_PLAYER_UIDS } from '../lib/jenga'
import { petIdleSrc } from '../lib/petAssets'
import { ArcadeStage } from './ArcadeStage'

function CatDisc({
  icon,
  color,
  size = 'md',
}: {
  icon: string
  color: string
  size?: 'sm' | 'md'
}) {
  const dim = size === 'sm' ? 'h-7 w-7' : 'h-10 w-10 sm:h-11 sm:w-11'
  const face = size === 'sm' ? 'h-[72%] w-[72%]' : 'h-[70%] w-[70%]'
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full shadow-inner ${dim}`}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      <span className="absolute inset-[12%] rounded-full bg-white/95" />
      <img
        src={petIdleSrc(icon)}
        alt=""
        className={`relative z-[1] rounded-full object-cover ${face}`}
        draggable={false}
      />
    </span>
  )
}

export function CatConnect4({ onClose }: { onClose: () => void }) {
  const { game, ready, uid, canPlay, commitGame, resetGame } =
    useSharedConnect4()
  const [hoverCol, setHoverCol] = useState<number | null>(null)

  const themes = useMemo(
    () =>
      [
        themeForCatIcon(game.cats[0]!),
        themeForCatIcon(game.cats[1]!),
      ] as const,
    [game.cats],
  )

  const turnSeat = seatForUid(game.turnUid)
  const mySeat = seatForUid(uid)
  const winnerSeat =
    game.winnerUid !== null ? seatForUid(game.winnerUid) : null

  const statusLabel = (() => {
    if (!ready) return 'Syncing…'
    if (game.status === 'won' && winnerSeat !== null) {
      return mySeat === winnerSeat ? 'You win!' : 'Opponent wins'
    }
    if (game.status === 'draw') return 'Draw'
    if (canPlay) return 'Your turn — pick a column'
    if (turnSeat !== null) return 'Waiting for opponent'
    return 'Waiting…'
  })()

  const drop = (col: number) => {
    if (!canPlay) return
    void commitGame((prev) => applyConnect4Drop(prev, uid, col) ?? prev)
  }

  const previewRow =
    hoverCol !== null && canPlay ? dropRow(game.grid, hoverCol) : -1

  return (
    <ArcadeStage
      title="Connect Four"
      onClose={onClose}
      meta={<p className="text-sm font-medium text-golden">{statusLabel}</p>}
    >
      {({ immersive }) => (
        <>
          {immersive ? null : (
            <div className="mt-2 rounded-xl border border-white/10 bg-black/25 px-3.5 py-3">
              <p className="text-[11px] leading-relaxed text-muted">
                Shared board — drop cats in turn. Get four in a row. Two random
                cat faces each round.
              </p>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ['Drop', 'tap a column'],
                    ['Win', 'four in a row'],
                    ['Cats', 'random pair each game'],
                    ['Sync', 'turns save to the room'],
                  ] as const
                ).map(([label, hint]) => (
                  <div
                    key={label}
                    className="flex items-baseline gap-2 text-[11px] leading-snug"
                  >
                    <span className="shrink-0 font-semibold text-white/85">
                      {label}
                    </span>
                    <span className="text-muted">{hint}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              {([0, 1] as const).map((seat) => {
                const theme = themes[seat]!
                const isTurn =
                  game.status === 'playing' && turnSeat === seat
                const label =
                  JENGA_PLAYER_UIDS[seat] === uid
                    ? 'You'
                    : seat === 0
                      ? 'P1'
                      : 'P2'
                return (
                  <div
                    key={seat}
                    className={[
                      'flex items-center gap-2 rounded-lg border px-2 py-1',
                      isTurn
                        ? 'border-golden/50 bg-golden/10'
                        : 'border-border bg-surface/60',
                    ].join(' ')}
                  >
                    <CatDisc icon={theme.icon} color={theme.color} size="sm" />
                    <span className="text-[11px] font-medium text-white/90">
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => void resetGame()}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-white hover:border-white/30"
            >
              New game
            </button>
          </div>

          <div
            className={[
              'mt-3 flex justify-center',
              immersive ? 'min-h-0 flex-1 items-center' : '',
            ].join(' ')}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-amber-700/40 bg-[#f0b429] p-2.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.18)] sm:p-3"
              role="grid"
              aria-label="Connect Four board"
            >
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {Array.from({ length: C4_COLS }, (_, col) => {
                  const open = dropRow(game.grid, col) >= 0
                  return (
                    <button
                      key={`drop-${col}`}
                      type="button"
                      disabled={!canPlay || !open}
                      onClick={() => drop(col)}
                      onMouseEnter={() => setHoverCol(col)}
                      onMouseLeave={() => setHoverCol(null)}
                      onFocus={() => setHoverCol(col)}
                      onBlur={() => setHoverCol(null)}
                      className="flex h-7 items-center justify-center rounded-md text-[10px] font-semibold text-amber-950/55 transition hover:bg-black/10 disabled:opacity-30 sm:h-8"
                      aria-label={`Drop in column ${col + 1}`}
                    >
                      ▼
                    </button>
                  )
                })}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-1.5">
                {Array.from({ length: C4_ROWS }, (_, row) =>
                  Array.from({ length: C4_COLS }, (_, col) => {
                    const cell: C4Cell =
                      game.grid[colRowToIndex(col, row)] ?? -1
                    const isPreview =
                      previewRow === row &&
                      hoverCol === col &&
                      cell === -1 &&
                      mySeat !== null
                    const seat = cell === -1 ? (isPreview ? mySeat : null) : cell
                    const theme =
                      seat === 0 || seat === 1 ? themes[seat] : null
                    return (
                      <button
                        key={`${col}-${row}`}
                        type="button"
                        disabled={!canPlay || dropRow(game.grid, col) < 0}
                        onClick={() => drop(col)}
                        onMouseEnter={() => setHoverCol(col)}
                        onMouseLeave={() => setHoverCol(null)}
                        className={[
                          'aspect-square rounded-full border border-amber-900/25 bg-[#1a1208]/flex items-center justify-center p-0.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.45)] transition',
                          canPlay ? 'hover:border-amber-950/50' : '',
                          isPreview ? 'opacity-55' : '',
                        ].join(' ')}
                        aria-label={
                          cell === -1
                            ? `Empty column ${col + 1} row ${row + 1}`
                            : `Player ${cell + 1} at column ${col + 1}`
                        }
                      >
                        {theme ? (
                          <CatDisc
                            icon={theme.icon}
                            color={theme.color}
                            size="md"
                          />
                        ) : null}
                      </button>
                    )
                  }),
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </ArcadeStage>
  )
}
