import { addDaysKey, parseKey, todayKey } from './date'
import {
  normalizeFurnitureList,
  type PlacedFurniture,
} from './furniture'

export type PetStatus = 'empty' | 'alive' | 'dead'

export type PetMood =
  | 'empty'
  | 'happy'
  | 'hungry'
  | 'dirty'
  | 'neglected'
  | 'dead'

export interface SharedPet {
  id: string
  status: PetStatus
  species: string
  name: string
  generation: number
  bornOn: string
  lastFedOn: string | null
  lastCleanedOn: string | null
  lastPlayedOn: string | null
  lastFedBy?: string | null
  lastCleanedBy?: string | null
  lastPlayedBy?: string | null
  deadOn?: string | null
  updatedAt: number
}

export interface PetKennel {
  pets: SharedPet[]
  furniture: PlacedFurniture[]
  updatedAt: number
}

export const MAX_PETS = 3

export const PET_SPECIES = [
  '/cats/cat-1.png',
  '/cats/cat-2.png',
  '/cats/cat-3.png',
  '/cats/cat-4.png',
  '/cats/cat-5.png',
  '/cats/cat-6.png',
  '/cats/cat-7.png',
  '/cats/cat-8.png',
  '/cats/cat-9.png',
  '/cats/extra-sage.png',
  '/cats/extra-bulba.png',
] as const

export const PET_STORAGE_KEY = 'jo-dailies:shared-pet:v2'

function isDayKey(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function createPetId(): string {
  return `pet_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function emptyKennel(): PetKennel {
  return { pets: [], furniture: [], updatedAt: Date.now() }
}

export function isPetSpecies(value: unknown): value is string {
  return (
    typeof value === 'string' && (PET_SPECIES as readonly string[]).includes(value)
  )
}

export function normalizePet(raw: unknown): SharedPet {
  if (!raw || typeof raw !== 'object') {
    return {
      id: createPetId(),
      status: 'empty',
      species: PET_SPECIES[0]!,
      name: '',
      generation: 0,
      bornOn: todayKey(),
      lastFedOn: null,
      lastCleanedOn: null,
      lastPlayedOn: null,
      lastFedBy: null,
      lastCleanedBy: null,
      lastPlayedBy: null,
      deadOn: null,
      updatedAt: Date.now(),
    }
  }
  const p = raw as Record<string, unknown>
  const status: PetStatus =
    p.status === 'alive' || p.status === 'dead' || p.status === 'empty'
      ? p.status
      : 'empty'
  return {
    id: typeof p.id === 'string' && p.id ? p.id : createPetId(),
    status,
    species: isPetSpecies(p.species) ? p.species : PET_SPECIES[0]!,
    name: typeof p.name === 'string' ? p.name.slice(0, 24) : '',
    generation:
      typeof p.generation === 'number' &&
      Number.isFinite(p.generation) &&
      p.generation >= 0
        ? Math.floor(p.generation)
        : 0,
    bornOn: isDayKey(p.bornOn) ? p.bornOn : todayKey(),
    lastFedOn: isDayKey(p.lastFedOn) ? p.lastFedOn : null,
    lastCleanedOn: isDayKey(p.lastCleanedOn) ? p.lastCleanedOn : null,
    lastPlayedOn: isDayKey(p.lastPlayedOn) ? p.lastPlayedOn : null,
    lastFedBy: typeof p.lastFedBy === 'string' ? p.lastFedBy : null,
    lastCleanedBy: typeof p.lastCleanedBy === 'string' ? p.lastCleanedBy : null,
    lastPlayedBy: typeof p.lastPlayedBy === 'string' ? p.lastPlayedBy : null,
    deadOn: isDayKey(p.deadOn) ? p.deadOn : null,
    updatedAt:
      typeof p.updatedAt === 'number' && Number.isFinite(p.updatedAt)
        ? p.updatedAt
        : Date.now(),
  }
}

/** Accepts kennel shape or legacy single-pet docs. */
export function normalizeKennel(raw: unknown): PetKennel {
  if (!raw || typeof raw !== 'object') return emptyKennel()
  const data = raw as Record<string, unknown>
  const furniture = normalizeFurnitureList(data.furniture)

  if (Array.isArray(data.pets)) {
    const pets = data.pets
      .map((entry) => normalizePet(entry))
      .filter((pet) => pet.status === 'alive' || pet.status === 'dead')
      .slice(0, MAX_PETS)
    return {
      pets,
      furniture,
      updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
    }
  }

  // Legacy: single SharedPet document
  if (
    data.status === 'alive' ||
    data.status === 'dead' ||
    data.status === 'empty'
  ) {
    const pet = normalizePet(data)
    return {
      pets: pet.status === 'empty' ? [] : [pet],
      furniture,
      updatedAt: pet.updatedAt,
    }
  }

  return { ...emptyKennel(), furniture }
}

export function loadLocalKennel(): PetKennel {
  try {
    const raw = localStorage.getItem(PET_STORAGE_KEY)
    if (raw) return normalizeKennel(JSON.parse(raw) as unknown)
  } catch {
    /* ignore */
  }

  // Migrate v1 single-pet key if present
  try {
    const legacy = localStorage.getItem('jo-dailies:shared-pet:v1')
    if (legacy) {
      const kennel = normalizeKennel(JSON.parse(legacy) as unknown)
      saveLocalKennel(kennel)
      return kennel
    }
  } catch {
    /* ignore */
  }

  return emptyKennel()
}

export function saveLocalKennel(kennel: PetKennel): void {
  try {
    localStorage.setItem(PET_STORAGE_KEY, JSON.stringify(kennel))
  } catch {
    /* ignore */
  }
}

/** Missed feed or clean for yesterday (or earlier) → dies. Born today is safe. */
export function shouldDie(pet: SharedPet, today = todayKey()): boolean {
  if (pet.status !== 'alive') return false
  if (pet.bornOn >= today) return false
  const yesterday = addDaysKey(today, -1)
  // Hatching counts as that day's care, so a pet born yesterday gets the same
  // one-day grace as one that was fed yesterday instead of dying overnight.
  const lastFed = pet.lastFedOn ?? pet.bornOn
  const lastCleaned = pet.lastCleanedOn ?? pet.bornOn
  if (lastFed < yesterday) return true
  if (lastCleaned < yesterday) return true
  return false
}

export interface DeathPostMortem {
  deadOn: string
  /** Care had to land on this day (or later) for the pet to survive. */
  requiredCareBy: string
  effectiveLastFed: string
  effectiveLastCleaned: string
  missedFeed: boolean
  missedClean: boolean
  /** False means the recorded state does not justify the death that was saved. */
  deathWasEarned: boolean
  summary: string
}

/**
 * Re-run the death rule against the state frozen on the pet at the moment it
 * died. `deathWasEarned: false` means the saved record does not justify the
 * death — either an old rule killed it or a stale write erased the care.
 */
export function explainDeath(pet: SharedPet): DeathPostMortem | null {
  if (pet.status !== 'dead' || !pet.deadOn) return null
  const deadOn = pet.deadOn
  const requiredCareBy = addDaysKey(deadOn, -1)
  const effectiveLastFed = pet.lastFedOn ?? pet.bornOn
  const effectiveLastCleaned = pet.lastCleanedOn ?? pet.bornOn
  const missedFeed = effectiveLastFed < requiredCareBy
  const missedClean = effectiveLastCleaned < requiredCareBy
  const bornAfter = pet.bornOn >= deadOn
  const deathWasEarned = !bornAfter && (missedFeed || missedClean)

  let summary: string
  if (!deathWasEarned) {
    summary = `Unjustified: care on record (fed ${effectiveLastFed}, cleaned ${effectiveLastCleaned}) satisfies the ${requiredCareBy} deadline.`
  } else if (missedFeed && missedClean) {
    summary = `Missed both: last fed ${effectiveLastFed}, last cleaned ${effectiveLastCleaned}, needed ${requiredCareBy}.`
  } else if (missedFeed) {
    summary = `Missed feed: last fed ${effectiveLastFed}, needed ${requiredCareBy}.`
  } else {
    summary = `Missed bath: last cleaned ${effectiveLastCleaned}, needed ${requiredCareBy}.`
  }

  return {
    deadOn,
    requiredCareBy,
    effectiveLastFed,
    effectiveLastCleaned,
    missedFeed,
    missedClean,
    deathWasEarned,
    summary,
  }
}

export function markDead(pet: SharedPet, today = todayKey()): SharedPet {
  return {
    ...pet,
    status: 'dead',
    deadOn: today,
    updatedAt: Date.now(),
  }
}

export function applyDeathCheck(pet: SharedPet, today = todayKey()): SharedPet {
  if (shouldDie(pet, today)) return markDead(pet, today)
  return pet
}

export function applyKennelDeathCheck(
  kennel: PetKennel,
  today = todayKey(),
): PetKennel {
  const pets = kennel.pets.map((pet) => applyDeathCheck(pet, today))
  const changed = pets.some((pet, i) => pet !== kennel.pets[i])
  if (!changed) return kennel
  return { ...kennel, pets, updatedAt: Date.now() }
}

/** Pick the later of two care dates, carrying its matching caregiver name. */
function laterCare(
  aOn: string | null | undefined,
  aBy: string | null | undefined,
  bOn: string | null | undefined,
  bBy: string | null | undefined,
): [string | null, string | null] {
  if (!aOn) return [bOn ?? null, bBy ?? null]
  if (!bOn) return [aOn, aBy ?? null]
  return bOn >= aOn ? [bOn, bBy ?? null] : [aOn, aBy ?? null]
}

/**
 * Merge two versions of the same pet so care only ever moves forward. Guards
 * against a stale writer regressing a feed/clean/play the other person already
 * recorded, and keeps death sticky (earliest death date wins).
 */
export function mergePetForward(base: SharedPet, incoming: SharedPet): SharedPet {
  const [lastFedOn, lastFedBy] = laterCare(
    base.lastFedOn,
    base.lastFedBy,
    incoming.lastFedOn,
    incoming.lastFedBy,
  )
  const [lastCleanedOn, lastCleanedBy] = laterCare(
    base.lastCleanedOn,
    base.lastCleanedBy,
    incoming.lastCleanedOn,
    incoming.lastCleanedBy,
  )
  const [lastPlayedOn, lastPlayedBy] = laterCare(
    base.lastPlayedOn,
    base.lastPlayedBy,
    incoming.lastPlayedOn,
    incoming.lastPlayedBy,
  )
  const dead = base.status === 'dead' || incoming.status === 'dead'
  const deadDates = [base.deadOn, incoming.deadOn].filter(
    (d): d is string => typeof d === 'string' && d.length > 0,
  )
  const deadOn = dead
    ? (deadDates.sort()[0] ?? incoming.deadOn ?? base.deadOn ?? null)
    : null

  return {
    ...incoming,
    status: dead ? 'dead' : incoming.status,
    deadOn,
    bornOn: base.bornOn < incoming.bornOn ? base.bornOn : incoming.bornOn,
    lastFedOn,
    lastFedBy,
    lastCleanedOn,
    lastCleanedBy,
    lastPlayedOn,
    lastPlayedBy,
    updatedAt: Date.now(),
  }
}

/**
 * Reconcile a desired kennel against freshly-read remote state (matched by pet
 * id) so a concurrent edit can't be clobbered. Death checks deliberately live
 * in their own transaction rather than piggybacking on unrelated writes.
 */
export function reconcileKennel(
  remote: PetKennel,
  desired: PetKennel,
): PetKennel {
  const remoteById = new Map(remote.pets.map((pet) => [pet.id, pet]))
  const pets = desired.pets.map((pet) => {
    const base = remoteById.get(pet.id)
    return base ? mergePetForward(base, pet) : pet
  })
  return { ...desired, pets, updatedAt: Date.now() }
}

export function petMood(pet: SharedPet, today = todayKey()): PetMood {
  if (pet.status === 'empty') return 'empty'
  if (pet.status === 'dead') return 'dead'
  const fed = pet.lastFedOn === today
  const cleaned = pet.lastCleanedOn === today
  if (!fed && !cleaned) return 'neglected'
  if (!fed) return 'hungry'
  if (!cleaned) return 'dirty'
  return 'happy'
}

export function daysAliveCount(pet: SharedPet, today = todayKey()): number {
  if (pet.status === 'empty') return 0
  const endKey = pet.status === 'dead' && pet.deadOn ? pet.deadOn : today
  const born = parseKey(pet.bornOn)
  const end = parseKey(endKey)
  return Math.max(
    1,
    Math.round((end.getTime() - born.getTime()) / 86_400_000) + 1,
  )
}

export function hatchPet(
  species: string,
  name: string,
  generation = 1,
  today = todayKey(),
): SharedPet {
  const cleanName = name.trim().slice(0, 24) || 'Mochi'
  return {
    id: createPetId(),
    status: 'alive',
    species: isPetSpecies(species) ? species : PET_SPECIES[0]!,
    name: cleanName,
    generation,
    bornOn: today,
    // Hatching is explicit first-day care. Persisting the dates avoids relying
    // on a null fallback when old/new clients reconcile the same pet.
    lastFedOn: today,
    lastCleanedOn: today,
    lastPlayedOn: null,
    lastFedBy: null,
    lastCleanedBy: null,
    lastPlayedBy: null,
    deadOn: null,
    updatedAt: Date.now(),
  }
}

export function addHatchedPet(
  kennel: PetKennel,
  species: string,
  name: string,
  today = todayKey(),
): PetKennel {
  return addPetToKennel(kennel, hatchPet(species, name, 0, today))
}

/** Add a pre-created pet while assigning its generation from remote state. */
export function addPetToKennel(
  kennel: PetKennel,
  pet: SharedPet,
): PetKennel {
  if (kennel.pets.some((existing) => existing.id === pet.id)) return kennel
  if (kennel.pets.length >= MAX_PETS) return kennel
  const nextGen =
    kennel.pets.reduce((max, pet) => Math.max(max, pet.generation), 0) + 1
  return {
    pets: [...kennel.pets, { ...pet, generation: nextGen, updatedAt: Date.now() }],
    furniture: kennel.furniture,
    updatedAt: Date.now(),
  }
}

export function updatePetInKennel(
  kennel: PetKennel,
  petId: string,
  updater: (pet: SharedPet) => SharedPet,
): PetKennel {
  let changed = false
  const pets = kennel.pets.map((pet) => {
    if (pet.id !== petId) return pet
    changed = true
    return updater(pet)
  })
  if (!changed) return kennel
  return { ...kennel, pets, updatedAt: Date.now() }
}

export function removePetFromKennel(
  kennel: PetKennel,
  petId: string,
): PetKennel {
  const pets = kennel.pets.filter((pet) => pet.id !== petId)
  if (pets.length === kennel.pets.length) return kennel
  return { ...kennel, pets, updatedAt: Date.now() }
}

export function renamePet(pet: SharedPet, name: string): SharedPet {
  if (pet.status !== 'alive' && pet.status !== 'dead') return pet
  const cleanName = name.trim().slice(0, 24)
  if (!cleanName || cleanName === pet.name) return pet
  return {
    ...pet,
    name: cleanName,
    updatedAt: Date.now(),
  }
}

export function feedPet(
  pet: SharedPet,
  by: string,
  today = todayKey(),
): SharedPet {
  if (pet.status !== 'alive') return pet
  return {
    ...pet,
    lastFedOn: today,
    lastFedBy: by,
    updatedAt: Date.now(),
  }
}

export function cleanPet(
  pet: SharedPet,
  by: string,
  today = todayKey(),
): SharedPet {
  if (pet.status !== 'alive') return pet
  return {
    ...pet,
    lastCleanedOn: today,
    lastCleanedBy: by,
    updatedAt: Date.now(),
  }
}

export function playWithPet(
  pet: SharedPet,
  by: string,
  today = todayKey(),
): SharedPet {
  if (pet.status !== 'alive') return pet
  return {
    ...pet,
    lastPlayedOn: today,
    lastPlayedBy: by,
    updatedAt: Date.now(),
  }
}

export function moodLabel(mood: PetMood): string {
  switch (mood) {
    case 'happy':
      return 'full & fresh'
    case 'hungry':
      return 'hungry…'
    case 'dirty':
      return 'needs a bath'
    case 'neglected':
      return 'lonely & stinky'
    case 'dead':
      return 'resting forever'
    default:
      return 'awaiting a friend'
  }
}
