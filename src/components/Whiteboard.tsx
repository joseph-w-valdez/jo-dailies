import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { useWhiteboard } from '../hooks/useWhiteboard'
import {
  FREEHAND_TOOLS,
  newWhiteboardStrokeId,
  paintWhiteboardStroke,
  redrawWhiteboard,
  SHAPE_TOOLS,
  WHITEBOARD_COLORS,
  WHITEBOARD_FONT_SIZES,
  WHITEBOARD_SIZES,
  WHITEBOARD_TEXT_FONT,
  type WhiteboardPoint,
  type WhiteboardStroke,
  type WhiteboardTool,
} from '../lib/whiteboard'

const PANEL_COLLAPSE_KEY = 'jo-dailies:whiteboard-panel-collapsed:v1'

/** Whiteboard felt-block eraser cursor (not a pencil eraser). */
const ERASER_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'>
  <g transform='translate(20 28) rotate(-28)'>
    <!-- felt pad -->
    <rect x='-14' y='-4' width='28' height='8' rx='2' fill='#64748b' stroke='#1e293b' stroke-width='1.1'/>
    <rect x='-12.5' y='-2.2' width='25' height='3.2' rx='1' fill='#94a3b8' opacity='0.9'/>
    <!-- hard plastic body -->
    <rect x='-12' y='-16' width='24' height='13' rx='2.5' fill='#e2e8f0' stroke='#475569' stroke-width='1.1'/>
    <!-- top face highlight -->
    <rect x='-10' y='-14.5' width='20' height='4' rx='1.2' fill='#ffffff' opacity='0.55'/>
    <!-- grip ridges -->
    <path d='M-7 -8.5 H7 M-7 -6 H7 M-7 -3.5 H7' stroke='#94a3b8' stroke-width='1' stroke-linecap='round'/>
  </g>
</svg>`,
)}") 14 30, cell`

const BUCKET_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><g fill='none' stroke='#111827' stroke-width='1.4' stroke-linejoin='round'><path d='M10 14 L22 14 L20 26 L12 26 Z' fill='#38bdf8'/><path d='M12 14 L14 8 L18 8 L20 14' fill='#e2e8f0'/><path d='M8 12 L11 14' stroke-linecap='round'/></g></svg>`,
)}") 6 28, cell`

const MARKER_CURSOR_FLIPPED = true

function markerCursor(ink: string): string {
  const tipX = MARKER_CURSOR_FLIPPED ? 86 : 10
  const flip = MARKER_CURSOR_FLIPPED ? 'scale(-1 1)' : ''
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'>
  <g transform='translate(${tipX} 84) ${flip} rotate(-42)'>
    <path d='M0 0 L11 0 L11 -5.5 L2.5 -7.5 L0 -7.5 Z' fill='${ink}' stroke='#111827' stroke-width='0.9' stroke-linejoin='round'/>
    <path d='M1.2 -1.3 L9.5 -1.3 L9.5 -4.2 L3 -5.5 L1.2 -5.5 Z' fill='#ffffff' opacity='0.22'/>
    <path d='M0.4 -7.5 L10.6 -7.5 L11.4 -12.5 L-0.4 -12.5 Z' fill='#f8fafc' stroke='#94a3b8' stroke-width='0.85'/>
    <path d='M-0.2 -12.5 L11.2 -12.5 L12.2 -17.2 L-1.2 -17.2 Z' fill='#ffffff' stroke='#94a3b8' stroke-width='0.85'/>
    <rect x='-1.6' y='-58' width='14.2' height='41.2' rx='2.6' fill='#ffffff' stroke='#94a3b8' stroke-width='1'/>
    <rect x='0.4' y='-56' width='3' height='37' rx='1.4' fill='#000000' opacity='0.06'/>
    <path d='M2.2 -21 L5.5 -24.4 L8.8 -21' fill='none' stroke='#111827' stroke-width='1.35' stroke-linecap='round' stroke-linejoin='round'/>
    <rect x='3.4' y='-46' width='4.4' height='12' rx='0.6' fill='#111827'/>
    <rect x='-2.2' y='-72' width='15.4' height='15' rx='2.2' fill='${ink}' stroke='#111827' stroke-width='1'/>
    <rect x='-2.2' y='-74.5' width='15.4' height='3.2' rx='1.2' fill='${ink}' stroke='#111827' stroke-width='0.9'/>
  </g>
</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${tipX} 84, crosshair`
}

function canvasCursor(tool: WhiteboardTool, color: string): string {
  if (tool === 'erase') return ERASER_CURSOR
  if (tool === 'fill') return BUCKET_CURSOR
  if (tool === 'text') return 'text'
  if (SHAPE_TOOLS.includes(tool)) return 'crosshair'
  return markerCursor(color)
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

function UndoIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
      <path
        d="M3.5 6.5 H10.5 A3.5 3.5 0 0 1 10.5 13.5 H8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 3.5 L3 6.5 L6 9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function RedoIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
      <path
        d="M12.5 6.5 H5.5 A3.5 3.5 0 0 0 5.5 13.5 H8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 3.5 L13 6.5 L10 9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ToolButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-lg px-2 py-1 text-xs font-medium transition',
        active ? 'bg-white/10 text-white' : 'text-muted hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function Whiteboard() {
  const {
    strokes,
    livePeers,
    liveEnabled,
    canUndo,
    canRedo,
    appendStroke,
    undo,
    redo,
    clear,
    publishLive,
    clearLiveStroke,
  } = useWhiteboard()
  const [panelCollapsed, setPanelCollapsed] = useState(() => loadPanelCollapsed())
  const [tool, setTool] = useState<WhiteboardTool>('pen')
  const [color, setColor] = useState<string>(WHITEBOARD_COLORS[0])
  const [sizeWidth, setSizeWidth] = useState<number>(WHITEBOARD_SIZES[1].width)
  const [fontSize, setFontSize] = useState<number>(WHITEBOARD_FONT_SIZES[1].size)
  const [shapeFilled, setShapeFilled] = useState(true)
  const [textBackground, setTextBackground] = useState(true)
  const [bgColor, setBgColor] = useState<string>('#fef3c7')
  const [confirmClear, setConfirmClear] = useState(false)
  const [textDraft, setTextDraft] = useState<{
    id: string
    x: number
    y: number
    value: string
  } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const textInputRef = useRef<HTMLTextAreaElement>(null)
  const strokesRef = useRef(strokes)
  const livePeersRef = useRef(livePeers)
  const draftRef = useRef<WhiteboardStroke | null>(null)
  const drawingRef = useRef(false)
  const sizeRef = useRef({ cssW: 0, cssH: 0 })
  const toolRef = useRef(tool)
  const colorRef = useRef(color)
  const sizeWidthRef = useRef(sizeWidth)
  const fontSizeRef = useRef(fontSize)
  const shapeFilledRef = useRef(shapeFilled)
  const textBackgroundRef = useRef(textBackground)
  const bgColorRef = useRef(bgColor)
  const textDraftRef = useRef(textDraft)
  const ignoreTextBlurRef = useRef(false)

  strokesRef.current = strokes
  livePeersRef.current = livePeers
  toolRef.current = tool
  colorRef.current = color
  sizeWidthRef.current = sizeWidth
  fontSizeRef.current = fontSize
  shapeFilledRef.current = shapeFilled
  textBackgroundRef.current = textBackground
  bgColorRef.current = bgColor
  textDraftRef.current = textDraft

  useEffect(() => {
    savePanelCollapsed(panelCollapsed)
  }, [panelCollapsed])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      const mod = event.metaKey || event.ctrlKey
      if (!mod) return
      if (event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

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
    for (const peer of livePeersRef.current) {
      if (peer.draft) paintWhiteboardStroke(ctx, peer.draft, cssW, cssH)
    }
    if (draftRef.current) {
      paintWhiteboardStroke(ctx, draftRef.current, cssW, cssH)
    }
    for (const peer of livePeersRef.current) {
      if (!peer.cursor) continue
      ctx.save()
      ctx.fillStyle = '#f472b6'
      ctx.strokeStyle = '#111827'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(peer.cursor.x * cssW, peer.cursor.y * cssH, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
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
  }, [strokes, livePeers, panelCollapsed])

  useEffect(() => {
    if (!textDraft) return
    ignoreTextBlurRef.current = true
    const id = window.setTimeout(() => {
      textInputRef.current?.focus()
      ignoreTextBlurRef.current = false
    }, 30)
    return () => window.clearTimeout(id)
  }, [textDraft?.id])

  const commitTextDraft = () => {
    const current = textDraftRef.current
    if (!current) return
    const value = current.value.trim()
    textDraftRef.current = null
    setTextDraft(null)
    if (!value) return
    appendStroke({
      id: current.id,
      tool: 'text',
      color: colorRef.current,
      width: sizeWidthRef.current,
      points: [{ x: current.x, y: current.y }],
      text: value,
      fontSize: fontSizeRef.current,
      background: textBackgroundRef.current,
      backgroundColor: bgColorRef.current,
      createdAt: Date.now(),
    })
  }

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    } satisfies WhiteboardPoint
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return
    const point = pointFromEvent(event)
    if (!point) return
    const activeTool = toolRef.current

    if (textDraftRef.current) {
      commitTextDraft()
      return
    }

    if (activeTool === 'text') {
      event.preventDefault()
      const draft = {
        id: newWhiteboardStrokeId(),
        x: point.x,
        y: point.y,
        value: '',
      }
      textDraftRef.current = draft
      setTextDraft(draft)
      return
    }

    if (activeTool === 'fill') {
      appendStroke({
        id: newWhiteboardStrokeId(),
        tool: 'fill',
        color: colorRef.current,
        width: sizeWidthRef.current,
        points: [point],
        createdAt: Date.now(),
      })
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    draftRef.current = {
      id: newWhiteboardStrokeId(),
      tool: activeTool,
      color: colorRef.current,
      width: sizeWidthRef.current,
      points: [point],
      filled:
        activeTool === 'rect' || activeTool === 'ellipse'
          ? shapeFilledRef.current
          : false,
      createdAt: Date.now(),
    }
    publishLive({ cursor: point, stroke: draftRef.current })
    paintAll()
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = pointFromEvent(event)
    if (!point) return

    if (!drawingRef.current || !draftRef.current) {
      publishLive({ cursor: point })
      return
    }

    const draft = draftRef.current
    if (SHAPE_TOOLS.includes(draft.tool)) {
      draft.points = [draft.points[0]!, point]
    } else {
      const last = draft.points[draft.points.length - 1]
      if (last && Math.hypot(point.x - last.x, point.y - last.y) < 0.002) {
        publishLive({ cursor: point })
        return
      }
      draft.points.push(point)
    }
    publishLive({ cursor: point, stroke: draft })
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
    clearLiveStroke()
    if (draft && draft.points.length > 0) {
      if (
        SHAPE_TOOLS.includes(draft.tool) &&
        draft.points.length === 1
      ) {
        paintAll()
        return
      }
      appendStroke(draft)
    } else {
      paintAll()
    }
  }

  const showColors =
    tool !== 'erase' &&
    (FREEHAND_TOOLS.includes(tool) ||
      SHAPE_TOOLS.includes(tool) ||
      tool === 'fill' ||
      tool === 'text')

  const brushSizes =
    tool === 'text'
      ? null
      : tool === 'fill'
        ? null
        : WHITEBOARD_SIZES

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
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[11px] text-muted tabular-nums">
            {strokes.length} mark{strokes.length === 1 ? '' : 's'}
            {liveEnabled ? ' · live' : ''}
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              undo()
            }}
            disabled={!canUndo}
            title="Undo (up to 50 steps)"
            aria-label="Undo"
            className="flex size-7 items-center justify-center rounded-lg border border-border bg-surface text-muted transition hover:border-white/25 hover:text-white disabled:opacity-40"
          >
            <UndoIcon />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              redo()
            }}
            disabled={!canRedo}
            title="Redo"
            aria-label="Redo"
            className="flex size-7 items-center justify-center rounded-lg border border-border bg-surface text-muted transition hover:border-white/25 hover:text-white disabled:opacity-40"
          >
            <RedoIcon />
          </button>
        </div>
      </div>

      {!panelCollapsed ? (
        <>
          <p className="mt-1 text-xs text-muted">
            {liveEnabled
              ? 'Doodle together — ink streams live while you draw.'
              : 'Doodle together — strokes sync when you lift the pen. Add VITE_FIREBASE_DATABASE_URL for live ink.'}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-surface p-1">
              <ToolButton active={tool === 'pen'} onClick={() => setTool('pen')}>
                Pen
              </ToolButton>
              <ToolButton
                active={tool === 'highlighter'}
                onClick={() => setTool('highlighter')}
              >
                Highlighter
              </ToolButton>
              <ToolButton
                active={tool === 'erase'}
                onClick={() => setTool('erase')}
              >
                Eraser
              </ToolButton>
              <ToolButton
                active={tool === 'line'}
                onClick={() => setTool('line')}
              >
                Line
              </ToolButton>
              <ToolButton
                active={tool === 'rect'}
                onClick={() => setTool('rect')}
              >
                Rect
              </ToolButton>
              <ToolButton
                active={tool === 'ellipse'}
                onClick={() => setTool('ellipse')}
              >
                Ellipse
              </ToolButton>
              <ToolButton
                active={tool === 'fill'}
                onClick={() => setTool('fill')}
              >
                Fill
              </ToolButton>
              <ToolButton
                active={tool === 'text'}
                onClick={() => setTool('text')}
              >
                Text
              </ToolButton>
            </div>

            {(tool === 'rect' || tool === 'ellipse') && (
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={shapeFilled}
                  onChange={(event) => setShapeFilled(event.target.checked)}
                  className="size-3.5 accent-golden"
                />
                Fill shape
              </label>
            )}

            {tool === 'text' ? (
              <>
                <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
                  {WHITEBOARD_FONT_SIZES.map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setFontSize(size.size)}
                      className={[
                        'rounded-lg px-2.5 py-1 text-xs font-medium transition',
                        fontSize === size.size
                          ? 'bg-white/10 text-white'
                          : 'text-muted hover:text-white',
                      ].join(' ')}
                    >
                      {size.id}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={textBackground}
                    onChange={(event) => setTextBackground(event.target.checked)}
                    className="size-3.5 accent-golden"
                  />
                  Background
                </label>
                {textBackground ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] uppercase tracking-wide text-muted">
                      bg
                    </span>
                    {['#fef3c7', '#ffffff', '#fce7f3', '#dbeafe', '#111827'].map(
                      (swatch) => (
                        <button
                          key={swatch}
                          type="button"
                          aria-label={`Background ${swatch}`}
                          onClick={() => setBgColor(swatch)}
                          className={[
                            'size-5 rounded-full border-2 transition',
                            bgColor.toLowerCase() === swatch
                              ? 'border-white scale-110'
                              : 'border-transparent opacity-80 hover:opacity-100',
                          ].join(' ')}
                          style={{ backgroundColor: swatch }}
                        />
                      ),
                    )}
                    <label
                      className="relative size-5 cursor-pointer overflow-hidden rounded-full border border-border"
                      title="Custom background"
                    >
                      <span
                        className="absolute inset-0"
                        style={{ backgroundColor: bgColor }}
                      />
                      <input
                        type="color"
                        value={
                          /^#[0-9a-fA-F]{6}$/.test(bgColor) ? bgColor : '#fef3c7'
                        }
                        onChange={(event) => setBgColor(event.target.value)}
                        className="absolute inset-0 cursor-pointer opacity-0"
                      />
                    </label>
                  </div>
                ) : null}
              </>
            ) : null}

            {brushSizes ? (
              <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
                {brushSizes.map((size) => (
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
            ) : null}

            <div className="ml-auto flex flex-wrap items-center gap-1">
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

          {showColors ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-2">
              {WHITEBOARD_COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`Color ${swatch}`}
                  onClick={() => setColor(swatch)}
                  className={[
                    'size-6 rounded-full border-2 transition',
                    color.toLowerCase() === swatch
                      ? 'border-white scale-110'
                      : 'border-transparent opacity-80 hover:opacity-100',
                  ].join(' ')}
                  style={{ backgroundColor: swatch }}
                />
              ))}
              <label
                className={[
                  'relative size-6 shrink-0 cursor-pointer rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35),0_0_0_1px_rgba(0,0,0,0.35)] transition',
                  !(WHITEBOARD_COLORS as readonly string[]).includes(
                    color.toLowerCase(),
                  )
                    ? 'scale-110 ring-2 ring-white/80'
                    : 'opacity-90 hover:opacity-100 hover:scale-105',
                ].join(' ')}
                title="Custom color"
                aria-label="Open color picker"
                style={{
                  background:
                    'conic-gradient(from 90deg, #ef4444 0deg, #f97316 45deg, #eab308 90deg, #22c55e 150deg, #06b6d4 200deg, #3b82f6 250deg, #8b5cf6 300deg, #ec4899 330deg, #ef4444 360deg)',
                }}
              >
                <span
                  className="pointer-events-none absolute inset-[4px] rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.2)]"
                  style={{ backgroundColor: color }}
                />
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#111827'}
                  onChange={(event) => setColor(event.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </div>
          ) : null}

          <div
            ref={wrapRef}
            className="relative mt-3 h-[32rem] overflow-hidden rounded-xl border border-border bg-white sm:h-[40rem]"
          >
            <canvas
              ref={canvasRef}
              className="block size-full touch-none"
              style={{ cursor: canvasCursor(tool, color) }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
            />
            {textDraft ? (
              <textarea
                ref={textInputRef}
                value={textDraft.value}
                onChange={(event) => {
                  const value = event.target.value
                  setTextDraft((current) => {
                    if (!current) return current
                    const next = { ...current, value }
                    textDraftRef.current = next
                    return next
                  })
                }}
                onBlur={() => {
                  if (ignoreTextBlurRef.current) return
                  commitTextDraft()
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    textDraftRef.current = null
                    setTextDraft(null)
                  } else if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    commitTextDraft()
                  }
                }}
                placeholder="Type here…"
                className="absolute z-10 min-h-0 min-w-[4rem] max-w-[70%] resize-none rounded-lg border-2 border-sky-400/80 bg-amber-50 px-2 py-1.5 text-sm leading-[1.15] text-gray-900 outline-none shadow-lg"
                style={{
                  left: `${textDraft.x * 100}%`,
                  top: `${textDraft.y * 100}%`,
                  color,
                  backgroundColor: textBackground ? bgColor : '#fffbeb',
                  fontFamily: WHITEBOARD_TEXT_FONT,
                  fontSize: `${Math.max(14, fontSize * 0.9)}px`,
                  padding: `${Math.max(5, fontSize * 0.28 * 0.9)}px ${Math.max(7, fontSize * 0.38 * 0.9)}px`,
                  transform: 'translate(0, 0)',
                }}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  )
}
