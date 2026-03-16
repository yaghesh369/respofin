import { startTransition, useEffect, useState } from 'react'
import { AuthContext } from './auth.context.js'
import { loginAccount, logoutAccount, registerAccount } from '../api/auth.js'
import { clearStoredSession, getStoredSession, setStoredSession } from '../lib/storage.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getStoredSession())
  const [isBooting, setIsBooting] = useState(true)

  useEffect(() => {
    setSession(getStoredSession())
    setIsBooting(false)

    const handleStorage = () => {
      setSession(getStoredSession())
    }

    const handleExpiry = () => {
      clearStoredSession()
      setSession(null)
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('respofin:session-expired', handleExpiry)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('respofin:session-expired', handleExpiry)
    }
  }, [])

  function applySession(nextSession) {
    setStoredSession(nextSession)
    startTransition(() => {
      setSession(nextSession)
    })
  }

  async function signIn(payload) {
    const nextSession = await loginAccount(payload)
    applySession(nextSession)
    return nextSession
  }

  async function signUp(payload) {
    const nextSession = await registerAccount(payload)
    applySession(nextSession)
    return nextSession
  }

  async function signOut() {
    try {
      if (session?.refresh) {
        await logoutAccount({ refresh: session.refresh })
      }
    } finally {
      clearStoredSession()
      startTransition(() => {
        setSession(null)
      })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        clearSession: () => {
          clearStoredSession()
          setSession(null)
        },
        isAuthenticated: Boolean(session?.access),
        isBooting,
        session,
        signIn,
        signOut,
        signUp,
        user: session?.user ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}