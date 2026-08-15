import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ARCADE_COMPONENTS,
  ARCADE_TILES,
  isArcadeWide,
  type ArcadeGameId,
} from '../arcade'
import { ArcadeHistoryDrawer } from '../components/ArcadeHistoryDrawer'
import { ArcadeMatchHistory } from '../components/ArcadeMatchHistory'
import { ArcadeStatsPanel } from '../components/ArcadeStatsPanel'
import { CatWallpaper } from '../components/CatWallpaper'
import { CursorTrail, useCursorTrailSetting } from '../components/CursorTrail'
import { ScrollTopButton } from '../components/ScrollTopButton'
import { TurnPushToggle } from '../components/TurnPushToggle'
import { useArcadeMatches } from '../hooks/useArcadeMatches'
import {
  arcadeGameTitle,
  isMatchHistoryGameId,
  type MatchHistoryGameId,
} from '../lib/arcadeMatches'

function parseArcadeGame(raw: string | null): ArcadeGameId | null {
  if (!raw) return null
  return ARCADE_TILES.some((tile) => tile.id === raw)
    ? (raw as ArcadeGameId)
    : null
}

/** Wide enough for stats, but never wider than the gutter (parent is `w-full`). */
const SIDE_PANEL = 'w-full max-w-[30rem]'

export function ArcadePage() {
  const { trailEnabled } = useCursorTrailSetting()
  const [searchParams, setSearchParams] = useSearchParams()
  const [active, setActive] = useState<ArcadeGameId | null>(() =>
    parseArcadeGame(searchParams.get('game')),
  )
  const ActiveGame = active ? ARCADE_COMPONENTS[active] : null
  const historyGameId: MatchHistoryGameId | null = isMatchHistoryGameId(active)
    ? active
    : null
  const onLobby = !active
  const { allMatches, matches: gameMatches } = useArcadeMatches(historyGameId)
  const wide = isArcadeWide(active)
  const gameMaxClass = wide ? 'max-w-5xl' : 'max-w-3xl'
  // Equal 1fr gutters keep the game page-centered; side panels center in leftover.
  const shellGrid = wide
    ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,64rem)_minmax(0,1fr)]'
    : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,48rem)_minmax(0,1fr)]'
  const gutterShow = wide ? 'hidden xl:flex' : 'hidden lg:flex'
  const mobileSideShow = wide ? 'xl:hidden' : 'lg:hidden'
  const showMobileSide = onLobby || Boolean(historyGameId)

  useEffect(() => {
    const fromUrl = parseArcadeGame(searchParams.get('game'))
    if (fromUrl) setActive(fromUrl)
    else if (!searchParams.get('game')) setActive(null)
  }, [searchParams])

  const openGame = (id: ArcadeGameId | null) => {
    setActive(id)
    if (id) {
      setSearchParams({ game: id }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  const sidePanel = onLobby ? (
    <div className={SIDE_PANEL}>
      <ArcadeStatsPanel matches={allMatches} />
    </div>
  ) : historyGameId ? (
    <div className={SIDE_PANEL}>
      <ArcadeHistoryDrawer
        gameId={historyGameId}
        gameTitle={arcadeGameTitle(historyGameId)}
        matches={gameMatches}
      />
    </div>
  ) : null

  return (
    <>
      <CatWallpaper />
      <CursorTrail enabled={trailEnabled} />
      <div className="relative z-10 mx-auto w-full px-4 py-8 sm:px-6">
        <div className={['grid grid-cols-1 items-start gap-4', shellGrid].join(' ')}>
          <div
            className={['min-w-0 justify-center self-start', gutterShow].join(' ')}
          >
            {onLobby ? sidePanel : null}
          </div>

          <div className={['mx-auto w-full min-w-0', gameMaxClass].join(' ')}>
            {ActiveGame ? (
              <Suspense
                fallback={
                  <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center text-sm text-muted shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]">
                    Loading game…
                  </div>
                }
              >
                <ActiveGame onClose={() => openGame(null)} />
              </Suspense>
            ) : (
              <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="text-lg font-semibold text-white">Arcade</h1>
                    <p className="mt-1 text-sm text-muted">
                      Pick a game — nothing loads until you open it.
                    </p>
                  </div>
                  <TurnPushToggle />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {ARCADE_TILES.map((tile) => (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => openGame(tile.id)}
                      className="rounded-xl border border-border bg-surface/80 px-3 py-8 text-center transition hover:border-muted hover:bg-surface"
                    >
                      <span className="block text-base font-semibold text-white">
                        {tile.title}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted">
                        {tile.blurb}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3">
              <ArcadeMatchHistory
                matches={allMatches}
                title="Match history"
                emptyLabel="Finished games show up here."
                onSelectGame={(gameId) => openGame(gameId)}
              />
            </div>
          </div>

          <div
            className={['min-w-0 justify-center self-start', gutterShow].join(' ')}
          >
            {historyGameId ? sidePanel : null}
          </div>
        </div>

        {showMobileSide ? (
          <div className={['mt-4 flex justify-center', mobileSideShow].join(' ')}>
            {sidePanel}
          </div>
        ) : null}
      </div>
      <ScrollTopButton />
    </>
  )
}
