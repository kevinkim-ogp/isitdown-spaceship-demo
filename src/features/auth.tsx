'use client'

import {
  createContext,
  useCallback,
  useContext,
  type PropsWithChildren,
} from 'react'

import { LOGGED_IN_KEY } from '~/constants/localStorage'
import { useLocalStorage } from '~/hooks/useLocalStorage'

type AuthContextReturn = {
  hasAuthFlag?: boolean
  setHasAuthFlag: () => void
  removeAuthFlag: () => void
}

// Exported for testing.
export const AuthContext = createContext<AuthContextReturn | null>(null)

/**
 * Provider component that wraps your app and makes client login state boolean available
 * to any child component that calls `useAuth()`.
 */
export const AuthProvider = ({ children }: PropsWithChildren) => {
  const authState = useProvideAuth()
  console.log('authState', authState)
  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  )
}

/**
 * Hook for components nested in AuthProvider component to get the current auth state.
 */
export const useAuth = (): AuthContextReturn => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error(`useAuth must be used within an AuthProvider component`)
  }
  return context
}

const useProvideAuth = () => {
  const [hasAuthFlag, setAuthFlag] = useLocalStorage<boolean>(
    LOGGED_IN_KEY,
    undefined,
  )

  const setHasAuthFlag = useCallback(() => {
    setAuthFlag(true)
  }, [setAuthFlag])

  const removeAuthFlag = useCallback(() => {
    setAuthFlag(undefined)
  }, [setAuthFlag])

  return {
    hasAuthFlag: !!hasAuthFlag,
    setHasAuthFlag,
    removeAuthFlag,
  }
}
