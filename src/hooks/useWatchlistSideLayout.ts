import { useEffect, useRef, useState } from 'react'

/** Main column target width (Tailwind max-w-5xl / 64rem). */
const MAIN_MAX_PX = 64 * 16
/** Minimum usable left-gutter width before watchlist drops to the bottom. */
const MIN_GUTTER_PX = 240
/** Tailwind gap-6 */
const GAP_PX = 24

/**
 * Measures the app shell and returns whether there's room for a ≥240px
 * left gutter beside the centered main column.
 */
export function useWatchlistSideLayout() {
  const ref = useRef<HTMLDivElement>(null)
  const [sideBySide, setSideBySide] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => {
      const styles = getComputedStyle(el)
      const padX =
        (Number.parseFloat(styles.paddingLeft) || 0) +
        (Number.parseFloat(styles.paddingRight) || 0)
      const inner = el.clientWidth - padX
      // Two gutters + main + two gaps between three columns
      const gutter = (inner - MAIN_MAX_PX - GAP_PX * 2) / 2
      setSideBySide(gutter >= MIN_GUTTER_PX)
    }

    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])

  return { shellRef: ref, sideBySide }
}
