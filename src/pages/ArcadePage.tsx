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
const CatConnect4 = lazy(() =>
  import('../components/CatConnect4').then((m) => ({ default: m.CatConnect4 })),
)
const CatBattleship = lazy(() =>
  import('../components/CatBattleship').then((m) => ({
    default: m.CatBattleship,
  })),
)
const CatScrabble = lazy(() =>
  import('../components/CatScrabble').then((m) => ({ default: m.CatScrabble })),
)
const CatChess = lazy(() =>
  import('../components/CatChess').then((m) => ({ default: m.CatChess })),
)

type ArcadeGame =
  | 'jenga'
  | 'suika'
  | 'connect4'
  | 'battleship'
  | 'scrabble'
  | 'chess'

const TILES: {
  id: ArcadeGame
  title: string
  blurb: string
}[] = [
  { id: 'jenga', title: 'Jenga', blurb: 'Shared tower' },
  { id: 'suika', title: 'Suika', blurb: 'Cat merge' },
  { id: 'connect4', title: 'Connect Four', blurb: 'Shared drops' },
  { id: 'battleship', title: 'Cattleship', blurb: 'Fog duel' },
  { id: 'scrabble', title: 'Scrabble', blurb: 'Shared board' },
  { id: 'chess', title: 'Chess', blurb: 'Shared board' },
]

export function ArcadePage() {
  const { trailEnabled } = useCursorTrailSetting()
  const [active, setActive] = useState<ArcadeGame | null>(null)

  return (
    <>
      <CatWallpaper />
      <CursorTrail enabled={trailEnabled} />
      <div
        className={[
          'relative z-10 mx-auto w-full px-4 py-8 sm:px-6',
          active === 'scrabble' || active === 'chess'
            ? 'max-w-5xl'
            : 'max-w-3xl',
        ].join(' ')}
      >
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
            ) : active === 'suika' ? (
              <CatSuika onClose={() => setActive(null)} />
            ) : active === 'connect4' ? (
              <CatConnect4 onClose={() => setActive(null)} />
            ) : active === 'battleship' ? (
              <CatBattleship onClose={() => setActive(null)} />
            ) : active === 'scrabble' ? (
              <CatScrabble onClose={() => setActive(null)} />
            ) : (
              <CatChess onClose={() => setActive(null)} />
            )}
          </Suspense>
        ) : (
          <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] sm:p-5">
            <h1 className="text-lg font-semibold text-white">Arcade</h1>
            <p className="mt-1 text-sm text-muted">
              Pick a game — nothing loads until you open it.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {TILES.map((tile) => (
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
