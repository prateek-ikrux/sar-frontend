import { create } from "zustand"
import { persist } from "zustand/middleware"
import { isExpired } from "@/lib/jwt"
import type { AuthSession, User } from "@/types"

/**
 * Why the last session ended, so the sign-in page can say so. "signed-out" is
 * the user's own choice and needs no explanation; "expired" covers both the
 * token running out and the server refusing it.
 */
export type SessionEnd = "signed-out" | "expired"

type AuthState = {
  token: string | null
  user: User | null
  endedBecause: SessionEnd | null
  setSession: (session: AuthSession) => void
  /** Replaces the stored user with a fresher copy from the server. */
  setUser: (user: User) => void
  logout: (reason?: SessionEnd) => void
}

/**
 * The signed-in user comes from the verify-otp response, then is refreshed
 * from GET /auth/me (see RequireAuth), so a role or name change made by an
 * admin reaches the UI without signing in again. The server enforces the
 * current role on every request regardless.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      endedBecause: null,
      setSession: ({ accessToken, user }) =>
        set({ token: accessToken, user, endedBecause: null }),
      setUser: (user) => set((state) => (state.token ? { user } : state)),
      logout: (reason = "signed-out") =>
        set((state) =>
          // Only the first reason counts: an expiry followed by the 401s of
          // requests already in flight is still an expiry.
          state.token
            ? { token: null, user: null, endedBecause: reason }
            : state
        ),
    }),
    {
      name: "sar-auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<AuthState> | undefined
        const token = saved?.token ?? null
        const user = saved?.user ?? null
        if (!token || !user) {
          return { ...current, token: null, user: null }
        }
        if (isExpired(token)) {
          return { ...current, token: null, user: null, endedBecause: "expired" }
        }
        return { ...current, token, user }
      },
    }
  )
)
