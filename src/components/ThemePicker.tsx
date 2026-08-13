import { useSharedTheme } from '../hooks/useSharedTheme'
import { THEMES, type ThemeId } from '../lib/themes'
import { CatWallpaper, useGuestWallpaperSetting } from './CatWallpaper'
import { CursorTrail, useCursorTrailSetting } from './CursorTrail'

export function ThemePicker({
  theme,
  onThemeChange,
}: {
  theme: ThemeId
  onThemeChange: (theme: ThemeId) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface/70 px-2.5 py-1.5 text-[11px] text-muted hover:border-white/20 hover:text-white">
      <span
        className="size-2.5 shrink-0 rounded-full ring-1 ring-white/25"
        style={{
          backgroundColor:
            THEMES.find((t) => t.id === theme)?.swatch ?? THEMES[0]!.swatch,
        }}
        aria-hidden="true"
      />
      <span className="sr-only">Theme</span>
      <select
        value={theme}
        onChange={(e) => onThemeChange(e.target.value as ThemeId)}
        className="max-w-[6.5rem] border-0 bg-transparent py-0 pl-0 pr-1 text-[11px] text-muted [color-scheme:dark] focus:outline-none"
        title="Theme color"
        aria-label="Theme color"
      >
        {THEMES.map((t) => (
          <option key={t.id} value={t.id} className="bg-surface text-white">
            {t.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Theme + cursor trail banner for guests and unsigned-in visitors. */
export function GuestThemeBar() {
  const { theme, setTheme } = useSharedTheme()
  const { trailEnabled, setTrailEnabled } = useCursorTrailSetting()
  const { wallpaperEnabled, setWallpaperEnabled } = useGuestWallpaperSetting()
  return (
    <>
      <CursorTrail enabled={trailEnabled} />
      {wallpaperEnabled ? <CatWallpaper /> : null}
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
              Appearance
            </p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-white">
              Pick a theme
            </h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ThemePicker theme={theme} onThemeChange={setTheme} />
            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-[11px] text-muted hover:border-white/20 hover:text-white">
              <input
                type="checkbox"
                checked={trailEnabled}
                onChange={(e) => setTrailEnabled(e.target.checked)}
                className="size-3.5 accent-golden"
              />
              Cursor trail
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-[11px] text-muted hover:border-white/20 hover:text-white">
              <input
                type="checkbox"
                checked={wallpaperEnabled}
                onChange={(e) => setWallpaperEnabled(e.target.checked)}
                className="size-3.5 accent-golden"
              />
              Cat wallpaper
            </label>
          </div>
        </div>
      </section>
    </>
  )
}
