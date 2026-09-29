import urls from "@/constants/urls"
import { api, unwrap } from "@/lib/api"
import type { ApiEnvelope, ShortlistItem } from "@/types"

export async function listShortlist(): Promise<ShortlistItem[]> {
  return unwrap(await api.get<ApiEnvelope<{ items: ShortlistItem[] }>>(urls.shortlist)).items
}

/** Saving a candidate that's already saved is a no-op, not an error. */
export async function addToShortlist(input: {
  profileId: string
  query?: string
  note?: string
}): Promise<ShortlistItem> {
  return unwrap(await api.post<ApiEnvelope<ShortlistItem>>(urls.shortlistAdd, input))
}

export async function saveShortlistNote(profileId: string, note: string): Promise<string> {
  return unwrap(
    await api.put<ApiEnvelope<{ note: string }>>(urls.shortlistNote(profileId), { note })
  ).note
}

export async function removeFromShortlist(profileId: string): Promise<void> {
  await api.delete(urls.shortlistRemove(profileId))
}
