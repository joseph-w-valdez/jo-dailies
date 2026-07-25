import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'

export interface FirebaseAuthValue {
  user: User | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

export const FirebaseAuthContext = createContext<FirebaseAuthValue | null>(null)

export function useFirebaseAuth(): FirebaseAuthValue {
  const value = useContext(FirebaseAuthContext)
  if (!value) {
    throw new Error('useFirebaseAuth must be used inside FirebaseAuthProvider')
  }
  return value
}
