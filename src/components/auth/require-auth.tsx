import { useEffect } from "react"
import { Navigate, Outlet, useLocation } from "react-router"
import { useAuthStore } from "@/stores/auth-store"
import { msUntilExpiry } from "@/lib/jwt"

export function RequireAuth() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()

  // End the session the moment the token's exp passes, without waiting for a
  // request to come back 401.
  useEffect(() => {
    if (!user) return
    const timer = setTimeout(logout, msUntilExpiry(user))
    return () => clearTimeout(timer)
  }, [user, logout])

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
