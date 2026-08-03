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
import { NewGameConfirm } from './NewGameConfirm'

function CatDisc({
  icon,
  color,
  size = 'md',
}: {
  icon: string
  color: string
  size?: 'sm' | 'md' | 'fill'
}) {
  if (size === 'fill') {
    return (
      <span
        className="relative block h-full w-full rounded-full shadow-inner"
        style={{ backgroundColor: color }}
        aria-hidden
      >
        <span className="absolute inset-[12%] rounded-full bg-white/95" />
        <img
          src={petIdleSrc(icon)}
          alt=""
          className="relative z-[1] h-full w-full rounded-full object-cover p-[15%]"
          draggable={false}
        />
      </span>
    )
  }
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
  const { game, ready, uid, actorUid, canPlay, commitGame, resetGame } =
    useSharedConnect4()
  const [hoverCol, setHoverCol] = useState<number | null>(null)
  const [newGameOpen, setNewGameOpen] = useState(false)

  const themes = useMemo(
    () =>
      [
        themeForCatIcon(game.cats[0]!),
        themeForCatIcon(game.cats[1]!),
      ] as const,
    [game.cats],
  )

  const turnSeat = seatForUid(game.turnUid)
  const actorSeat = seatForUid(actorUid)
  const mySeat = seatForUid(uid)
  const winnerSeat =
    game.winnerUid !== null ? seatForUid(game.winnerUid) : null

  const statusLabel = (() => {
    if (!ready) return 'Syncing…'
    if (game.status === 'won' && winnerSeat !== null) {
      if (game.hotseat) {
        return winnerSeat === 0 ? 'P1 wins!' : 'P2 wins!'
      }
      return mySeat === winnerSeat ? 'You win!' : 'Opponent wins'
    }
    if (game.status === 'draw') return 'Draw'
    if (canPlay) {
      if (game.hotseat && turnSeat !== null) {
        return `${turnSeat === 0 ? 'P1' : 'P2'} — pick a column`
      }
      return 'Your turn — pick a column'
    }
    if (turnSeat !== null) return 'Waiting for opponent'
    return 'Waiting…'
  })()

  const drop = (col: number) => {
    if (!canPlay) return
    void commitGame((prev) => applyConnect4Drop(prev, actorUid, col) ?? prev)
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
        <div
          className={
            immersive ? 'flex min-h-0 flex-1 flex-col' : undefined
          }
        >
          {immersive ? null : (
            <div className="mt-2 rounded-xl border border-border bg-surface/60 px-3.5 py-3">
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

          <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              {([0, 1] as const).map((seat) => {
                const theme = themes[seat]!
                const isTurn =
                  game.status === 'playing' && turnSeat === seat
                const label = game.hotseat
                  ? seat === 0
                    ? 'P1'
                    : 'P2'
                  : JENGA_PLAYER_UIDS[seat] === uid
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
              {game.hotseat ? (
                <span className="rounded-md border border-amber-400/35 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-100">
                  Debug hotseat
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setNewGameOpen(true)}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-white hover:border-muted"
            >
              New game
            </button>
          </div>

          <NewGameConfirm
            open={newGameOpen}
            onClose={() => setNewGameOpen(false)}
            onConfirm={(opts) => void resetGame(opts)}
            blurb="Starts a fresh board for both of you."
          />

          <div
            className={[
              'mt-3 flex justify-center',
              immersive
                ? 'min-h-0 flex-1 items-center'
                : '',
            ].join(' ')}
          >
            <div
              className={[
                'rounded-2xl border border-amber-700/40 bg-[#f0b429] shadow-[inset_0_2px_8px_rgba(0,0,0,0.18)]',
                immersive
                  ? 'flex h-full max-h-full w-auto max-w-full flex-col aspect-[7/7.35] p-2 sm:p-3'
                  : 'w-full max-w-md p-2.5 sm:p-3',
              ].join(' ')}
              role="grid"
              aria-label="Connect Four board"
            >
              <div
                className={[
                  'grid grid-cols-7',
                  immersive
                    ? 'min-h-0 shrink-0 grow-[1] basis-0 gap-1 sm:gap-1.5'
                    : 'gap-1 sm:gap-1.5',
                ].join(' ')}
              >
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
                      className={[
                        'flex items-center justify-center rounded-md text-[10px] font-semibold text-amber-950/55 transition hover:bg-black/10 disabled:opacity-30',
                        immersive ? 'h-full min-h-0 w-full' : 'h-7 sm:h-8',
                      ].join(' ')}
                      aria-label={`Drop in column ${col + 1}`}
                    >
                      ▼
                    </button>
                  )
                })}
              </div>
              <div
                className={[
                  'mt-1 grid grid-cols-7',
                  immersive
                    ? 'min-h-0 grow-[6] basis-0 gap-1 sm:gap-1.5'
                    : 'gap-1 sm:gap-1.5',
                ].join(' ')}
                style={
                  immersive
                    ? {
                        gridTemplateRows: `repeat(${C4_ROWS}, minmax(0, 1fr))`,
                      }
                    : undefined
                }
              >
                {Array.from({ length: C4_ROWS }, (_, row) =>
                  Array.from({ length: C4_COLS }, (_, col) => {
                    const cell: C4Cell =
                      game.grid[colRowToIndex(col, row)] ?? -1
                    const isPreview =
                      previewRow === row &&
                      hoverCol === col &&
                      cell === -1 &&
                      actorSeat !== null
                    const seat = cell === -1 ? (isPreview ? actorSeat : null) : cell
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
                          'rounded-full border border-amber-900/25 bg-[#1a1208] flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.45)] transition',
                          immersive
                            ? 'min-h-0 min-w-0 p-[4%]'
                            : 'aspect-square p-0.5',
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
                            size={immersive ? 'fill' : 'md'}
                          />
                        ) : null}
                      </button>
                    )
                  }),
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ArcadeStage>
  )
}
