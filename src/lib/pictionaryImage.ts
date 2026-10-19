import { redrawWhiteboard, type WhiteboardStroke } from './whiteboard'

/** Render strokes onto a white PNG (with an optional caption band). */
export async function pictionaryDrawingBlob(
  strokes: WhiteboardStroke[],
  caption?: string,
): Promise<{ blob: Blob; width: number; height: number } | null> {
  const width = 1200
  const boardH = 900
  const band = caption ? 110 : 0
  const height = boardH + band
  // Erased pixels are transparent on the board — flatten onto white below.
  const board = document.createElement('canvas')
  board.width = width
  board.height = boardH
  const bctx = board.getContext('2d')
  if (!bctx) return null
  redrawWhiteboard(bctx, strokes, width, boardH)

  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const ctx = out.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(board, 0, 0)
  if (caption) {
    ctx.fillStyle = '#111827'
    ctx.fillRect(0, boardH, width, band)
    ctx.fillStyle = '#ffffff'
    ctx.font = '600 44px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(caption, width / 2, boardH + band / 2, width - 60)
  }
  const blob = await new Promise<Blob | null>((resolve) =>
    out.toBlob((b) => resolve(b), 'image/png'),
  )
  return blob ? { blob, width, height } : null
}
