export type Role = "admin" | "recruiter"

/** Every response the backend sends is wrapped in this envelope. */
export type ApiEnvelope<T> = {
  statusCode: number
  message: string
  data: T
  success: boolean
}

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

/** One page of `GET /users`. The server defaults to 20 per page. */
export type UserPage = {
  users: User[]
  page: number
  limit: number
  /** Users matching the query, across every page. */
  total: number
  /** Page count, not an index. */
  pages: number
}

/** What `POST /auth/request-otp` reports about the code it just mailed out. */
export type OtpChallenge = {
  email: string
  expiresAt: string
}

/** What `POST /auth/verify-otp` hands back on a correct code. */
export type AuthSession = {
  accessToken: string
  user: User
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

/**
 * The few JWT claims the client reads. The server's token carries `_id`; `exp`
 * is only there when ACCESS_TOKEN_EXPIRY is set, so treat it as optional.
 */
export type TokenClaims = {
  _id?: string
  exp?: number
  iat?: number
}
