import urls from "@/constants/urls"
import { api, unwrap } from "@/lib/api"
import type { ApiEnvelope, AuthSession, OtpChallenge, User } from "@/types"

/** How many wrong guesses one code survives. Mirrors the server's OTP_MAX_ATTEMPTS. */
export const OTP_MAX_ATTEMPTS = 5

/** The shortest password the server accepts. Mirrors the server's rule. */
export const PASSWORD_MIN_LENGTH = 12

/**
 * Checks the password, then mails a 6-digit code. A wrong password, an unknown
 * address and a disabled account all come back as the same 401, so nobody can
 * probe which addresses have accounts.
 */
export async function requestOtp(
  email: string,
  password: string
): Promise<OtpChallenge> {
  return unwrap(
    await api.post<ApiEnvelope<OtpChallenge>>(urls.requestOtp, { email, password })
  )
}

/**
 * Mails a reset code if the address belongs to an active user. The server
 * answers 200 either way, so nobody can probe which addresses have accounts.
 */
export async function forgotPassword(email: string): Promise<OtpChallenge> {
  return unwrap(
    await api.post<ApiEnvelope<OtpChallenge>>(urls.forgotPassword, { email })
  )
}

/** Sets a new password with the emailed code. A bad or expired code is a 401. */
export async function resetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<{ email: string }> {
  return unwrap(
    await api.post<ApiEnvelope<{ email: string }>>(urls.resetPassword, {
      email,
      code,
      newPassword,
    })
  )
}

/** Replaces the signed-in user's password and returns a fresh session. */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<AuthSession> {
  return unwrap(
    await api.post<ApiEnvelope<AuthSession>>(urls.changePassword, {
      currentPassword,
      newPassword,
    })
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
