import { toFirestoreData } from './firebase'
import type { UnitKind } from './units'
import { toCanonical } from './units'

export const MAIN_INGREDIENT_TAGS = [
  'chicken',
  'turkey',
  'beef',
  'pork',
  'lamb',
  'seafood',
  'eggs',
  'tofu',
  'beans',
  'vegetarian',
  'vegan',
  'pasta',
  'noodles',
  'rice',
  'potatoes',
  'bread',
  'soup',
  'salad',
  'other',
] as const

export type MainIngredientTag = (typeof MAIN_INGREDIENT_TAGS)[number]

export const CUISINE_TAGS = [
  'American',
  'Italian',
  'Mexican',
  'Chinese',
  'Japanese',
  'Korean',
  'Thai',
  'Indian',
  'French',
  'Mediterranean',
  'Greek',
  'Middle Eastern',
  'Venezuelan',
  'Other',
] as const

export type CuisineTag = (typeof CUISINE_TAGS)[number]

/** Suggested freeform recipe tags (editor chips; custom tags still allowed). */
export const COMMON_RECIPE_TAGS = [
  'weeknight',
  'meal prep',
  'one pot',
  'one pan',
  'air fryer',
  'instant pot',
  'slow cooker',
  'grill',
  'bake',
  'no cook',
  'comfort food',
  'date night',
  'party',
  'leftovers',
  'freezer friendly',
  'spicy',
  'sweet',
  'healthy',
  'cheap',
  'fancy',
] as const

export type RecipeDifficulty = 'easy' | 'medium' | 'hard'

export type Ingredient = {
  id: string
  name: string
  /** Canonical metric amount (g / ml) or count. */
  amount: number
  /** Canonical unit: g | ml | count label. */
  unit: string
  unitKind: UnitKind
  scalable: boolean
}

export type Recipe = {
  id: string
  title: string
  description?: string
  imageUrl?: string
  storagePath?: string
  cuisine: string
  mainIngredients: MainIngredientTag[]
  /** Freeform labels typed by hand. */
  tags: string[]
  servings: number
  scalingIngredientId?: string
  /** Legacy; no longer edited. */
  difficulty?: RecipeDifficulty
  /** Legacy; no longer edited. */
  prepTime?: number
  /** Freeform, e.g. "45 min" or "1 hour". */
  cookTime?: string
  ingredients: Ingredient[]
  steps: string[]
  favoriteUids: string[]
  cookedCount: number
  lastCookedAt: number | null
  createdAt: number
  updatedAt: number
}

export type RecipeNote = {
  id: string
  authorId: string
  authorName: string
  text: string
  createdAt: number
}

export type CookRating = 'love' | 'okay' | 'bad'

/** Preset chips for logging a cook (plus freeform custom tags). */
export const COOK_TAGS = [
  'spicy',
  'salty',
  'bland',
  'easy',
  'fussy',
  'leftovers good',
  'would remake',
] as const

export type CookingLog = {
  id: string
  cookedBy: string
  date: number
  servings: number
  notes?: string
  /** 0–5 star score for this cook. */
  stars?: number
  /** Legacy mood label; prefer stars. */
  rating?: CookRating
  tags: string[]
}

export function clampCookStars(n: unknown): number | undefined {
  if (typeof n !== 'number' || !Number.isFinite(n)) return undefined
  const s = Math.round(n * 2) / 2
  if (s < 0 || s > 5) return undefined
  return s
}

export function formatCookStars(stars: number): string {
  const s = clampCookStars(stars) ?? 0
  return String(s) + '/5'
}

function clampNum(n: unknown, fallback = 0): number {
  const x = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(x) ? x : fallback
}

export function newRecipeId(): string {
  return crypto.randomUUID()
}

export function newIngredientId(): string {
  return crypto.randomUUID()
}

export function emptyIngredient(): Ingredient {
  return {
    id: newIngredientId(),
    name: '',
    amount: 0,
    unit: 'g',
    unitKind: 'mass',
    scalable: true,
  }
}

export function createEmptyRecipe(): Recipe {
  const now = Date.now()
  return {
    id: newRecipeId(),
    title: '',
    cuisine: '',
    mainIngredients: [],
    tags: [],
    servings: 2,
    ingredients: [emptyIngredient()],
    steps: [''],
    favoriteUids: [],
    cookedCount: 0,
    lastCookedAt: null,
    createdAt: now,
    updatedAt: now,
  }
}

/** Copy a recipe into a new shared doc (clears cook stats / favorites). */
export function duplicateRecipe(source: Recipe): Recipe {
  const now = Date.now()
  const idMap = new Map<string, string>()
  const ingredients = source.ingredients.map((ing) => {
    const id = newIngredientId()
    idMap.set(ing.id, id)
    return { ...ing, id }
  })
  const scalingIngredientId = source.scalingIngredientId
    ? idMap.get(source.scalingIngredientId)
    : undefined
  const copy: Recipe = {
    ...source,
    id: newRecipeId(),
    title: `${source.title} (copy)`,
    ingredients,
    steps: [...source.steps],
    tags: [...(source.tags ?? [])],
    favoriteUids: [],
    cookedCount: 0,
    lastCookedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  if (scalingIngredientId) copy.scalingIngredientId = scalingIngredientId
  else delete copy.scalingIngredientId
  delete copy.imageUrl
  delete copy.storagePath
  return copy
}

const SCALE_STORAGE_PREFIX = 'jo-dailies:recipe-scale:v1:'

export function loadRecipeMultiplier(recipeId: string): number | null {
  try {
    const raw = localStorage.getItem(SCALE_STORAGE_PREFIX + recipeId)
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

export function saveRecipeMultiplier(recipeId: string, multiplier: number) {
  try {
    localStorage.setItem(SCALE_STORAGE_PREFIX + recipeId, String(multiplier))
  } catch {
    /* ignore */
  }
}

const STEP_DONE_STORAGE_PREFIX = 'jo-dailies:recipe-steps-done:v1:'

export function loadRecipeStepsDone(recipeId: string): number[] {
  try {
    const raw = localStorage.getItem(STEP_DONE_STORAGE_PREFIX + recipeId)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0)
  } catch {
    return []
  }
}

export function saveRecipeStepsDone(recipeId: string, indices: number[]) {
  try {
    const unique = [...new Set(indices.filter((n) => Number.isInteger(n) && n >= 0))]
    if (unique.length === 0) {
      localStorage.removeItem(STEP_DONE_STORAGE_PREFIX + recipeId)
      return
    }
    localStorage.setItem(STEP_DONE_STORAGE_PREFIX + recipeId, JSON.stringify(unique))
  } catch {
    /* ignore */
  }
}

function normalizeIngredient(raw: unknown): Ingredient | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const name = typeof r.name === 'string' ? r.name.trim() : ''
  if (!name) return null
  const kind: UnitKind =
    r.unitKind === 'volume' || r.unitKind === 'count' || r.unitKind === 'mass'
      ? r.unitKind
      : 'mass'
  const unitRaw = typeof r.unit === 'string' ? r.unit : kind === 'count' ? 'pc' : kind === 'volume' ? 'ml' : 'g'
  const amountRaw = clampNum(r.amount, 0)
  // Re-canonicalize in case an older client stored display units.
  const canon = toCanonical(amountRaw, unitRaw, kind)
  return {
    id: typeof r.id === 'string' && r.id ? r.id : newIngredientId(),
    name,
    amount: canon.amount,
    unit: kind === 'count' ? (unitRaw.trim() || 'pc') : canon.unit,
    unitKind: kind,
    scalable: r.scalable !== false,
  }
}

export function normalizeRecipe(raw: unknown): Recipe | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = typeof r.id === 'string' ? r.id : ''
  const title = typeof r.title === 'string' ? r.title.trim() : ''
  if (!id || !title) return null

  const ingredients: Ingredient[] = []
  if (Array.isArray(r.ingredients)) {
    for (const row of r.ingredients) {
      const ing = normalizeIngredient(row)
      if (ing) ingredients.push(ing)
    }
  }

  const steps = Array.isArray(r.steps)
    ? r.steps
        .filter((s): s is string => typeof s === 'string')
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  const mainIngredients: MainIngredientTag[] = []
  if (Array.isArray(r.mainIngredients)) {
    for (const tag of r.mainIngredients) {
      if (
        typeof tag === 'string' &&
        (MAIN_INGREDIENT_TAGS as readonly string[]).includes(tag) &&
        !mainIngredients.includes(tag as MainIngredientTag)
      ) {
        mainIngredients.push(tag as MainIngredientTag)
      }
    }
  }

  const tags: string[] = []
  if (Array.isArray(r.tags)) {
    for (const tag of r.tags) {
      if (typeof tag !== 'string') continue
      const t = tag.trim()
      if (!t) continue
      const key = t.toLowerCase()
      if (tags.some((x) => x.toLowerCase() === key)) continue
      tags.push(t)
    }
  }

  const favoriteUids = Array.isArray(r.favoriteUids)
    ? r.favoriteUids.filter((u): u is string => typeof u === 'string')
    : []

  const difficulty =
    r.difficulty === 'easy' || r.difficulty === 'medium' || r.difficulty === 'hard'
      ? r.difficulty
      : undefined

  const recipe: Recipe = {
    id,
    title,
    cuisine: typeof r.cuisine === 'string' ? r.cuisine.trim() : '',
    mainIngredients,
    tags,
    servings: Math.max(1, Math.floor(clampNum(r.servings, 2))),
    ingredients,
    steps,
    favoriteUids,
    cookedCount: Math.max(0, Math.floor(clampNum(r.cookedCount, 0))),
    lastCookedAt:
      typeof r.lastCookedAt === 'number' && Number.isFinite(r.lastCookedAt)
        ? r.lastCookedAt
        : null,
    createdAt: clampNum(r.createdAt, Date.now()),
    updatedAt: clampNum(r.updatedAt, Date.now()),
  }

  if (typeof r.description === 'string' && r.description.trim()) {
    recipe.description = r.description.trim()
  }
  if (typeof r.imageUrl === 'string' && r.imageUrl) recipe.imageUrl = r.imageUrl
  if (typeof r.storagePath === 'string' && r.storagePath) {
    recipe.storagePath = r.storagePath
  }
  if (typeof r.scalingIngredientId === 'string' && r.scalingIngredientId) {
    recipe.scalingIngredientId = r.scalingIngredientId
  }
  if (difficulty) recipe.difficulty = difficulty
  if (typeof r.prepTime === 'number' && r.prepTime > 0) {
    recipe.prepTime = Math.floor(r.prepTime)
  }
  if (typeof r.cookTime === 'string' && r.cookTime.trim()) {
    recipe.cookTime = r.cookTime.trim()
  } else if (typeof r.cookTime === 'number' && r.cookTime > 0) {
    recipe.cookTime = `${Math.floor(r.cookTime)} min`
  }

  return recipe
}

export function recipeToDoc(recipe: Recipe): Record<string, unknown> {
  return toFirestoreData(recipe) as Record<string, unknown>
}

export function normalizeNote(raw: unknown): RecipeNote | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = typeof r.id === 'string' ? r.id : ''
  const text = typeof r.text === 'string' ? r.text.trim() : ''
  const authorId = typeof r.authorId === 'string' ? r.authorId : ''
  if (!id || !text || !authorId) return null
  return {
    id,
    authorId,
    authorName:
      typeof r.authorName === 'string' && r.authorName.trim()
        ? r.authorName.trim()
        : 'Friend',
    text,
    createdAt: clampNum(r.createdAt, Date.now()),
  }
}

export function normalizeCookLog(raw: unknown): CookingLog | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = typeof r.id === 'string' ? r.id : ''
  const cookedBy = typeof r.cookedBy === 'string' ? r.cookedBy : ''
  if (!id || !cookedBy) return null

  const tags: string[] = []
  if (Array.isArray(r.tags)) {
    for (const tag of r.tags) {
      if (typeof tag !== 'string') continue
      const t = tag.trim()
      if (!t) continue
      const key = t.toLowerCase()
      if (tags.some((x) => x.toLowerCase() === key)) continue
      tags.push(t)
    }
  }

  let rating: CookRating | undefined
  if (r.rating === 'love' || r.rating === 'okay' || r.rating === 'bad') {
    rating = r.rating
  }

  let stars = clampCookStars(r.stars)
  if (stars == null && rating) {
    stars = rating === 'love' ? 5 : rating === 'okay' ? 3 : 1
  }

  const log: CookingLog = {
    id,
    cookedBy,
    date: clampNum(r.date, Date.now()),
    servings: Math.max(1, Math.floor(clampNum(r.servings, 1))),
    tags,
  }
  if (typeof r.notes === 'string' && r.notes.trim()) log.notes = r.notes.trim()
  if (stars != null) log.stars = stars
  if (rating) log.rating = rating
  return log
}

export function normalizeNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

const STEP_PREFIX =
  /^(?:step\s*)?(?:\d+[.)\]:]|\d+\s*[-–—]|[-*•–—]+)\s+/i

/** Strip leading list markers: 1. 1) Step 1: - * • — */
export function stripStepPrefix(line: string): string {
  let s = line.trim()
  // Repeat once for "Step 1." style after a bullet edge case
  for (let i = 0; i < 2; i += 1) {
    const next = s.replace(STEP_PREFIX, '').trim()
    if (next === s) break
    s = next
  }
  return s
}

/**
 * Split pasted recipe instructions into steps.
 * Handles newlines, numbered lists, bullets/hyphens, and sentence runs.
 */
export function parseRecipeSteps(text: string): string[] {
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!raw) return []

  // Newlines first — one instruction per line (with markers stripped)
  const lines = raw
    .split('\n')
    .map((l) => stripStepPrefix(l))
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length >= 2) {
    return lines.map((l) => l.replace(/\s+/g, ' '))
  }

  const blob = lines[0] ?? stripStepPrefix(raw)

  // Inline numbered list: "1. … 2. … 3. …"
  const numbered = blob.match(/(?:^|\s)(?:step\s*)?\d+[.)\]]\s+/gi)
  if (numbered && numbered.length >= 2) {
    const parts = blob
      .split(/(?:^|\s+)(?=(?:step\s*)?\d+[.)\]]\s+)/i)
      .map(stripStepPrefix)
      .map((s) => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
    if (parts.length >= 2) return parts
  }

  // Mid-line bullet / hyphen separators
  if (/(\s[-*•–—]\s)/.test(blob)) {
    const byBullet = blob
      .split(/\s[-*•–—]\s/)
      .map((s) => stripStepPrefix(s).replace(/\s+/g, ' ').trim())
      .filter(Boolean)
    if (byBullet.length >= 2) return byBullet
  }

  // Sentence split for a pasted paragraph
  const sentences = blob
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (sentences.length >= 2) {
    return sentences.map((s) => s.replace(/\s+/g, ' '))
  }

  return blob ? [blob.replace(/\s+/g, ' ')] : []
}

const UNICODE_FRAC: Record<string, number> = {
  '¼': 0.25,
  '½': 0.5,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
}

const UNIT_DEFS: { re: RegExp; unit: string; unitKind: UnitKind }[] = [
  { re: /^(tablespoons?|tbsps?|tbs)\b/i, unit: 'tbsp', unitKind: 'volume' },
  { re: /^(teaspoons?|tsps?)\b/i, unit: 'tsp', unitKind: 'volume' },
  { re: /^(cups?)\b/i, unit: 'cup', unitKind: 'volume' },
  { re: /^(fl\.?\s*oz|fluid\s*ounces?)\b/i, unit: 'fl oz', unitKind: 'volume' },
  { re: /^(millilitr?es?|mls?)\b/i, unit: 'ml', unitKind: 'volume' },
  { re: /^(liters?|litres?|l)\b/i, unit: 'L', unitKind: 'volume' },
  { re: /^(pounds?|lbs?)\b/i, unit: 'lb', unitKind: 'mass' },
  { re: /^(ounces?|ozs?)\b/i, unit: 'oz', unitKind: 'mass' },
  { re: /^(kilograms?|kgs?)\b/i, unit: 'kg', unitKind: 'mass' },
  { re: /^(grams?|gs?)\b/i, unit: 'g', unitKind: 'mass' },
  { re: /^(cloves?)\b/i, unit: 'clove', unitKind: 'count' },
  { re: /^(slices?)\b/i, unit: 'slice', unitKind: 'count' },
  { re: /^(bunches?)\b/i, unit: 'bunch', unitKind: 'count' },
  { re: /^(cans?)\b/i, unit: 'can', unitKind: 'count' },
  { re: /^(packages?|pkgs?)\b/i, unit: 'package', unitKind: 'count' },
  { re: /^(pcs?|pieces?|whole)\b/i, unit: 'pc', unitKind: 'count' },
]

export type ParsedIngredientLine = {
  name: string
  amount: number
  unit: string
  unitKind: UnitKind
  scalable: boolean
}

function parseLeadingAmount(s: string): { amount: number; rest: string } | null {
  let t = s.trim().replace(/^[~≈]+\s*/, '')

  // Range: 1–2 or 1-2 → use first value
  const range = t.match(
    /^(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞]|\d+\/\d+)\s*[–—-]\s*(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞]|\d+\/\d+)(?=\s|$)/,
  )
  if (range) {
    const first = parseAmountToken(range[1]!)
    if (first != null) {
      return { amount: first, rest: t.slice(range[0].length).trim() }
    }
  }

  // Mixed unicode: 1½
  const mixedUni = t.match(/^(\d+)\s*([¼½¾⅓⅔⅛⅜⅝⅞])(?=\s|$)/)
  if (mixedUni) {
    const whole = Number(mixedUni[1])
    const frac = UNICODE_FRAC[mixedUni[2]!] ?? 0
    return {
      amount: whole + frac,
      rest: t.slice(mixedUni[0].length).trim(),
    }
  }

  // Mixed ascii: 1 1/2
  const mixedAscii = t.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)(?=\s|$)/)
  if (mixedAscii) {
    const whole = Number(mixedAscii[1])
    const num = Number(mixedAscii[2])
    const den = Number(mixedAscii[3])
    if (den) {
      return {
        amount: whole + num / den,
        rest: t.slice(mixedAscii[0].length).trim(),
      }
    }
  }

  // Unicode fraction alone
  const uni = t.match(/^([¼½¾⅓⅔⅛⅜⅝⅞])(?=\s|$)/)
  if (uni) {
    return {
      amount: UNICODE_FRAC[uni[1]!] ?? 0,
      rest: t.slice(uni[0].length).trim(),
    }
  }

  // Ascii fraction: 1/2
  const asciiFrac = t.match(/^(\d+)\s*\/\s*(\d+)(?=\s|$)/)
  if (asciiFrac) {
    const den = Number(asciiFrac[2])
    if (den) {
      return {
        amount: Number(asciiFrac[1]) / den,
        rest: t.slice(asciiFrac[0].length).trim(),
      }
    }
  }

  // Decimal / integer
  const plain = t.match(/^(\d+(?:\.\d+)?)(?=\s|$)/)
  if (plain) {
    return {
      amount: Number(plain[1]),
      rest: t.slice(plain[0].length).trim(),
    }
  }

  return null
}

function parseAmountToken(token: string): number | null {
  const t = token.trim()
  if (UNICODE_FRAC[t] != null) return UNICODE_FRAC[t]!
  const mixed = t.match(/^(\d+)\s*([¼½¾⅓⅔⅛⅜⅝⅞])$/)
  if (mixed) return Number(mixed[1]) + (UNICODE_FRAC[mixed[2]!] ?? 0)
  const ascii = t.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (ascii && Number(ascii[2])) return Number(ascii[1]) / Number(ascii[2])
  const mixedAscii = t.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/)
  if (mixedAscii && Number(mixedAscii[3])) {
    return Number(mixedAscii[1]) + Number(mixedAscii[2]) / Number(mixedAscii[3])
  }
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function matchUnit(
  s: string,
): { unit: string; unitKind: UnitKind; rest: string } | null {
  const t = s.trim()
  for (const def of UNIT_DEFS) {
    const m = t.match(def.re)
    if (m) {
      return {
        unit: def.unit,
        unitKind: def.unitKind,
        rest: t.slice(m[0].length).trim(),
      }
    }
  }
  return null
}

/** Parse one ingredient line into structured fields. */
export function parseIngredientLine(line: string): ParsedIngredientLine | null {
  let s = line
    .trim()
    .replace(/^[-*•–—]+\s*/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/\s+/g, ' ')
  if (!s) return null

  // Drop trailing emoji / fluff
  s = s.replace(/[\u{1F300}-\u{1FAFF}]+$/u, '').trim()

  let optional = false
  const opt = s.match(/^optional\s*[:\-–—]\s*(.+)$/i)
  if (opt) {
    optional = true
    s = opt[1]!.trim()
  }

  const amt = parseLeadingAmount(s)
  let amount = 1
  let rest = s
  if (amt) {
    amount = amt.amount
    rest = amt.rest
  }

  const unitHit = matchUnit(rest)
  let unit = 'pc'
  let unitKind: UnitKind = 'count'
  let name = rest
  if (unitHit && unitHit.rest) {
    unit = unitHit.unit
    unitKind = unitHit.unitKind
    name = unitHit.rest
  } else if (unitHit && !unitHit.rest) {
    // "1 tbsp" with no name — skip
    return null
  } else if (amt) {
    // "1 pork chop" / "1 minced garlic clove"
    const trailing = matchUnit(name.split(/\s+/).slice(-1).join(' '))
    if (trailing && name.toLowerCase().endsWith(trailing.unit === 'pc' ? '' : trailing.unit)) {
      // If last word is a count unit like clove
      const words = name.split(/\s+/)
      const last = words[words.length - 1] ?? ''
      const lastUnit = matchUnit(last)
      if (lastUnit && lastUnit.unitKind === 'count' && !lastUnit.rest) {
        unit = lastUnit.unit
        unitKind = 'count'
        name = words.slice(0, -1).join(' ').trim() || last
      }
    }
  } else {
    // Bare name: "salt"
    amount = 1
    unit = 'pc'
    unitKind = 'count'
  }

  name = name.replace(/^of\s+/i, '').trim()
  if (!name) return null
  if (optional && !/\boptional\b/i.test(name)) {
    name = `${name} (optional)`
  }

  return {
    name,
    amount,
    unit,
    unitKind,
    scalable: unitKind !== 'count' || amount > 0,
  }
}

function splitIngredientChunks(text: string): string[] {
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!raw) return []

  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const out: string[] = []
  for (const line of lines) {
    // Don't split ranges like 1–2; split comma lists without amounts carefully
    if (
      /,/.test(line) &&
      !parseLeadingAmount(line.replace(/^[-*•–—]+\s*/, '').replace(/^optional\s*[:\-–—]\s*/i, ''))
    ) {
      for (const part of line.split(',')) {
        const p = part.trim()
        if (p) out.push(p)
      }
      continue
    }
    // Mid-line bullets (not numeric ranges)
    if (/\s[-*•]\s/.test(line) && !/\d\s*[-–—]\s*\d/.test(line)) {
      for (const part of line.split(/\s[-*•]\s/)) {
        const p = part.trim()
        if (p) out.push(p)
      }
      continue
    }
    out.push(line)
  }
  return out
}

/** Parse a pasted ingredient list into structured rows. */
export function parseRecipeIngredients(text: string): ParsedIngredientLine[] {
  const chunks = splitIngredientChunks(text)
  const out: ParsedIngredientLine[] = []
  for (const chunk of chunks) {
    const row = parseIngredientLine(chunk)
    if (row) out.push(row)
  }
  return out
}

function looksLikeIngredientLine(line: string): boolean {
  const s = line.trim()
  if (!s || s.length > 120) return false
  if (/^optional\s*[:\-–—]/i.test(s)) return true
  if (/^[~≈]/.test(s)) return true
  if (/^[-*•–—]\s*\S/.test(s)) return true
  if (parseLeadingAmount(s.replace(/^[-*•–—]+\s*/, ''))) return true
  // Short bare pantry names
  if (s.length <= 40 && !/[.!?]$/.test(s) && s.split(/\s+/).length <= 6) {
    return true
  }
  return false
}

function looksLikeStepLine(line: string): boolean {
  const s = line.trim()
  if (!s) return false
  if (s.length > 90) return true
  if (/[.!?]$/.test(s) && s.split(/\s+/).length >= 6) return true
  if (
    /\b(heat|cook|flip|season|preheat|pat|add|stir|rest|pull|check|lower|tilt|spoon)\b/i.test(
      s,
    ) &&
    !parseLeadingAmount(s)
  ) {
    return true
  }
  return false
}

/**
 * Split a multi-block paste into ingredients + steps.
 * Blank lines, or line classification, separate the sections.
 */
export function parseRecipePaste(text: string): {
  ingredients: ParsedIngredientLine[]
  steps: string[]
} {
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!raw) return { ingredients: [], steps: [] }

  const blocks = raw
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)

  if (blocks.length >= 2) {
    // Prefer: first ingredient-heavy block(s), rest steps
    let splitAt = -1
    for (let i = 0; i < blocks.length; i += 1) {
      const lines = blocks[i]!.split('\n').map((l) => l.trim()).filter(Boolean)
      const ingScore = lines.filter(looksLikeIngredientLine).length
      const stepScore = lines.filter(looksLikeStepLine).length
      if (ingScore >= stepScore && ingScore > 0) {
        splitAt = i
      } else if (stepScore > ingScore && splitAt >= 0) {
        break
      } else if (stepScore > ingScore && splitAt < 0) {
        // starts with steps — treat all as steps
        return { ingredients: [], steps: parseRecipeSteps(raw) }
      }
    }
    if (splitAt >= 0) {
      const ingText = blocks.slice(0, splitAt + 1).join('\n')
      const stepText = blocks.slice(splitAt + 1).join('\n\n')
      return {
        ingredients: parseRecipeIngredients(ingText),
        steps: stepText ? parseRecipeSteps(stepText) : [],
      }
    }
  }

  // Single block: classify line-by-line
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
  const ingLines: string[] = []
  const stepLines: string[] = []
  for (const line of lines) {
    if (looksLikeIngredientLine(line) && !looksLikeStepLine(line)) {
      ingLines.push(line)
    } else if (looksLikeStepLine(line)) {
      stepLines.push(line)
    } else if (ingLines.length > 0 && stepLines.length === 0) {
      ingLines.push(line)
    } else {
      stepLines.push(line)
    }
  }

  if (ingLines.length > 0 && stepLines.length > 0) {
    return {
      ingredients: parseRecipeIngredients(ingLines.join('\n')),
      steps: parseRecipeSteps(stepLines.join('\n')),
    }
  }
  if (ingLines.length > 0) {
    return { ingredients: parseRecipeIngredients(ingLines.join('\n')), steps: [] }
  }
  return { ingredients: [], steps: parseRecipeSteps(raw) }
}

export type RecipeSort =
  | 'newest'
  | 'name'
  | 'recentlyMade'
  | 'mostCooked'

export type FavoriteFilter = 'all' | 'joseph' | 'joha' | 'both'

export function sortRecipes(list: Recipe[], sort: RecipeSort): Recipe[] {
  const next = [...list]
  switch (sort) {
    case 'name':
      return next.sort((a, b) => a.title.localeCompare(b.title))
    case 'recentlyMade':
      return next.sort(
        (a, b) => (b.lastCookedAt ?? 0) - (a.lastCookedAt ?? 0),
      )
    case 'mostCooked':
      return next.sort((a, b) => b.cookedCount - a.cookedCount)
    case 'newest':
    default:
      return next.sort((a, b) => b.createdAt - a.createdAt)
  }
}
