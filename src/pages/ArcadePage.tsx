import { Suspense, useState } from 'react'
import {
  ARCADE_COMPONENTS,
  ARCADE_TILES,
  isArcadeWide,
  type ArcadeGameId,
} from '../arcade'
import { CatWallpaper } from '../components/CatWallpaper'
import { CursorTrail, useCursorTrailSetting } from '../components/CursorTrail'
import { ScrollTopButton } from '../components/ScrollTopButton'

export function ArcadePage() {
  const { trailEnabled } = useCursorTrailSetting()
  const [active, setActive] = useState<ArcadeGameId | null>(null)
  const ActiveGame = active ? ARCADE_COMPONENTS[active] : null

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
            <ActiveGame onClose={() => setActive(null)} />
          </Suspense>
        ) : (
          <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] sm:p-5">
            <h1 className="text-lg font-semibold text-white">Arcade</h1>
            <p className="mt-1 text-sm text-muted">
              Pick a game — nothing loads until you open it.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ARCADE_TILES.map((tile) => (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => setActive(tile.id)}
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
