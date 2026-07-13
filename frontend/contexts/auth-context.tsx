"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { getMe, signIn as apiSignIn, signOut as apiSignOut, signUp as apiSignUp } from "@/lib/api-auth"
import type { AuthResponse, SignInRequest, SignUpRequest, User } from "@/lib/types"

interface AuthContextValue {
  user: User | null
  loading: boolean
  signIn: (body: SignInRequest) => Promise<void>
  signUp: (body: SignUpRequest) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    try {
      const u = await getMe()
      setUser(u)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  const signIn = useCallback(async (body: SignInRequest) => {
    const res = await apiSignIn(body)
    setUser({ id: res.id, email: res.email, name: res.name })
  }, [])

  const signUp = useCallback(async (body: SignUpRequest) => {
    await apiSignUp(body)
  }, [])

  const signOut = useCallback(async () => {
    await apiSignOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
