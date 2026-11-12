import { useState, type ReactNode } from "react"
import { Link, useParams } from "react-router"
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query"
import {
  ChevronLeft,
  ChevronRight,
  Contact,
  Download,
  FileText,
  LogIn,
  MessageSquare,
  ShieldAlert,
  Bookmark,
  BookmarkMinus,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  TriangleAlert,
  Sheet,
} from "lucide-react"

import { ActivityChart } from "@/components/users/activity-chart"
import { FlagList } from "@/components/users/flag-list"
import { RangePicker } from "@/components/users/range-picker"
import { useActivityRange } from "@/hooks/use-activity-range"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useDocumentTitle } from "@/hooks/use-document-title"
import type { ApiError } from "@/lib/api"
import { TAG_LABELS, timeAgo } from "@/lib/team"
import { browserOf, FAILED_SIGN_IN, formatDuration } from "@/lib/usage"
import { cn } from "@/lib/utils"
import { getFlags } from "@/services/team"
import { getActivityEntries, getActivitySearches, getActivitySummary } from "@/services/users"
import type {
  ActivityEntry,
  ActivityRange,
  ActivitySearch,
  ActivitySummary,
  ActivityTotals,
} from "@/types"


const when = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
})

const n = (value: number) => value.toLocaleString()
const plural = (count: number, one: string, many: string) => `${n(count)} ${count === 1 ? one : many}`

/**
 * One recruiter's use of the platform, for admins: totals over a chosen range,
 * activity per day, their searches and what came of each, and everything
 * they did, newest first.
 */
export default function UserActivityPage() {
  const { id = "" } = useParams()
  const [days, setDays] = useActivityRange()

  const summary = useQuery<ActivitySummary, ApiError>({
    queryKey: ["user-activity", id, days],
    queryFn: () => getActivitySummary(id, days),
    placeholderData: keepPreviousData,
  })

  const user = summary.data?.user
  useDocumentTitle(user ? `${user.name ?? user.email} · Activity` : "Activity")

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Link
        to="/users"
        className="-ml-1 inline-flex items-center gap-1 rounded-sm px-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Users
      </Link>

      {summary.error && <LoadError title="Couldn't load this user's activity" error={summary.error} />}

      {summary.isPending && (
        <div className="space-y-4" aria-hidden>
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-56 rounded-xl" />
        </div>
      )}

      {summary.data && user && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
                {user.name ?? user.email}
                {user.role === "admin" && (
                  <Badge variant="outline">
                    <ShieldCheck aria-hidden />
                    Admin
                  </Badge>
                )}
                {!user.active && <Badge variant="secondary">Disabled</Badge>}
              </h1>
              <p className="text-sm text-muted-foreground">
                {user.name && <>{user.email} · </>}
                {summary.data.lastActiveAt
                  ? `Last active ${timeAgo(summary.data.lastActiveAt)}`
                  : "No recorded activity yet"}
              </p>
            </div>

            <RangePicker days={days} onChange={setDays} />
          </div>

          <div className={cn("space-y-6 transition-opacity", summary.isPlaceholderData && "opacity-60")}>
            <Totals totals={summary.data.totals} time={summary.data.time} days={days} />

            <Card>
              <CardHeader>
                <CardTitle>Actions per day</CardTitle>
                <CardDescription>
                  Searches, chat questions and actions on candidates, in your time zone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityChart days={summary.data.daily} />
              </CardContent>
            </Card>

            <UserFlags userId={id} days={days} />

            <SignIns logins={summary.data.logins} />

            <Searches userId={id} days={days} />
          </div>

          <Timeline userId={id} />
        </>
      )}
    </div>
  )
}

function LoadError({ title, error }: { title: string; error: ApiError }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      <div className="space-y-0.5">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">
          {error.message}
          {error.detail && `. ${error.detail}`}
        </p>
      </div>
    </div>
  )
}

function StatTile({ label, value, detail }: { label: string; value: number | string; detail?: ReactNode }) {
  return (
    <div className="space-y-1 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground tabular-nums">
        {typeof value === "number" ? n(value) : value}
      </p>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  )
}

function Totals({
  totals,
  time,
  days,
}: {
  totals: ActivityTotals
  time: ActivitySummary["time"]
  days: ActivityRange
}) {
  return (
    <section aria-label="Totals" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatTile
        label="Time on the platform"
        value={formatDuration(time.activeSeconds)}
        detail={`${plural(time.sessions, "session", "sessions")} · active ${totals.activeDays} of ${days} days`}
      />
      <StatTile
        label="Searches"
        value={totals.searches}
        detail={plural(totals.questions, "chat question", "chat questions")}
      />
      <StatTile
        label="Candidates seen"
        value={totals.uniqueProfilesShown}
        detail={`${n(totals.profilesShown)} across all searches`}
      />
      <StatTile
        label="Candidates worked on"
        value={totals.uniqueCandidatesWorked}
        detail="Opened, contacted, saved, tagged or exported"
      />
      <StatTile
        label="Resumes opened"
        value={totals.resumeViews}
        detail={`${n(totals.resumeDownloads)} downloaded`}
      />
      <StatTile label="Contacts viewed" value={totals.contactViews} />
      <StatTile
        label="Shortlisted"
        value={totals.shortlisted}
        detail={plural(totals.tagged, "tag set", "tags set")}
      />
      <StatTile
        label="Exported to spreadsheets"
        value={totals.exportedCandidates}
        detail={plural(totals.exports, "export", "exports")}
      />
    </section>
  )
}

/** Their unusual activity in the period; hidden when there's none. */
function UserFlags({ userId, days }: { userId: string; days: ActivityRange }) {
  const flags = useQuery({
    queryKey: ["user-flags", userId, days],
    queryFn: () => getFlags(days, userId),
    placeholderData: keepPreviousData,
  })
  if (!flags.data?.length) return null
  return (
    <Card className="ring-team/40">
      <CardHeader>
        <CardTitle>Worth a look</CardTitle>
        <CardDescription>Unusual activity in this period, in your time zone.</CardDescription>
      </CardHeader>
      <CardContent>
        <FlagList flags={flags.data} named={false} />
      </CardContent>
    </Card>
  )
}


/** Recent sign-ins with where they came from, failed attempts included. */
function SignIns({ logins }: { logins: ActivitySummary["logins"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign-ins</CardTitle>
        <CardDescription>
          {plural(logins.succeeded, "sign-in", "sign-ins")}
          {logins.failed > 0 && <> · {plural(logins.failed, "failed attempt", "failed attempts")}</>} in this period
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logins.recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">None in this period.</p>
        ) : (
          <ol className="divide-y divide-border">
            {logins.recent.map((login) => (
              <li key={login.at} className="flex items-start gap-3 py-2 text-sm">
                {login.ok ? (
                  <LogIn className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                ) : (
                  <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-foreground">
                    {login.ok ? "Signed in" : `Failed: ${FAILED_SIGN_IN[login.reason ?? ""] ?? "rejected"}`}
                  </p>
                  <p className="truncate text-xs text-muted-foreground" title={login.userAgent ?? undefined}>
                    {browserOf(login.userAgent)}
                    {login.ip && <> · {login.ip}</>}
                  </p>
                </div>
                <time dateTime={login.at} className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
                  {when.format(new Date(login.at))}
                </time>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

function Searches({ userId, days }: { userId: string; days: ActivityRange }) {
  const [page, setPage] = useState(1)
  // A new range starts again from the first page.
  const [shownFor, setShownFor] = useState(days)
  if (shownFor !== days) {
    setShownFor(days)
    setPage(1)
  }

  const searches = useQuery({
    queryKey: ["user-activity-searches", userId, days, page],
    queryFn: () => getActivitySearches(userId, days, page),
    placeholderData: keepPreviousData,
  })
  const data = searches.data

  return (
    <Card>
      <CardHeader>
        <CardTitle>Searches</CardTitle>
        <CardDescription>
          What they searched for, and how many of the results they then worked on before their next
          search.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {searches.error && <LoadError title="Couldn't load searches" error={searches.error as ApiError} />}
        {searches.isPending && <Skeleton className="h-40 w-full" />}
        {data && data.total === 0 && (
          <p className="text-sm text-muted-foreground">No searches in this period.</p>
        )}
        {data && data.items.length > 0 && (
          <div
            className={cn(
              "overflow-x-auto rounded-lg border border-border transition-opacity",
              searches.isPlaceholderData && "opacity-60"
            )}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Search</TableHead>
                  <TableHead className="text-right">Results</TableHead>
                  <TableHead className="text-right max-sm:hidden">Opened</TableHead>
                  <TableHead className="text-right max-sm:hidden">Contacted</TableHead>
                  <TableHead className="text-right max-md:hidden">Saved</TableHead>
                  <TableHead className="text-right">Worked on</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <SearchRow key={item.id} item={item} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {data && data.pages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Page {data.page} of {data.pages} &middot; {plural(data.total, "search", "searches")}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SearchRow({ item }: { item: ActivitySearch }) {
  const filters = [item.filters.hideMine && "hid their own", item.filters.hideTeam && "hid the team's"].filter(
    Boolean
  )
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-muted-foreground">{when.format(new Date(item.at))}</TableCell>
      <TableCell className="max-w-80">
        <div className="space-y-0.5 whitespace-normal">
          {item.query ? (
            <p className="text-foreground">{item.query}</p>
          ) : (
            <p className="text-muted-foreground italic">Text removed after 90 days</p>
          )}
          {(item.source === "ask" || filters.length > 0) && (
            <p className="text-xs text-muted-foreground">
              {[item.source === "ask" && "Asked the assistant directly", ...filters].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">{item.results}</TableCell>
      <TableCell className="text-right tabular-nums max-sm:hidden">{item.outcome.opened}</TableCell>
      <TableCell className="text-right tabular-nums max-sm:hidden">{item.outcome.contacted}</TableCell>
      <TableCell className="text-right tabular-nums max-md:hidden">{item.outcome.saved}</TableCell>
      <TableCell
        className={cn(
          "text-right font-medium tabular-nums",
          item.outcome.worked === 0 ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {item.outcome.worked}
      </TableCell>
    </TableRow>
  )
}

const ICONS: Record<ActivityEntry["type"], typeof Search> = {
  search_results: Search,
  question: MessageSquare,
  contact_view: Contact,
  resume_view: FileText,
  resume_download: Download,
  shortlist_add: Bookmark,
  shortlist_remove: BookmarkMinus,
  tag: Tag,
  export: Sheet,
  login: LogIn,
  login_failed: ShieldAlert,
}

function candidatesOf(entry: ActivityEntry) {
  if (!entry.candidates.length) return plural(entry.count, "candidate", "candidates")
  return entry.candidates
    .map((candidate) => candidate.label ?? "a candidate no longer in the library")
    .join(", ")
}

const quoted = (text: string | null) =>
  text ? <>&ldquo;{text}&rdquo;</> : <span className="italic">(text removed after 90 days)</span>

/** One entry as a sentence. Candidates are named by resume file. */
function describe(entry: ActivityEntry): ReactNode {
  const who = <span className="font-medium">{candidatesOf(entry)}</span>
  switch (entry.type) {
    case "search_results":
      return (
        <>
          {entry.source === "ask" ? "Asked the assistant" : "Searched"} {quoted(entry.query)} ·{" "}
          {plural(entry.count, "result", "results")}
        </>
      )
    case "question":
      return <>Asked {quoted(entry.query)} in the chat</>
    case "contact_view":
      return <>Viewed the contact details of {who}</>
    case "resume_view":
      return <>Opened the resume of {who}</>
    case "resume_download":
      return <>Downloaded the resume of {who}</>
    case "shortlist_add":
      return <>Shortlisted {who}</>
    case "shortlist_remove":
      return <>Removed {who} from their shortlist</>
    case "tag":
      return entry.tag ? (
        <>
          Tagged {who} &ldquo;{TAG_LABELS[entry.tag]}&rdquo;
        </>
      ) : (
        <>Cleared their tag on {who}</>
      )
    case "export":
      return (
        <>
          Exported {who} to a spreadsheet{entry.source === "shortlist" ? " from their shortlist" : ""}
        </>
      )
    case "login":
      return (
        <>
          Signed in · {browserOf(entry.userAgent ?? null)}
          {entry.ip && <> · {entry.ip}</>}
        </>
      )
    case "login_failed":
      return (
        <>
          Failed sign-in: {FAILED_SIGN_IN[entry.reason ?? ""] ?? "rejected"} · {browserOf(entry.userAgent ?? null)}
          {entry.ip && <> · {entry.ip}</>}
        </>
      )
  }
}

function Timeline({ userId }: { userId: string }) {
  const entries = useInfiniteQuery({
    queryKey: ["user-activity-entries", userId],
    queryFn: ({ pageParam }) => getActivityEntries(userId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next ?? undefined,
  })
  const items = entries.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Everything they did</CardTitle>
        <CardDescription>All recorded activity, newest first. Kept for a year.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.error && <LoadError title="Couldn't load activity" error={entries.error as ApiError} />}
        {entries.isPending && <Skeleton className="h-40 w-full" />}
        {entries.data && items.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
        )}
        {items.length > 0 && (
          <ol className="divide-y divide-border">
            {items.map((entry) => {
              const Icon = entry.source === "ask" && entry.type === "search_results" ? Sparkles : ICONS[entry.type]
              return (
                <li key={entry.id} className="flex items-start gap-3 py-2.5 text-sm">
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <p className="min-w-0 flex-1 text-foreground">{describe(entry)}</p>
                  <time
                    dateTime={entry.at}
                    className="shrink-0 text-xs whitespace-nowrap text-muted-foreground"
                  >
                    {when.format(new Date(entry.at))}
                  </time>
                </li>
              )
            })}
          </ol>
        )}
        {entries.hasNextPage && (
          <Button
            variant="outline"
            size="sm"
            disabled={entries.isFetchingNextPage}
            onClick={() => void entries.fetchNextPage()}
          >
            {entries.isFetchingNextPage ? "Loading…" : "Show older"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
