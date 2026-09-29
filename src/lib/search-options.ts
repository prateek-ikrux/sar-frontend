import { MAX_CONTEXT_CHARS, type SearchOptions } from "@/services/search"

export const DEFAULT_OPTIONS: SearchOptions = {
  limit: 5,
  charsPerDocument: 4000,
  requireResume: true,
}

export const RESULT_COUNTS = [3, 5, 10, 15, 20, 40]

/**
 * How much of each resume the assistant reads, in words a recruiter uses.
 * A resume page is roughly 3,000 characters.
 */
export const READING_DEPTHS = [
  { value: 2000, label: "Skim", description: "The first page" },
  { value: 4000, label: "Standard", description: "About two pages" },
  { value: 8000, label: "Detailed", description: "About three pages" },
  { value: 12000, label: "Thorough", description: "About four pages" },
  { value: 20000, label: "Full resume", description: "Up to seven pages" },
] as const

export const depthLabel = (chars: number) =>
  READING_DEPTHS.find((depth) => depth.value === chars)?.label ?? `${chars.toLocaleString()} characters`

const fits = (limit: number, chars: number) => limit * chars <= MAX_CONTEXT_CHARS

/**
 * The server caps results x reading depth, since that is how much text every
 * answer re-reads. Rather than disabling choices that break the cap, the
 * setting the user did not just touch gives way, and `note` says so.
 */
export function fitOptions(
  next: SearchOptions,
  changed: "limit" | "charsPerDocument"
): { options: SearchOptions; note: string | null } {
  if (fits(next.limit, next.charsPerDocument)) return { options: next, note: null }

  if (changed === "limit") {
    const depth = [...READING_DEPTHS].reverse().find((d) => fits(next.limit, d.value))
    const charsPerDocument = depth?.value ?? READING_DEPTHS[0].value
    return {
      options: { ...next, charsPerDocument },
      note: `Reading set to ${depthLabel(charsPerDocument)} so ${next.limit} results fit.`,
    }
  }

  const limit =
    [...RESULT_COUNTS].reverse().find((n) => fits(n, next.charsPerDocument)) ?? RESULT_COUNTS[0]
  return {
    options: { ...next, limit },
    note: `Results set to ${limit} so ${depthLabel(next.charsPerDocument)} reading fits.`,
  }
}

/**
 * A search as URL parameters, so it can be bookmarked or shared. Settings at
 * their defaults are left out to keep links short.
 */
export function searchParamsFor(query: string, options: SearchOptions) {
  const params = new URLSearchParams({ q: query })
  if (options.limit !== DEFAULT_OPTIONS.limit) params.set("n", String(options.limit))
  if (options.charsPerDocument !== DEFAULT_OPTIONS.charsPerDocument) {
    params.set("read", String(options.charsPerDocument))
  }
  if (options.requireResume !== DEFAULT_OPTIONS.requireResume) {
    params.set("resume", options.requireResume ? "1" : "0")
  }
  return params
}

/** Reads settings back from a link, ignoring anything not on offer. */
export function optionsFromParams(params: URLSearchParams): SearchOptions {
  const limit = Number(params.get("n"))
  const chars = Number(params.get("read"))
  const resume = params.get("resume")
  const options: SearchOptions = {
    limit: RESULT_COUNTS.includes(limit) ? limit : DEFAULT_OPTIONS.limit,
    charsPerDocument: READING_DEPTHS.some((d) => d.value === chars)
      ? chars
      : DEFAULT_OPTIONS.charsPerDocument,
    requireResume: resume === null ? DEFAULT_OPTIONS.requireResume : resume === "1",
  }
  return fitOptions(options, "limit").options
}
