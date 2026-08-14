import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ARCADE_COMPONENTS,
  ARCADE_TILES,
  isArcadeWide,
  type ArcadeGameId,
} from '../arcade'
import { CatWallpaper } from '../components/CatWallpaper'
import { CursorTrail, useCursorTrailSetting } from '../components/CursorTrail'
import { ScrollTopButton } from '../components/ScrollTopButton'
import { TurnPushToggle } from '../components/TurnPushToggle'

function parseArcadeGame(raw: string | null): ArcadeGameId | null {
  if (!raw) return null
  return ARCADE_TILES.some((tile) => tile.id === raw)
    ? (raw as ArcadeGameId)
    : null
}

export function ArcadePage() {
  const { trailEnabled } = useCursorTrailSetting()
  const [searchParams, setSearchParams] = useSearchParams()
  const [active, setActive] = useState<ArcadeGameId | null>(() =>
    parseArcadeGame(searchParams.get('game')),
  )
  const ActiveGame = active ? ARCADE_COMPONENTS[active] : null

  useEffect(() => {
    const fromUrl = parseArcadeGame(searchParams.get('game'))
    if (fromUrl) setActive(fromUrl)
  }, [searchParams])

  const openGame = (id: ArcadeGameId | null) => {
    setActive(id)
    if (id) {
      setSearchParams({ game: id }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  return (
    <>
      <CatWallpaper />
      <CursorTrail enabled={trailEnabled} />
      <div
        className={[
          'relative z-10 mx-auto w-full px-4 py-8 sm:px-6',
          isArcadeWide(active) ? 'max-w-5xl' : 'max-w-3xl',
        ].join(' ')}
      >
        {ActiveGame ? (
          <Suspense
            fallback={
              <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center text-sm text-muted">
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
      </div>
      <ScrollTopButton />
    </>
  )
}
