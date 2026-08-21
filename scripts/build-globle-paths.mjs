/**
 * Build equirectangular SVG path strings for Globle country fills.
 * Run: node scripts/build-globle-paths.mjs
 */
import fs from 'node:fs'
import { feature } from 'topojson-client'
import { geoEquirectangular, geoPath } from 'd3-geo'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const topo = JSON.parse(
  fs.readFileSync('scripts/data/countries-110m.json', 'utf8'),
)
const isoSlim = JSON.parse(
  fs.readFileSync('scripts/data/iso-slim.json', 'utf8'),
)

/** Numeric ISO → alpha-2 (our Globle ids). */
const numericToAlpha2 = new Map()
for (const row of isoSlim) {
  const n = String(Number(row['country-code']))
  numericToAlpha2.set(n, row['alpha-2'])
  numericToAlpha2.set(row['country-code'], row['alpha-2'])
}

// world-atlas France includes overseas departments in one MultiPolygon.
// We list French Guiana (GF) separately for guessing — split it out of FR.
function partitionFrance(featureGeom) {
  if (featureGeom?.type !== 'MultiPolygon') {
    return { FR: featureGeom }
  }
  const frPolys = []
  const gfPolys = []
  for (const poly of featureGeom.coordinates) {
    const ring = poly[0]
    if (!ring?.length) continue
    let sx = 0
    let sy = 0
    for (const [lon, lat] of ring) {
      sx += lon
      sy += lat
    }
    const lon = sx / ring.length
    const lat = sy / ring.length
    // French Guiana sits on the NE coast of South America.
    if (lon < -30 && lat > -5 && lat < 15) gfPolys.push(poly)
    else frPolys.push(poly)
  }
  const out = {}
  if (frPolys.length === 1) out.FR = { type: 'Polygon', coordinates: frPolys[0] }
  else if (frPolys.length > 1)
    out.FR = { type: 'MultiPolygon', coordinates: frPolys }
  if (gfPolys.length === 1) out.GF = { type: 'Polygon', coordinates: gfPolys[0] }
  else if (gfPolys.length > 1)
    out.GF = { type: 'MultiPolygon', coordinates: gfPolys }
  return out
}

const WIDTH = 1000
const HEIGHT = 500
const projection = geoEquirectangular()
  .fitSize([WIDTH, HEIGHT], { type: 'Sphere' })
const path = geoPath(projection)

const countries = feature(topo, topo.objects.countries)
const paths = {}
let matched = 0
let skipped = 0

function addPath(alpha2, geom) {
  const d = path(geom)
  if (!d) {
    skipped += 1
    return
  }
  // Prefer larger geometries if duplicates appear.
  if (!paths[alpha2] || d.length > paths[alpha2].length) {
    paths[alpha2] = d
  }
  matched += 1
}

for (const f of countries.features) {
  const rawId = f.id == null ? '' : String(f.id)
  const alpha2 =
    numericToAlpha2.get(rawId) ||
    numericToAlpha2.get(rawId.padStart(3, '0')) ||
    null
  if (!alpha2) {
    skipped += 1
    continue
  }
  if (alpha2 === 'FR') {
    const parts = partitionFrance(f.geometry)
    for (const [id, geom] of Object.entries(parts)) addPath(id, geom)
    continue
  }
  addPath(alpha2, f.geometry)
}

const out = `/** Equirectangular SVG paths (viewBox 0 0 ${WIDTH} ${HEIGHT}). Generated. */
export const GLOBLE_MAP_VIEWBOX = '0 0 ${WIDTH} ${HEIGHT}' as const

export const GLOBLE_COUNTRY_PATHS: Record<string, string> = ${JSON.stringify(paths, null, 2)}
`

fs.writeFileSync('src/lib/globleCountryPaths.ts', out)
console.log('wrote', Object.keys(paths).length, 'paths; matched features', matched, 'skipped', skipped)
