import urls from "@/constants/urls"
import { api } from "@/lib/api"
import type { SearchResponse } from "@/types"

export async function search(
  query: string,
  signal?: AbortSignal
): Promise<SearchResponse> {
  const { data } = await api.post<SearchResponse>(
    urls.search,
    { query },
    { signal }
  )
  return data
}
