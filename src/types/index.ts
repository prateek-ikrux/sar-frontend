export type Role = "admin" | "user"

/** Mirrors the users collection. Mongo ObjectId/ISODate are serialised as strings. */
export type User = {
  _id: string
  email: string
  name: string | null
  role: Role
  active: boolean
  created_at: string
  last_login_at: string | null
}

/** One resume returned by the search endpoint. `document` is markdown. */
export type SearchResult = {
  _id: string
  email: string
  phone: string | null
  file_name: string
  document: string
  /** Relevance, 0-1. Optional: present only if the backend returns it. */
  score?: number
}

export type SearchResponse = {
  results: SearchResult[]
  total: number
}

/** Claims the server puts in the JWT issued on OTP verification. */
export type TokenPayload = {
  sub: string
  email: string
  name: string | null
  role: Role
  /** Unix seconds. */
  exp: number
  iat: number
}
