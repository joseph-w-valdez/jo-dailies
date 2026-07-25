import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  FirebaseAuthContext,
  type FirebaseAuthValue,
} from '../hooks/firebaseAuthContext'
import {
  auth,
  firebaseConfigured,
  googleProvider,
} from '../lib/firebase'

function authErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Could not sign in. Please try again.'
}

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false)
      setError('Firebase environment variables are missing.')
      return
    }

    return onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser)
        setLoading(false)
        setError(null)
      },
      (nextError) => {
        setLoading(false)
        setError(authErrorMessage(nextError))
      },
    )
  }, [])

  const value = useMemo<FirebaseAuthValue>(
    () => ({
      user,
      loading,
      error,
      signIn: async () => {
        setError(null)
        try {
          await signInWithPopup(auth, googleProvider)
        } catch (nextError) {
          setError(authErrorMessage(nextError))
        }
      },
      signOut: () => firebaseSignOut(auth),
    }),
    [error, loading, user],
  )

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  )
}
