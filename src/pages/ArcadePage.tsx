import { CatWallpaper } from '../components/CatWallpaper'
import { CursorTrail, useCursorTrailSetting } from '../components/CursorTrail'
import { Jenga } from '../components/Jenga'
import { ScrollTopButton } from '../components/ScrollTopButton'

export function ArcadePage() {
  const { trailEnabled } = useCursorTrailSetting()

  return (
    <>
      <CatWallpaper />
      <CursorTrail enabled={trailEnabled} />
      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-4">
          <h1 className="text-lg font-semibold text-white">Arcade</h1>
          <p className="mt-1 text-sm text-muted">
            Shared games — start with Jenga.
          </p>
        </div>
        <Jenga />
      </div>
      <ScrollTopButton />
    </>
  )
}
