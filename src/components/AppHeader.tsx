import { useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const LINKS = [
  { to: '/', label: 'Home', end: true },
  {
    to: '/arcade',
    label: 'Arcade',
    end: false,
  },
] as const

export function AppHeader() {
  const { pathname } = useLocation()
  const navRef = useRef<HTMLElement>(null)
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false })

  useLayoutEffect(() => {
    const nav = navRef.current
    const activeIndex = LINKS.findIndex((link) =>
      link.end ? pathname === link.to : pathname.startsWith(link.to),
    )
    const el = linkRefs.current[activeIndex]
    if (!nav || !el) return
    const navBox = nav.getBoundingClientRect()
    const linkBox = el.getBoundingClientRect()
    setIndicator({
      left: linkBox.left - navBox.left,
      width: linkBox.width,
      ready: true,
    })
  }, [pathname])

  return (
    <header className="pointer-events-none sticky top-0 z-50">
      <div className="pointer-events-none relative mx-auto flex h-11 max-w-[140rem] items-start justify-center px-4 pt-2.5 sm:px-6">
        <nav
          ref={navRef}
          aria-label="Primary"
          className="pointer-events-auto relative flex items-center gap-1 rounded-full border border-border bg-surface/75 p-1 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.35),inset_0_1px_0_var(--color-glow)] backdrop-blur-xl"
        >
          <span
            aria-hidden
            className="absolute top-1 bottom-1 rounded-full bg-surface-raised shadow-[inset_0_0_0_1px_var(--color-border)] transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              left: indicator.left,
              width: indicator.width,
              opacity: indicator.ready ? 1 : 0,
            }}
          />
          {LINKS.map((link, i) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              ref={(node) => {
                linkRefs.current[i] = node
              }}
              className={({ isActive }) =>
                [
                  'relative z-[1] rounded-full px-4 py-1.5 text-[12px] font-medium tracking-wide transition-colors duration-200',
                  isActive ? 'text-white' : 'text-muted hover:text-white/80',
                ].join(' ')
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
