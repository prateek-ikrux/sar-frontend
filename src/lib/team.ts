import type { CandidateTagValue, EngagedAction, TeamActivity } from "@/types"

/** What a recruiter did, after their name: "Priya opened the resume". */
export const DID: Record<EngagedAction, string> = {
  contact_view: "viewed the contact details",
  resume_view: "opened the resume",
  resume_download: "downloaded the resume",
  shortlist_add: "shortlisted them",
  tag: "tagged them",
  export: "exported them to a spreadsheet",
}

export const TAG_LABELS: Record<CandidateTagValue, string> = {
  contacted: "Contacted",
  interested: "Interested",
  not_interested: "Not interested",
  not_reachable: "Not reachable",
  wrong_number: "Wrong number",
  in_process: "In process",
  not_a_fit: "Not a fit",
  placed: "Placed",
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
]

/** "3 days ago", "yesterday", "just now". */
export function timeAgo(iso: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return "just now"
}

/**
 * Another recruiter is working on this candidate: they took an action on it
 * lately, or they've tagged it. Only appearing in someone's results doesn't
 * count; that's shown, but not flagged.
 */
export function workedOnByOthers(team: TeamActivity | null | undefined) {
  if (!team) return false
  return team.otherCount > 0 || team.tags.some((tag) => !tag.mine)
}
