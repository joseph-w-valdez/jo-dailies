import { useEffect, useRef, useState } from 'react'

/** Main column target width (Tailwind max-w-5xl / 64rem). */
const MAIN_MAX_PX = 64 * 16
/** Hard max width for the side watchlist; also the min gutter needed to keep it beside. */
export const WATCHLIST_SIDE_MAX_PX = 400
/** Tailwind gap-6 */
const GAP_PX = 24

/**
 * Keeps the full 400px watchlist beside the main column only when both fit.
 * Otherwise the watchlist moves below the main content.
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
      const required = WATCHLIST_SIDE_MAX_PX + GAP_PX + MAIN_MAX_PX
      setSideBySide(inner >= required)
    }

    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])

  return { shellRef: ref, sideBySide }
}
