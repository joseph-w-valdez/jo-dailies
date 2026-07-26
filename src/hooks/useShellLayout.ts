import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Minimum main-column width required before a side rail is allowed beside it.
 * The main column is `minmax(0, 64rem)`, so it grows up to 64rem when there's
 * room and shrinks to fit otherwise; we only need to guarantee it stays at
 * least this wide before pulling a rail alongside it.
 */
const MAIN_MIN_PX = 48 * 16
/** Hard max width for the side watchlist. */
export const WATCHLIST_SIDE_MAX_PX = 400
/** Fixed width for the right notice-card column (portrait key visuals). */
export const NOTICE_SIDE_PX = 480
/** Portrait poster height at ~2:3. */
export const NOTICE_CARD_HEIGHT_PX = 720
/** Tailwind gap-6 */
const GAP_PX = 24

export interface ShellLayout {
  shellRef: RefObject<HTMLDivElement | null>
  /** Watchlist beside main. */
  leftBySide: boolean
  /** Notice cards beside main (implies leftBySide). */
  rightBySide: boolean
}

/**
 * Places side panels beside the main column only when they fully fit.
 * Watchlist (left) and notices (right) drop below independently by width.
 */
export function useShellLayout(): ShellLayout {
  const ref = useRef<HTMLDivElement>(null)
  const [leftBySide, setLeftBySide] = useState(false)
  const [rightBySide, setRightBySide] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => {
      const styles = getComputedStyle(el)
      const padX =
        (Number.parseFloat(styles.paddingLeft) || 0) +
        (Number.parseFloat(styles.paddingRight) || 0)
      const inner = el.clientWidth - padX
      const leftRequired = WATCHLIST_SIDE_MAX_PX + GAP_PX + MAIN_MIN_PX
      const bothRequired =
        WATCHLIST_SIDE_MAX_PX +
        GAP_PX +
        MAIN_MIN_PX +
        GAP_PX +
        NOTICE_SIDE_PX
      const left = inner >= leftRequired
      setLeftBySide(left)
      setRightBySide(left && inner >= bothRequired)
    }

    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])

  return { shellRef: ref, leftBySide, rightBySide }
}
