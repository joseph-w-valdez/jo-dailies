import {
  doc,
  getDocFromServer,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore'
import { useCallback, useEffect, useRef, useState } from 'react'
import { db, syncRoomId } from '../lib/firebase'
import {
  addFurniture,
  flipFurniture,
  MAX_FURNITURE,
  moveFurniture,
  removeFurniture,
  transformFurniture,
  type PlacedFurniture,
} from '../lib/furniture'
import {
  addPetToKennel,
  applyKennelDeathCheck,
  cleanPet,
  explainDeath,
  feedPet,
  hatchPet,
  loadLocalKennel,
  MAX_PETS,
  normalizeKennel,
  playWithPet,
  reconcileKennel,
  removePetFromKennel,
  renamePet,
  saveLocalKennel,
  shouldDie,
  updatePetInKennel,
  type PetKennel,
  type SharedPet,
} from '../lib/pet'
import { updateSyncSource } from '../lib/syncStatus'
import { useAppToday } from './useAppToday'
import { useFirebaseAuth } from './firebaseAuthContext'

interface PetConsoleApi {
  help(): void
  diagnose(): Promise<unknown[]>
  revive(petNameOrId: string): Promise<unknown[]>
  reviveAll(): Promise<unknown[]>
}

declare global {
  interface Window {
    __joPets?: PetConsoleApi
  }
}

function caregiverName(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  if (displayName?.trim()) return displayName.trim().split(/\s+/)[0] ?? 'Friend'
  if (email?.includes('@')) return email.split('@')[0] ?? 'Friend'
  return 'Friend'
}

export function useSharedPet() {
  const { user } = useFirebaseAuth()
  // Show the cached kennel as-is. Deaths are only decided from server-confirmed
  // data, so a stale tab can't render (or later persist) a bogus death.
  const [kennel, setKennel] = useState<PetKennel>(() => loadLocalKennel())
  const kennelRef = useRef(kennel)
  const mountedRef = useRef(true)
  const pendingActionsRef = useRef(0)
  const actionFailedRef = useRef(false)
  // Same Pacific day as dailies — feed/clean/play and death share one clock.
  const today = useAppToday()
  const todayRef = useRef(today)

  useEffect(() => {
    kennelRef.current = kennel
  }, [kennel])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      updateSyncSource('pet-action', null)
    }
  }, [])

  useEffect(() => {
    todayRef.current = today
  }, [today])

  const petDocRef = useCallback(
    () => doc(db, 'rooms', syncRoomId, 'pet', 'current'),
    [],
  )

  const applyLocal = useCallback((next: PetKennel) => {
    kennelRef.current = next
    saveLocalKennel(next)
    setKennel(next)
  }, [])

  const beginPetAction = useCallback(() => {
    if (pendingActionsRef.current === 0) actionFailedRef.current = false
    pendingActionsRef.current += 1
    updateSyncSource('pet-action', { pending: true, fromCache: false })
  }, [])

  const finishPetAction = useCallback((succeeded: boolean) => {
    pendingActionsRef.current = Math.max(0, pendingActionsRef.current - 1)
    if (!mountedRef.current) return
    if (!succeeded) actionFailedRef.current = true
    if (actionFailedRef.current) {
      updateSyncSource('pet-action', {
        pending: pendingActionsRef.current > 0,
        fromCache: false,
        error: true,
      })
    } else if (pendingActionsRef.current > 0) {
      updateSyncSource('pet-action', { pending: true, fromCache: false })
    } else {
      updateSyncSource('pet-action', null)
    }
  }, [])

  // Every write re-reads the server doc inside a transaction and re-applies the
  // change on top of it. We update local state only after server acknowledgement
  // so an offline/failed action is never presented or cached as successful.
  const applyPetMutation = useCallback(
    (mutate: (kennel: PetKennel) => PetKennel) => {
      beginPetAction()
      void runTransaction(db, async (tx) => {
        const ref = petDocRef()
        const snapshot = await tx.get(ref)
        const remote = snapshot.exists()
          ? normalizeKennel(snapshot.data())
          : kennelRef.current
        const next = reconcileKennel(remote, mutate(remote))
        tx.set(ref, next)
        return next
      })
        .then(() => {
          finishPetAction(true)
        })
        .catch((error: unknown) => {
          finishPetAction(false)
          console.error('Could not save pet', error)
        })
    },
    [beginPetAction, finishPetAction, petDocRef],
  )

  // Persist any newly-earned deaths from authoritative server state. Reads and
  // writes in one transaction, and only writes when a pet actually dies, so
  // stale tabs and repeated snapshots can't invent or re-trigger deaths.
  const commitDeaths = useCallback(
    (day: string) =>
      runTransaction(db, async (tx) => {
        const ref = petDocRef()
        const snapshot = await tx.get(ref)
        if (!snapshot.exists()) return null
        const remote = normalizeKennel(snapshot.data())
        const checked = applyKennelDeathCheck(remote, day)
        if (checked === remote) return null
        tx.set(ref, checked)
        return checked
      }),
    [petDocRef],
  )

  const migrateLocalKennel = useCallback(
    () =>
      runTransaction(db, async (tx) => {
        const ref = petDocRef()
        const snapshot = await tx.get(ref)
        if (snapshot.exists()) return normalizeKennel(snapshot.data())
        const local = loadLocalKennel()
        if (local.pets.length > 0 || local.furniture.length > 0) {
          tx.set(ref, local)
        }
        return local
      }),
    [petDocRef],
  )

  const petDiagnostics = useCallback(async () => {
    const snapshot = await getDocFromServer(petDocRef())
    if (!snapshot.exists()) return []
    const remote = normalizeKennel(snapshot.data())
    const day = todayRef.current
    return remote.pets.map((pet) => {
      const postMortem = explainDeath(pet)
      return {
        id: pet.id,
        name: pet.name,
        generation: pet.generation,
        status: pet.status,
        bornOn: pet.bornOn,
        lastFedOn: pet.lastFedOn,
        lastFedBy: pet.lastFedBy ?? null,
        lastCleanedOn: pet.lastCleanedOn,
        lastCleanedBy: pet.lastCleanedBy ?? null,
        lastPlayedOn: pet.lastPlayedOn,
        deadOn: pet.deadOn ?? null,
        // Only meaningful while alive; the rule short-circuits on dead pets.
        wouldDieToday: pet.status === 'alive' ? shouldDie(pet, day) : null,
        requiredCareBy: postMortem?.requiredCareBy ?? null,
        deathWasEarned: postMortem?.deathWasEarned ?? null,
        diagnosis: postMortem?.summary ?? `Alive as of ${day}.`,
        appToday: day,
        updatedAt: new Date(pet.updatedAt).toISOString(),
      }
    })
  }, [petDocRef])

  const revivePets = useCallback(
    async (petNameOrId?: string) => {
      const day = todayRef.current
      const revivedBy = `${caregiverName(user?.displayName, user?.email)} (console)`
      const query = petNameOrId?.trim().toLocaleLowerCase()
      // Reviving rewrites the care dates, so keep the post-mortem evidence.
      const beforeRevive = await petDiagnostics()
      await runTransaction(db, async (tx) => {
        const ref = petDocRef()
        const snapshot = await tx.get(ref)
        if (!snapshot.exists()) throw new Error('No saved kennel was found.')
        const remote = normalizeKennel(snapshot.data())
        let revived = 0
        const pets = remote.pets.map((pet) => {
          const matches =
            !query ||
            pet.id.toLocaleLowerCase() === query ||
            pet.name.toLocaleLowerCase() === query
          if (!matches || pet.status !== 'dead') return pet
          revived += 1
          return {
            ...pet,
            status: 'alive' as const,
            deadOn: null,
            lastFedOn: day,
            lastFedBy: revivedBy,
            lastCleanedOn: day,
            lastCleanedBy: revivedBy,
            updatedAt: Date.now(),
          }
        })
        if (revived === 0) {
          throw new Error(
            query
              ? `No dead pet matched "${petNameOrId}". Run __joPets.diagnose() to list ids and names.`
              : 'There are no dead pets to revive.',
          )
        }
        const kennel = { ...remote, pets, updatedAt: Date.now() }
        tx.set(ref, kennel)
        return kennel
      })
      console.info('State before revive (post-mortem evidence):')
      console.table(beforeRevive)
      return petDiagnostics()
    },
    [petDiagnostics, petDocRef, user?.displayName, user?.email],
  )

  // Intentionally absent from the UI. Firestore rules still restrict these
  // helpers to the two signed-in room members; the console name is not security.
  useEffect(() => {
    if (!user) {
      delete window.__joPets
      return
    }

    const api: PetConsoleApi = {
      help() {
        console.info(
          [
            '__joPets.diagnose()       Read fresh server data, print all pets + death post-mortem',
            '__joPets.revive("name")   Revive one dead pet by exact name or id',
            '__joPets.reviveAll()      Revive every dead pet',
            '__joPets.help()           Show these commands',
          ].join('\n'),
        )
      },
      async diagnose() {
        const rows = await petDiagnostics()
        console.table(rows)
        return rows
      },
      async revive(petNameOrId: string) {
        const rows = await revivePets(petNameOrId)
        console.info(`Revived "${petNameOrId}" and counted today as fed + cleaned.`)
        console.table(rows)
        return rows
      },
      async reviveAll() {
        const rows = await revivePets()
        console.info('Revived all dead pets and counted today as fed + cleaned.')
        console.table(rows)
        return rows
      },
    }
    window.__joPets = api
    console.info('Pet console ready. Run __joPets.help() for commands.')

    return () => {
      if (window.__joPets === api) delete window.__joPets
    }
  }, [petDiagnostics, revivePets, user])

  // At Pacific midnight (or tab wake) sweep for deaths against server state.
  useEffect(() => {
    if (!user) return

    void commitDeaths(today)
      .catch((error: unknown) => {
        // Offline at rollover: leave the pets alone. Whoever reconnects first
        // with real server data decides, instead of guessing from stale cache.
        console.error('Could not refresh pets for day rollover', error)
      })

  }, [today, commitDeaths, user])

  useEffect(() => {
    if (!user) return

    const petRefDoc = doc(db, 'rooms', syncRoomId, 'pet', 'current')
    const unsubscribe = onSnapshot(
      petRefDoc,
      { includeMetadataChanges: true },
      (snapshot) => {
        updateSyncSource('pet', {
          pending: snapshot.metadata.hasPendingWrites,
          fromCache: snapshot.metadata.fromCache,
        })

        // Cached / not-yet-acknowledged snapshots can be badly out of date —
        // e.g. a tab that slept through someone else's feed. Never replace our
        // acknowledged/local state or migrate from an untrusted snapshot.
        const trustworthy =
          !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites

        if (!trustworthy) return

        if (!snapshot.exists()) {
          void migrateLocalKennel()
            .catch((error: unknown) => {
              console.error('Could not migrate local pet', error)
            })
          return
        }

        const remote = normalizeKennel(snapshot.data())

        // Display exactly what the server confirmed. If a death is due, decide
        // and persist it transactionally; the dead state appears after commit.
        applyLocal(remote)
        if (applyKennelDeathCheck(remote, todayRef.current) !== remote) {
          void commitDeaths(todayRef.current).catch((error: unknown) => {
            console.error('Could not mark pet dead', error)
          })
        }
      },
      (error) => {
        updateSyncSource('pet', {
          pending: false,
          fromCache: false,
          error: true,
        })
        console.error('Pet sync failed', error)
      },
    )

    return () => {
      unsubscribe()
      updateSyncSource('pet', null)
      updateSyncSource('pet-action', null)
    }
  }, [user, applyLocal, commitDeaths, migrateLocalKennel])

  const by = caregiverName(user?.displayName, user?.email)

  const hatch = useCallback(
    (species: string, name: string) => {
      const pet = hatchPet(species, name, 0, today)
      applyPetMutation((k) => addPetToKennel(k, pet))
    },
    [applyPetMutation, today],
  )

  const feed = useCallback(
    (petId: string) => {
      applyPetMutation((k) =>
        updatePetInKennel(k, petId, (pet) => feedPet(pet, by, today)),
      )
    },
    [applyPetMutation, by, today],
  )

  const clean = useCallback(
    (petId: string) => {
      applyPetMutation((k) =>
        updatePetInKennel(k, petId, (pet) => cleanPet(pet, by, today)),
      )
    },
    [applyPetMutation, by, today],
  )

  const play = useCallback(
    (petId: string) => {
      applyPetMutation((k) =>
        updatePetInKennel(k, petId, (pet) => playWithPet(pet, by, today)),
      )
    },
    [applyPetMutation, by, today],
  )

  const remove = useCallback(
    (petId: string) => {
      applyPetMutation((k) => removePetFromKennel(k, petId))
    },
    [applyPetMutation],
  )

  const rename = useCallback(
    (petId: string, name: string) => {
      applyPetMutation((k) =>
        updatePetInKennel(k, petId, (pet) => renamePet(pet, name)),
      )
    },
    [applyPetMutation],
  )

  const placeFurniture = useCallback(
    (assetId: string): string | null => {
      const prev = kennelRef.current.furniture
      const next = addFurniture(prev, assetId)
      if (next === prev) return null
      const added = next.find((item) => !prev.some((p) => p.id === item.id))
      if (!added) return null
      // Reuse one generated id if Firestore retries the transaction.
      applyPetMutation((k) => {
        if (k.furniture.length >= MAX_FURNITURE) return k
        if (k.furniture.some((item) => item.id === added.id)) return k
        return {
          ...k,
          furniture: [...k.furniture, added],
          updatedAt: Date.now(),
        }
      })
      return added.id
    },
    [applyPetMutation],
  )

  const deleteFurniture = useCallback(
    (furnitureId: string) => {
      applyPetMutation((k) => ({
        ...k,
        furniture: removeFurniture(k.furniture, furnitureId),
        updatedAt: Date.now(),
      }))
    },
    [applyPetMutation],
  )

  const relocateFurniture = useCallback(
    (furnitureId: string, x: number, y: number) => {
      applyPetMutation((k) => ({
        ...k,
        furniture: moveFurniture(k.furniture, furnitureId, x, y),
        updatedAt: Date.now(),
      }))
    },
    [applyPetMutation],
  )

  const mirrorFurniture = useCallback(
    (furnitureId: string) => {
      applyPetMutation((k) => ({
        ...k,
        furniture: flipFurniture(k.furniture, furnitureId),
        updatedAt: Date.now(),
      }))
    },
    [applyPetMutation],
  )

  const reshapeFurniture = useCallback(
    (furnitureId: string, rotation: number, scale: number) => {
      applyPetMutation((k) => ({
        ...k,
        furniture: transformFurniture(k.furniture, furnitureId, rotation, scale),
        updatedAt: Date.now(),
      }))
    },
    [applyPetMutation],
  )

  return {
    pets: kennel.pets,
    furniture: kennel.furniture,
    today,
    canAddPet: kennel.pets.length < MAX_PETS,
    maxPets: MAX_PETS,
    hatch,
    feed,
    clean,
    play,
    remove,
    rename,
    placeFurniture,
    deleteFurniture,
    relocateFurniture,
    mirrorFurniture,
    reshapeFurniture,
  }
}

export type { SharedPet, PlacedFurniture }
