import urls from "@/constants/urls"
import { api, unwrap } from "@/lib/api"
import type { ApiEnvelope, AuthSession, OtpChallenge } from "@/types"

/** Mails a 6-digit code to a registered address. 404 if nobody owns it. */
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
