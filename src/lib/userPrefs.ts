export type UnitPref = 'us' | 'metric'

export type UserPrefs = {
  units: UnitPref
  updatedAt: number
}

export function defaultUserPrefs(): UserPrefs {
  return { units: 'us', updatedAt: Date.now() }
}

export function normalizeUserPrefs(raw: unknown): UserPrefs {
  if (!raw || typeof raw !== 'object') return defaultUserPrefs()
  const r = raw as Record<string, unknown>
  return {
    units: r.units === 'metric' ? 'metric' : 'us',
    updatedAt:
      typeof r.updatedAt === 'number' && Number.isFinite(r.updatedAt)
        ? r.updatedAt
        : Date.now(),
  }
}
