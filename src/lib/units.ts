/** Canonical storage is metric (g / ml) + count. Convert only for display/edit. */

export type UnitSystem = 'us' | 'metric'
export type UnitKind = 'mass' | 'volume' | 'count'

const TBSP_ML = 15
const TSP_ML = 5
const CUP_ML = 240
const FLOZ_ML = 29.5735
const LB_G = 453.592
const OZ_G = 28.3495

export type DisplayAmount = {
  amount: number
  unit: string
}

function clampNum(n: unknown, fallback = 0): number {
  const x = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(x) ? x : fallback
}

/** Convert an entered amount+unit into canonical metric (g / ml) or count. */
export function toCanonical(
  amount: number,
  unit: string,
  kind: UnitKind,
): DisplayAmount {
  const a = Math.max(0, clampNum(amount))
  const u = unit.trim().toLowerCase()

  if (kind === 'count') {
    return { amount: a, unit: unit.trim() || 'pc' }
  }

  if (kind === 'mass') {
    if (u === 'kg') return { amount: a * 1000, unit: 'g' }
    if (u === 'lb' || u === 'lbs') return { amount: a * LB_G, unit: 'g' }
    if (u === 'oz') return { amount: a * OZ_G, unit: 'g' }
    return { amount: a, unit: 'g' }
  }

  // volume → ml
  if (u === 'l' || u === 'liter' || u === 'litre') return { amount: a * 1000, unit: 'ml' }
  if (u === 'cup' || u === 'cups') return { amount: a * CUP_ML, unit: 'ml' }
  if (u === 'tbsp' || u === 'tbs' || u === 'tablespoon') {
    return { amount: a * TBSP_ML, unit: 'ml' }
  }
  if (u === 'tsp' || u === 'teaspoon') return { amount: a * TSP_ML, unit: 'ml' }
  if (u === 'fl oz' || u === 'floz') return { amount: a * FLOZ_ML, unit: 'ml' }
  return { amount: a, unit: 'ml' }
}

/** Pick a friendly display unit for canonical g/ml in the given system. */
export function fromCanonical(
  canonicalAmount: number,
  kind: UnitKind,
  system: UnitSystem,
  countUnit = 'pc',
): DisplayAmount {
  const a = Math.max(0, clampNum(canonicalAmount))

  if (kind === 'count') {
    return { amount: a, unit: countUnit || 'pc' }
  }

  if (kind === 'mass') {
    if (system === 'metric') {
      if (a >= 1000) return { amount: a / 1000, unit: 'kg' }
      return { amount: a, unit: 'g' }
    }
    const lb = a / LB_G
    if (lb >= 1) return { amount: lb, unit: 'lb' }
    return { amount: a / OZ_G, unit: 'oz' }
  }

  // volume
  if (system === 'metric') {
    if (a >= 1000) return { amount: a / 1000, unit: 'L' }
    return { amount: a, unit: 'ml' }
  }
  const cups = a / CUP_ML
  if (cups >= 0.25) return { amount: cups, unit: 'cup' }
  const tbsp = a / TBSP_ML
  if (tbsp >= 1) return { amount: tbsp, unit: 'tbsp' }
  return { amount: a / TSP_ML, unit: 'tsp' }
}

export function scaleAmount(
  amount: number,
  scalable: boolean,
  multiplier: number,
): number {
  if (!scalable) return amount
  return amount * Math.max(0, multiplier)
}

const US_FRACTIONS: { v: number; s: string }[] = [
  { v: 0.125, s: '⅛' },
  { v: 0.25, s: '¼' },
  { v: 0.333, s: '⅓' },
  { v: 0.5, s: '½' },
  { v: 0.666, s: '⅔' },
  { v: 0.75, s: '¾' },
]

function formatUsFraction(amount: number): string {
  const whole = Math.floor(amount)
  const frac = amount - whole
  if (frac < 0.04) return String(whole || 0)
  let best = US_FRACTIONS[0]!
  let bestDiff = Math.abs(frac - best.v)
  for (const f of US_FRACTIONS) {
    const d = Math.abs(frac - f.v)
    if (d < bestDiff) {
      best = f
      bestDiff = d
    }
  }
  if (bestDiff > 0.06) {
    return amount >= 10 ? amount.toFixed(0) : amount.toFixed(1).replace(/\.0$/, '')
  }
  if (whole === 0) return best.s
  return `${whole}${best.s}`
}

/** Human-readable amount for lists / shopping. */
export function formatDisplayAmount(
  amount: number,
  unit: string,
  kind: UnitKind,
  system: UnitSystem,
): string {
  const a = Math.max(0, clampNum(amount))
  if (kind === 'count') {
    const n = Math.round(a)
    const u = unit.trim().toLowerCase()
    if (!u || u === 'pc' || u === 'pcs' || u === 'piece' || u === 'pieces') {
      return String(n)
    }
    return `${n} ${unit}`.trim()
  }

  const u = unit.toLowerCase()
  const useFraction =
    system === 'us' && (u === 'cup' || u === 'tbsp' || u === 'tsp')

  let num: string
  if (useFraction) {
    num = formatUsFraction(a)
  } else if (kind === 'volume' && a < 10) {
    num = a.toFixed(1).replace(/\.0$/, '')
  } else if (a >= 100) {
    num = a.toFixed(0)
  } else {
    num = a.toFixed(1).replace(/\.0$/, '')
  }

  return `${num} ${unit}`.trim()
}

/** Units offered in the editor dropdown for a kind. */
export function editorUnitsForKind(kind: UnitKind): string[] {
  if (kind === 'mass') return ['g', 'kg', 'lb', 'oz']
  if (kind === 'volume') return ['ml', 'L', 'cup', 'tbsp', 'tsp', 'fl oz']
  return ['pc', 'clove', 'slice', 'bunch', 'can', 'package']
}
