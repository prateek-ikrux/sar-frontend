import type { Ref } from "react"
import { Bookmark, Copy, FileText, FileX, Mail, Phone } from "lucide-react"
import { toast } from "sonner"

import { Hint } from "@/components/search/hint"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SearchProfile } from "@/types"

/** Strips the extension so the file name reads as a label, not a path. */
export function fileLabel(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "")
}

/** What to call a candidate: their name from the resume, else the file name. */
export function candidateName(profile: SearchProfile) {
  return profile.summary?.name ?? fileLabel(profile.fileName)
}

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${what} copied`)
  } catch {
    toast.error(`Couldn't copy the ${what.toLowerCase()}`, {
      description: "Select the text and copy it instead.",
    })
  }
}

type Props = {
  profile: SearchProfile
  /**
   * 1-based, matching the [n] citations in answers. Undefined for a profile
   * the conversation doesn't hold (no resume file), which the chat can't see.
   */
  number?: number
  /** Position in the ranked list, for the relevance hint. */
  rank: number
  highlighted?: boolean
  /** On the user's shortlist. The save toggle shows only with onToggleSave. */
  saved?: boolean
  onToggleSave?: () => void
  ref?: Ref<HTMLDivElement>
}

export function ResultCard({ profile, number, rank, highlighted, saved, onToggleSave, ref }: Props) {
  const summary = profile.summary
  const name = candidateName(profile)
  const inChat = number !== undefined

  return (
    <div
      ref={ref}
      id={`candidate-${profile.id}`}
      className={cn(
        "flex gap-3 px-4 py-3 transition-colors duration-300",
        highlighted && "bg-primary/10"
      )}
    >
      {/* Scores cluster tightly, so rank is the signal; the raw score stays in a hint. */}
      <Hint label={`Rank ${rank} · relevance ${profile.score.toFixed(3)}`}>
        <span
          className={cn(
            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums",
            highlighted
              ? "border-primary bg-primary text-primary-foreground"
              : inChat
                ? "border-border text-foreground"
                : "border-dashed border-border text-muted-foreground"
          )}
        >
          {inChat ? (
            <>
              <span className="sr-only">Candidate </span>
              {number}
            </>
          ) : (
            <span aria-hidden>–</span>
          )}
        </span>
      </Hint>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-foreground" title={name}>
              {name}
            </h3>
            {summary?.name && (
              <p className="truncate text-xs text-muted-foreground" title={profile.fileName}>
                {profile.fileName}
              </p>
            )}
          </div>
          {onToggleSave && <SaveToggle saved={Boolean(saved)} name={name} onToggle={onToggleSave} />}
        </div>

        <div className="flex items-center justify-between gap-3">
          <ContactDetails email={profile.email} phone={profile.phone} />
          <ResumeLink url={profile.resumeUrl} name={name} />
        </div>

        {!inChat && (
          <p className="text-xs text-muted-foreground">
            Not in the chat: there&rsquo;s no resume file for the assistant to read.
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Three states: a link, a "missing" note when the PDF is gone from object
 * storage (null), or nothing when no link was issued (absent). Links are
 * presigned and expire, which is why they come from the server rather than
 * being built here.
 */
export function ResumeLink({ url, name }: { url: string | null | undefined; name: string }) {
  if (url === undefined) return null

  if (url === null) {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <FileX className="size-3" aria-hidden />
        Resume file missing
      </span>
    )
  }

  return (
    <Button
      variant="outline"
      size="xs"
      className="shrink-0"
      nativeButton={false}
      render={
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`Resume for ${name} (PDF, opens in a new tab)`}
        />
      }
    >
      <FileText />
      Resume
    </Button>
  )
}

/**
 * Email over phone, each a link with a copy button. Takes the free width of
 * its row, so whatever sits beside it stays on the right.
 */
export function ContactDetails({ email, phone }: { email: string | null; phone: string | null }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-xs text-muted-foreground">
      {email && (
        <span className="flex max-w-full min-w-0 items-center gap-0.5">
          <a
            href={`mailto:${email}`}
            className="flex min-w-0 items-center gap-1 rounded-sm hover:text-foreground hover:underline"
          >
            <Mail className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{email}</span>
          </a>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Copy email ${email}`}
            onClick={() => void copy(email, "Email")}
          >
            <Copy />
          </Button>
        </span>
      )}
      {phone && (
        <span className="flex items-center gap-0.5">
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-1 rounded-sm hover:text-foreground hover:underline"
          >
            <Phone className="size-3" aria-hidden />
            {phone}
          </a>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Copy phone number ${phone}`}
            onClick={() => void copy(phone, "Phone number")}
          >
            <Copy />
          </Button>
        </span>
      )}
    </div>
  )
}

/** Adds a candidate to the user's shortlist, or takes them off it. */
function SaveToggle({ saved, name, onToggle }: { saved: boolean; name: string; onToggle: () => void }) {
  const label = saved ? `Remove ${name} from your shortlist` : `Save ${name} to your shortlist`
  return (
    <Hint label={saved ? "On your shortlist. Select to remove." : "Save to your shortlist"}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        aria-pressed={saved}
        onClick={onToggle}
        className={cn("-mt-1 -mr-1 shrink-0", saved ? "text-primary" : "text-muted-foreground")}
      >
        <Bookmark className={cn(saved && "fill-current")} />
      </Button>
    </Hint>
  )
}
