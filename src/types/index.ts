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
  /** Only on the users list: the last 7 days. */
  usage?: UserUsage
}

/** A user's last 7 days, as the Users table shows it. */
export type UserUsage = {
  /** Their latest recorded action of any kind, at any time. */
  lastActiveAt: string | null
  /** Time with the page visible and in use. */
  activeSeconds: number
  searches: number
  /** Resumes opened or downloaded. */
  resumes: number
  /** Candidates whose contact details they viewed. */
  contacts: number
}

export type ActivityRange = 7 | 30 | 90

export type ActivityTotals = {
  searches: number
  questions: number
  /** Candidates in their results, counted once per search. */
  profilesShown: number
  /** Distinct candidates in their results. */
  uniqueProfilesShown: number
  contactViews: number
  resumeViews: number
  resumeDownloads: number
  shortlisted: number
  tagged: number
  exports: number
  exportedCandidates: number
  /** Distinct candidates they opened, contacted, saved, tagged or exported. */
  uniqueCandidatesWorked: number
  /** Days with at least one action. */
  activeDays: number
}

export type ActivityDay = {
  /** YYYY-MM-DD in the requested time zone. */
  date: string
  searches: number
  questions: number
  candidateActions: number
  /** Time on the platform, in sessions that started that day. */
  activeMinutes: number
}

export type SignIn = {
  at: string
  ok: boolean
  ip: string | null
  userAgent: string | null
  /** Why a failed one failed: "wrong_code", "no_valid_code" or "disabled". */
  reason: string | null
}

export type ActivitySummary = {
  user: User
  range: { days: ActivityRange; from: string; to: string; tz: string }
  lastActiveAt: string | null
  time: { activeSeconds: number; sessions: number; longestSessionSeconds: number }
  logins: { succeeded: number; failed: number; recent: SignIn[] }
  totals: ActivityTotals
  /** Every day in the range, oldest first. */
  daily: ActivityDay[]
}

export type ActivitySearch = {
  id: string
  at: string
  /** Null once the text has been removed, 90 days on. */
  query: string | null
  /** "ask" when they asked the assistant directly instead of searching. */
  source: "search" | "ask"
  results: number
  filters: { hideMine: boolean; hideTeam: boolean }
  /** Distinct candidates from these results they acted on before their next search. */
  outcome: { opened: number; contacted: number; saved: number; tagged: number; exported: number; worked: number }
}

export type ActivitySearchPage = {
  items: ActivitySearch[]
  page: number
  limit: number
  total: number
  pages: number
}

export type ActivityEventType =
  | EngagedAction
  | "search_results"
  | "question"
  | "shortlist_remove"
  | "login"
  | "login_failed"

export type ActivityEntry = {
  id: string
  at: string
  type: ActivityEventType
  query: string | null
  /** How many candidates the action covered. */
  count: number
  /** Named when there are a few; label is null for one gone from the library. */
  candidates: { id: string; label: string | null }[]
  /** On a tag change: the tag set, or null when cleared. */
  tag?: CandidateTagValue | null
  source?: "search" | "ask" | "shortlist"
  /** On a sign-in. */
  ip?: string | null
  userAgent?: string | null
  reason?: string | null
}

export type ActivityEntryPage = {
  items: ActivityEntry[]
  /** Pass as `before` for the next page; null at the end. */
  next: string | null
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
  /**
   * Contact details are not in search results: "Show contact" fetches them
   * for one candidate (see services/candidates), and that is recorded.
   */
  hasEmail: boolean
  hasPhone: boolean
  /** What the team has done with this candidate. Null if it couldn't be loaded. */
  team: TeamActivity | null
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

/** Things a recruiter can do to a candidate that others see on its card. */
export type EngagedAction =
  | "contact_view"
  | "resume_view"
  | "resume_download"
  | "shortlist_add"
  | "tag"
  | "export"

/** The server's list of shared tags. */
export const CANDIDATE_TAGS = [
  "contacted",
  "interested",
  "not_interested",
  "not_reachable",
  "wrong_number",
  "in_process",
  "not_a_fit",
  "placed",
] as const
export type CandidateTagValue = (typeof CANDIDATE_TAGS)[number]

/** One recruiter's current tag on a candidate. Every recruiter sees it. */
export type CandidateTag = {
  tag: CandidateTagValue
  note: string
  /** Who set it. */
  name: string
  mine: boolean
  /** ISO date. */
  at: string
}

/**
 * What recruiters have done with a candidate in the last 90 days (tags have
 * no window). `others` names each other recruiter once, with their latest
 * action, newest first, up to five; `otherCount` counts all of them.
 */
export type TeamActivity = {
  others: { name: string; action: EngagedAction; at: string }[]
  otherCount: number
  /** Other recruiters who only got this candidate in their results. */
  seenBy: number
  /** The signed-in recruiter's own latest action. */
  mine: { action: EngagedAction; at: string } | null
  tags: CandidateTag[]
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

export type FlagKind =
  | "bulk_resumes"
  | "bulk_contacts"
  | "bulk_export"
  | "failed_logins"
  | "night_activity"
  | "new_ip"
  | "new_browser"

/** Something unusual a user did, for admins to look at. */
export type ActivityFlag = {
  kind: FlagKind
  userId: string
  name: string
  /** When: the hour or day it happened in, or the sign-in time. */
  at: string
  /** How many, for the bursts. */
  count?: number
  /** For a sign-in from somewhere new. */
  ip?: string | null
  browser?: string | null
}

export type TeamRow = {
  user: { _id: string; name: string; email: string | null; role: Role | null; active: boolean }
  activeSeconds: number
  activeDays: number
  searches: number
  questions: number
  candidatesWorked: number
  resumes: number
  contacts: number
  shortlisted: number
  exportedCandidates: number
  lastActiveAt: string | null
  flags: number
}

export type TeamSummary = {
  range: { days: ActivityRange; from: string; to: string; tz: string }
  totals: {
    activeUsers: number
    searches: number
    candidatesWorked: number
    activeSeconds: number
  }
  /** Most candidates worked on first. Active recruiters with no activity are included. */
  ranking: TeamRow[]
  /** Active recruiters with no activity in the range. */
  inactive: TeamRow["user"][]
  duplicateEffort: {
    candidates: number
    shared: number
    /** shared / candidates, 0-1. */
    rate: number
    top: { profileId: string; label: string | null; recruiters: string[]; lastAt: string }[]
  }
  flags: ActivityFlag[]
}

export type Person = { _id: string; name: string; email: string }

export type WeeklyEmailSettings = {
  enabled: boolean
  timeZone: string
  sendsAt: { weekday: string; hour: number }
  recipients: Person[]
  /** Active admins: the only people it can go to. */
  eligible: Person[]
  lastSentAt: string | null
  lastError: string | null
}
