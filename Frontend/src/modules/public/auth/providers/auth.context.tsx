import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react"

type AuthContextValue = {
  isAuthenticated: boolean
  isPending: boolean
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = "stahl.isAuthenticated"

export function AuthProvider({ children }: PropsWithChildren) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === "true"
  })

  const login = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true")
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "false")
    setIsAuthenticated(false)
  }, [])

  const value = useMemo(
    () => ({ isAuthenticated, isPending: false, login, logout }),
    [isAuthenticated, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuthContext must be used within AuthProvider")
  }
  return ctx
}
