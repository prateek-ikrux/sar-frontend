import { useState } from "react"
import { Eye, Info, Tag, Users } from "lucide-react"
import { toast } from "sonner"

import { Hint } from "@/components/search/hint"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ApiError } from "@/lib/api"
import { DID, TAG_LABELS, timeAgo } from "@/lib/team"
import { cn } from "@/lib/utils"
import { CANDIDATE_TAGS, type CandidateTag, type CandidateTagValue, type TeamActivity } from "@/types"

/** Mirrors the server's CANDIDATE_TAG_NOTE_MAX_CHARS. */
const TAG_NOTE_MAX = 280

/**
 * Who else has worked on this candidate lately, by name, newest first; or,
 * failing that, how many others got them in their results; and what the
 * signed-in recruiter did themselves.
 */
export function TeamActivityLine({ team }: { team: TeamActivity | null | undefined }) {
  if (!team) return null
  const [latest] = team.others
  const more = team.otherCount - 1
  const unnamed = team.otherCount - team.others.length

  return (
    <div className="space-y-0.5 text-xs">
      {latest ? (
        <p className="flex min-w-0 items-center gap-1 text-team-foreground">
          <Users className="size-3 shrink-0" aria-hidden />
          <span className="truncate">
            {latest.name} {DID[latest.action]} · {timeAgo(latest.at)}
          </span>
          {more > 0 && (
            <Hint
              label={
                <ul className="space-y-0.5">
                  {team.others.map((other) => (
                    <li key={other.name}>
                      {other.name} {DID[other.action]} {timeAgo(other.at)}
                    </li>
                  ))}
                  {unnamed > 0 && <li>and {unnamed} more</li>}
                </ul>
              }
            >
              <button
                type="button"
                className="shrink-0 rounded-sm font-medium underline-offset-2 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                +{more} more
              </button>
            </Hint>
          )}
        </p>
      ) : (
        team.seenBy > 0 && (
          <p className="flex items-center gap-1 text-muted-foreground">
            <Eye className="size-3 shrink-0" aria-hidden />
            In {team.seenBy} other {team.seenBy === 1 ? "recruiter's" : "recruiters'"} results lately
          </p>
        )
      )}
      {team.mine && (
        <p className="text-muted-foreground">
          You {DID[team.mine.action]} {timeAgo(team.mine.at)}
        </p>
      )}
    </div>
  )
}

/** The amber edge as a small swatch, for keys that describe it. */
function EdgeSwatch() {
  return <span aria-hidden className="inline-block h-3.5 w-1 shrink-0 rounded-full bg-team" />
}

/**
 * What the markers on a candidate card mean. The amber edge is easy to miss
 * or misread on its own, so the list says it in words wherever it appears.
 */
export function CardKey() {
  return (
    <ul className="space-y-1.5 text-xs">
      <li className="flex items-start gap-2">
        <span className="mt-0.5 flex">
          <EdgeSwatch />
        </span>
        <span>
          <strong className="font-medium">Amber edge:</strong> another recruiter opened, downloaded, contacted,
          shortlisted, tagged or exported this candidate in the last 90 days, or has a tag on them.
        </span>
      </li>
      <li className="flex items-start gap-2">
        <Users className="mt-0.5 size-3 shrink-0" aria-hidden />
        <span>
          <strong className="font-medium">Amber line:</strong> who it was and what they did, newest first.
        </span>
      </li>
      <li className="flex items-start gap-2">
        <Eye className="mt-0.5 size-3 shrink-0" aria-hidden />
        <span>
          <strong className="font-medium">Grey line:</strong> the candidate only turned up in other recruiters&rsquo;
          results. Nobody has worked on them yet.
        </span>
      </li>
      <li className="flex items-start gap-2">
        <Tag className="mt-0.5 size-3 shrink-0" aria-hidden />
        <span>
          <strong className="font-medium">Tags:</strong> each recruiter&rsquo;s status for the candidate, such as
          Contacted or Not interested, with their note. Amber is someone else&rsquo;s, outlined is yours.
        </span>
      </li>
    </ul>
  )
}

/** An info button that shows the card key on hover or focus. */
export function CardKeyButton() {
  return (
    <Hint label={<CardKey />}>
      <Button variant="ghost" size="icon-sm" aria-label="What the colours on the cards mean">
        <Info />
      </Button>
    </Hint>
  )
}

/** A one-line key, shown above the list when some cards have the amber edge. */
export function EdgeNote({ count }: { count: number }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <EdgeSwatch />
      <span>
        {count} with an amber edge {count === 1 ? "is" : "are"} being worked on by another recruiter.
      </span>
    </p>
  )
}

/** Everyone's current tag on a candidate, one line each. */
export function TagList({ tags }: { tags: CandidateTag[] }) {
  if (!tags.length) return null
  return (
    <ul className="space-y-1">
      {tags.map((tag) => (
        <li key={`${tag.name}-${tag.mine}`} className="flex min-w-0 items-center gap-1.5 text-xs">
          <span
            className={cn(
              "shrink-0 rounded-md border px-1.5 py-px font-medium",
              tag.mine
                ? "border-primary/40 text-foreground"
                : "border-team/50 bg-team-muted text-team-foreground"
            )}
          >
            {TAG_LABELS[tag.tag]}
          </span>
          <span
            className="min-w-0 truncate text-muted-foreground"
            title={tag.note ? `${tag.note} (${tag.mine ? "you" : tag.name}, ${timeAgo(tag.at)})` : undefined}
          >
            {tag.mine ? "You" : tag.name}
            {tag.note && <> · &ldquo;{tag.note}&rdquo;</>} · {timeAgo(tag.at)}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Opens the tag dialog; filled in when the signed-in recruiter has a tag on. */
export function TagButton({ name, tagged, onClick }: { name: string; tagged: boolean; onClick: () => void }) {
  return (
    <Hint label={tagged ? "Change your tag. Your team sees it." : "Tag for your team"}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={tagged ? `Change your tag on ${name}` : `Tag ${name} for your team`}
        onClick={onClick}
        className={cn("-mt-1 shrink-0", tagged ? "text-primary" : "text-muted-foreground")}
      >
        <Tag />
      </Button>
    </Hint>
  )
}

/**
 * Sets the signed-in recruiter's tag, with an optional note: the status
 * every recruiter sees on this candidate. One tag per recruiter; a new one
 * replaces theirs.
 */
export function TagDialog({
  open,
  onOpenChange,
  name,
  current,
  onSave,
  onClear,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  current: CandidateTag | undefined
  onSave: (tag: CandidateTagValue, note: string) => Promise<void>
  onClear: () => Promise<void>
}) {
  const [tag, setTag] = useState<CandidateTagValue | null>(current?.tag ?? null)
  const [note, setNote] = useState(current?.note ?? "")
  const [pending, setPending] = useState(false)

  // Starts from the current tag each time it opens.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setTag(current?.tag ?? null)
      setNote(current?.note ?? "")
    }
  }

  async function run(action: () => Promise<void>, done: string) {
    setPending(true)
    try {
      await action()
      toast.success(done)
      onOpenChange(false)
    } catch (error) {
      const apiError = error as ApiError
      toast.error(apiError.message ?? "Couldn't save the tag", { description: apiError.detail })
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tag {name}</DialogTitle>
          <DialogDescription>
            Every recruiter sees your tag on this candidate, so nobody repeats your work.
          </DialogDescription>
        </DialogHeader>

        <form
          id="tag-form"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (tag) void run(() => onSave(tag, note.trim()), "Tag saved")
          }}
        >
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Status</legend>
            <div className="grid grid-cols-2 gap-2">
              {CANDIDATE_TAGS.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={tag === value ? "default" : "outline"}
                  size="sm"
                  aria-pressed={tag === value}
                  onClick={() => setTag(value)}
                >
                  {TAG_LABELS[value]}
                </Button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="tag-note">Note for the team (optional)</Label>
            <Textarea
              id="tag-note"
              value={note}
              maxLength={TAG_NOTE_MAX}
              rows={2}
              placeholder="Wants remote only, notice period 60 days…"
              onChange={(event) => setNote(event.target.value)}
            />
            <p className="text-right text-xs text-muted-foreground tabular-nums">
              {note.length}/{TAG_NOTE_MAX}
            </p>
          </div>
        </form>

        <DialogFooter>
          {current && (
            <Button
              variant="ghost"
              className="sm:mr-auto"
              disabled={pending}
              onClick={() => void run(onClear, "Tag cleared")}
            >
              Clear my tag
            </Button>
          )}
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="tag-form" disabled={!tag || pending}>
            {pending ? "Saving…" : "Save tag"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
