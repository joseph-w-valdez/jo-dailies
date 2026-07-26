/**
 * Shared app calendar — America/Los_Angeles (Pacific).
 * Day keys, dailies, pets, and midnight rollover all use this zone so two
 * people in different timezones never disagree about "today".
 */
export const APP_TIME_ZONE = 'America/Los_Angeles'

export interface AppTimeParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const pacificFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** Wall-clock parts in the app timezone for an instant. */
export function appTimeParts(now = new Date()): AppTimeParts {
  const parts = pacificFormatter.formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((part) => part.type === type)?.value
    return Number(value)
  }
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

/** YYYY-MM-DD from numeric calendar parts (no timezone conversion). */
export function calendarKey(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

/** Pacific YYYY-MM-DD for this instant — never use toISOString() (UTC shift). */
export function toKey(date: Date): string {
  const { year, month, day } = appTimeParts(date)
  return calendarKey(year, month - 1, day)
}

export function todayKey(now = new Date()): string {
  return toKey(now)
}

/** Fractional Pacific hour (e.g. 14.5 = 2:30pm PT) for sky / greetings. */
export function appHour(now = new Date()): number {
  const { hour, minute } = appTimeParts(now)
  return hour + minute / 60
}

/**
 * Offset (ms) to add to a UTC timestamp so that formatting in `timeZone`
 * matches formatting that timestamp as if it were UTC wall time.
 * Used to convert a Pacific wall time → real UTC instant.
 */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const parts = Object.fromEntries(
    dtf
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )
  return asUtc - date.getTime()
}

/** UTC ms for a wall-clock time in the given IANA zone (handles PST/PDT). */
function zonedWallTimeToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): number {
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute, second)
  // Two passes so DST boundaries land on the right side.
  const once = wallAsUtc - timeZoneOffsetMs(new Date(wallAsUtc), timeZone)
  return wallAsUtc - timeZoneOffsetMs(new Date(once), timeZone)
}

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  delta: number,
): { year: number; month: number; day: number } {
  // Noon UTC avoids DST edge cases when stepping calendar days.
  const utc = new Date(Date.UTC(year, month - 1, day + delta, 12, 0, 0))
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  }
}

/**
 * Parse a YYYY-MM-DD key into a Date at local noon of that calendar day.
 * Used for labels and day-diff math — the key itself is the identity.
 */
export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0)
}

export function addDays(date: Date, delta: number): Date {
  const next = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + delta,
    12,
    0,
    0,
    0,
  )
  return next
}

export function addDaysKey(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const next = addCalendarDays(y!, m!, d!, delta)
  return calendarKey(next.year, next.month - 1, next.day)
}

/** Whole Pacific calendar days from today until dateKey (negative if past). */
export function daysUntil(dateKey: string, now = new Date()): number {
  const target = parseKey(dateKey)
  const today = parseKey(todayKey(now))
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

/** Milliseconds until the next Pacific midnight (clamped to at least 1s). */
export function msUntilNextAppMidnight(now = new Date()): number {
  const { year, month, day } = appTimeParts(now)
  const next = addCalendarDays(year, month, day, 1)
  const nextMidnight = zonedWallTimeToUtcMs(
    next.year,
    next.month,
    next.day,
    0,
    0,
    0,
    APP_TIME_ZONE,
  )
  return Math.max(1000, nextMidnight - now.getTime())
}

/** @deprecated Alias — midnight is Pacific, not the browser's local zone. */
export const msUntilNextLocalMidnight = msUntilNextAppMidnight

/** Sunday-start month grid of calendar date keys (null = padding cell). */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startPad = first.getDay() // 0 = Sunday
  const cells: (string | null)[] = []

  for (let i = 0; i < startPad; i++) {
    cells.push(null)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(calendarKey(year, month, day))
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
