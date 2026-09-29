import { useEffect } from "react"
import { Navigate, Outlet, useLocation } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { msUntilExpiry } from "@/lib/jwt"
import { getMe } from "@/services/auth"
import { useAuthStore } from "@/stores/auth-store"

/** How long before the session ends to warn about it. */
const EXPIRY_WARNING_MS = 2 * 60 * 1000

export function RequireAuth() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const setUser = useAuthStore((s) => s.setUser)
  const location = useLocation()

  // End the session the moment the token's exp passes, without waiting for a
  // request to come back 401, and give a warning shortly before. Tokens
  // without an exp just rely on that 401.
  useEffect(() => {
    if (!token) return
    const ms = msUntilExpiry(token)
    if (ms === null) return
    const warning =
      ms > EXPIRY_WARNING_MS
        ? setTimeout(
            () =>
              toast.warning("Your session ends in 2 minutes", {
                description:
                  "You'll need to sign in again. Your search and chat will be kept.",
                duration: 15_000,
              }),
            ms - EXPIRY_WARNING_MS
          )
        : undefined
    const expiry = setTimeout(() => logout("expired"), ms)
    return () => {
      clearTimeout(warning)
      clearTimeout(expiry)
    }
  }, [token, logout])

  // The stored user is a snapshot from sign-in. Refreshing it on load and on
  // return to the tab means an admin's change to someone's role or name shows
  // up without them signing in again.
  const me = useQuery({
    queryKey: ["me", token],
    queryFn: getMe,
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    const fresh = me.data
    const stored = useAuthStore.getState().user
    if (!fresh || !stored) return
    if (fresh.role !== stored.role) {
      toast.info(
        fresh.role === "admin"
          ? "You're now an admin, so you can manage users."
          : "Your role changed to recruiter."
      )
    }
    if (fresh.role !== stored.role || fresh.name !== stored.name || fresh.email !== stored.email) {
      setUser(fresh)
    }
  }, [me.data, setUser])

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}
