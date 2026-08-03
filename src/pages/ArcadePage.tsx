import { lazy, Suspense, useState } from 'react'
import { CatWallpaper } from '../components/CatWallpaper'
import { CursorTrail, useCursorTrailSetting } from '../components/CursorTrail'
import { ScrollTopButton } from '../components/ScrollTopButton'

const Jenga = lazy(() =>
  import('../components/Jenga').then((m) => ({ default: m.Jenga })),
)
const CatSuika = lazy(() =>
  import('../components/CatSuika').then((m) => ({ default: m.CatSuika })),
)

type ArcadeGame = 'jenga' | 'suika'

export function ArcadePage() {
  const { trailEnabled } = useCursorTrailSetting()
  const [active, setActive] = useState<ArcadeGame | null>(null)

  return (
    <>
      <CatWallpaper />
      <CursorTrail enabled={trailEnabled} />
      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        {active ? (
          <Suspense
            fallback={
              <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center text-sm text-muted">
                Loading game…
              </div>
            }
          >
            {active === 'jenga' ? (
              <Jenga onClose={() => setActive(null)} />
            ) : (
              <CatSuika onClose={() => setActive(null)} />
            )}
          </Suspense>
        ) : (
          <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] sm:p-5">
            <h1 className="text-lg font-semibold text-white">Arcade</h1>
            <p className="mt-1 text-sm text-muted">
              Pick a game — nothing loads until you open it.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActive('jenga')}
                className="rounded-xl border border-border bg-surface/80 px-3 py-8 text-center transition hover:border-white/30 hover:bg-surface"
              >
                <span className="block text-base font-semibold text-white">
                  Jenga
                </span>
                <span className="mt-1 block text-[11px] text-muted">
                  Shared tower
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActive('suika')}
                className="rounded-xl border border-border bg-surface/80 px-3 py-8 text-center transition hover:border-white/30 hover:bg-surface"
              >
                <span className="block text-base font-semibold text-white">
                  Suika
                </span>
                <span className="mt-1 block text-[11px] text-muted">
                  Cat merge
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
      <ScrollTopButton />
    </>
  )
}
