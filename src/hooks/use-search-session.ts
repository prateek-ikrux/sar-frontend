import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { ApiError } from "@/lib/api"
import {
  askProfiles,
  endConversation,
  endConversationOnUnload,
  searchProfiles,
  type SearchOptions,
} from "@/services/search"
import { useAuthStore } from "@/stores/auth-store"
import type { AskAnswer, SearchProfile } from "@/types"

export type ChatMessage =
  | {
      id: string
      role: "user"
      text: string
      status: "pending" | "sent" | "failed"
    }
  | { id: string; role: "assistant"; text: string }
  /** A quiet inline note from the app itself, e.g. that the set was re-fetched. */
  | { id: string; role: "notice"; text: string }

export const DEFAULT_OPTIONS: SearchOptions = {
  limit: 5,
  charsPerDocument: 4000,
  requireResume: true,
}

/**
 * The server pins only profiles with a resume file, in result order, and the
 * answer's [n] counts those. Mirrors its filter so the list numbers match.
 */
const pinnedIdsOf = (profiles: SearchProfile[]) =>
  profiles.filter((p) => p.resumeUrl).map((p) => p.id)

type Session = {
  /** Set while the server holds a conversation pinned to `profiles`. */
  conversationId: string | null
  /** The search (or first question) that produced the pinned set. */
  query: string
  /** Everything the search returned. null before the first search, and after "New search". */
  profiles: SearchProfile[] | null
  /** The subset the conversation holds, in citation order: [1] is pinnedIds[0]. */
  pinnedIds: string[]
  messages: ChatMessage[]
  /** The user ended the chat: the set stays on screen, but can't be asked about. */
  ended: boolean
}

const EMPTY: Session = {
  conversationId: null,
  query: "",
  profiles: null,
  pinnedIds: [],
  messages: [],
  ended: false,
}

const id = () => crypto.randomUUID()

function releaseConversation(conversationId: string | null) {
  // Freeing server memory is a courtesy, not something to report on.
  if (conversationId) endConversation(conversationId).catch(() => {})
}

function reportError(error: unknown) {
  if (error instanceof ApiError) {
    toast.error(error.message, { description: error.detail })
  } else if ((error as Error)?.name !== "CanceledError") {
    toast.error("Something went wrong.")
  }
}

/**
 * The search page's state machine: idle -> set pinned -> conversing. A search
 * pins a set of profiles to a server-side conversation, and every question
 * after that answers from exactly that set until the user starts over. The
 * set's size and depth are fixed for the conversation's life, so `options`
 * is locked whenever a conversation exists.
 */
export function useSearchSession() {
  const [session, setSession] = useState<Session>(EMPTY)
  const [options, setOptions] = useState<SearchOptions>(DEFAULT_OPTIONS)
  const [searching, setSearching] = useState(false)
  const [asking, setAsking] = useState(false)

  // Bumped whenever the set is thrown away, so a response to a request made
  // for the old set lands nowhere instead of resurrecting it.
  const generation = useRef(0)
  const searchAbort = useRef<AbortController | null>(null)
  // Mirrors session.conversationId for cleanup paths that run outside render.
  // Written wherever the id changes, never during render.
  const conversationRef = useRef<string | null>(null)

  // Conversations no longer expire, so the candidate details they hold stay in
  // server memory until someone ends them. Release on route-away, tab close
  // and sign-out. The unmount path can use axios; a closing page needs
  // keepalive; and sign-out clears the token before the page unmounts, so it
  // is caught here, with the token that was just removed.
  useEffect(() => {
    const onPageHide = () => {
      if (conversationRef.current) endConversationOnUnload(conversationRef.current)
    }
    const unsubscribe = useAuthStore.subscribe((state, prev) => {
      if (prev.token && !state.token && conversationRef.current) {
        endConversation(conversationRef.current, prev.token).catch(() => {})
        conversationRef.current = null
      }
    })
    window.addEventListener("pagehide", onPageHide)
    return () => {
      window.removeEventListener("pagehide", onPageHide)
      unsubscribe()
      releaseConversation(conversationRef.current)
    }
  }, [])

  function discard() {
    generation.current += 1
    searchAbort.current?.abort()
    releaseConversation(conversationRef.current)
    conversationRef.current = null
    setSearching(false)
    setAsking(false)
  }

  async function search(query: string) {
    discard()
    const gen = generation.current
    const controller = new AbortController()
    searchAbort.current = controller

    setSession({ ...EMPTY, query })
    setSearching(true)
    try {
      const matches = await searchProfiles(query, options, controller.signal)
      if (gen !== generation.current) {
        releaseConversation(matches.conversationId)
        return
      }
      conversationRef.current = matches.conversationId
      setSession({
        ...EMPTY,
        query,
        conversationId: matches.conversationId,
        profiles: matches.results,
        pinnedIds: pinnedIdsOf(matches.results),
      })
    } catch (error) {
      if (gen === generation.current) reportError(error)
    } finally {
      if (gen === generation.current) setSearching(false)
    }
  }

  async function ask(question: string) {
    // A second question on a busy conversation is a 409; the UI disables Send,
    // and this guards against a double submit getting through anyway.
    if (asking || searching) return

    const gen = generation.current
    const messageId = id()
    const pinnedTo = session.conversationId
    const setStatus = (status: "sent" | "failed") =>
      setSession((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.id === messageId && m.role === "user" ? { ...m, status } : m
        ),
      }))

    setSession((s) => ({
      ...s,
      // Asking directly, with no set yet: the question becomes the search.
      query: s.profiles ? s.query : question,
      messages: [
        ...s.messages,
        { id: messageId, role: "user", text: question, status: "pending" },
      ],
    }))
    setAsking(true)

    try {
      let answer: AskAnswer
      if (pinnedTo) {
        try {
          answer = await askProfiles(question, { conversationId: pinnedTo })
        } catch (error) {
          // Restarts wipe every conversation and busy users get their oldest
          // ones evicted, so this is routine.
          // Reopen quietly with the same size and depth, and let the new set
          // replace the old one on the left.
          if (!(error instanceof ApiError) || error.status !== 404) throw error
          if (gen !== generation.current) return
          conversationRef.current = null
          setSession((s) => ({
            ...s,
            conversationId: null,
            messages: [
              ...s.messages.filter((m) => m.id !== messageId),
              {
                id: id(),
                role: "notice",
                text: "Your previous chat was closed on the server — searching again.",
              },
              ...s.messages.filter((m) => m.id === messageId),
            ],
          }))
          answer = await askProfiles(question, { options })
        }
      } else {
        answer = await askProfiles(question, { options })
      }

      if (gen !== generation.current) {
        if (answer.conversationId !== pinnedTo)
          releaseConversation(answer.conversationId)
        return
      }

      const followUp = answer.conversationId === pinnedTo
      conversationRef.current = answer.conversationId
      setStatus("sent")
      setSession((s) => ({
        ...s,
        conversationId: answer.conversationId,
        ...(followUp
          ? {
              // Same pinned set, with fresh PDF links. Merge rather than
              // replace, so unpinned rows stay put and the list never moves.
              profiles: (s.profiles ?? []).map(
                (p) => answer.sources.find((src) => src.id === p.id) ?? p
              ),
            }
          : {
              // A new set: asked directly, or reopened after a 404.
              profiles: answer.sources,
              pinnedIds: answer.sources.map((p) => p.id),
            }),
        messages: [
          ...s.messages,
          { id: id(), role: "assistant", text: answer.answer },
        ],
      }))
    } catch (error) {
      if (gen !== generation.current) return
      setStatus("failed")
      reportError(error)
    } finally {
      if (gen === generation.current) setAsking(false)
    }
  }

  /** Back to idle: drops the set and unlocks the options. */
  function reset() {
    discard()
    setSession(EMPTY)
  }

  /** Ends the conversation but leaves the set and transcript on screen. */
  function endChat() {
    discard()
    setSession((s) => ({ ...s, conversationId: null, ended: true }))
  }

  return {
    ...session,
    options,
    setOptions,
    /** Size and depth can't change on a live conversation (the server 422s). */
    locked: session.conversationId !== null,
    searching,
    asking,
    search,
    ask,
    reset,
    endChat,
  }
}
