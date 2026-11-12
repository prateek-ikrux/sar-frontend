import { Hint } from "@/components/search/hint"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDuration } from "@/lib/usage"
import type { ActivityDay } from "@/types"

const dayLabel = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", timeZone: "UTC" })
const dayLong = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
})

// Dates arrive as YYYY-MM-DD already in the admin's zone; read them as UTC so
// formatting never shifts them a day.
const asDate = (day: string) => new Date(`${day}T00:00:00Z`)

const total = (day: ActivityDay) => day.searches + day.questions + day.candidateActions

/** The axis top: the smallest 1, 2 or 5 x 10^n at or above the busiest day. */
function niceMax(n: number) {
  if (n <= 0) return 0
  const power = 10 ** Math.floor(Math.log10(n))
  return [1, 2, 5, 10].map((m) => m * power).find((v) => v >= n) ?? n
}

function breakdown(day: ActivityDay) {
  return (
    <div className="space-y-0.5">
      <p className="font-medium">{dayLong.format(asDate(day.date))}</p>
      <p className="tabular-nums">{total(day)} actions</p>
      <p className="tabular-nums opacity-80">
        {day.searches} searches · {day.questions} questions · {day.candidateActions} on candidates
      </p>
      {day.activeMinutes > 0 && (
        <p className="tabular-nums opacity-80">{formatDuration(day.activeMinutes * 60)} on the platform</p>
      )}
    </div>
  )
}

/**
 * Actions per day: one series, so one colour and no legend (the heading names
 * it). Each day's column is its hover target, wider than the bar; the same
 * numbers are in the table below for keyboard and screen reader use.
 */
export function ActivityChart({ days }: { days: ActivityDay[] }) {
  const top = niceMax(Math.max(0, ...days.map(total)))
  const ticks = top >= 2 && top % 2 === 0 ? [top, top / 2, 0] : [top, 0]

  if (top === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
        No activity in this period.
      </p>
    )
  }

  const labelled = new Set([0, Math.floor((days.length - 1) / 2), days.length - 1])

  return (
    <div className="space-y-3">
      <div className="flex gap-2" aria-hidden>
        {/* Y axis: clean ticks, in muted ink. */}
        <div className="relative h-40 w-8 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${100 - (tick / top) * 100}%` }}
            >
              {tick.toLocaleString()}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-40">
            {/* Hairline gridlines, recessive. */}
            {ticks.map((tick) => (
              <div
                key={tick}
                className="absolute inset-x-0 border-t border-border"
                style={{ top: `${100 - (tick / top) * 100}%` }}
              />
            ))}
            {/* A 2px gap between neighbouring columns. */}
            <div className="absolute inset-0 flex items-end gap-0.5">
              {days.map((day) => {
                const value = total(day)
                return (
                  <Hint key={day.date} label={breakdown(day)}>
                    <span className="group flex h-full min-w-0 flex-1 items-end justify-center">
                      {value > 0 && (
                        <span
                          className="block min-h-0.5 w-full max-w-6 rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-75"
                          style={{ height: `${(value / top) * 100}%` }}
                        />
                      )}
                    </span>
                  </Hint>
                )
              })}
            </div>
          </div>

          <div className="mt-1 flex text-xs text-muted-foreground">
            {days.map((day, index) => (
              <span key={day.date} className="relative min-w-0 flex-1">
                {labelled.has(index) && (
                  <span
                    className={
                      index === 0
                        ? "absolute left-0 whitespace-nowrap"
                        : index === days.length - 1
                          ? "absolute right-0 whitespace-nowrap"
                          : "absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
                    }
                  >
                    {dayLabel.format(asDate(day.date))}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      <details className="pt-3 text-sm">
        <summary className="w-fit cursor-pointer rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
          View as a table
        </summary>
        <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead className="text-right">Searches</TableHead>
                <TableHead className="text-right">Questions</TableHead>
                <TableHead className="text-right">On candidates</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...days].reverse().map((day) => (
                <TableRow key={day.date}>
                  <TableCell>{dayLong.format(asDate(day.date))}</TableCell>
                  <TableCell className="text-right tabular-nums">{day.searches}</TableCell>
                  <TableCell className="text-right tabular-nums">{day.questions}</TableCell>
                  <TableCell className="text-right tabular-nums">{day.candidateActions}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{total(day)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatDuration(day.activeMinutes * 60)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </details>
    </div>
  )
}
