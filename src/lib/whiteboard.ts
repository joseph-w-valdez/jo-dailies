export type WhiteboardTool =
  | 'pen'
  | 'erase'
  | 'highlighter'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'fill'
  | 'text'

export interface WhiteboardPoint {
  x: number
  y: number
}

export interface WhiteboardStroke {
  id: string
  tool: WhiteboardTool
  /** CSS color for ink / text; ignored for erase. */
  color: string
  /** Stroke width in CSS px at a 1000px-wide board (also used for eraser size). */
  width: number
  /**
   * pen/erase/highlighter: path points
   * line/rect/ellipse: [start, end]
   * fill / text: [{ x, y }] anchor
   */
  points: WhiteboardPoint[]
  /** For rect/ellipse — paint interior. */
  filled?: boolean
  /** Text tool content. */
  text?: string
  /** Text size in CSS px at a 1000px-wide board. */
  fontSize?: number
  /** Text background pill. */
  background?: boolean
  backgroundColor?: string
  createdAt: number
}

interface WhiteboardStore {
  version: 1
  strokes: WhiteboardStroke[]
}

export const WHITEBOARD_KEY = 'jo-dailies:whiteboard:v1'
export const MAX_WHITEBOARD_STROKES = 200
export const WHITEBOARD_WIDTH_REF = 1000
export const WHITEBOARD_TEXT_FONT =
  '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive'

export const WHITEBOARD_COLORS = [
  '#111827',
  '#6b7280',
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0d9488',
  '#2563eb',
  '#38bdf8',
  '#9333ea',
  '#c026d3',
  '#f472b6',
  '#fb7185',
] as const

export const WHITEBOARD_SIZES = [
  { id: 'thin', width: 3 },
  { id: 'medium', width: 6 },
  { id: 'thick', width: 12 },
] as const

export const WHITEBOARD_FONT_SIZES = [
  { id: 'S', size: 18 },
  { id: 'M', size: 28 },
  { id: 'L', size: 42 },
] as const

export const FREEHAND_TOOLS: WhiteboardTool[] = ['pen', 'erase', 'highlighter']
export const SHAPE_TOOLS: WhiteboardTool[] = ['line', 'rect', 'ellipse']

const TOOL_SET = new Set<WhiteboardTool>([
  'pen',
  'erase',
  'highlighter',
  'line',
  'rect',
  'ellipse',
  'fill',
  'text',
])

const COLOR_SET = new Set<string>(WHITEBOARD_COLORS)

function normalizeColor(raw: unknown): string {
  if (typeof raw !== 'string') return '#111827'
  const value = raw.trim().toLowerCase()
  if (COLOR_SET.has(value)) return value
  if (/^#[0-9a-f]{6}$/.test(value)) return value
  if (/^#[0-9a-f]{3}$/.test(value)) {
    const r = value[1]!
    const g = value[2]!
    const b = value[3]!
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return '#111827'
}

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

function normalizeTool(raw: unknown): WhiteboardTool {
  return typeof raw === 'string' && TOOL_SET.has(raw as WhiteboardTool)
    ? (raw as WhiteboardTool)
    : 'pen'
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
  const tool = normalizeTool(s.tool)
  if (tool === 'fill' && points.length < 1) return null
  if (tool === 'text') {
    if (typeof s.text !== 'string' || !s.text.trim()) return null
  }
  if (
    (tool === 'line' || tool === 'rect' || tool === 'ellipse') &&
    points.length < 2
  ) {
    return null
  }
  const color = normalizeColor(s.color)
  const width =
    typeof s.width === 'number' && Number.isFinite(s.width) && s.width > 0
      ? Math.min(80, s.width)
      : 6
  const createdAt =
    typeof s.createdAt === 'number' && Number.isFinite(s.createdAt)
      ? s.createdAt
      : 0
  const fontSize =
    typeof s.fontSize === 'number' && Number.isFinite(s.fontSize) && s.fontSize > 0
      ? Math.min(96, s.fontSize)
      : undefined
  return {
    id: s.id,
    tool,
    color,
    width,
    points,
    filled: s.filled === true,
    text: typeof s.text === 'string' ? s.text : undefined,
    fontSize,
    background: s.background === true,
    backgroundColor: s.backgroundColor
      ? normalizeColor(s.backgroundColor)
      : undefined,
    createdAt,
  }
}

export function normalizeWhiteboardStrokes(raw: unknown): WhiteboardStroke[] {
  if (!raw || typeof raw !== 'object') return []
  const strokes = (raw as { strokes?: unknown }).strokes
  if (!Array.isArray(strokes)) return []
  return sortWhiteboardStrokes(
    capWhiteboardStrokes(
      strokes
        .map(normalizeWhiteboardStroke)
        .filter((s): s is WhiteboardStroke => s !== null),
    ),
  )
}

export function sortWhiteboardStrokes(
  strokes: WhiteboardStroke[],
): WhiteboardStroke[] {
  return [...strokes].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt
    return a.id.localeCompare(b.id)
  })
}

export function capWhiteboardStrokes(
  strokes: WhiteboardStroke[],
): WhiteboardStroke[] {
  const sorted = sortWhiteboardStrokes(strokes)
  if (sorted.length <= MAX_WHITEBOARD_STROKES) return sorted
  return sorted.slice(sorted.length - MAX_WHITEBOARD_STROKES)
}

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

function parseCssColor(color: string): [number, number, number, number] {
  const hex = color.replace('#', '')
  if (hex.length === 6) {
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
      255,
    ]
  }
  return [17, 24, 39, 255]
}

function colorsMatch(
  data: Uint8ClampedArray,
  index: number,
  target: [number, number, number, number],
  tolerance = 24,
): boolean {
  return (
    Math.abs(data[index]! - target[0]) <= tolerance &&
    Math.abs(data[index + 1]! - target[1]) <= tolerance &&
    Math.abs(data[index + 2]! - target[2]) <= tolerance &&
    Math.abs(data[index + 3]! - target[3]) <= tolerance
  )
}

/** Flood-fill the canvas bitmap from a normalized seed point. */
export function floodFillCanvas(
  ctx: CanvasRenderingContext2D,
  seed: WhiteboardPoint,
  color: string,
): void {
  const width = ctx.canvas.width
  const height = ctx.canvas.height
  if (width <= 0 || height <= 0) return
  const sx = Math.min(width - 1, Math.max(0, Math.floor(seed.x * width)))
  const sy = Math.min(height - 1, Math.max(0, Math.floor(seed.y * height)))
  const image = ctx.getImageData(0, 0, width, height)
  const { data } = image
  const start = (sy * width + sx) * 4
  const fill = parseCssColor(color)
  const target: [number, number, number, number] = [
    data[start]!,
    data[start + 1]!,
    data[start + 2]!,
    data[start + 3]!,
  ]
  if (
    Math.abs(target[0] - fill[0]) <= 8 &&
    Math.abs(target[1] - fill[1]) <= 8 &&
    Math.abs(target[2] - fill[2]) <= 8 &&
    Math.abs(target[3] - fill[3]) <= 8
  ) {
    return
  }

  const stack: number[] = [sx, sy]
  const seen = new Uint8Array(width * height)

  while (stack.length > 0) {
    const y = stack.pop()!
    const x = stack.pop()!
    if (x < 0 || y < 0 || x >= width || y >= height) continue
    const key = y * width + x
    if (seen[key]) continue
    const idx = key * 4
    if (!colorsMatch(data, idx, target)) continue
    seen[key] = 1
    data[idx] = fill[0]
    data[idx + 1] = fill[1]
    data[idx + 2] = fill[2]
    data[idx + 3] = fill[3]
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1)
  }

  ctx.putImageData(image, 0, 0)
}

function paintFreehand(
  ctx: CanvasRenderingContext2D,
  stroke: WhiteboardStroke,
  cssWidth: number,
  cssHeight: number,
): void {
  const scale = cssWidth / WHITEBOARD_WIDTH_REF
  const lineWidth = Math.max(1, stroke.width * scale)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = lineWidth

  if (stroke.tool === 'erase') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = 'rgba(0,0,0,1)'
    ctx.globalAlpha = 1
  } else if (stroke.tool === 'highlighter') {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = stroke.color
    ctx.globalAlpha = 0.35
    ctx.lineWidth = Math.max(lineWidth * 2.2, 8 * scale)
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = stroke.color
    ctx.globalAlpha = 1
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
}

function paintShape(
  ctx: CanvasRenderingContext2D,
  stroke: WhiteboardStroke,
  cssWidth: number,
  cssHeight: number,
): void {
  const a = stroke.points[0]!
  const b = stroke.points[stroke.points.length - 1]!
  const x0 = a.x * cssWidth
  const y0 = a.y * cssHeight
  const x1 = b.x * cssWidth
  const y1 = b.y * cssHeight
  const scale = cssWidth / WHITEBOARD_WIDTH_REF
  const lineWidth = Math.max(1, stroke.width * scale)

  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = lineWidth
  ctx.strokeStyle = stroke.color
  ctx.fillStyle = stroke.color

  if (stroke.tool === 'line') {
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
    return
  }

  if (stroke.tool === 'rect') {
    const left = Math.min(x0, x1)
    const top = Math.min(y0, y1)
    const w = Math.abs(x1 - x0)
    const h = Math.abs(y1 - y0)
    if (stroke.filled) ctx.fillRect(left, top, w, h)
    ctx.strokeRect(left, top, w, h)
    return
  }

  if (stroke.tool === 'ellipse') {
    const cx = (x0 + x1) / 2
    const cy = (y0 + y1) / 2
    const rx = Math.abs(x1 - x0) / 2
    const ry = Math.abs(y1 - y0) / 2
    ctx.beginPath()
    ctx.ellipse(cx, cy, Math.max(rx, 0.5), Math.max(ry, 0.5), 0, 0, Math.PI * 2)
    if (stroke.filled) ctx.fill()
    ctx.stroke()
  }
}

function paintText(
  ctx: CanvasRenderingContext2D,
  stroke: WhiteboardStroke,
  cssWidth: number,
  cssHeight: number,
): void {
  const text = stroke.text?.trim()
  if (!text) return
  const anchor = stroke.points[0]!
  const scale = cssWidth / WHITEBOARD_WIDTH_REF
  const fontSize = Math.max(10, (stroke.fontSize ?? 28) * scale)
  const x = anchor.x * cssWidth
  const y = anchor.y * cssHeight
  const lines = text.split('\n')
  const lineStep = fontSize * 1.15
  // Uniform inset that grows with text size (S/M/L).
  const paddingY = Math.max(5, fontSize * 0.28)
  const paddingX = Math.max(7, fontSize * 0.38)

  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.font = `${fontSize}px ${WHITEBOARD_TEXT_FONT}`
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'

  let maxWidth = 0
  let ascent = fontSize * 0.8
  let descent = fontSize * 0.2
  let measuredInk = false
  for (const line of lines) {
    const metrics = ctx.measureText(line || ' ')
    maxWidth = Math.max(maxWidth, metrics.width)
    if (
      typeof metrics.actualBoundingBoxAscent === 'number' &&
      typeof metrics.actualBoundingBoxDescent === 'number'
    ) {
      if (!measuredInk) {
        ascent = metrics.actualBoundingBoxAscent
        descent = metrics.actualBoundingBoxDescent
        measuredInk = true
      } else {
        ascent = Math.max(ascent, metrics.actualBoundingBoxAscent)
        descent = Math.max(descent, metrics.actualBoundingBoxDescent)
      }
    }
  }

  // Pad around the real glyph ink (not the em square), so top/bottom match.
  const contentHeight = (lines.length - 1) * lineStep + ascent + descent
  const boxW = maxWidth + paddingX * 2
  const boxH = contentHeight + paddingY * 2
  // First-line ink top sits at `y`; alphabetic baseline is `y + ascent`.
  const baseline0 = y + ascent

  if (stroke.background) {
    const bg = stroke.backgroundColor || '#fef3c7'
    ctx.fillStyle = bg
    const r = Math.min(10, fontSize * 0.3)
    const left = x - paddingX
    const top = y - paddingY
    ctx.beginPath()
    ctx.moveTo(left + r, top)
    ctx.arcTo(left + boxW, top, left + boxW, top + boxH, r)
    ctx.arcTo(left + boxW, top + boxH, left, top + boxH, r)
    ctx.arcTo(left, top + boxH, left, top, r)
    ctx.arcTo(left, top, left + boxW, top, r)
    ctx.closePath()
    ctx.fill()
  }

  ctx.fillStyle = stroke.color
  lines.forEach((line, index) => {
    ctx.fillText(line, x, baseline0 + index * lineStep)
  })
}

export function paintWhiteboardStroke(
  ctx: CanvasRenderingContext2D,
  stroke: WhiteboardStroke,
  cssWidth: number,
  cssHeight: number,
): void {
  if (stroke.points.length === 0 || cssWidth <= 0 || cssHeight <= 0) return
  ctx.save()
  if (stroke.tool === 'fill') {
    const transform = ctx.getTransform()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    floodFillCanvas(ctx, stroke.points[0]!, stroke.color)
    ctx.setTransform(transform)
  } else if (stroke.tool === 'text') {
    paintText(ctx, stroke, cssWidth, cssHeight)
  } else if (
    stroke.tool === 'pen' ||
    stroke.tool === 'erase' ||
    stroke.tool === 'highlighter'
  ) {
    paintFreehand(ctx, stroke, cssWidth, cssHeight)
  } else {
    paintShape(ctx, stroke, cssWidth, cssHeight)
  }
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
