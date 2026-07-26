import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useCallback, useEffect, useRef, useState } from 'react'
import { todayKey } from '../lib/date'
import { db, syncRoomId } from '../lib/firebase'
import {
  addFurniture,
  flipFurniture,
  moveFurniture,
  removeFurniture,
  transformFurniture,
  type PlacedFurniture,
} from '../lib/furniture'
import {
  addHatchedPet,
  applyKennelDeathCheck,
  cleanPet,
  feedPet,
  loadLocalKennel,
  MAX_PETS,
  normalizeKennel,
  playWithPet,
  removePetFromKennel,
  renamePet,
  saveLocalKennel,
  updatePetInKennel,
  type PetKennel,
  type SharedPet,
} from '../lib/pet'
import { updateSyncSource } from '../lib/syncStatus'
import { useFirebaseAuth } from './firebaseAuthContext'

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
  const [kennel, setKennel] = useState<PetKennel>(() =>
    applyKennelDeathCheck(loadLocalKennel()),
  )
  const kennelRef = useRef(kennel)
  const today = todayKey()

  useEffect(() => {
    kennelRef.current = kennel
  }, [kennel])

  const persist = useCallback((next: PetKennel) => {
    const checked = applyKennelDeathCheck(next)
    kennelRef.current = checked
    saveLocalKennel(checked)
    setKennel(checked)
    void setDoc(doc(db, 'rooms', syncRoomId, 'pet', 'current'), checked).catch(
      (error: unknown) => {
        console.error('Could not save pet', error)
      },
    )
    return checked
  }, [])

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

        if (!snapshot.exists()) {
          const local = applyKennelDeathCheck(loadLocalKennel())
          if (local.pets.length > 0 || local.furniture.length > 0) {
            void setDoc(petRefDoc, local).catch((error: unknown) => {
              console.error('Could not migrate local pet', error)
            })
          }
          saveLocalKennel(local)
          kennelRef.current = local
          setKennel(local)
          return
        }

        const raw = snapshot.data()
        const remote = applyKennelDeathCheck(normalizeKennel(raw))
        const before = normalizeKennel(raw)
        const died = remote.pets.some((pet, i) => {
          const prior = before.pets[i]
          return pet.status === 'dead' && prior?.status === 'alive'
        })
        if (died) {
          void setDoc(petRefDoc, remote).catch((error: unknown) => {
            console.error('Could not mark pet dead', error)
          })
        }
        saveLocalKennel(remote)
        kennelRef.current = remote
        setKennel(remote)
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
    }
  }, [user])

  const by = caregiverName(user?.displayName, user?.email)

  const hatch = useCallback(
    (species: string, name: string) => {
      persist(addHatchedPet(kennelRef.current, species, name, today))
    },
    [persist, today],
  )

  const feed = useCallback(
    (petId: string) => {
      persist(
        updatePetInKennel(kennelRef.current, petId, (pet) =>
          feedPet(pet, by, today),
        ),
      )
    },
    [by, persist, today],
  )

  const clean = useCallback(
    (petId: string) => {
      persist(
        updatePetInKennel(kennelRef.current, petId, (pet) =>
          cleanPet(pet, by, today),
        ),
      )
    },
    [by, persist, today],
  )

  const play = useCallback(
    (petId: string) => {
      persist(
        updatePetInKennel(kennelRef.current, petId, (pet) =>
          playWithPet(pet, by, today),
        ),
      )
    },
    [by, persist, today],
  )

  const remove = useCallback(
    (petId: string) => {
      persist(removePetFromKennel(kennelRef.current, petId))
    },
    [persist],
  )

  const rename = useCallback(
    (petId: string, name: string) => {
      persist(
        updatePetInKennel(kennelRef.current, petId, (pet) =>
          renamePet(pet, name),
        ),
      )
    },
    [persist],
  )

  const placeFurniture = useCallback(
    (assetId: string): string | null => {
      const prev = kennelRef.current.furniture
      const next = addFurniture(prev, assetId)
      if (next === prev) return null
      const added = next.find((item) => !prev.some((p) => p.id === item.id))
      persist({
        ...kennelRef.current,
        furniture: next,
        updatedAt: Date.now(),
      })
      return added?.id ?? null
    },
    [persist],
  )

  const deleteFurniture = useCallback(
    (furnitureId: string) => {
      persist({
        ...kennelRef.current,
        furniture: removeFurniture(kennelRef.current.furniture, furnitureId),
        updatedAt: Date.now(),
      })
    },
    [persist],
  )

  const relocateFurniture = useCallback(
    (furnitureId: string, x: number, y: number) => {
      persist({
        ...kennelRef.current,
        furniture: moveFurniture(
          kennelRef.current.furniture,
          furnitureId,
          x,
          y,
        ),
        updatedAt: Date.now(),
      })
    },
    [persist],
  )

  const mirrorFurniture = useCallback(
    (furnitureId: string) => {
      persist({
        ...kennelRef.current,
        furniture: flipFurniture(kennelRef.current.furniture, furnitureId),
        updatedAt: Date.now(),
      })
    },
    [persist],
  )

  const reshapeFurniture = useCallback(
    (furnitureId: string, rotation: number, scale: number) => {
      persist({
        ...kennelRef.current,
        furniture: transformFurniture(
          kennelRef.current.furniture,
          furnitureId,
          rotation,
          scale,
        ),
        updatedAt: Date.now(),
      })
    },
    [persist],
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
