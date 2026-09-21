import urls from "@/constants/urls"
import { api } from "@/lib/api"

export async function requestOtp(email: string): Promise<{ ok: true }> {
  const { data } = await api.post<{ ok: true }>(urls.requestOtp, { email })
  return data
}

export async function verifyOtp(email: string, otp: string): Promise<string> {
  const { data } = await api.post<{ token: string }>(urls.verifyOtp, {
    email,
    otp,
  })
  return data.token
}
