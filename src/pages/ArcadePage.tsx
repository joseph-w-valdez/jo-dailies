import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ARCADE_COMPONENTS,
  ARCADE_TILE_ACCENTS,
  ARCADE_TILES,
  isArcadeWide,
  type ArcadeGameId,
  type ArcadeTile,
} from '../arcade'
import { ArcadeHistoryDrawer } from '../components/ArcadeHistoryDrawer'
import { ArcadeMatchHistory } from '../components/ArcadeMatchHistory'
import { ArcadeStatsPanel } from '../components/ArcadeStatsPanel'
import { CatWallpaper } from '../components/CatWallpaper'
import { CursorTrail, useCursorTrailSetting } from '../components/CursorTrail'
import { ScrollTopButton } from '../components/ScrollTopButton'
import { TurnPushToggle } from '../components/TurnPushToggle'
import { useArcadeMatches } from '../hooks/useArcadeMatches'
import { useArcadeTileImage } from '../hooks/useArcadeTileImage'
import {
  arcadeGameTitle,
  isMatchHistoryGameId,
  type MatchHistoryGameId,
} from '../lib/arcadeMatches'

function ArcadeGameTile({
  tile,
  onOpen,
}: {
  tile: ArcadeTile
  onOpen: (id: ArcadeGameId) => void
}) {
  const accent = ARCADE_TILE_ACCENTS[tile.accent]
  const image = useArcadeTileImage(tile.id)

  return (
    <button
      type="button"
      onClick={() => onOpen(tile.id)}
      className={[
        'relative overflow-hidden rounded-xl border border-border px-3 py-8 text-center transition',
        image ? 'bg-surface' : accent.wash,
        accent.hoverBorder,
      ].join(' ')}
    >
      {image ? (
        <img
          src={image}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <span
        aria-hidden
        className={['absolute inset-y-0 left-0 z-[1] w-1.5', accent.rail].join(
          ' ',
        )}
      />
      <span className="relative z-[1] mx-auto flex max-w-full flex-col items-center gap-1.5">
        <span
          className={[
            'rounded-md border bg-white/90 px-3 py-1.5 text-base font-semibold text-zinc-900 shadow-sm',
            accent.chipBorder,
          ].join(' ')}
        >
          {tile.title}
        </span>
        <span
          className={[
            'rounded-md border bg-white/75 px-2 py-0.5 text-[11px] font-medium text-zinc-700 shadow-sm',
            accent.chipBorderSoft,
          ].join(' ')}
        >
          {tile.blurb}
        </span>
      </span>
    </button>
  )
}

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
                    <ArcadeGameTile
                      key={tile.id}
                      tile={tile}
                      onOpen={openGame}
                    />
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
