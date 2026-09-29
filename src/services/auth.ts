import urls from "@/constants/urls"
import { api, unwrap } from "@/lib/api"
import type { ApiEnvelope, AuthSession, OtpChallenge, User } from "@/types"

/** How many wrong guesses one code survives. Mirrors the server's OTP_MAX_ATTEMPTS. */
export const OTP_MAX_ATTEMPTS = 5

/**
 * Mails a 6-digit code if the address belongs to an active user. The server
 * answers 200 either way, so nobody can probe which addresses have accounts.
 */
export async function requestOtp(email: string): Promise<OtpChallenge> {
  return unwrap(
    await api.post<ApiEnvelope<OtpChallenge>>(urls.requestOtp, { email })
  )
}

/** Exchanges the code for an access token. Every rejection comes back as a 401. */
export async function verifyOtp(
  email: string,
  code: string
): Promise<AuthSession> {
  return unwrap(
    await api.post<ApiEnvelope<AuthSession>>(urls.verifyOtp, { email, code })
  )
}

/** The signed-in user as the server sees them now. */
export async function getMe(): Promise<User> {
  return unwrap(await api.get<ApiEnvelope<User>>(urls.me))
}
