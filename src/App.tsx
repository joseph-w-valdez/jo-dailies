import { useState } from 'react'
import { CatWallpaper } from './components/CatWallpaper'
import { CursorTrail, useCursorTrailSetting } from './components/CursorTrail'
import { DailyCard } from './components/DailyCard'
import { DayEditor } from './components/DayEditor'
import { GameFrame } from './components/GameFrame'
import { MonthCalendar } from './components/MonthCalendar'
import { ScrollTopButton } from './components/ScrollTopButton'
import { StreakBar } from './components/StreakBar'
import { Watchlist } from './components/Watchlist'
import { GAMES, GAME_COUNT } from './games'
import { useDailies } from './hooks/useDailies'
import { useWatchlistSideLayout } from './hooks/useWatchlistSideLayout'
import { parseKey } from './lib/date'
import type { GameId } from './types'

function App() {
  const {
    today,
    streaks,
    todayCount,
    todayGolden,
    toggle,
    openAndComplete,
    openExternal,
    isDone,
    dayCount,
  } = useDailies()
  const { trailEnabled, setTrailEnabled } = useCursorTrailSetting()
  const { shellRef, sideBySide } = useWatchlistSideLayout()

  const todayDate = parseKey(today)
  const [viewYear, setViewYear] = useState(todayDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth())
  const [selectedKey, setSelectedKey] = useState(today)
  const [framedGameId, setFramedGameId] = useState<GameId | null>(null)
  const [frameSession, setFrameSession] = useState(0)

  const framedGame = GAMES.find((g) => g.id === framedGameId) ?? null

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  const handleOpen = (gameId: GameId) => {
    const game = GAMES.find((g) => g.id === gameId)
    if (!game) return

    openAndComplete(gameId)

    if (game.embeddable) {
      setFrameSession((n) => n + 1)
      setFramedGameId(gameId)
      return
    }

    openExternal(gameId)
    setFramedGameId(null)
  }

  return (
    <>
      <CatWallpaper />
      <CursorTrail enabled={trailEnabled} />
      <div
        ref={shellRef}
        className={[
          'relative z-10 mx-auto grid min-h-full w-full max-w-[100rem] gap-6 px-4 py-8 sm:px-6',
          sideBySide
            ? 'grid-cols-[minmax(0,1fr)_minmax(0,64rem)_minmax(0,1fr)]'
            : 'grid-cols-1',
        ].join(' ')}
      >
        <div
          className={[
            'order-1 flex min-w-0 flex-col gap-6',
            sideBySide ? 'col-start-2 row-start-1' : '',
          ].join(' ')}
        >
          <StreakBar
            streaks={streaks}
            todayGolden={todayGolden}
            todayCount={todayCount}
            gameCount={GAME_COUNT}
            cursorTrail={trailEnabled}
            onCursorTrailChange={setTrailEnabled}
          />

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Today&apos;s dailies
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {GAMES.map((game) => (
                <DailyCard
                  key={game.id}
                  game={game}
                  done={isDone(today, game.id)}
                  active={framedGameId === game.id}
                  onOpen={() => handleOpen(game.id)}
                  onToggle={() => toggle(today, game.id)}
                />
              ))}
            </div>
          </section>

          {framedGame && (
            <GameFrame
              key={frameSession}
              game={framedGame}
              onClose={() => setFramedGameId(null)}
              onOpenExternal={() => openExternal(framedGame.id)}
            />
          )}

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <MonthCalendar
              year={viewYear}
              month={viewMonth}
              selectedKey={selectedKey}
              todayKey={today}
              dayCount={dayCount}
              onSelect={setSelectedKey}
              onPrevMonth={() => shiftMonth(-1)}
              onNextMonth={() => shiftMonth(1)}
            />
            <DayEditor
              dateKey={selectedKey}
              isDone={(entryId) => isDone(selectedKey, entryId)}
              onToggle={(entryId) => toggle(selectedKey, entryId)}
            />
          </div>
        </div>

        {/* Bottom when gutter would be <240px; left gutter when there's room. */}
        <aside
          className={[
            'order-2 w-full',
            sideBySide
              ? 'col-start-1 row-start-1 max-w-md justify-self-end'
              : '',
          ].join(' ')}
        >
          <div
            className={
              sideBySide
                ? 'sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto'
                : ''
            }
          >
            <Watchlist />
          </div>
        </aside>

        {sideBySide ? (
          <div className="col-start-3 row-start-1" aria-hidden="true" />
        ) : null}
      </div>

      <ScrollTopButton />
    </>
  )
}

export default App
