import { toFirestoreData } from './firebase'

export const SHOPPING_CATEGORIES = [
  'meat',
  'produce',
  'pantry',
  'dairy',
  'frozen',
  'household',
  'pet',
  'personal',
  'other',
] as const

export type ShoppingCategory = (typeof SHOPPING_CATEGORIES)[number]

export const SHOPPING_CATEGORY_LABELS: Record<ShoppingCategory, string> = {
  meat: 'Meat',
  produce: 'Produce',
  pantry: 'Pantry',
  dairy: 'Dairy',
  frozen: 'Frozen',
  household: 'Household',
  pet: 'Pet Supplies',
  personal: 'Personal Care',
  other: 'Other',
}

export type ShoppingSource = 'manual' | 'recipe' | 'scanner'

export type ShoppingItem = {
  id: string
  name: string
  quantity?: number
  unit?: string
  category: ShoppingCategory
  completed: boolean
  completedAt?: number
  /** Buy-soon / pin to top of open list. */
  pinned?: boolean
  addedBy: string
  source: ShoppingSource
  sourceRecipeId?: string
  createdAt: number
}

function clampNum(n: unknown, fallback = 0): number {
  const x = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(x) ? x : fallback
}

export function newShoppingItemId(): string {
  return crypto.randomUUID()
}

export function normalizeShoppingName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function normalizeShoppingItem(raw: unknown): ShoppingItem | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = typeof r.id === 'string' ? r.id : ''
  const name = typeof r.name === 'string' ? r.name.trim() : ''
  if (!id || !name) return null

  const category =
    typeof r.category === 'string' &&
    (SHOPPING_CATEGORIES as readonly string[]).includes(r.category)
      ? (r.category as ShoppingCategory)
      : 'other'

  const source: ShoppingSource =
    r.source === 'recipe' || r.source === 'scanner' || r.source === 'manual'
      ? r.source
      : 'manual'

  const item: ShoppingItem = {
    id,
    name,
    category,
    completed: Boolean(r.completed),
    addedBy: typeof r.addedBy === 'string' ? r.addedBy : '',
    source,
    createdAt: clampNum(r.createdAt, Date.now()),
  }

  if (typeof r.quantity === 'number' && Number.isFinite(r.quantity) && r.quantity > 0) {
    item.quantity = r.quantity
  }
  if (typeof r.unit === 'string' && r.unit.trim()) item.unit = r.unit.trim()
  if (typeof r.completedAt === 'number' && Number.isFinite(r.completedAt)) {
    item.completedAt = r.completedAt
  }
  if (typeof r.sourceRecipeId === 'string' && r.sourceRecipeId) {
    item.sourceRecipeId = r.sourceRecipeId
  }
  if (r.pinned === true) item.pinned = true

  return item
}

export function shoppingItemToDoc(item: ShoppingItem): Record<string, unknown> {
  return toFirestoreData(item) as Record<string, unknown>
}

/** Guess a category from an ingredient name (best-effort for recipe → list). */
export function guessShoppingCategory(name: string): ShoppingCategory {
  const n = normalizeShoppingName(name)
  if (
    /\b(chicken|beef|pork|turkey|lamb|bacon|sausage|steak|ground|meat|shrimp|fish|salmon)\b/.test(
      n,
    )
  ) {
    return 'meat'
  }
  if (
    /\b(milk|cream|butter|cheese|yogurt|egg|eggs)\b/.test(n)
  ) {
    return 'dairy'
  }
  if (
    /\b(frozen|ice cream)\b/.test(n)
  ) {
    return 'frozen'
  }
  if (
    /\b(onion|garlic|tomato|lettuce|spinach|carrot|potato|lemon|lime|pepper|cilantro|parsley|fruit|apple|banana|berry|avocado|celery|cucumber|ginger|herb|basil)\b/.test(
      n,
    )
  ) {
    return 'produce'
  }
  if (
    /\b(soap|shampoo|toothpaste|deodorant)\b/.test(n)
  ) {
    return 'personal'
  }
  if (
    /\b(paper towel|trash|cleaner|detergent|foil|wrap)\b/.test(n)
  ) {
    return 'household'
  }
  if (/\b(cat|dog|litter|pet)\b/.test(n)) return 'pet'
  return 'pantry'
}

export function groupShoppingItems(items: ShoppingItem[]): {
  pinned: ShoppingItem[]
  open: Record<ShoppingCategory, ShoppingItem[]>
  done: ShoppingItem[]
} {
  const open = Object.fromEntries(
    SHOPPING_CATEGORIES.map((c) => [c, [] as ShoppingItem[]]),
  ) as Record<ShoppingCategory, ShoppingItem[]>
  const pinned: ShoppingItem[] = []
  const done: ShoppingItem[] = []

  for (const item of items) {
    if (item.completed) {
      done.push(item)
      continue
    }
    if (item.pinned) {
      pinned.push(item)
      continue
    }
    open[item.category].push(item)
  }

  pinned.sort((a, b) => a.createdAt - b.createdAt)
  for (const cat of SHOPPING_CATEGORIES) {
    open[cat].sort((a, b) => a.createdAt - b.createdAt)
  }
  done.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))

  return { pinned, open, done }
}
