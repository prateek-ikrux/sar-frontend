import { create } from "zustand"
import { persist } from "zustand/middleware"
import { decodeToken, isExpired } from "@/lib/jwt"
import type { TokenPayload } from "@/types"

type AuthState = {
  token: string | null
  user: TokenPayload | null
  setToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setToken: (token) => set({ token, user: decodeToken(token) }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: "sar-auth",
      // Only the token is durable; claims are always re-derived from it.
      partialize: (state) => ({ token: state.token }),
      merge: (persisted, current) => {
        const token = (persisted as { token?: string | null } | undefined)?.token ?? null
        const user = token ? decodeToken(token) : null
        if (!user || isExpired(user)) return { ...current, token: null, user: null }
        return { ...current, token, user }
      },
    }
  )
)
