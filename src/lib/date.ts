/** Local YYYY-MM-DD — never use toISOString() (UTC shift). */
export function toKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayKey(now = new Date()): string {
  return toKey(now)
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date: Date, delta: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() + delta)
  return next
}

export function addDaysKey(key: string, delta: number): string {
  return toKey(addDays(parseKey(key), delta))
}

/** Whole local calendar days from today until dateKey (negative if past). */
export function daysUntil(dateKey: string, now = new Date()): number {
  const target = parseKey(dateKey)
  const today = parseKey(todayKey(now))
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

/** Milliseconds until the next local midnight (clamped to at least 1s). */
export function msUntilNextLocalMidnight(now = new Date()): number {
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  )
  return Math.max(1000, next.getTime() - now.getTime())
}

/** Sunday-start month grid of local date keys (null = padding cell). */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startPad = first.getDay() // 0 = Sunday
  const cells: (string | null)[] = []

  for (let i = 0; i < startPad; i++) {
    cells.push(null)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(toKey(new Date(year, month, day)))
  }

  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  return cells
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}
