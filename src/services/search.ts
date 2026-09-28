import urls from "@/constants/urls"
import { api, unwrap } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import type { ApiEnvelope, AskAnswer, ProfileMatches } from "@/types"

/** The server rejects anything shorter. */
export const MIN_QUERY_LENGTH = 3

/**
 * What a conversation is pinned to. Sent when a set is created, and never
 * alongside a conversationId: the server 422s any attempt to change them.
 */
export type SearchOptions = {
  /** 1-40. */
  limit: number
  /** How much of each resume the model reads, 500-20000. */
  charsPerDocument: number
  /**
   * Skip profiles whose PDF is missing and keep scanning until `limit` are
   * found. When false those profiles are listed, but never pinned for chat.
   */
  requireResume: boolean
}

/**
 * Ranked profile matches, straight from vector search. Also opens a
 * conversation pinned to these results; its id goes on every follow-up.
 */
export async function searchProfiles(
  query: string,
  options: SearchOptions,
  signal?: AbortSignal
): Promise<ProfileMatches> {
  return unwrap(
    await api.post<ApiEnvelope<ProfileMatches>>(
      urls.searchProfiles,
      { query, ...options },
      { signal }
    )
  )
}

/**
 * A written answer over a pinned set of resumes. Without a conversationId the
 * server retrieves and pins in the same call. With one, `options` must be left
 * out: the set is fixed, and the server answers 422 if you try to change it.
 */
export async function askProfiles(
  question: string,
  target: { conversationId: string } | { options: SearchOptions },
  signal?: AbortSignal
): Promise<AskAnswer> {
  const body =
    "conversationId" in target
      ? { question, conversationId: target.conversationId }
      : { question, ...target.options }

  return unwrap(
    await api.post<ApiEnvelope<AskAnswer>>(urls.searchAsk, body, { signal })
  )
}

/**
 * Frees the server's copy of the conversation. A 404 means it is already gone.
 * Pass `token` when the session is ending and the store's token is already
 * cleared; the request interceptor leaves an explicit header alone.
 */
export async function endConversation(
  conversationId: string,
  token?: string
): Promise<void> {
  await api.post(
    urls.searchEndConversation,
    { conversationId },
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  )
}

/**
 * The same call for a page that is closing, where an axios request would be
 * cancelled. `keepalive` lets the browser finish it after the page is gone.
 */
export function endConversationOnUnload(conversationId: string) {
  const token = useAuthStore.getState().token
  void fetch(`${api.defaults.baseURL}${urls.searchEndConversation}`, {
    method: "POST",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ conversationId }),
  }).catch(() => {})
}
