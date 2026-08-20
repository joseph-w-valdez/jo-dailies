import fs from 'node:fs'

const data = JSON.parse(
  fs.readFileSync('public/globle/countries-alt.json', 'utf8'),
).ref_country_codes

const exclude = new Set([
  'ATA',
  'HMD',
  'ATF',
  'SGS',
  'BVT',
  'UMI',
  'IOT',
  'CXR',
  'CCK',
  'NFK',
  'PCN',
  'TKL',
  'WLF',
  'BLM',
  'SXM',
  'BES',
  'ALA',
  'SJM',
  'AN', // dissolved
])

const rename = {
  'United States of America': 'United States',
  'Russian Federation': 'Russia',
  'Korea, Republic of': 'South Korea',
  "Korea, Democratic People's Republic of": 'North Korea',
  'Iran, Islamic Republic of': 'Iran',
  'Syrian Arab Republic': 'Syria',
  'Viet Nam': 'Vietnam',
  "Lao People's Democratic Republic": 'Laos',
  'Bolivia, Plurinational State of': 'Bolivia',
  'Venezuela, Bolivarian Republic of': 'Venezuela',
  'Tanzania, United Republic of': 'Tanzania',
  'Moldova, Republic of': 'Moldova',
  'Macedonia, the former Yugoslav Republic of': 'North Macedonia',
  'Congo, the Democratic Republic of the': 'DR Congo',
  Congo: 'Republic of the Congo',
  'Czech Republic': 'Czechia',
  "Côte d'Ivoire": 'Ivory Coast',
  'Brunei Darussalam': 'Brunei',
  'Holy See (Vatican City State)': 'Vatican City',
  'Palestinian Territory, Occupied': 'Palestine',
  'Micronesia, Federated States of': 'Micronesia',
  'Taiwan, Province of China': 'Taiwan',
  Macao: 'Macau',
  'Libyan Arab Jamahiriya': 'Libya',
  Swaziland: 'Eswatini',
  'Falkland Islands (Malvinas)': 'Falkland Islands',
  'Virgin Islands, British': 'British Virgin Islands',
  'Virgin Islands, U.S.': 'U.S. Virgin Islands',
  'Saint Helena, Ascension and Tristan da Cunha': 'Saint Helena',
  Réunion: 'Reunion',
  'Cape Verde': 'Cabo Verde',
}

const aliases = {
  US: ['USA', 'America', 'United States of America'],
  GB: ['UK', 'Britain', 'Great Britain', 'England'],
  RU: ['Russian Federation'],
  KR: ['Korea', 'Republic of Korea'],
  KP: ['DPRK'],
  AE: ['UAE'],
  CZ: ['Czech Republic'],
  CI: ["Côte d'Ivoire", "Cote d'Ivoire"],
  CD: ['Democratic Republic of the Congo', 'DRC', 'Congo-Kinshasa'],
  CG: ['Congo', 'Congo-Brazzaville'],
  NL: ['Holland'],
  MM: ['Burma'],
  SZ: ['Swaziland'],
  TR: ['Türkiye'],
  VA: ['Vatican', 'Holy See'],
  MK: ['Macedonia'],
  BN: ['Brunei Darussalam'],
  VN: ['Viet Nam'],
  BO: ['Bolivia, Plurinational State of'],
  VE: ['Venezuela, Bolivarian Republic of'],
  IR: ['Iran, Islamic Republic of'],
  SY: ['Syrian Arab Republic'],
  LA: ["Lao People's Democratic Republic"],
  TZ: ['Tanzania, United Republic of'],
  MD: ['Moldova, Republic of'],
  TW: ['Taiwan, Province of China'],
  PS: ['Palestinian Territory, Occupied'],
  FM: ['Micronesia, Federated States of'],
  LY: ['Libyan Arab Jamahiriya'],
  CV: ['Cape Verde'],
}

const countries = data
  .filter((c) => !exclude.has(c.alpha3))
  .map((c) => {
    const name = rename[c.country] || c.country
    const row = {
      id: c.alpha2,
      name,
      lat: c.latitude,
      lon: c.longitude,
    }
    if (aliases[c.alpha2]) row.aliases = aliases[c.alpha2]
    return row
  })
  .sort((a, b) => a.name.localeCompare(b.name))

const out = `/** Country centroids for Globle (equirectangular map). */
export interface GlobleCountry {
  id: string
  name: string
  lat: number
  lon: number
  aliases?: string[]
}

export const GLOBLE_COUNTRIES: GlobleCountry[] = ${JSON.stringify(countries, null, 2)}
`

fs.writeFileSync('src/lib/globleCountries.ts', out)
console.log('wrote', countries.length, 'countries')
