import { describe, expect, it } from 'vitest'
import {
  addPetToKennel,
  applyKennelDeathCheck,
  explainDeath,
  hatchPet,
  mergePetForward,
  normalizePet,
  reconcileKennel,
  shouldDie,
  type PetKennel,
  type SharedPet,
} from './pet'

function pet(overrides: Partial<SharedPet> = {}): SharedPet {
  return {
    ...hatchPet('/cats/cat-1.png', 'Mochi', 1, '2026-07-28'),
    lastFedOn: null,
    lastCleanedOn: null,
    ...overrides,
  }
}

function kennel(pets: SharedPet[]): PetKennel {
  return { pets, furniture: [], updatedAt: 0 }
}

describe('shouldDie', () => {
  it('keeps a pet born today alive with no care yet', () => {
    expect(shouldDie(pet({ bornOn: '2026-07-30' }), '2026-07-30')).toBe(false)
  })

  it('keeps a pet born yesterday alive with no care yet (grace day)', () => {
    expect(shouldDie(pet({ bornOn: '2026-07-29' }), '2026-07-30')).toBe(false)
  })

  it('kills a pet born two days ago that was never cared for', () => {
    expect(shouldDie(pet({ bornOn: '2026-07-28' }), '2026-07-30')).toBe(true)
  })

  it('keeps a pet fed and cleaned yesterday alive', () => {
    const survivor = pet({
      bornOn: '2026-07-20',
      lastFedOn: '2026-07-29',
      lastCleanedOn: '2026-07-29',
    })
    expect(shouldDie(survivor, '2026-07-30')).toBe(false)
  })

  it('kills a pet fed yesterday but not cleaned since two days ago', () => {
    const dirty = pet({
      bornOn: '2026-07-20',
      lastFedOn: '2026-07-29',
      lastCleanedOn: '2026-07-28',
    })
    expect(shouldDie(dirty, '2026-07-30')).toBe(true)
  })

  it('ignores play when deciding death', () => {
    const unplayed = pet({
      bornOn: '2026-07-20',
      lastFedOn: '2026-07-30',
      lastCleanedOn: '2026-07-30',
      lastPlayedOn: '2026-07-01',
    })
    expect(shouldDie(unplayed, '2026-07-30')).toBe(false)
  })

  it('never re-kills a dead pet', () => {
    const dead = pet({ status: 'dead', bornOn: '2026-07-01' })
    expect(shouldDie(dead, '2026-07-30')).toBe(false)
  })
})

describe('mergePetForward', () => {
  const id = 'pet_a'

  it('keeps the later feed and its caregiver', () => {
    const base = pet({ id, lastFedOn: '2026-07-30', lastFedBy: 'Joha' })
    const stale = pet({ id, lastFedOn: '2026-07-28', lastFedBy: 'Joseph' })
    const merged = mergePetForward(base, stale)
    expect(merged.lastFedOn).toBe('2026-07-30')
    expect(merged.lastFedBy).toBe('Joha')
  })

  it('adopts a newer feed from the incoming edit', () => {
    const base = pet({ id, lastFedOn: '2026-07-28', lastFedBy: 'Joseph' })
    const fresh = pet({ id, lastFedOn: '2026-07-30', lastFedBy: 'Joha' })
    const merged = mergePetForward(base, fresh)
    expect(merged.lastFedOn).toBe('2026-07-30')
    expect(merged.lastFedBy).toBe('Joha')
  })

  it('keeps death sticky with the earliest death date', () => {
    const dead = pet({ id, status: 'dead', deadOn: '2026-07-29' })
    const alive = pet({ id, status: 'alive', lastFedOn: '2026-07-30' })
    const merged = mergePetForward(dead, alive)
    expect(merged.status).toBe('dead')
    expect(merged.deadOn).toBe('2026-07-29')
  })
})

describe('reconcileKennel', () => {
  it('does not let a stale feed regress the remote feed', () => {
    const remote = kennel([
      pet({ id: 'p1', bornOn: '2026-07-20', lastFedOn: '2026-07-30', lastCleanedOn: '2026-07-30' }),
    ])
    // A stale writer only knows about the older feed.
    const desired = kennel([
      pet({ id: 'p1', bornOn: '2026-07-20', lastFedOn: '2026-07-28', lastCleanedOn: '2026-07-28' }),
    ])
    const result = reconcileKennel(remote, desired)
    expect(result.pets[0]!.lastFedOn).toBe('2026-07-30')
    expect(result.pets[0]!.status).toBe('alive')
  })

  it('does not apply death as a side effect of an unrelated mutation', () => {
    const remote = kennel([
      pet({ id: 'p1', bornOn: '2026-07-20', lastFedOn: '2026-07-27', lastCleanedOn: '2026-07-27' }),
    ])
    const desired = kennel([
      pet({ id: 'p1', bornOn: '2026-07-20', lastFedOn: '2026-07-27', lastCleanedOn: '2026-07-27' }),
    ])
    const result = reconcileKennel(remote, desired)
    expect(result.pets[0]!.status).toBe('alive')
    expect(applyKennelDeathCheck(result, '2026-07-30').pets[0]!.status).toBe(
      'dead',
    )
  })

  it('keeps a freshly hatched pet that is not in remote yet', () => {
    const remote = kennel([])
    const desired = kennel([pet({ id: 'new', bornOn: '2026-07-30' })])
    const result = reconcileKennel(remote, desired)
    expect(result.pets).toHaveLength(1)
    expect(result.pets[0]!.status).toBe('alive')
  })
})

describe('hatching', () => {
  it('persists first-day feed and clean dates', () => {
    const hatched = hatchPet('/cats/cat-1.png', 'Mochi', 1, '2026-07-30')
    expect(hatched.lastFedOn).toBe('2026-07-30')
    expect(hatched.lastCleanedOn).toBe('2026-07-30')
  })

  it('adds a pre-created pet idempotently with a server-derived generation', () => {
    const existing = pet({ id: 'old', generation: 4 })
    const created = hatchPet('/cats/cat-2.png', 'New', 0, '2026-07-30')
    const once = addPetToKennel(kennel([existing]), created)
    const twice = addPetToKennel(once, created)
    expect(once.pets[1]!.id).toBe(created.id)
    expect(once.pets[1]!.generation).toBe(5)
    expect(twice.pets).toHaveLength(2)
  })
})

describe('explainDeath', () => {
  it('returns nothing for a living pet', () => {
    expect(explainDeath(pet({ status: 'alive' }))).toBeNull()
  })

  it('flags a death the record does not justify', () => {
    // Fed the day before it died — this death should never have happened.
    const victim = pet({
      status: 'dead',
      bornOn: '2026-07-20',
      lastFedOn: '2026-07-29',
      lastCleanedOn: '2026-07-29',
      deadOn: '2026-07-30',
    })
    const report = explainDeath(victim)!
    expect(report.requiredCareBy).toBe('2026-07-29')
    expect(report.deathWasEarned).toBe(false)
    expect(report.summary).toContain('Unjustified')
  })

  it('flags a newborn killed without its grace day', () => {
    const newborn = pet({
      status: 'dead',
      bornOn: '2026-07-29',
      lastFedOn: null,
      lastCleanedOn: null,
      deadOn: '2026-07-30',
    })
    const report = explainDeath(newborn)!
    expect(report.effectiveLastFed).toBe('2026-07-29')
    expect(report.deathWasEarned).toBe(false)
  })

  it('confirms a genuinely neglected pet', () => {
    const neglected = pet({
      status: 'dead',
      bornOn: '2026-07-20',
      lastFedOn: '2026-07-27',
      lastCleanedOn: '2026-07-27',
      deadOn: '2026-07-30',
    })
    const report = explainDeath(neglected)!
    expect(report.deathWasEarned).toBe(true)
    expect(report.missedFeed).toBe(true)
    expect(report.missedClean).toBe(true)
  })

  it('separates a missed bath from a missed feed', () => {
    const dirty = pet({
      status: 'dead',
      bornOn: '2026-07-20',
      lastFedOn: '2026-07-29',
      lastCleanedOn: '2026-07-26',
      deadOn: '2026-07-30',
    })
    const report = explainDeath(dirty)!
    expect(report.missedFeed).toBe(false)
    expect(report.missedClean).toBe(true)
    expect(report.summary).toContain('Missed bath')
  })
})

describe('normalization', () => {
  it('rejects malformed calendar keys before death comparisons', () => {
    const normalized = normalizePet({
      ...pet(),
      bornOn: '2026-02-30',
      lastFedOn: 'not-a-date',
      lastCleanedOn: '2026-13-01',
      deadOn: 'yesterday',
    })
    expect(normalized.bornOn).not.toBe('2026-02-30')
    expect(normalized.lastFedOn).toBeNull()
    expect(normalized.lastCleanedOn).toBeNull()
    expect(normalized.deadOn).toBeNull()
  })
})
