export type WhiteboardTool = 'pen' | 'erase'

export interface WhiteboardPoint {
  x: number
  y: number
}

export interface WhiteboardStroke {
  id: string
  tool: WhiteboardTool
  /** CSS color for pen strokes; ignored for erase. */
  color: string
  /** Stroke width in CSS px at a 1000px-wide board. */
  width: number
  points: WhiteboardPoint[]
}

interface WhiteboardStore {
  version: 1
  strokes: WhiteboardStroke[]
}

export const WHITEBOARD_KEY = 'jo-dailies:whiteboard:v1'
export const MAX_WHITEBOARD_STROKES = 200
export const WHITEBOARD_WIDTH_REF = 1000

export const WHITEBOARD_COLORS = [
  '#111827',
  '#dc2626',
  '#2563eb',
  '#16a34a',
  '#ca8a04',
  '#9333ea',
] as const

export const WHITEBOARD_SIZES = [
  { id: 'thin', width: 3 },
  { id: 'medium', width: 6 },
  { id: 'thick', width: 12 },
] as const

const COLOR_SET = new Set<string>(WHITEBOARD_COLORS)

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function normalizePoint(raw: unknown): WhiteboardPoint | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  if (typeof p.x !== 'number' || typeof p.y !== 'number') return null
  return { x: clamp01(p.x), y: clamp01(p.y) }
}

export function normalizeWhiteboardStroke(
  raw: unknown,
): WhiteboardStroke | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  if (typeof s.id !== 'string' || !Array.isArray(s.points)) return null
  const points = s.points
    .map(normalizePoint)
    .filter((p): p is WhiteboardPoint => p !== null)
  if (points.length === 0) return null
  const tool: WhiteboardTool = s.tool === 'erase' ? 'erase' : 'pen'
  const color =
    typeof s.color === 'string' && COLOR_SET.has(s.color) ? s.color : '#111827'
  const width =
    typeof s.width === 'number' && Number.isFinite(s.width) && s.width > 0
      ? Math.min(48, s.width)
      : 6
  return { id: s.id, tool, color, width, points }
}

export function normalizeWhiteboardStrokes(raw: unknown): WhiteboardStroke[] {
  if (!raw || typeof raw !== 'object') return []
  const strokes = (raw as { strokes?: unknown }).strokes
  if (!Array.isArray(strokes)) return []
  return capWhiteboardStrokes(
    strokes
      .map(normalizeWhiteboardStroke)
      .filter((s): s is WhiteboardStroke => s !== null),
  )
}

export function capWhiteboardStrokes(
  strokes: WhiteboardStroke[],
): WhiteboardStroke[] {
  if (strokes.length <= MAX_WHITEBOARD_STROKES) return strokes
  return strokes.slice(strokes.length - MAX_WHITEBOARD_STROKES)
}

/**
 * Remote strokes win for shared ids. Local strokes still in `pendingIds`
 * (written optimistically, not yet visible in the snapshot) are appended.
 */
export function mergeWhiteboardStrokes(
  remote: WhiteboardStroke[],
  local: WhiteboardStroke[],
  pendingIds: ReadonlySet<string>,
): WhiteboardStroke[] {
  const seen = new Set<string>()
  const merged: WhiteboardStroke[] = []
  for (const stroke of remote) {
    merged.push(stroke)
    seen.add(stroke.id)
  }
  for (const stroke of local) {
    if (!pendingIds.has(stroke.id) || seen.has(stroke.id)) continue
    merged.push(stroke)
    seen.add(stroke.id)
  }
  return capWhiteboardStrokes(merged)
}

/** True when both lists have the same stroke ids in the same order. */
export function whiteboardStrokeIdsEqual(
  a: WhiteboardStroke[],
  b: WhiteboardStroke[],
): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]!.id !== b[i]!.id) return false
  }
  return true
}

export function loadWhiteboard(): WhiteboardStroke[] {
  try {
    const raw = localStorage.getItem(WHITEBOARD_KEY)
    if (!raw) return []
    return normalizeWhiteboardStrokes(JSON.parse(raw))
  } catch {
    return []
  }
}

export function saveWhiteboard(strokes: WhiteboardStroke[]): void {
  try {
    const store: WhiteboardStore = { version: 1, strokes }
    localStorage.setItem(WHITEBOARD_KEY, JSON.stringify(store))
  } catch {
    /* ignore quota / private mode */
  }
}

export function newWhiteboardStrokeId(): string {
  return `wb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function paintWhiteboardStroke(
  ctx: CanvasRenderingContext2D,
  stroke: WhiteboardStroke,
  cssWidth: number,
  cssHeight: number,
): void {
  if (stroke.points.length === 0 || cssWidth <= 0 || cssHeight <= 0) return
  const scale = cssWidth / WHITEBOARD_WIDTH_REF
  const lineWidth = Math.max(1, stroke.width * scale)

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = lineWidth
  if (stroke.tool === 'erase') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = 'rgba(0,0,0,1)'
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = stroke.color
  }

  const first = stroke.points[0]!
  ctx.beginPath()
  ctx.moveTo(first.x * cssWidth, first.y * cssHeight)
  for (let i = 1; i < stroke.points.length; i += 1) {
    const point = stroke.points[i]!
    ctx.lineTo(point.x * cssWidth, point.y * cssHeight)
  }
  if (stroke.points.length === 1) {
    ctx.lineTo(first.x * cssWidth + 0.01, first.y * cssHeight)
  }
  ctx.stroke()
  ctx.restore()
}

export function redrawWhiteboard(
  ctx: CanvasRenderingContext2D,
  strokes: WhiteboardStroke[],
  cssWidth: number,
  cssHeight: number,
): void {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.restore()

  for (const stroke of strokes) {
    paintWhiteboardStroke(ctx, stroke, cssWidth, cssHeight)
  }
}
