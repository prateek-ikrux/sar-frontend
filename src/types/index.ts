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

/**
 * One profile from either search endpoint. Both strip the resume markdown and
 * neither carries a candidate name, so the file name is the only label.
 */
export type SearchProfile = {
  id: string
  fileName: string
  email: string
  phone: string | null
  /** Vector-search relevance, 0-1. */
  score: number
  /**
   * Presigned PDF link; null when the file is missing from object storage.
   * Absent when the server issued no link at all.
   */
  resumeUrl?: string | null
}

/**
 * `POST /search/profiles` -- ranked matches, no LLM. Also opens a conversation
 * pinned to exactly these results, so follow-up questions answer from them.
 */
export type ProfileMatches = {
  query: string
  requireResume: boolean
  /** The limit asked for; `count` can fall short of it. */
  requested: number
  count: number
  /**
   * How many of `results` the conversation holds: only those with a resume
   * file. Citations number these, in `results` order.
   */
  pinnedForChat: number
  /**
   * No expiry: it lives until ended, evicted (least-recently-used, past 20 per
   * user or 200 overall) or lost to a server restart.
   */
  conversationId: string
  results: SearchProfile[]
}

/**
 * `POST /search/ask` -- a written answer. The answer cites profiles as [1],
 * [2]... in the order of `sources`, which on a follow-up is the pinned set.
 */
export type AskAnswer = {
  conversationId: string
  /** Questions this conversation has answered, this one included. */
  turn: number
  question: string
  answer: string
  model: string
  sources: SearchProfile[]
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
