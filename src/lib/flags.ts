import type { ActivityFlag } from "@/types"

const n = (value: number | undefined) => (value ?? 0).toLocaleString()

const hour = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", hour: "numeric" })
const day = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" })
const moment = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })

/** What a flag says happened, after the person's name. */
export function flagText(flag: ActivityFlag) {
  switch (flag.kind) {
    case "bulk_resumes":
      return `opened ${n(flag.count)} resumes in one hour`
    case "bulk_contacts":
      return `viewed ${n(flag.count)} contacts in one hour`
    case "bulk_export":
      return `exported ${n(flag.count)} candidates in one day`
    case "failed_logins":
      return `had ${n(flag.count)} failed sign-ins in one day`
    case "night_activity":
      return `worked on ${n(flag.count)} candidates at night (10pm-6am)`
    case "new_ip":
      return `signed in from a new IP address, ${flag.ip ?? "unknown"}`
    case "new_browser":
      return `signed in from a new browser, ${flag.browser ?? "unknown"}`
  }
}

/** When it happened, as precisely as the flag knows. */
export function flagWhen(flag: ActivityFlag) {
  const at = new Date(flag.at)
  if (flag.kind === "bulk_resumes" || flag.kind === "bulk_contacts") return hour.format(at)
  if (flag.kind === "new_ip" || flag.kind === "new_browser") return moment.format(at)
  return day.format(at)
}

/** Sign-in flags are about the account; the rest about what was done with candidates. */
export const isSignInFlag = (flag: ActivityFlag) =>
  flag.kind === "failed_logins" || flag.kind === "new_ip" || flag.kind === "new_browser"
