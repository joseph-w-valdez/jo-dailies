import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useWhiteboard } from '../hooks/useWhiteboard'
import {
  newWhiteboardStrokeId,
  paintWhiteboardStroke,
  redrawWhiteboard,
  WHITEBOARD_COLORS,
  WHITEBOARD_SIZES,
  type WhiteboardPoint,
  type WhiteboardStroke,
  type WhiteboardTool,
} from '../lib/whiteboard'

const PANEL_COLLAPSE_KEY = 'jo-dailies:whiteboard-panel-collapsed:v1'

const ERASER_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><g stroke-linecap='round' stroke-linejoin='round'><rect x='6' y='12' width='18' height='12' rx='2' transform='rotate(-28 15 18)' fill='#f9a8d4' stroke='#9d174d' stroke-width='1.2'/><rect x='8' y='14' width='14' height='5' rx='1' transform='rotate(-28 15 16.5)' fill='#fce7f3' stroke='none'/><path d='M7 26 H25' stroke='#94a3b8' stroke-width='1.5'/></g></svg>`,
)}") 10 24, cell`

/**
 * Marks-A-Lot style dry-erase cursor.
 * White barrel; tip + posted cap take the active ink color.
 * Hotspot = pointiest corner of the chisel tip.
 *
 * Set MARKER_CURSOR_FLIPPED to false to restore the pre-flip pose
 * (tip bottom-left, body up-right) that we liked before the mirror.
 */
const MARKER_CURSOR_FLIPPED = true

function markerCursor(ink: string): string {
  const tipX = MARKER_CURSOR_FLIPPED ? 86 : 10
  const flip = MARKER_CURSOR_FLIPPED ? 'scale(-1 1)' : ''
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'>
  <g transform='translate(${tipX} 84) ${flip} rotate(-42)'>
    <!-- chisel tip (ink) — bottom-left corner at origin -->
    <path d='M0 0 L11 0 L11 -5.5 L2.5 -7.5 L0 -7.5 Z' fill='${ink}' stroke='#111827' stroke-width='0.9' stroke-linejoin='round'/>
    <path d='M1.2 -1.3 L9.5 -1.3 L9.5 -4.2 L3 -5.5 L1.2 -5.5 Z' fill='#ffffff' opacity='0.22'/>

    <!-- white stepped neck -->
    <path d='M0.4 -7.5 L10.6 -7.5 L11.4 -12.5 L-0.4 -12.5 Z' fill='#f8fafc' stroke='#94a3b8' stroke-width='0.85'/>
    <path d='M-0.2 -12.5 L11.2 -12.5 L12.2 -17.2 L-1.2 -17.2 Z' fill='#ffffff' stroke='#94a3b8' stroke-width='0.85'/>

    <!-- white barrel -->
    <rect x='-1.6' y='-58' width='14.2' height='41.2' rx='2.6' fill='#ffffff' stroke='#94a3b8' stroke-width='1'/>
    <rect x='0.4' y='-56' width='3' height='37' rx='1.4' fill='#000000' opacity='0.06'/>

    <!-- chevron near neck (brand mark stand-in) -->
    <path d='M2.2 -21 L5.5 -24.4 L8.8 -21' fill='none' stroke='#111827' stroke-width='1.35' stroke-linecap='round' stroke-linejoin='round'/>
    <path d='M2.8 -25.5 L5.5 -28.2 L8.2 -25.5' fill='none' stroke='#111827' stroke-width='1.1' stroke-linecap='round' stroke-linejoin='round' opacity='0.7'/>

    <!-- label bars (reads as packaging type at cursor size) -->
    <rect x='3.4' y='-46' width='4.4' height='12' rx='0.6' fill='#111827'/>
    <rect x='4' y='-44.8' width='3.2' height='1.1' rx='0.3' fill='#ffffff'/>
    <rect x='4' y='-42.6' width='3.2' height='1.1' rx='0.3' fill='#ffffff'/>
    <rect x='4' y='-40.4' width='2.4' height='1.1' rx='0.3' fill='#ffffff'/>

    <!-- posted cap (ink), slightly faceted -->
    <rect x='-2.2' y='-72' width='15.4' height='15' rx='2.2' fill='${ink}' stroke='#111827' stroke-width='1'/>
    <path d='M0.2 -71 L0.2 -58.5' stroke='#ffffff' stroke-width='1.4' opacity='0.28' stroke-linecap='round'/>
    <path d='M4.2 -71 L4.2 -58.5' stroke='#000000' stroke-width='1.1' opacity='0.18' stroke-linecap='round'/>
    <path d='M8.2 -71 L8.2 -58.5' stroke='#ffffff' stroke-width='1.1' opacity='0.2' stroke-linecap='round'/>
    <path d='M11.8 -71 L11.8 -58.5' stroke='#000000' stroke-width='1' opacity='0.14' stroke-linecap='round'/>
    <!-- cap end ridge -->
    <rect x='-2.2' y='-74.5' width='15.4' height='3.2' rx='1.2' fill='${ink}' stroke='#111827' stroke-width='0.9'/>
  </g>
</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${tipX} 84, crosshair`
}

function loadPanelCollapsed(): boolean {
  try {
    return localStorage.getItem(PANEL_COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

function savePanelCollapsed(value: boolean): void {
  try {
    localStorage.setItem(PANEL_COLLAPSE_KEY, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={[
        'size-3 shrink-0 transition-transform duration-200',
        open ? 'rotate-90' : 'rotate-0',
      ].join(' ')}
      aria-hidden="true"
    >
      <path
        d="M4 2.5 L8.5 6 L4 9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Whiteboard() {
  const { strokes, appendStroke, clear } = useWhiteboard()
  const [panelCollapsed, setPanelCollapsed] = useState(() => loadPanelCollapsed())
  const [tool, setTool] = useState<WhiteboardTool>('pen')
  const [color, setColor] = useState<string>(WHITEBOARD_COLORS[0])
  const [sizeWidth, setSizeWidth] = useState(WHITEBOARD_SIZES[1].width)
  const [confirmClear, setConfirmClear] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const strokesRef = useRef(strokes)
  const draftRef = useRef<WhiteboardStroke | null>(null)
  const drawingRef = useRef(false)
  const sizeRef = useRef({ cssW: 0, cssH: 0 })

  strokesRef.current = strokes

  useEffect(() => {
    savePanelCollapsed(panelCollapsed)
  }, [panelCollapsed])

  const paintAll = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { cssW, cssH } = sizeRef.current
    if (cssW <= 0 || cssH <= 0) return
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    redrawWhiteboard(ctx, strokesRef.current, cssW, cssH)
    if (draftRef.current) {
      paintWhiteboardStroke(ctx, draftRef.current, cssW, cssH)
    }
  }

  useEffect(() => {
    if (panelCollapsed) return
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const cssW = Math.max(1, Math.floor(rect.width))
      const cssH = Math.max(1, Math.floor(rect.height))
      const dpr = window.devicePixelRatio || 1
      sizeRef.current = { cssW, cssH }
      canvas.width = Math.floor(cssW * dpr)
      canvas.height = Math.floor(cssH * dpr)
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`
      paintAll()
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [panelCollapsed])

  useEffect(() => {
    if (panelCollapsed) return
    paintAll()
  }, [strokes, panelCollapsed])

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    const point: WhiteboardPoint = {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    }
    return point
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return
    const point = pointFromEvent(event)
    if (!point) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    draftRef.current = {
      id: newWhiteboardStrokeId(),
      tool,
      color,
      width: sizeWidth,
      points: [point],
    }
    paintAll()
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !draftRef.current) return
    const point = pointFromEvent(event)
    if (!point) return
    const draft = draftRef.current
    const last = draft.points[draft.points.length - 1]
    if (
      last &&
      Math.hypot(point.x - last.x, point.y - last.y) < 0.002
    ) {
      return
    }
    draft.points.push(point)
    paintAll()
  }

  const endStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    drawingRef.current = false
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
    const draft = draftRef.current
    draftRef.current = null
    if (draft && draft.points.length > 0) {
      appendStroke(draft)
    } else {
      paintAll()
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setPanelCollapsed((value) => !value)}
          aria-expanded={!panelCollapsed}
          className="flex min-w-0 items-center gap-1.5 text-left transition hover:opacity-90"
        >
          <ChevronIcon open={!panelCollapsed} />
          <h2 className="text-sm font-semibold text-white">Whiteboard</h2>
        </button>
        <span className="shrink-0 text-[11px] text-muted tabular-nums">
          {strokes.length} stroke{strokes.length === 1 ? '' : 's'}
        </span>
      </div>

      {!panelCollapsed ? (
        <>
          <p className="mt-1 text-xs text-muted">
            Doodle together — strokes sync when you lift the pen.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
              <button
                type="button"
                onClick={() => setTool('pen')}
                className={[
                  'rounded-lg px-2.5 py-1 text-xs font-medium transition',
                  tool === 'pen'
                    ? 'bg-white/10 text-white'
                    : 'text-muted hover:text-white',
                ].join(' ')}
              >
                Pen
              </button>
              <button
                type="button"
                onClick={() => setTool('erase')}
                className={[
                  'rounded-lg px-2.5 py-1 text-xs font-medium transition',
                  tool === 'erase'
                    ? 'bg-white/10 text-white'
                    : 'text-muted hover:text-white',
                ].join(' ')}
              >
                Eraser
              </button>
            </div>

            {tool === 'pen' ? (
              <div className="flex items-center gap-1.5">
                {WHITEBOARD_COLORS.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    aria-label={`Color ${swatch}`}
                    onClick={() => setColor(swatch)}
                    className={[
                      'size-6 rounded-full border-2 transition',
                      color === swatch
                        ? 'border-white scale-110'
                        : 'border-transparent opacity-80 hover:opacity-100',
                    ].join(' ')}
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
            ) : null}

            <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
              {WHITEBOARD_SIZES.map((size) => (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => setSizeWidth(size.width)}
                  className={[
                    'rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition',
                    sizeWidth === size.width
                      ? 'bg-white/10 text-white'
                      : 'text-muted hover:text-white',
                  ].join(' ')}
                >
                  {size.id}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-1">
              {confirmClear ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmClear(false)
                      clear()
                    }}
                    className="rounded-lg border border-rose-400/40 bg-rose-500/15 px-2.5 py-1 text-xs font-medium text-rose-200 transition hover:bg-rose-500/25"
                  >
                    Clear board
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="rounded-lg px-2 py-1 text-xs text-muted transition hover:text-white"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted transition hover:border-white/25 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div
            ref={wrapRef}
            className="mt-3 h-[32rem] overflow-hidden rounded-xl border border-border bg-white sm:h-[40rem]"
          >
            <canvas
              ref={canvasRef}
              className="block size-full touch-none"
              style={{
                cursor: tool === 'erase' ? ERASER_CURSOR : markerCursor(color),
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
            />
          </div>
        </>
      ) : null}
    </section>
  )
}
