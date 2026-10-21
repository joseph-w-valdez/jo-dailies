import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  newWhiteboardStrokeId,
  paintWhiteboardStroke,
  redrawWhiteboard,
  type WhiteboardPoint,
  type WhiteboardStroke,
} from '../lib/whiteboard'

export type PictionaryTool = 'pen' | 'erase' | 'fill'

const ASPECT = 4 / 3

/** Fit a 4:3 board inside the available box. */
function fitBoard(w: number, h: number): { cssW: number; cssH: number } {
  if (w <= 0 || h <= 0) return { cssW: 0, cssH: 0 }
  if (w / h > ASPECT) return { cssW: Math.floor(h * ASPECT), cssH: Math.floor(h) }
  return { cssW: Math.floor(w), cssH: Math.floor(w / ASPECT) }
}

export function PictionaryCanvas({
  strokes,
  peerDraft,
  interactive = false,
  tool = 'pen',
  color = '#111827',
  width = 6,
  onStroke,
  onDraft,
  hideInk = false,
  className,
}: {
  strokes: WhiteboardStroke[]
  /** The other player's in-progress stroke. */
  peerDraft?: WhiteboardStroke | null
  interactive?: boolean
  tool?: PictionaryTool
  color?: string
  width?: number
  onStroke?: (stroke: WhiteboardStroke) => void
  onDraft?: (stroke: WhiteboardStroke | null) => void
  /** Draw normally but show a blank board (blindfold challenge). */
  hideInk?: boolean
  className?: string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sizeRef = useRef({ cssW: 0, cssH: 0 })
  const [size, setSize] = useState({ cssW: 0, cssH: 0 })
  const draftRef = useRef<WhiteboardStroke | null>(null)
  const strokesRef = useRef(strokes)
  strokesRef.current = strokes
  const peerRef = useRef(peerDraft ?? null)
  peerRef.current = peerDraft ?? null
  const onDraftRef = useRef(onDraft)
  onDraftRef.current = onDraft
  const hideInkRef = useRef(hideInk)
  hideInkRef.current = hideInk

  const paint = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const { cssW, cssH } = sizeRef.current
    if (!canvas || !ctx || cssW <= 0 || cssH <= 0) return
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (hideInkRef.current) {
      redrawWhiteboard(ctx, [], cssW, cssH)
      return
    }
    redrawWhiteboard(ctx, strokesRef.current, cssW, cssH)
    if (peerRef.current) paintWhiteboardStroke(ctx, peerRef.current, cssW, cssH)
    if (draftRef.current) paintWhiteboardStroke(ctx, draftRef.current, cssW, cssH)
  }

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const next = fitBoard(rect.width, rect.height)
      const dpr = window.devicePixelRatio || 1
      sizeRef.current = next
      setSize(next)
      canvas.width = Math.max(1, Math.floor(next.cssW * dpr))
      canvas.height = Math.max(1, Math.floor(next.cssH * dpr))
      paint()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    paint()
  }, [strokes, peerDraft, size, hideInk])

  // Drop an in-progress stroke if drawing gets locked mid-gesture.
  useEffect(() => {
    if (interactive || !draftRef.current) return
    draftRef.current = null
    onDraftRef.current?.(null)
    paint()
  }, [interactive])

  const pointFrom = (event: ReactPointerEvent<HTMLCanvasElement>): WhiteboardPoint | null => {
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    }
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!interactive || event.button !== 0) return
    const point = pointFrom(event)
    if (!point) return
    event.preventDefault()
    if (tool === 'fill') {
      onStroke?.({
        id: newWhiteboardStrokeId(),
        tool: 'fill',
        color,
        width,
        points: [point],
        createdAt: Date.now(),
      })
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    draftRef.current = {
      id: newWhiteboardStrokeId(),
      tool,
      color,
      width,
      points: [point],
      createdAt: Date.now(),
    }
    onDraft?.(draftRef.current)
    paint()
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const draft = draftRef.current
    if (!draft) return
    const point = pointFrom(event)
    if (!point) return
    const last = draft.points[draft.points.length - 1]
    if (last && Math.hypot(point.x - last.x, point.y - last.y) < 0.002) return
    draft.points.push(point)
    onDraft?.(draft)
    paint()
  }

  const finish = () => {
    const draft = draftRef.current
    if (!draft) return
    draftRef.current = null
    onStroke?.({ ...draft, points: [...draft.points] })
    paint()
  }

  return (
    <div
      ref={wrapRef}
      className={['relative flex min-h-0 items-center justify-center', className]
        .filter(Boolean)
        .join(' ')}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size.cssW, height: size.cssH, touchAction: 'none' }}
        className={[
          'block rounded-xl bg-white shadow-[0_10px_40px_-20px_rgba(0,0,0,0.8)]',
          interactive ? (tool === 'fill' ? 'cursor-cell' : 'cursor-crosshair') : '',
        ].join(' ')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onLostPointerCapture={finish}
      />
    </div>
  )
}
