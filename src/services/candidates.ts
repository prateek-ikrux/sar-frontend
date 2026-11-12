import urls from "@/constants/urls"
import { api, unwrap } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import type { ApiEnvelope, CandidateTag, CandidateTagValue } from "@/types"

// Every call here is recorded against the candidate, so other recruiters can
// see they're being worked on.

export type Contact = { profileId: string; email: string | null; phone: string | null }

export async function revealContact(profileId: string): Promise<Contact> {
  return unwrap(await api.post<ApiEnvelope<Contact>>(urls.candidateContact(profileId)))
}

/**
 * Reports a resume being opened. The link goes straight to file storage, so
 * this is the only way the server hears of it. `keepalive` lets it finish as
 * the new tab takes focus; a failure is not worth telling anyone about.
 */
export function reportResumeView(profileId: string) {
  const token = useAuthStore.getState().token
  void fetch(`${api.defaults.baseURL}${urls.candidateResumeView(profileId)}`, {
    method: "POST",
    keepalive: true,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).catch(() => {})
}

/** A short-lived link that saves the resume instead of opening it. */
export async function resumeDownloadUrl(profileId: string): Promise<string> {
  return unwrap(
    await api.post<ApiEnvelope<{ url: string }>>(urls.candidateResumeDownload(profileId))
  ).url
}

/** Sets the signed-in recruiter's tag; resolves to everyone's tags. */
export async function setTag(
  profileId: string,
  tag: CandidateTagValue,
  note = ""
): Promise<CandidateTag[]> {
  return unwrap(
    await api.put<ApiEnvelope<{ tags: CandidateTag[] }>>(urls.candidateTag(profileId), { tag, note })
  ).tags
}

export async function clearTag(profileId: string): Promise<CandidateTag[]> {
  return unwrap(await api.delete<ApiEnvelope<{ tags: CandidateTag[] }>>(urls.candidateTag(profileId)))
    .tags
}

/** Contact details for a spreadsheet, in the order asked for. */
export async function exportContacts(input: {
  profileIds: string[]
  source: "search" | "shortlist"
  query?: string
}): Promise<Contact[]> {
  return unwrap(await api.post<ApiEnvelope<{ rows: Contact[] }>>(urls.candidatesExport, input)).rows
}
