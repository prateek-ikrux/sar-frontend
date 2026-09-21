import axios, { type AxiosError } from "axios"
import { useAuthStore } from "@/stores/auth-store"

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

    return Promise.reject(new ApiError(message, status, body?.code))
  }
)
