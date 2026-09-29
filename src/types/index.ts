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

/** `POST /users/create`: the new user, and whether the welcome email went out. */
export type CreatedUser = User & { invited: boolean }

export type UserSort = "name" | "email" | "role" | "created_at" | "last_login_at"

export type UserListParams = {
  page?: number
  limit?: number
  /** Matched against name and email. */
  q?: string
  role?: Role
  status?: "active" | "disabled"
  sort?: UserSort
  order?: "asc" | "desc"
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

/** What the server could read from the resume text. */
export type ProfileSummary = {
  /**
   * The candidate's name as the resume gives it. Null when it isn't clear:
   * the server would rather say nothing than guess.
   */
  name: string | null
}

/**
 * One profile from either search endpoint. Both strip the resume markdown and
 * neither carries a structured name, so `summary.name` (or failing that the
 * file name) is the label.
 */
export type SearchProfile = {
  id: string
  fileName: string
  email: string
  phone: string | null
  /** Vector-search relevance, 0-1. */
  score: number
  /** Absent from servers older than the summary feature. */
  summary?: ProfileSummary
  /**
   * Presigned PDF link; null when the file is missing from object storage.
   * Absent when the server issued no link at all.
   */
  resumeUrl?: string | null
}

/** A candidate on the signed-in user's shortlist. Only they can see it. */
export type ShortlistItem = {
  profileId: string
  fileName: string | null
  email: string | null
  phone: string | null
  /** Built when it was saved. */
  summary: ProfileSummary
  /** The search it was saved from. */
  query: string
  note: string
  savedAt: string
  /** Signed fresh on every load; null when the file is missing. */
  resumeUrl: string | null
  /** The profile has left the library; details are as saved. */
  missing: boolean
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
 * The JWT's claims. The server signs `_id`, `email` and `role`; the client
 * only reads `exp`, to end the session on time. Role checks use the stored
 * user instead. `exp` is only there when ACCESS_TOKEN_EXPIRY is set, so treat
 * it as optional.
 */
export type TokenClaims = {
  _id?: string
  email?: string
  role?: Role
  exp?: number
  iat?: number
}
