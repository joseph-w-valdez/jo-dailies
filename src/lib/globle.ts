/** Local unlimited Globle — guess the country by distance on a flat map. */

import {
  GLOBLE_COUNTRIES,
  type GlobleCountry,
} from './globleCountries'

export type { GlobleCountry }
export { GLOBLE_COUNTRIES }

const EARTH_RADIUS_KM = 6371

export type CompassDir =
  | 'N'
  | 'NE'
  | 'E'
  | 'SE'
  | 'S'
  | 'SW'
  | 'W'
  | 'NW'

export interface GlobleGuess {
  country: GlobleCountry
  /** Great-circle distance to the secret (km). */
  distanceKm: number
  direction: CompassDir
  /** 0 = exact, 1 = antipodal-ish. */
  proximity: number
}

/** Wrong guesses before the name blanks appear. 0 = blanks from the start. */
export const GLOBLE_DEFAULT_HINT_AFTER = 10
export const GLOBLE_MIN_HINT_AFTER = 0
export const GLOBLE_MAX_HINT_AFTER = 40

export interface GlobleRound {
  secret: GlobleCountry
  guesses: GlobleGuess[]
  won: boolean
  /** Wrong guesses required before blanks (and then letter reveals). */
  hintAfterWrong: number
  /** Character indices in `secret.name` that hints have revealed. */
  hintRevealed: number[]
}

export function clampGlobleHintAfter(value: number): number {
  if (!Number.isFinite(value)) return GLOBLE_DEFAULT_HINT_AFTER
  return Math.min(
    GLOBLE_MAX_HINT_AFTER,
    Math.max(GLOBLE_MIN_HINT_AFTER, Math.floor(value)),
  )
}

/** Letter positions in the country name (spaces/punctuation stay visible). */
export function globleLetterIndices(name: string): number[] {
  const out: number[] = []
  for (let i = 0; i < name.length; i += 1) {
    if (/[a-zA-Z]/.test(name[i]!)) out.push(i)
  }
  return out
}

export type GlobleHintCell =
  | { kind: 'gap'; char: string }
  | { kind: 'letter'; char: string; revealed: boolean }

/** Build hangman-style cells. Returns null before the hint threshold. */
export function buildGlobleHint(
  round: GlobleRound,
): GlobleHintCell[] | null {
  if (round.won) return null
  if (round.guesses.length < round.hintAfterWrong) return null
  const revealed = new Set(round.hintRevealed)
  const cells: GlobleHintCell[] = []
  for (let i = 0; i < round.secret.name.length; i += 1) {
    const ch = round.secret.name[i]!
    if (/[a-zA-Z]/.test(ch)) {
      cells.push({
        kind: 'letter',
        char: ch,
        revealed: revealed.has(i),
      })
    } else {
      cells.push({ kind: 'gap', char: ch })
    }
  }
  return cells
}

function revealOneHintLetter(
  name: string,
  already: readonly number[],
  random: () => number,
): number[] {
  const open = globleLetterIndices(name).filter((i) => !already.includes(i))
  if (open.length === 0) return [...already]
  const pick = open[Math.floor(random() * open.length)]!
  return [...already, pick]
}

export function normalizeGlobleQuery(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function countryKeys(country: GlobleCountry): string[] {
  const keys = [country.name, ...(country.aliases ?? [])]
  return keys.map(normalizeGlobleQuery)
}

export function findGlobleCountry(query: string): GlobleCountry | null {
  const q = normalizeGlobleQuery(query)
  if (!q) return null
  const exact = GLOBLE_COUNTRIES.find((c) => countryKeys(c).includes(q))
  if (exact) return exact
  return null
}

export function suggestGlobleCountries(
  query: string,
  limit = 8,
  excludeIds: ReadonlySet<string> = new Set(),
): GlobleCountry[] {
  const q = normalizeGlobleQuery(query)
  if (!q) return []
  const scored: { country: GlobleCountry; score: number }[] = []
  for (const country of GLOBLE_COUNTRIES) {
    if (excludeIds.has(country.id)) continue
    let best = Infinity
    for (const key of countryKeys(country)) {
      if (key === q) best = Math.min(best, 0)
      else if (key.startsWith(q)) best = Math.min(best, 1)
      else if (key.includes(q)) best = Math.min(best, 2)
    }
    if (best < Infinity) scored.push({ country, score: best })
  }
  scored.sort(
    (a, b) =>
      a.score - b.score || a.country.name.localeCompare(b.country.name),
  )
  return scored.slice(0, limit).map((s) => s.country)
}

/** Inverse of latLonToMapXY — 0–1 image coords → lat/lon. */
export function mapXYToLatLon(
  x: number,
  y: number,
): { lat: number; lon: number } {
  return {
    lon: x * 360 - 180,
    lat: 90 - y * 180,
  }
}

/** Nearest country centroid to a map point (for click-to-guess). */
export function nearestGlobleCountry(
  lat: number,
  lon: number,
  excludeIds: ReadonlySet<string> = new Set(),
): GlobleCountry | null {
  let best: GlobleCountry | null = null
  let bestKm = Infinity
  for (const country of GLOBLE_COUNTRIES) {
    if (excludeIds.has(country.id)) continue
    const km = haversineKm({ lat, lon }, country)
    if (km < bestKm) {
      bestKm = km
      best = country
    }
  }
  return best
}

/** Haversine distance in km. */
export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Initial bearing from a → b, degrees clockwise from north. */
export function bearingDeg(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const φ1 = toRad(a.lat)
  const φ2 = toRad(b.lat)
  const Δλ = toRad(b.lon - a.lon)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const θ = Math.atan2(y, x)
  return ((θ * 180) / Math.PI + 360) % 360
}

export function compassFromBearing(deg: number): CompassDir {
  const dirs: CompassDir[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const idx = Math.round(deg / 45) % 8
  return dirs[idx]!
}

/** 0 at target, ~1 near antipode (~20_000 km). */
export function proximityFromDistanceKm(km: number): number {
  return Math.min(1, Math.max(0, km / 20_000))
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return '0 km'
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km).toLocaleString('en-US')} km`
}

/** Equirectangular project to 0–1 board coords (image space). */
export function latLonToMapXY(
  lat: number,
  lon: number,
): { x: number; y: number } {
  return {
    x: (lon + 180) / 360,
    y: (90 - lat) / 180,
  }
}

export function proximityColor(proximity: number): string {
  // green (close) → yellow → red (far)
  const t = Math.min(1, Math.max(0, proximity))
  const hue = (1 - t) * 120
  return `hsl(${hue} 85% 45%)`
}

/** SVG land fill for default / hover / guessed / revealed secret. */
export function globleCountryFill(opts: {
  proximity: number | null
  hovered: boolean
  correct: boolean
}): string {
  if (opts.correct) return '#22c55e'
  if (opts.proximity != null) return proximityColor(opts.proximity)
  if (opts.hovered) return '#38bdf8'
  return '#334155'
}

export function globleCountryStroke(opts: {
  proximity: number | null
  hovered: boolean
  correct: boolean
}): string {
  if (opts.correct) return '#86efac'
  if (opts.hovered) return '#e0f2fe'
  if (opts.proximity != null) return 'rgba(15,23,42,0.55)'
  return 'rgba(15,23,42,0.65)'
}

export function pickRandomCountry(
  random: () => number = Math.random,
  excludeId?: string,
): GlobleCountry {
  const pool =
    excludeId == null
      ? GLOBLE_COUNTRIES
      : GLOBLE_COUNTRIES.filter((c) => c.id !== excludeId)
  const i = Math.floor(random() * pool.length)
  return pool[i] ?? GLOBLE_COUNTRIES[0]!
}

export function startGlobleRound(opts?: {
  random?: () => number
  excludeId?: string
  hintAfterWrong?: number
}): GlobleRound {
  const random = opts?.random ?? Math.random
  const hintAfterWrong = clampGlobleHintAfter(
    opts?.hintAfterWrong ?? GLOBLE_DEFAULT_HINT_AFTER,
  )
  return {
    secret: pickRandomCountry(random, opts?.excludeId),
    guesses: [],
    won: false,
    hintAfterWrong,
    hintRevealed: [],
  }
}

export function applyGlobleGuess(
  round: GlobleRound,
  country: GlobleCountry,
  random: () => number = Math.random,
): GlobleRound | null {
  if (round.won) return null
  if (round.guesses.some((g) => g.country.id === country.id)) return null
  const distanceKm = haversineKm(country, round.secret)
  const direction = compassFromBearing(bearingDeg(country, round.secret))
  const proximity = proximityFromDistanceKm(distanceKm)
  const guess: GlobleGuess = {
    country,
    distanceKm,
    direction: country.id === round.secret.id ? 'N' : direction,
    proximity: country.id === round.secret.id ? 0 : proximity,
  }
  const guesses = [...round.guesses, guess]
  const won = country.id === round.secret.id
  if (won) {
    return { ...round, guesses, won: true }
  }

  let hintRevealed = round.hintRevealed
  const wrongCount = guesses.length
  // At the threshold: blanks only. Past it: reveal one more letter per miss.
  if (wrongCount > round.hintAfterWrong) {
    hintRevealed = revealOneHintLetter(round.secret.name, hintRevealed, random)
  }

  return { ...round, guesses, won: false, hintRevealed }
}
