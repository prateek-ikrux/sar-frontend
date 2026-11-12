import { useState } from "react"
import { Link } from "react-router"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { ArrowDown, TriangleAlert, Users } from "lucide-react"

import { FlagList } from "@/components/users/flag-list"
import { RangePicker } from "@/components/users/range-picker"
import { useActivityRange } from "@/hooks/use-activity-range"
import { WeeklyEmailCard } from "@/components/users/weekly-email-card"
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
import { timeAgo } from "@/lib/team"
import { formatDuration } from "@/lib/usage"
import { cn } from "@/lib/utils"
import { getTeamSummary } from "@/services/team"
import type { TeamRow, TeamSummary } from "@/types"

const n = (value: number) => value.toLocaleString()

type SortKey = "candidatesWorked" | "activeSeconds" | "searches" | "resumes" | "contacts" | "exportedCandidates" | "flags"

const COLUMNS: { key: SortKey; label: string; className?: string; render?: (row: TeamRow) => string }[] = [
  { key: "candidatesWorked", label: "Candidates worked on" },
  { key: "activeSeconds", label: "Time", render: (row) => formatDuration(row.activeSeconds) },
  { key: "searches", label: "Searches", className: "max-sm:hidden" },
  { key: "resumes", label: "Resumes", className: "max-md:hidden" },
  { key: "contacts", label: "Contacts", className: "max-md:hidden" },
  { key: "exportedCandidates", label: "Exported", className: "max-lg:hidden" },
  { key: "flags", label: "Flags" },
]

/**
 * The whole team for admins: who uses the platform and how much, how often
 * two recruiters worked the same candidate, anything unusual, and the weekly
 * summary email.
 */
export default function TeamPage() {
  useDocumentTitle("Team activity")
  const [days, setDays] = useActivityRange()

  const summary = useQuery<TeamSummary, ApiError>({
    queryKey: ["team-summary", days],
    queryFn: () => getTeamSummary(days),
    placeholderData: keepPreviousData,
  })
  const data = summary.data

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Team activity</h1>
          <p className="text-sm text-muted-foreground">How everyone uses the platform, side by side.</p>
        </div>
        <RangePicker days={days} onChange={setDays} />
      </div>

      {summary.error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div className="space-y-0.5">
            <p className="font-medium text-foreground">Couldn&rsquo;t load team activity</p>
            <p className="text-sm text-muted-foreground">
              {summary.error.message}
              {summary.error.detail && `. ${summary.error.detail}`}
            </p>
          </div>
        </div>
      )}

      {summary.isPending && (
        <div className="space-y-4" aria-hidden>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {data && (
        <div className={cn("space-y-6 transition-opacity", summary.isPlaceholderData && "opacity-60")}>
          <section aria-label="Totals" className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile label="People active" value={n(data.totals.activeUsers)} />
            <Tile label="Time on the platform" value={formatDuration(data.totals.activeSeconds)} />
            <Tile
              label="Candidates worked on"
              value={n(data.totals.candidatesWorked)}
              detail={`${n(data.totals.searches)} searches`}
            />
            <Tile label="Unusual activity" value={n(data.flags.length)} detail="See Worth a look below" />
          </section>

          <Ranking rows={data.ranking} />

          <div className="grid gap-6 md:grid-cols-2">
            <DuplicateEffort effort={data.duplicateEffort} />
            <Card>
              <CardHeader>
                <CardTitle>Worth a look</CardTitle>
                <CardDescription>Unusual activity, in your time zone.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FlagList flags={data.flags} />
                {data.inactive.length > 0 && (
                  <div className="space-y-1 border-t border-border pt-3">
                    <p className="text-sm font-medium text-foreground">No activity in this period</p>
                    <p className="text-sm text-muted-foreground">
                      {data.inactive.map((user, index) => (
                        <span key={user._id}>
                          {index > 0 && ", "}
                          <Link to={`/users/${user._id}`} className="underline-offset-4 hover:underline">
                            {user.name}
                          </Link>
                        </span>
                      ))}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <WeeklyEmailCard />
    </div>
  )
}

function Tile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="space-y-1 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  )
}

/** Everyone, ranked by the column chosen: candidates worked on unless changed. */
function Ranking({ rows }: { rows: TeamRow[] }) {
  const [sort, setSort] = useState<SortKey>("candidatesWorked")
  const sorted = [...rows].sort((a, b) => b[sort] - a[sort] || b.candidatesWorked - a.candidatesWorked)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Who&rsquo;s doing what</CardTitle>
        <CardDescription>Select a column to rank by it. Select a name for their full activity.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nobody yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 text-right">#</TableHead>
                  <TableHead>Person</TableHead>
                  {COLUMNS.map((column) => (
                    <TableHead
                      key={column.key}
                      className={cn("text-right", column.className)}
                      aria-sort={sort === column.key ? "descending" : "none"}
                    >
                      <button
                        type="button"
                        onClick={() => setSort(column.key)}
                        className={cn(
                          "-mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                          sort === column.key && "text-foreground"
                        )}
                      >
                        {column.label}
                        {sort === column.key && <ArrowDown className="size-3.5" aria-hidden />}
                      </button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((row, index) => (
                  <TableRow key={row.user._id}>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{index + 1}</TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <Link
                          to={`/users/${row.user._id}`}
                          className="rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          {row.user.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {row.lastActiveAt ? `Active ${timeAgo(row.lastActiveAt)}` : "No activity"}
                          {row.user.role === "admin" && " · Admin"}
                        </p>
                      </div>
                    </TableCell>
                    {COLUMNS.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(
                          "text-right tabular-nums",
                          column.className,
                          column.key === "flags" && row.flags > 0 && "font-medium text-team-foreground"
                        )}
                      >
                        {column.render ? column.render(row) : n(row[column.key])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** How often two or more recruiters worked on the same candidate. */
function DuplicateEffort({ effort }: { effort: TeamSummary["duplicateEffort"] }) {
  const percent = Math.round(effort.rate * 100)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" aria-hidden />
          Duplicate effort
        </CardTitle>
        <CardDescription>Candidates more than one recruiter worked on in this period.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-2xl font-semibold text-foreground tabular-nums">{percent}%</p>
          <p className="text-xs text-muted-foreground">
            {n(effort.shared)} of {n(effort.candidates)} candidates worked on
          </p>
        </div>
        {/* A thin share bar: the overlap against the whole. */}
        {effort.candidates > 0 && (
          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-team" style={{ width: `${percent}%` }} />
          </div>
        )}
        {effort.top.length > 0 && (
          <ul className="space-y-1.5 text-sm">
            {effort.top.map((candidate) => (
              <li key={candidate.profileId} className="flex min-w-0 items-baseline justify-between gap-3">
                <span className="truncate text-foreground">{candidate.label ?? "A candidate no longer in the library"}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{candidate.recruiters.join(", ")}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
