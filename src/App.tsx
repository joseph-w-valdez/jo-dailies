import { useMemo, useState } from 'react'
import { CatWallpaper, WALLPAPER_ICONS } from './components/CatWallpaper'
import { CursorTrail, useCursorTrailSetting } from './components/CursorTrail'
import { DailyCard } from './components/DailyCard'
import { DayEditor } from './components/DayEditor'
import { FirebaseAuthProvider } from './components/FirebaseAuthProvider'
import { GameFrame } from './components/GameFrame'
import { MonthCalendar } from './components/MonthCalendar'
import { NoticeRail } from './components/NoticeRail'
import { PetCare } from './components/PetCare'
import { ScrollTopButton } from './components/ScrollTopButton'
import { StreakBar } from './components/StreakBar'
import { Watchlist } from './components/Watchlist'
import { GAMES, GAME_COUNT } from './games'
import { useDailies } from './hooks/useDailies'
import { useFirebaseAuth } from './hooks/firebaseAuthContext'
import { useShellLayout } from './hooks/useShellLayout'
import { parseKey } from './lib/date'
import { useSyncStatus } from './lib/syncStatus'
import type { GameId } from './types'

function Dashboard() {
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
  const { shellRef, leftBySide, rightBySide } = useShellLayout()

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

  const gridClass = rightBySide
    ? 'grid-cols-[400px_minmax(0,64rem)_480px] justify-center'
    : leftBySide
      ? 'grid-cols-[400px_minmax(0,64rem)] justify-center'
      : 'grid-cols-1'

  return (
    <>
      <CatWallpaper />
      <CursorTrail enabled={trailEnabled} />
      <div
        ref={shellRef}
        className={[
          'relative z-10 mx-auto grid min-h-full w-full max-w-[140rem] gap-6 px-4 py-8 sm:px-6',
          gridClass,
        ].join(' ')}
      >
        <div
          className={[
            'order-1 flex min-w-0 flex-col gap-6',
            leftBySide ? 'col-start-2 row-start-1' : '',
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

          <PetCare />
        </div>

        <aside
          className={[
            'order-2 w-full',
            leftBySide ? 'col-start-1 row-start-1' : '',
          ].join(' ')}
        >
          <Watchlist />
        </aside>

        <aside
          className={[
            'order-3 w-full',
            rightBySide ? 'col-start-3 row-start-1' : '',
          ].join(' ')}
        >
          <NoticeRail sideBySide={rightBySide} />
        </aside>
      </div>

      <ScrollTopButton />
    </>
  )
}

function AppContent() {
  const { user, loading, error, signIn, signOut } = useFirebaseAuth()
  const syncStatus = useSyncStatus()
  const loginPet = useMemo(
    () => WALLPAPER_ICONS[Math.floor(Math.random() * WALLPAPER_ICONS.length)]!,
    [],
  )

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <p className="text-sm text-muted">Waking up the watch party…</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="relative grid min-h-screen place-items-center overflow-hidden px-4">
        <CatWallpaper />
        <section className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface-raised/95 p-6 text-center shadow-2xl shadow-black/40">
          <img
            src={loginPet}
            alt=""
            className="mx-auto mb-3 size-20 object-contain"
          />
          <h1 className="text-xl font-semibold text-white">Jo Dailies</h1>
          <p className="mt-2 text-sm text-muted">
            Sign in to keep your dailies and watchlist together.
          </p>
          <button
            type="button"
            onClick={() => void signIn()}
            className="mt-5 w-full rounded-xl bg-streak px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
          >
            Continue with Google
          </button>
          {error ? (
            <p className="mt-3 text-xs text-rose-300" role="alert">
              {error}
            </p>
          ) : null}
        </section>
      </main>
    )
  }

  return (
    <>
      <div className="fixed right-3 top-3 z-50 flex items-center gap-2 rounded-full border border-border bg-surface/90 px-2.5 py-1.5 text-[10px] shadow-lg backdrop-blur">
        <span
          className={[
            'size-1.5 rounded-full',
            syncStatus === 'synced'
              ? 'bg-emerald-400'
              : syncStatus === 'offline'
                ? 'bg-amber-400'
                : syncStatus === 'error'
                  ? 'bg-rose-400'
                  : 'animate-pulse bg-streak',
          ].join(' ')}
        />
        <span className="text-muted">
          {syncStatus === 'synced'
            ? 'synced'
            : syncStatus === 'offline'
              ? 'offline · saves queued'
              : syncStatus === 'error'
                ? 'sync blocked · check rules'
                : 'syncing…'}
        </span>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-muted transition hover:text-white"
          title={`Signed in as ${user.email ?? user.displayName ?? 'Google user'}`}
        >
          sign out
        </button>
      </div>
      <Dashboard />
    </>
  )
}

function App() {
  return (
    <FirebaseAuthProvider>
      <AppContent />
    </FirebaseAuthProvider>
  )
}

export default App
