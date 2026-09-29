import axios, { type AxiosError, type AxiosResponse } from "axios"
import urls from "@/constants/urls"
import { useAuthStore } from "@/stores/auth-store"
import type { ApiEnvelope } from "@/types"

export type ApiErrorBody = {
  statusCode?: number
  message?: string
  data?: null
  success?: boolean
  errors?: string[]
  /** Only when the server runs with NODE_ENV=development. Never shown to the user. */
  stack?: string
}

/**
 * Every failed request, in words a user can act on. `message` is the
 * headline and `detail` the next step; what the server actually said is kept
 * in `serverMessage`/`serverErrors` for the console, never for the screen.
 */
export class ApiError extends Error {
  readonly status: number | undefined
  readonly detail: string | undefined
  /** Per-field messages for forms, keyed by request field ("email", "name"). */
  readonly fields: Record<string, string>
  readonly serverMessage: string | undefined
  readonly serverErrors: string[]

  constructor(init: {
    message: string
    detail?: string
    status?: number
    fields?: Record<string, string>
    serverMessage?: string
    serverErrors?: string[]
  }) {
    super(init.message)
    this.name = "ApiError"
    this.status = init.status
    this.detail = init.detail
    this.fields = init.fields ?? {}
    this.serverMessage = init.serverMessage
    this.serverErrors = init.serverErrors ?? []
  }
}

/** A request the app cancelled itself. Never worth reporting. */
export function isAbort(error: unknown): boolean {
  return (
    axios.isCancel(error) ||
    (error instanceof DOMException && error.name === "AbortError")
  )
}

// How request fields read in a sentence. The server reports 422s as
// "field: problem", which becomes "<label> <problem>".
const FIELD_LABELS: Record<string, string> = {
  email: "Email",
  name: "Name",
  role: "Role",
  code: "The code",
  query: "Your search",
  question: "Your question",
  limit: "Results",
  charsPerDocument: "Reading depth",
  q: "Search",
}

const sentence = (text: string) => {
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  const capitalised = trimmed[0].toUpperCase() + trimmed.slice(1)
  return /[.!?]$/.test(capitalised) ? capitalised : `${capitalised}.`
}

function fieldProblems(errors: string[]) {
  const fields: Record<string, string> = {}
  const lines: string[] = []
  for (const error of errors) {
    // The context cap is a rule about two settings together; say it plainly.
    if (error.includes("limit x charsPerDocument")) {
      lines.push("That many results at this reading depth is too much text. Lower one of them.")
      continue
    }
    const match = /^([\w.]+): (.+)$/.exec(error)
    if (!match) {
      lines.push(sentence(error))
      continue
    }
    const key = match[1].split(".")[0]
    const line = sentence(`${FIELD_LABELS[key] ?? key} ${match[2]}`)
    fields[key] ??= line
    lines.push(line)
  }
  return { fields, detail: lines.join(" ") || undefined }
}

/**
 * Turns a failed response (or no response at all) into an ApiError. Shared by
 * axios and the streaming fetch in services/search.
 */
export function toApiError({
  status,
  body,
  url = "",
  timedOut = false,
}: {
  status?: number
  body?: ApiErrorBody | null
  url?: string
  timedOut?: boolean
}): ApiError {
  const serverMessage = body?.message
  const serverErrors = body?.errors ?? []
  const make = (message: string, detail?: string, fields?: Record<string, string>) =>
    new ApiError({ message, detail, status, fields, serverMessage, serverErrors })

  if (timedOut) return make("That took too long", "Try again in a moment.")
  if (status === undefined) {
    return make("Can't reach the server", "Check your connection and try again.")
  }

  switch (status) {
    case 401:
      return url.includes(urls.verifyOtp)
        ? make("That code didn't work", "Check it and try again, or request a new code.")
        : make("Your session has ended", "Sign in again to continue.")
    case 403:
      // A bare "Forbidden" is the role check; the other 403s already say
      // what went wrong in the user's terms.
      return serverMessage && serverMessage !== "Forbidden"
        ? make(sentence(serverMessage).replace(/\.$/, ""), serverErrors.map(sentence).join(" ") || undefined)
        : make("You don't have access to that", "Ask an admin if you need it.")
    case 404:
      if (serverMessage === "User not found") {
        return make("That user no longer exists", "Someone may have just removed them.")
      }
      if (serverMessage === "Conversation not found") {
        return make("This chat is no longer available", "Start a new search to keep going.")
      }
      if (serverMessage === "Candidate not found") {
        return make("That candidate is no longer in the library", "They may have been removed.")
      }
      if (serverMessage === "Not on your shortlist") {
        return make("That candidate isn't on your shortlist", "It may have been removed in another tab.")
      }
      return make("We couldn't find that", "It may have been moved or removed.")
    case 409:
      if (serverMessage === "Conversation is busy") {
        return make("Still answering your last question", "Wait for it to finish, then ask again.")
      }
      if (serverMessage === "A user with that email already exists") {
        const line = "Someone with this email already has access."
        return make("That email is already added", line, { email: line })
      }
      if (serverMessage === "Your shortlist is full") {
        return make("Your shortlist is full", serverErrors.map(sentence).join(" ") || undefined)
      }
      return make("That clashes with a recent change", "Refresh and try again.")
    case 413:
      return make("That's too long", "Shorten it and try again.")
    case 422: {
      const { fields, detail } = fieldProblems(serverErrors)
      return make("Some details need fixing", detail, fields)
    }
    case 429:
      return make(
        "Too many attempts",
        serverErrors.map(sentence).join(" ") || "Wait a few minutes, then try again."
      )
    default:
      if (status >= 500) {
        return status >= 502 && status <= 504
          ? make("The service is having trouble", "Try again in a moment.")
          : make(
              "Something went wrong on our side",
              "Try again in a moment. If it keeps happening, tell an admin."
            )
      }
      return make("That didn't work", "Try again. If it keeps happening, tell an admin.")
  }
}

/**
 * A 401 on a request that carried a token means the session is over. One
 * without (a wrong sign-in code) is just an answer.
 */
export function endSessionOn401(status: number | undefined, sentToken: boolean) {
  if (status === 401 && sentToken) useAuthStore.getState().logout("expired")
}

export const api = axios.create({
  // Carries the origin and the version prefix; src/constants/urls holds the paths.
  // `||`, not `??`: a Docker build without the build arg bakes in "".
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/** Normalises every failure into an ApiError, and ends the session on a 401. */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (axios.isCancel(error)) return Promise.reject(error)

    const status = error.response?.status
    endSessionOn401(status, Boolean(error.config?.headers?.Authorization))

    const apiError = toApiError({
      status,
      body: error.response?.data,
      url: error.config?.url,
      timedOut: error.code === "ECONNABORTED",
    })
    if (import.meta.env.DEV) {
      console.warn(
        `${error.config?.method?.toUpperCase()} ${error.config?.url} → ${status ?? error.code}`,
        apiError.serverMessage ?? error.message,
        apiError.serverErrors
      )
    }
    return Promise.reject(apiError)
  }
)

/** Pulls the payload out of the `{ statusCode, message, data, success }` envelope. */
export function unwrap<T>(response: AxiosResponse<ApiEnvelope<T>>): T {
  return response.data.data
}
