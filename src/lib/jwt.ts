import { jwtDecode } from "jwt-decode"
import type { TokenPayload } from "@/types"

/**
 * Reads the claims out of a JWT. This does NOT verify the signature -- only the
 * server can do that. Treat the result as a UI hint, never as authorisation.
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = jwtDecode<TokenPayload>(token)
    // Without a usable exp the session would never expire on the client.
    return typeof payload.exp === "number" ? payload : null
  } catch {
    return null
  }
}

export function isExpired(payload: TokenPayload, skewSeconds = 0): boolean {
  return payload.exp * 1000 <= Date.now() + skewSeconds * 1000
}

/**
 * Milliseconds until the token expires; 0 if already expired. Capped at the
 * largest delay setTimeout can hold -- anything above it wraps around and fires
 * immediately, which would log the user straight back out.
 */
export function msUntilExpiry(payload: TokenPayload): number {
  const MAX_TIMEOUT = 2_147_483_647
  return Math.min(MAX_TIMEOUT, Math.max(0, payload.exp * 1000 - Date.now()))
}
