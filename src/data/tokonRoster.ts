/** In-game character select order (4 columns × 5 rows). */

export type TokonTeamId =
  | 'fighting-avengers'
  | 'unbreakable-x-men'
  | 'amazing-guardians'
  | 'samurai-outriders'
  | 'knights-of-doom'

export type TokonRosterEntry = {
  id: string
  name: string
  team: TokonTeamId
  /** Filename under `public/tokon/portraits/`. */
  portraitFile: string
  /** Dustloop wiki slug under `/w/MTFS/`. */
  dustloopSlug: string
  secret?: boolean
}

export const TOKON_TEAMS: Record<
  TokonTeamId,
  { label: string; accent: string }
> = {
  'fighting-avengers': { label: 'Fighting Avengers', accent: 'border-sky-400/60' },
  'unbreakable-x-men': { label: 'Unbreakable X-Men', accent: 'border-violet-400/60' },
  'amazing-guardians': { label: 'Amazing Guardians', accent: 'border-rose-400/60' },
  'samurai-outriders': { label: 'Samurai Outriders', accent: 'border-orange-400/60' },
  'knights-of-doom': { label: 'Knights of Doom', accent: 'border-emerald-400/60' },
}

/** Select-screen grid order — row-major, left to right. */
export const TOKON_ROSTER: TokonRosterEntry[] = [
  // Fighting Avengers
  { id: 'captain-america', name: 'Captain America', team: 'fighting-avengers', portraitFile: 'captain_america.png', dustloopSlug: 'Captain_America' },
  { id: 'iron-man', name: 'Iron Man', team: 'fighting-avengers', portraitFile: 'iron_man.png', dustloopSlug: 'Iron_Man' },
  { id: 'black-panther', name: 'Black Panther', team: 'fighting-avengers', portraitFile: 'black_panther.png', dustloopSlug: 'Black_Panther' },
  { id: 'hulk', name: 'Hulk', team: 'fighting-avengers', portraitFile: 'hulk.png', dustloopSlug: 'Hulk' },
  // Unbreakable X-Men
  { id: 'storm', name: 'Storm', team: 'unbreakable-x-men', portraitFile: 'storm.png', dustloopSlug: 'Storm' },
  { id: 'magik', name: 'Magik', team: 'unbreakable-x-men', portraitFile: 'magik.png', dustloopSlug: 'Magik' },
  { id: 'wolverine', name: 'Wolverine', team: 'unbreakable-x-men', portraitFile: 'wolverine.png', dustloopSlug: 'Wolverine' },
  { id: 'danger', name: 'Danger', team: 'unbreakable-x-men', portraitFile: 'danger.png', dustloopSlug: 'Danger' },
  // Amazing Guardians
  { id: 'spider-man', name: 'Spider-Man', team: 'amazing-guardians', portraitFile: 'spider-man.png', dustloopSlug: 'Spider-Man' },
  { id: 'ms-marvel', name: 'Ms. Marvel', team: 'amazing-guardians', portraitFile: 'ms_marvel.png', dustloopSlug: 'Ms_Marvel' },
  { id: 'star-lord', name: 'Star-Lord', team: 'amazing-guardians', portraitFile: 'star-lord.png', dustloopSlug: 'Star-Lord' },
  { id: 'peni-parker', name: 'Peni Parker', team: 'amazing-guardians', portraitFile: 'peni_parker.png', dustloopSlug: 'Peni_Parker' },
  // Samurai Outriders
  { id: 'ghost-rider', name: 'Ghost Rider', team: 'samurai-outriders', portraitFile: 'ghost_rider.png', dustloopSlug: 'Ghost_Rider' },
  { id: 'blade', name: 'Blade', team: 'samurai-outriders', portraitFile: 'blade.png', dustloopSlug: 'Blade' },
  { id: 'loki', name: 'Loki', team: 'samurai-outriders', portraitFile: 'loki.png', dustloopSlug: 'Loki' },
  { id: 'deadpool', name: 'Deadpool', team: 'samurai-outriders', portraitFile: 'deadpool.png', dustloopSlug: 'Deadpool' },
  // Knights of Doom
  { id: 'doctor-doom', name: 'Doctor Doom', team: 'knights-of-doom', portraitFile: 'doctor_doom.png', dustloopSlug: 'Doctor_Doom' },
  { id: 'magneto', name: 'Magneto', team: 'knights-of-doom', portraitFile: 'magneto.png', dustloopSlug: 'Magneto' },
  { id: 'green-goblin', name: 'Green Goblin', team: 'knights-of-doom', portraitFile: 'green_goblin.png', dustloopSlug: 'Green_Goblin' },
  { id: 'carnage', name: 'Carnage', team: 'knights-of-doom', portraitFile: 'carnage.png', dustloopSlug: 'Carnage' },
]

export const TOKON_CHAMPION: TokonRosterEntry = {
  id: 'champion',
  name: 'Champion',
  team: 'knights-of-doom',
  portraitFile: 'champion.png',
  dustloopSlug: 'Champion',
  secret: true,
}

export function tokonPortraitUrl(entry: Pick<TokonRosterEntry, 'portraitFile'>): string {
  return `/tokon/portraits/${entry.portraitFile}`
}

export function tokonDustloopUrl(entry: Pick<TokonRosterEntry, 'dustloopSlug'>): string {
  return `https://www.dustloop.com/w/MTFS/${entry.dustloopSlug}`
}

export function tokonRosterById(id: string): TokonRosterEntry | undefined {
  return (
    TOKON_ROSTER.find((c) => c.id === id) ??
    (id === TOKON_CHAMPION.id ? TOKON_CHAMPION : undefined)
  )
}

export function defaultTeamSlots(team: TokonTeamId): string[] {
  return TOKON_ROSTER.filter((c) => c.team === team).map((c) => c.id)
}
