import axios, { type AxiosError } from "axios"

/** Shape the backend uses for failures. Adjust once the API contract is fixed. */
export type ApiErrorBody = {
  message?: string
  code?: string
}

export class ApiError extends Error {
  readonly status: number | undefined
  readonly code: string | undefined

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
})

/**
 * Normalises every failure into an ApiError so callers never have to unwrap
 * axios' error shape themselves.
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const body = error.response?.data
    const message =
      body?.message ??
      (error.code === "ECONNABORTED"
        ? "The request timed out."
        : error.message) ??
      "Something went wrong."

    return Promise.reject(new ApiError(message, error.response?.status, body?.code))
  }
)
