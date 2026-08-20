import { describe, expect, it } from 'vitest'
import {
  applyGlobleGuess,
  bearingDeg,
  buildGlobleHint,
  compassFromBearing,
  findGlobleCountry,
  formatDistanceKm,
  GLOBLE_DEFAULT_HINT_AFTER,
  haversineKm,
  latLonToMapXY,
  mapXYToLatLon,
  nearestGlobleCountry,
  normalizeGlobleQuery,
  proximityFromDistanceKm,
  startGlobleRound,
  suggestGlobleCountries,
} from './globle'
import { GLOBLE_COUNTRIES } from './globleCountries'

describe('globle', () => {
  it('ships a usable country list', () => {
    expect(GLOBLE_COUNTRIES.length).toBeGreaterThan(150)
    expect(findGlobleCountry('United States')?.id).toBe('US')
    expect(findGlobleCountry('usa')?.id).toBe('US')
    expect(findGlobleCountry('uk')?.id).toBe('GB')
  })

  it('normalizes accents for lookup', () => {
    expect(normalizeGlobleQuery("Côte d'Ivoire")).toBe("cote d'ivoire")
    expect(findGlobleCountry('Ivory Coast')?.id).toBe('CI')
  })

  it('suggests prefix matches', () => {
    const hits = suggestGlobleCountries('spa')
    expect(hits.some((c) => c.id === 'ES')).toBe(true)
  })

  it('computes haversine distance roughly', () => {
    const paris = { lat: 48.8566, lon: 2.3522 }
    const nyc = { lat: 40.7128, lon: -74.006 }
    const km = haversineKm(paris, nyc)
    expect(km).toBeGreaterThan(5500)
    expect(km).toBeLessThan(6200)
  })

  it('maps bearing to compass', () => {
    expect(compassFromBearing(0)).toBe('N')
    expect(compassFromBearing(90)).toBe('E')
    expect(compassFromBearing(180)).toBe('S')
    expect(compassFromBearing(270)).toBe('W')
    const bearing = bearingDeg(
      { lat: 0, lon: 0 },
      { lat: 0, lon: 10 },
    )
    expect(compassFromBearing(bearing)).toBe('E')
  })

  it('projects lat/lon onto the flat map', () => {
    expect(latLonToMapXY(0, 0)).toEqual({ x: 0.5, y: 0.5 })
    expect(latLonToMapXY(90, -180).y).toBeCloseTo(0)
    expect(latLonToMapXY(-90, 180).x).toBeCloseTo(1)
  })

  it('maps clicks back to lat/lon and nearest country', () => {
    const mid = mapXYToLatLon(0.5, 0.5)
    expect(mid.lat).toBeCloseTo(0)
    expect(mid.lon).toBeCloseTo(0)
    const france = findGlobleCountry('France')!
    const { x, y } = latLonToMapXY(france.lat, france.lon)
    const { lat, lon } = mapXYToLatLon(x, y)
    expect(nearestGlobleCountry(lat, lon)?.id).toBe('FR')
  })

  it('plays a round until the secret is guessed', () => {
    const france = findGlobleCountry('France')!
    const germany = findGlobleCountry('Germany')!
    let round = startGlobleRound({
      hintAfterWrong: 10,
      random: () => 0,
    })
    round = { ...round, secret: france, guesses: [], hintRevealed: [] }
    round = applyGlobleGuess(round, germany)!
    expect(round.won).toBe(false)
    expect(round.guesses[0]!.distanceKm).toBeGreaterThan(0)
    expect(formatDistanceKm(round.guesses[0]!.distanceKm)).toMatch(/km/)
    expect(proximityFromDistanceKm(0)).toBe(0)
    round = applyGlobleGuess(round, france)!
    expect(round.won).toBe(true)
    expect(applyGlobleGuess(round, germany)).toBeNull()
  })

  it('startGlobleRound picks a country', () => {
    const round = startGlobleRound({ random: () => 0 })
    expect(round.secret.id).toBeTruthy()
    expect(round.guesses).toEqual([])
    expect(round.hintAfterWrong).toBe(GLOBLE_DEFAULT_HINT_AFTER)
  })

  it('shows blanks after the hint threshold, then reveals letters', () => {
    const france = findGlobleCountry('France')!
    const germany = findGlobleCountry('Germany')!
    const spain = findGlobleCountry('Spain')!
    let round = startGlobleRound({ hintAfterWrong: 1, random: () => 0 })
    round = { ...round, secret: france, guesses: [], hintRevealed: [] }

    expect(buildGlobleHint(round)).toBeNull()

    round = applyGlobleGuess(round, germany, () => 0)!
    const blanks = buildGlobleHint(round)!
    expect(blanks.filter((c) => c.kind === 'letter').every((c) => !c.revealed)).toBe(
      true,
    )
    expect(round.hintRevealed).toEqual([])

    round = applyGlobleGuess(round, spain, () => 0)!
    expect(round.hintRevealed.length).toBe(1)
    const hinted = buildGlobleHint(round)!
    const letters = hinted.filter((c) => c.kind === 'letter')
    expect(letters.some((c) => c.revealed)).toBe(true)
    expect(letters.some((c) => !c.revealed)).toBe(true)
  })

  it('hintAfter 0 shows blanks immediately', () => {
    const round = startGlobleRound({ hintAfterWrong: 0, random: () => 0 })
    const hint = buildGlobleHint(round)!
    expect(hint.some((c) => c.kind === 'letter')).toBe(true)
    expect(hint.filter((c) => c.kind === 'letter').every((c) => !c.revealed)).toBe(
      true,
    )
  })
})
