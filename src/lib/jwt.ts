import { jwtDecode } from "jwt-decode"
import type { TokenClaims } from "@/types"

/**
 * Reads the claims out of a JWT. This does NOT verify the signature -- only the
 * server can do that. Treat the result as a UI hint, never as authorisation.
 */
export function decodeToken(token: string): TokenClaims | null {
  try {
    return jwtDecode<TokenClaims>(token)
  } catch {
    return null
  }
}

/** A token with no `exp` never expires client-side; the 401 handler catches it. */
export function isExpired(token: string, skewSeconds = 0): boolean {
  const exp = decodeToken(token)?.exp
  if (typeof exp !== "number") return false
  return exp * 1000 <= Date.now() + skewSeconds * 1000
}

/**
 * Milliseconds until the token expires, or null when it carries no `exp`.
 * Capped at the largest delay setTimeout can hold -- anything above it wraps
 * around and fires immediately, which would log the user straight back out.
 */
export function msUntilExpiry(token: string): number | null {
  const MAX_TIMEOUT = 2_147_483_647
  const exp = decodeToken(token)?.exp
  if (typeof exp !== "number") return null
  return Math.min(MAX_TIMEOUT, Math.max(0, exp * 1000 - Date.now()))
}
