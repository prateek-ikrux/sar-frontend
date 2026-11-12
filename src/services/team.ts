import urls from "@/constants/urls"
import { api, unwrap } from "@/lib/api"
import type { ActivityFlag, ActivityRange, ApiEnvelope, TeamSummary, WeeklyEmailSettings } from "@/types"

/** The admin's own time zone, so days and nights are theirs. */
export const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"

export async function getTeamSummary(days: ActivityRange): Promise<TeamSummary> {
  return unwrap(await api.get<ApiEnvelope<TeamSummary>>(urls.teamSummary, { params: { days, tz: timeZone() } }))
}

export async function getFlags(days: ActivityRange, userId?: string): Promise<ActivityFlag[]> {
  return unwrap(
    await api.get<ApiEnvelope<{ flags: ActivityFlag[] }>>(urls.teamFlags, {
      params: { days, tz: timeZone(), ...(userId ? { userId } : {}) },
    })
  ).flags
}

export async function getWeeklyEmail(): Promise<WeeklyEmailSettings> {
  return unwrap(await api.get<ApiEnvelope<WeeklyEmailSettings>>(urls.teamWeeklyEmail))
}

export async function saveWeeklyEmail(input: {
  enabled: boolean
  recipientIds: string[]
  timeZone: string
}): Promise<WeeklyEmailSettings> {
  return unwrap(await api.put<ApiEnvelope<WeeklyEmailSettings>>(urls.teamWeeklyEmail, input))
}

/** Sends the summary now, to the signed-in admin only. */
export async function sendTestWeeklyEmail(): Promise<string> {
  return unwrap(await api.post<ApiEnvelope<{ to: string }>>(urls.teamWeeklyEmailTest)).to
}
