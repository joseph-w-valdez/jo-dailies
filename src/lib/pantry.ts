export type ShoppingStat = {
  nameKey: string
  name: string
  count: number
  lastCompletedAt: number
}

export function normalizeShoppingStat(raw: unknown): ShoppingStat | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const nameKey = typeof r.nameKey === 'string' ? r.nameKey : ''
  const name = typeof r.name === 'string' ? r.name.trim() : ''
  if (!nameKey || !name) return null
  return {
    nameKey,
    name,
    count: Math.max(0, Math.floor(Number(r.count) || 0)),
    lastCompletedAt:
      typeof r.lastCompletedAt === 'number' && Number.isFinite(r.lastCompletedAt)
        ? r.lastCompletedAt
        : 0,
  }
}

/** Parse pasted grocery text into draft lines (qty optional). */
export function parsePastedShoppingLines(text: string): {
  name: string
  quantity?: number
  unit?: string
}[] {
  const lines = text
    .split(/\r?\n|,|;/)
    .map((l) => l.replace(/^[-*•]+\s*/, '').replace(/^\d+[.)]\s+/, '').trim())
    .filter(Boolean)

  const out: { name: string; quantity?: number; unit?: string }[] = []
  for (const line of lines) {
    const m = line.match(
      /^(\d+(?:\.\d+)?)\s*(cups?|tbsp|tsp|lbs?|oz|g|kg|ml|l|pc|x)?\s+(.+)$/i,
    )
    if (m) {
      const quantity = Number(m[1])
      const unitRaw = m[2]?.toLowerCase()
      const name = m[3]!.trim()
      out.push({
        name,
        quantity: Number.isFinite(quantity) ? quantity : undefined,
        unit: unitRaw && unitRaw !== 'x' ? unitRaw : undefined,
      })
      continue
    }
    out.push({ name: line })
  }
  return out
}
