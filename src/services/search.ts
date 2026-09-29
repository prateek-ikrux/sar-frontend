import urls from "@/constants/urls"
import { api, endSessionOn401, isAbort, toApiError, unwrap } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import type { ApiEnvelope, AskAnswer, ProfileMatches, SearchProfile } from "@/types"

/** The server rejects anything shorter. */
export const MIN_QUERY_LENGTH = 3

/**
 * Mirrors the server's MAX_CONTEXT_CHARS: limit x charsPerDocument above this
 * is a 422, since it is how much resume text every answer re-reads.
 */
export const MAX_CONTEXT_CHARS = 200_000

/**
 * Gives up on a stream that has gone quiet for this long. The server sends a
 * heartbeat every 15 seconds and bounds its model call at about 2 minutes, so
 * silence past this means the connection, not the model, is stuck.
 */
const STREAM_IDLE_TIMEOUT_MS = 60_000

/**
 * What a conversation is pinned to. Sent when a set is created, and never
 * alongside a conversationId: the server 422s any attempt to change them.
 */
export type SearchOptions = {
  /** 1-40. */
  limit: number
  /**
   * How much of each resume the model reads, 500-20000. Its product with
   * `limit` is capped at MAX_CONTEXT_CHARS.
   */
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

export type AskTarget = { conversationId: string } | { options: SearchOptions }

export type StreamHandlers = {
  /** The set is known: sent before the first word, so it can be shown early. */
  onMeta?: (meta: { conversationId: string; sources: SearchProfile[] }) => void
  onToken?: (text: string) => void
}

function parseEvent(block: string): { event: string; data: unknown } | null {
  let event = ""
  let data = ""
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim()
    else if (line.startsWith("data:")) data += line.slice(5).trim()
  }
  // A heartbeat is a bare comment line, with neither.
  return event ? { event, data: data ? JSON.parse(data) : null } : null
}

/**
 * A written answer over a pinned set of resumes, streamed as it is written.
 * Without a conversationId the server retrieves and pins in the same call,
 * and `onMeta` hands over that set before the answer starts. Aborting
 * `signal` stops the model; the server then records nothing for this turn.
 */
export async function streamAsk(
  question: string,
  target: AskTarget,
  handlers: StreamHandlers = {},
  signal?: AbortSignal
): Promise<AskAnswer> {
  const token = useAuthStore.getState().token
  const body =
    "conversationId" in target
      ? { question, conversationId: target.conversationId }
      : { question, ...target.options }

  // One controller for both the caller's Stop and the idle timeout.
  const controller = new AbortController()
  const stopWith = () => controller.abort(signal?.reason)
  signal?.addEventListener("abort", stopWith, { once: true })
  let timedOut = false
  let idle: ReturnType<typeof setTimeout> | undefined
  const armIdle = () => {
    clearTimeout(idle)
    idle = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, STREAM_IDLE_TIMEOUT_MS)
  }

  try {
    armIdle()
    let response: Response
    try {
      response = await fetch(`${api.defaults.baseURL}${urls.searchAskStream}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (error) {
      if (timedOut) throw toApiError({ timedOut: true })
      if (isAbort(error)) throw error
      throw toApiError({})
    }

    if (!response.ok || !response.body) {
      const errorBody = await response.json().catch(() => null)
      endSessionOn401(response.status, Boolean(token))
      throw toApiError({ status: response.status, body: errorBody, url: urls.searchAskStream })
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ""
    let answer: AskAnswer | null = null

    try {
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        armIdle()
        buffer += value

        let boundary: number
        while ((boundary = buffer.indexOf("\n\n")) >= 0) {
          const parsed = parseEvent(buffer.slice(0, boundary))
          buffer = buffer.slice(boundary + 2)
          if (!parsed) continue

          if (parsed.event === "meta") {
            handlers.onMeta?.(parsed.data as { conversationId: string; sources: SearchProfile[] })
          } else if (parsed.event === "token") {
            handlers.onToken?.((parsed.data as { text: string }).text)
          } else if (parsed.event === "done") {
            answer = parsed.data as AskAnswer
          } else if (parsed.event === "error") {
            const data = parsed.data as { statusCode?: number; message?: string; errors?: string[] }
            throw toApiError({ status: data.statusCode ?? 500, body: data, url: urls.searchAskStream })
          }
        }
      }
    } catch (error) {
      if (timedOut) throw toApiError({ timedOut: true })
      if (isAbort(error) || controller.signal.aborted) {
        throw new DOMException("Stopped", "AbortError")
      }
      throw error
    }

    // The connection closed without a verdict: a proxy or the server died.
    if (!answer) throw toApiError({ status: 502 })
    return answer
  } finally {
    clearTimeout(idle)
    signal?.removeEventListener("abort", stopWith)
  }
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
