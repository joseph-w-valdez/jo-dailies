import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

function scrollOffset(): number {
  return (
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  )
}

/** Fixed bottom-right button, visible only after scrolling down a bit. */
export function ScrollTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(scrollOffset() > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('scroll', onScroll, true)
    }
  }, [])

  return createPortal(
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      title="Scroll to top"
      className={[
        'fixed bottom-6 right-6 z-[100] flex size-11 items-center justify-center rounded-full',
        'border border-white/20 bg-surface-raised text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)]',
        'transition-all duration-200 hover:border-white/35 hover:bg-surface',
        visible
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-3 opacity-0',
      ].join(' ')}
    >
      <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
        <path
          d="M8 12.5v-9M4 7l4-3.5L12 7"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>,
    document.body,
  )
}
