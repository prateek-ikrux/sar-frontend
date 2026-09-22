import axios, { type AxiosError, type AxiosResponse } from "axios"
import { useAuthStore } from "@/stores/auth-store"
import type { ApiEnvelope } from "@/types"

export type ApiErrorBody = {
  statusCode?: number
  message?: string
  data?: null
  success?: boolean
  errors?: string[]
  /** Present outside NODE_ENV=production. Never shown to the user. */
  stack?: string
}

export class ApiError extends Error {
  readonly status: number | undefined
  /** Field-level detail the server attaches to 422s; empty on most failures. */
  readonly errors: string[]

  constructor(message: string, status?: number, errors: string[] = []) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.errors = errors
  }

  /**
   * The `errors` array as one line, to sit under the headline message. The
   * server puts the useful part there -- a 422 says only "Validation failed"
   * until you read it.
   */
  get detail(): string | undefined {
    return this.errors.length > 0 ? this.errors.join(" ") : undefined
  }
}

export const api = axios.create({
  // Carries the origin and the version prefix; src/constants/urls holds the paths.
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/** Normalises every failure into an ApiError, and ends the session on a 401. */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status
    if (status === 401) {
      useAuthStore.getState().logout()
    }

    const body = error.response?.data
    const message =
      body?.message ??
      (error.code === "ECONNABORTED"
        ? "The request timed out."
        : error.message) ??
      "Something went wrong."

    return Promise.reject(new ApiError(message, status, body?.errors ?? []))
  }
)

/** Pulls the payload out of the `{ statusCode, message, data, success }` envelope. */
export function unwrap<T>(response: AxiosResponse<ApiEnvelope<T>>): T {
  return response.data.data
}
