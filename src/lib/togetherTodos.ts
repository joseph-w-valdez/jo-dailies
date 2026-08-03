export interface TogetherTodo {
  id: string
  text: string
  done: boolean
  order: number
  createdAt: number
}

interface TogetherTodoStore {
  version: 1
  items: TogetherTodo[]
}

export const TOGETHER_TODOS_KEY = 'jo-dailies:together-todos:v1'

export function normalizeTogetherTodo(
  raw: unknown,
  fallbackOrder = 0,
): TogetherTodo | null {
  if (!raw || typeof raw !== 'object') return null
  const i = raw as Record<string, unknown>
  if (typeof i.id !== 'string' || typeof i.text !== 'string') return null
  const text = i.text.trim()
  if (!text) return null
  const order =
    typeof i.order === 'number' && Number.isFinite(i.order)
      ? i.order
      : fallbackOrder
  const createdAt =
    typeof i.createdAt === 'number' && Number.isFinite(i.createdAt)
      ? i.createdAt
      : Date.now()
  return {
    id: i.id,
    text,
    done: i.done === true,
    order,
    createdAt,
  }
}

export function loadTogetherTodos(): TogetherTodo[] {
  try {
    const raw = localStorage.getItem(TOGETHER_TODOS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return []
    const items = (parsed as { items?: unknown }).items
    if (!Array.isArray(items)) return []
    return items
      .map((item, index) => normalizeTogetherTodo(item, index * 1024))
      .filter((item): item is TogetherTodo => item !== null)
  } catch {
    return []
  }
}

export function saveTogetherTodos(items: TogetherTodo[]): void {
  try {
    const store: TogetherTodoStore = { version: 1, items }
    localStorage.setItem(TOGETHER_TODOS_KEY, JSON.stringify(store))
  } catch {
    /* ignore quota / private mode */
  }
}

export function newTogetherTodoId(): string {
  return `tt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

/** Open items first, then by order ascending. */
export function sortTogetherTodos(items: TogetherTodo[]): TogetherTodo[] {
  return [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    return a.order - b.order
  })
}
