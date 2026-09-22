import urls from "@/constants/urls"
import { api, unwrap } from "@/lib/api"
import type { ApiEnvelope, SearchResponse } from "@/types"

export async function search(
  query: string,
  signal?: AbortSignal
): Promise<SearchResponse> {
  return unwrap(
    await api.post<ApiEnvelope<SearchResponse>>(
      urls.search,
      { query },
      { signal }
    )
  )
}
