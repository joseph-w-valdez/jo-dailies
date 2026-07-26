import { useEffect, useRef, useState, type RefObject } from 'react'

/** Main column target width (Tailwind max-w-5xl / 64rem). */
const MAIN_MAX_PX = 64 * 16
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
      const leftRequired = WATCHLIST_SIDE_MAX_PX + GAP_PX + MAIN_MAX_PX
      const bothRequired =
        WATCHLIST_SIDE_MAX_PX +
        GAP_PX +
        MAIN_MAX_PX +
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
