import { create } from "zustand"
import { persist } from "zustand/middleware"
import { isExpired } from "@/lib/jwt"
import type { AuthSession, User } from "@/types"

type AuthState = {
  token: string | null
  user: User | null
  setSession: (session: AuthSession) => void
  logout: () => void
}

/**
 * The signed-in user comes from the verify-otp response, not from the JWT: the
 * server's token carries only an id, so the claims cannot drive the UI.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: ({ accessToken, user }) => set({ token: accessToken, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: "sar-auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<AuthState> | undefined
        const token = saved?.token ?? null
        const user = saved?.user ?? null
        if (!token || !user || isExpired(token)) {
          return { ...current, token: null, user: null }
        }
        return { ...current, token, user }
      },
    }
  )
)
