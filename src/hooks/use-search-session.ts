import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { ApiError, isAbort } from "@/lib/api"
import { DEFAULT_OPTIONS } from "@/lib/search-options"
import { tabStore } from "@/lib/storage"
import {
  endConversation,
  endConversationOnUnload,
  searchProfiles,
  streamAsk,
  type AskTarget,
  type SearchOptions,
  type StreamHandlers,
} from "@/services/search"
import { useAuthStore } from "@/stores/auth-store"
import type { AskAnswer, SearchProfile } from "@/types"

export type ChatMessage =
  | {
      id: string
      role: "user"
      text: string
      status: "pending" | "sent" | "failed" | "stopped"
    }
  | {
      id: string
      role: "assistant"
      text: string
      /** The question this answers, for the "search for this instead" hint. */
      question: string
      /**
       * Profile ids in the order the answer's [n] counts them: [1] is
       * citations[0]. Held per answer, so a citation keeps pointing at the
       * same person even after the list on the left is replaced.
       */
      citations: string[]
      streaming: boolean
      /** Cut short by Stop; the server kept no record of it. */
      stopped?: boolean
    }
  /** A quiet inline note from the app itself, e.g. that the chat restarted. */
  | { id: string; role: "notice"; text: string }

type Session = {
  /** Set while the server holds a conversation pinned to `profiles`. */
  conversationId: string | null
  /** The search (or first question) that produced the pinned set. */
  query: string
  /** The settings `profiles` was retrieved with, reused to re-open it. */
  pinnedOptions: SearchOptions
  /** Everything the search returned. null before the first search, and after "New search". */
  profiles: SearchProfile[] | null
  /** The subset the conversation holds, in citation order: [1] is pinnedIds[0]. */
  pinnedIds: string[]
  messages: ChatMessage[]
}

const EMPTY: Session = {
  conversationId: null,
  query: "",
  pinnedOptions: DEFAULT_OPTIONS,
  profiles: null,
  pinnedIds: [],
  messages: [],
}

type Stored = { session: Session; options: SearchOptions }

const storageKey = (userId: string) => `sar-search:${userId}`

/**
 * The server pins only profiles with a resume file, in result order, and the
 * answer's [n] counts those. Mirrors its filter so the list numbers match.
 */
const pinnedIdsOf = (profiles: SearchProfile[]) =>
  profiles.filter((p) => p.resumeUrl).map((p) => p.id)

const sameIds = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, i) => id === b[i])

/** Swaps in fresher copies (new PDF links) without moving any row. */
const refreshed = (profiles: SearchProfile[] | null, fresh: SearchProfile[]) =>
  (profiles ?? []).map((p) => fresh.find((f) => f.id === p.id) ?? p)

const newId = () => crypto.randomUUID()

/**
 * A stored session was written by an earlier page, which may have been closed
 * mid-question. Anything in flight then is marked as interrupted.
 */
function restore(userId: string | undefined): Stored | null {
  if (!userId) return null
  const stored = tabStore.read<Stored>(storageKey(userId))
  if (!stored?.session) return null
  return {
    options: stored.options ?? DEFAULT_OPTIONS,
    session: {
      ...EMPTY,
      ...stored.session,
      messages: stored.session.messages.flatMap((m): ChatMessage[] => {
        if (m.role === "user" && m.status === "pending") return [{ ...m, status: "failed" }]
        if (m.role === "assistant" && m.streaming) {
          return m.text ? [{ ...m, streaming: false, stopped: true }] : []
        }
        return [m]
      }),
    },
  }
}

function releaseConversation(conversationId: string | null) {
  // Freeing server memory is a courtesy, not something to report on.
  if (conversationId) endConversation(conversationId).catch(() => {})
}

function reportError(error: unknown) {
  if (isAbort(error)) return
  if (error instanceof ApiError) {
    toast.error(error.message, { description: error.detail })
  } else {
    toast.error("Something went wrong", { description: "Try again in a moment." })
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * The search page's state machine: idle -> set pinned -> conversing. A search
 * pins a set of profiles to a server-side conversation, and every question
 * after that answers from exactly that set until the user starts over.
 *
 * The session is kept per tab (sessionStorage), so leaving the page, a
 * refresh, or an expired sign-in doesn't lose the work. The server side of a
 * conversation can vanish meanwhile; the next question then re-runs the same
 * search and carries on, saying so if the list changed.
 */
export function useSearchSession(userId: string | undefined) {
  const [initial] = useState(() => restore(userId))
  const [session, setSession] = useState<Session>(initial?.session ?? EMPTY)
  const [options, setOptions] = useState<SearchOptions>(initial?.options ?? DEFAULT_OPTIONS)
  const [searching, setSearching] = useState(false)
  const [asking, setAsking] = useState(false)

  // Bumped whenever the set is thrown away, so a response to a request made
  // for the old set lands nowhere instead of resurrecting it.
  const generation = useRef(0)
  const searchAbort = useRef<AbortController | null>(null)
  const askAbort = useRef<AbortController | null>(null)
  // Mirrors session.conversationId for cleanup paths that run outside render.
  const conversationRef = useRef<string | null>(initial?.session.conversationId ?? null)

  // Saved at most every half second, always with the latest state: a
  // streaming answer changes the session on every token, and a debounce
  // would never fire while it streams. Flushed when the page hides.
  const pendingWrite = useRef<{ key: string; value: Stored | null } | null>(null)
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flush = () => {
    if (writeTimer.current) clearTimeout(writeTimer.current)
    writeTimer.current = null
    const write = pendingWrite.current
    pendingWrite.current = null
    if (write) tabStore.write(write.key, write.value)
  }

  useEffect(() => {
    if (!userId) return
    const empty = session.profiles === null && session.messages.length === 0 && !session.query
    pendingWrite.current = { key: storageKey(userId), value: empty ? null : { session, options } }
    writeTimer.current ??= setTimeout(flush, 500)
  }, [userId, session, options])

  // The candidate details a conversation holds stay in server memory until
  // it is ended. A closing tab ends it (a refresh re-opens it on the next
  // question); signing out ends it and forgets the session, with the token
  // that was just removed. Leaving the page does not: the session is kept.
  useEffect(() => {
    const onPageHide = () => {
      flush()
      if (conversationRef.current) endConversationOnUnload(conversationRef.current)
    }
    const unsubscribe = useAuthStore.subscribe((state, prev) => {
      if (!prev.token || state.token) return
      if (conversationRef.current) {
        endConversation(conversationRef.current, prev.token).catch(() => {})
        conversationRef.current = null
      }
      // An expiry keeps the session for when they sign back in; choosing to
      // sign out clears it, since this may be a shared machine.
      if (state.endedBecause === "signed-out" && prev.user) {
        // Drop any queued save too, or it would write the session back.
        pendingWrite.current = null
        tabStore.write(storageKey(prev.user._id), null)
      }
    })
    window.addEventListener("pagehide", onPageHide)
    return () => {
      window.removeEventListener("pagehide", onPageHide)
      unsubscribe()
      flush()
    }
  }, [])

  function discard() {
    generation.current += 1
    searchAbort.current?.abort()
    askAbort.current?.abort()
    releaseConversation(conversationRef.current)
    conversationRef.current = null
    setSearching(false)
    setAsking(false)
  }

  /** Runs a search and pins its results. Resolves true when it succeeded. */
  async function search(query: string, withOptions: SearchOptions = options): Promise<boolean> {
    discard()
    const gen = generation.current
    const controller = new AbortController()
    searchAbort.current = controller

    setOptions(withOptions)
    setSession({ ...EMPTY, query, pinnedOptions: withOptions })
    setSearching(true)
    try {
      const matches = await searchProfiles(query, withOptions, controller.signal)
      if (gen !== generation.current) {
        releaseConversation(matches.conversationId)
        return false
      }
      conversationRef.current = matches.conversationId
      setSession({
        ...EMPTY,
        query,
        pinnedOptions: withOptions,
        conversationId: matches.conversationId,
        profiles: matches.results,
        pinnedIds: pinnedIdsOf(matches.results),
      })
      return true
    } catch (error) {
      if (gen === generation.current) reportError(error)
      return false
    } finally {
      if (gen === generation.current) setSearching(false)
    }
  }

  /**
   * Asks about the pinned set, or with no set yet, asks directly: the server
   * retrieves for the question and the set appears as the answer starts.
   * Resolves true when an answer arrived.
   */
  async function ask(question: string): Promise<boolean> {
    // A second question on a busy conversation is a 409; the UI disables Send,
    // and this guards against a double submit getting through anyway.
    if (asking || searching) return false

    const gen = generation.current
    const current = session
    const messageId = newId()
    const answerId = newId()
    const controller = new AbortController()
    askAbort.current = controller
    const live = () => gen === generation.current

    const setStatus = (status: "sent" | "failed" | "stopped") =>
      setSession((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.id === messageId && m.role === "user" ? { ...m, status } : m
        ),
      }))

    const handlers: StreamHandlers = {
      onMeta: ({ conversationId, sources }) => {
        if (!live()) return
        conversationRef.current = conversationId
        setSession((s) => {
          const followUp = conversationId === s.conversationId
          const pinnedIds = followUp ? s.pinnedIds : sources.map((p) => p.id)
          return {
            ...s,
            conversationId,
            pinnedIds,
            profiles: followUp ? refreshed(s.profiles, sources) : sources,
            messages: [
              ...s.messages,
              {
                id: answerId,
                role: "assistant",
                text: "",
                question,
                citations: pinnedIds,
                streaming: true,
              },
            ],
          }
        })
      },
      onToken: (text) => {
        if (!live()) return
        setSession((s) => ({
          ...s,
          messages: s.messages.map((m) =>
            m.id === answerId && m.role === "assistant" ? { ...m, text: m.text + text } : m
          ),
        }))
      },
    }

    // Stop then ask again can land before the server has released the
    // previous turn; one short retry covers that race.
    const streamTo = async (target: AskTarget): Promise<AskAnswer> => {
      try {
        return await streamAsk(question, target, handlers, controller.signal)
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 409 || !live()) throw error
        await wait(800)
        return streamAsk(question, target, handlers, controller.signal)
      }
    }

    // The server lost the conversation (restart, eviction, closed tab). Run
    // the same search again, so the new set answers the original request
    // rather than this follow-up, then ask on it.
    const reopen = async (): Promise<AskAnswer> => {
      const matches = await searchProfiles(current.query, current.pinnedOptions, controller.signal)
      if (!live()) {
        releaseConversation(matches.conversationId)
        throw new DOMException("Stale", "AbortError")
      }
      const pinnedIds = pinnedIdsOf(matches.results)
      const unchanged = sameIds(pinnedIds, current.pinnedIds)
      conversationRef.current = matches.conversationId
      setSession((s) => ({
        ...s,
        conversationId: matches.conversationId,
        pinnedIds,
        profiles: unchanged ? refreshed(s.profiles, matches.results) : matches.results,
        messages: [
          ...s.messages.filter((m) => m.id !== messageId),
          {
            id: newId(),
            role: "notice",
            text: unchanged
              ? "This chat restarted, so the assistant won't remember earlier answers. Your candidates are the same."
              : "This chat restarted and your search ran again. The list changed, and the assistant won't remember earlier answers.",
          },
          ...s.messages.filter((m) => m.id === messageId),
        ],
      }))
      return streamTo({ conversationId: matches.conversationId })
    }

    setSession((s) => ({
      ...s,
      // Asking directly, with no set yet: the question becomes the search.
      query: s.profiles ? s.query : question,
      pinnedOptions: s.profiles ? s.pinnedOptions : options,
      messages: [
        ...s.messages,
        { id: messageId, role: "user", text: question, status: "pending" },
      ],
    }))
    setAsking(true)

    try {
      let answer: AskAnswer
      if (current.conversationId) {
        try {
          answer = await streamTo({ conversationId: current.conversationId })
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 404 || !live()) throw error
          conversationRef.current = null
          answer = await reopen()
        }
      } else if (current.profiles) {
        answer = await reopen()
      } else {
        answer = await streamTo({ options })
      }

      if (!live()) return false
      setStatus("sent")
      setSession((s) => ({
        ...s,
        profiles: refreshed(s.profiles, answer.sources),
        messages: s.messages.map((m) =>
          m.id === answerId && m.role === "assistant"
            ? { ...m, text: answer.answer, streaming: false }
            : m
        ),
      }))
      return true
    } catch (error) {
      if (!live()) return false
      const stopped = isAbort(error)
      setStatus(stopped ? "stopped" : "failed")
      // A stopped answer keeps what was written, marked as cut short; a
      // failed one is dropped, since the server recorded neither.
      setSession((s) => ({
        ...s,
        messages: s.messages.flatMap((m) =>
          m.id !== answerId || m.role !== "assistant"
            ? [m]
            : stopped && m.text
              ? [{ ...m, streaming: false, stopped: true }]
              : []
        ),
      }))
      if (!stopped) reportError(error)
      return false
    } finally {
      if (live()) {
        setAsking(false)
        askAbort.current = null
      }
    }
  }

  /** Stops the answer being written. */
  function stop() {
    askAbort.current?.abort()
  }

  /** Back to idle: drops the set and unlocks the options. */
  function reset() {
    discard()
    setSession(EMPTY)
  }

  const hasQuestions = session.messages.some((m) => m.role === "user")

  return {
    ...session,
    options,
    setOptions,
    /**
     * Settings are fixed once a question has been asked: changing them means
     * a different set, and the chat would no longer match it. Before that, a
     * change simply re-runs the search.
     */
    locked: hasQuestions,
    hasQuestions,
    searching,
    asking,
    search,
    ask,
    stop,
    reset,
  }
}
