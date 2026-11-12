import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Mail, Send, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import type { ApiError } from "@/lib/api"
import { getWeeklyEmail, saveWeeklyEmail, sendTestWeeklyEmail, timeZone } from "@/services/team"
import type { WeeklyEmailSettings } from "@/types"

const KEY = ["weekly-email"] as const

const sentAt = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })

const hourLabel = (hour: number) =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hour))

/**
 * Turns the weekly summary email on or off and picks who gets it. Off by
 * default. Only admins can be chosen: recruiters aren't told their activity
 * is tracked, and this report would tell them.
 */
export function WeeklyEmailCard() {
  const settings = useQuery<WeeklyEmailSettings, ApiError>({ queryKey: KEY, queryFn: getWeeklyEmail })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-4 text-muted-foreground" aria-hidden />
          Weekly summary email
        </CardTitle>
        <CardDescription>
          The last 7 days in one email: who was most active, duplicate effort, who did nothing, and anything
          unusual. Only admins can receive it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {settings.isPending && <Skeleton className="h-32 w-full" />}
        {settings.error && <p className="text-sm text-destructive">{settings.error.message}</p>}
        {/* Keyed so a fresh load resets the form to what's saved. */}
        {settings.data && <SettingsForm key={settings.dataUpdatedAt} saved={settings.data} />}
      </CardContent>
    </Card>
  )
}

function SettingsForm({ saved }: { saved: WeeklyEmailSettings }) {
  const queryClient = useQueryClient()
  const [enabled, setEnabled] = useState(saved.enabled)
  const [chosen, setChosen] = useState(() => new Set(saved.recipients.map((person) => person._id)))
  const [zone, setZone] = useState(saved.timeZone)
  const mine = timeZone()

  const changed =
    enabled !== saved.enabled ||
    zone !== saved.timeZone ||
    chosen.size !== saved.recipients.length ||
    saved.recipients.some((person) => !chosen.has(person._id))
  const missing = enabled && chosen.size === 0

  const save = useMutation({
    mutationFn: () => saveWeeklyEmail({ enabled, recipientIds: [...chosen], timeZone: zone }),
    onSuccess: (next) => {
      queryClient.setQueryData(KEY, next)
      toast.success(next.enabled ? "Weekly summary is on" : "Weekly summary is off")
    },
    onError: (error: ApiError) => toast.error(error.message, { description: error.detail }),
  })

  const test = useMutation({
    mutationFn: sendTestWeeklyEmail,
    onSuccess: (to) => toast.success("Test summary sent", { description: `Check ${to}.` }),
    onError: (error: ApiError) => toast.error(error.message, { description: error.detail }),
  })

  function toggle(id: string, on: boolean) {
    setChosen((current) => {
      const next = new Set(current)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (!missing) save.mutate()
      }}
    >
      <div className="flex items-start gap-3">
        <Switch id="weekly-enabled" checked={enabled} onCheckedChange={setEnabled} />
        <div className="space-y-0.5">
          <Label htmlFor="weekly-enabled">Send it every week</Label>
          <p className="text-xs text-muted-foreground">
            {saved.sendsAt.weekday}s at {hourLabel(saved.sendsAt.hour)}, {zone} time.{" "}
            {zone !== mine && (
              <button
                type="button"
                className="rounded-sm text-foreground underline underline-offset-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                onClick={() => setZone(mine)}
              >
                Use my time zone ({mine})
              </button>
            )}
          </p>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Send it to</legend>
        {saved.eligible.length === 0 ? (
          <p className="text-sm text-muted-foreground">There are no active admins to send it to.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {saved.eligible.map((person) => (
              <li key={person._id} className="flex items-center gap-3 px-3 py-2">
                <Switch
                  id={`weekly-to-${person._id}`}
                  size="sm"
                  checked={chosen.has(person._id)}
                  onCheckedChange={(on) => toggle(person._id, on)}
                />
                <Label htmlFor={`weekly-to-${person._id}`} className="min-w-0 flex-1 font-normal">
                  <span className="text-foreground">{person.name}</span>{" "}
                  <span className="truncate text-muted-foreground">{person.email}</span>
                </Label>
              </li>
            ))}
          </ul>
        )}
        {missing && <p className="text-sm text-destructive">Choose at least one person to send it to.</p>}
      </fieldset>

      {saved.lastError && (
        <p className="flex items-start gap-2 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          The last send failed: {saved.lastError}. It will try again at the next check.
        </p>
      )}
      {saved.lastSentAt && !saved.lastError && (
        <p className="text-xs text-muted-foreground">Last sent {sentAt.format(new Date(saved.lastSentAt))}.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={!changed || missing || save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="outline" disabled={test.isPending} onClick={() => test.mutate()}>
          <Send />
          {test.isPending ? "Sending…" : "Send me a test now"}
        </Button>
      </div>
    </form>
  )
}
