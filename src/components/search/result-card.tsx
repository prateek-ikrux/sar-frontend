import { useState, type Ref } from "react"
import { useQuery } from "@tanstack/react-query"
import { Bookmark, Contact, Copy, Download, FileText, FileX, Mail, Phone } from "lucide-react"
import { toast } from "sonner"

import { Hint } from "@/components/search/hint"
import { TagButton, TagDialog, TagList, TeamActivityLine } from "@/components/search/team-activity"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { ApiError } from "@/lib/api"
import { workedOnByOthers } from "@/lib/team"
import { cn } from "@/lib/utils"
import {
  clearTag,
  reportResumeView,
  resumeDownloadUrl,
  revealContact,
  setTag,
} from "@/services/candidates"
import type { CandidateTag, SearchProfile } from "@/types"

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
  // Tags change here without a new search, so the card keeps its own copy.
  const [tags, setTags] = useState<CandidateTag[]>(profile.team?.tags ?? [])
  const [tagging, setTagging] = useState(false)
  const team = profile.team ? { ...profile.team, tags } : null
  const flagged = workedOnByOthers(team)
  const myTag = tags.find((tag) => tag.mine)

  return (
    <div
      ref={ref}
      id={`candidate-${profile.id}`}
      className={cn(
        // The bar is always there, so flagged and plain rows line up.
        "flex gap-3 border-l-4 py-3 pr-4 pl-3 transition-colors duration-300",
        flagged ? "border-l-team" : "border-l-transparent",
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
          <TagButton name={name} tagged={Boolean(myTag)} onClick={() => setTagging(true)} />
          {onToggleSave && <SaveToggle saved={Boolean(saved)} name={name} onToggle={onToggleSave} />}
        </div>

        {flagged && <span className="sr-only">Another recruiter is working on this candidate.</span>}
        <TeamActivityLine team={team} />
        <TagList tags={tags} />

        <div className="flex items-center justify-between gap-3">
          <ContactReveal profile={profile} />
          <ResumeLink url={profile.resumeUrl} name={name} profileId={profile.id} />
        </div>

        {!inChat && (
          <p className="text-xs text-muted-foreground">
            Not in the chat: there&rsquo;s no resume file for the assistant to read.
          </p>
        )}
      </div>

      <TagDialog
        open={tagging}
        onOpenChange={setTagging}
        name={name}
        current={myTag}
        onSave={async (tag, note) => setTags(await setTag(profile.id, tag, note))}
        onClear={async () => setTags(await clearTag(profile.id))}
      />
    </div>
  )
}

/**
 * Search results carry no contact details. This fetches one candidate's on
 * request, which the server records, and keeps them for the rest of the visit
 * (in memory only, never in the saved session).
 */
function ContactReveal({ profile }: { profile: SearchProfile }) {
  const contact = useQuery({
    queryKey: ["candidate-contact", profile.id],
    queryFn: () => revealContact(profile.id),
    enabled: false,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: false,
  })

  if (contact.data) return <ContactDetails email={contact.data.email} phone={contact.data.phone} />

  // A session saved before this change has no hasEmail/hasPhone: offer the button.
  if (profile.hasEmail === false && profile.hasPhone === false) {
    return <span className="flex-1 text-xs text-muted-foreground">No contact details</span>
  }

  async function reveal() {
    const result = await contact.refetch()
    if (result.error) {
      const apiError = result.error as ApiError
      toast.error(apiError.message, { description: apiError.detail })
    }
  }

  return (
    <div className="min-w-0 flex-1">
      <Button
        variant="outline"
        size="xs"
        onClick={() => void reveal()}
        disabled={contact.isFetching}
        aria-label={`Show contact details for ${candidateName(profile)}`}
      >
        {contact.isFetching ? <Spinner /> : <Contact />}
        Show contact
      </Button>
    </div>
  )
}

/**
 * Three states: a link, a "missing" note when the PDF is gone from object
 * storage (null), or nothing when no link was issued (absent). Links are
 * presigned and expire, which is why they come from the server rather than
 * being built here. With `profileId`, opening is reported to the server and
 * a Download button sits beside it.
 */
export function ResumeLink({
  url,
  name,
  profileId,
}: {
  url: string | null | undefined
  name: string
  profileId?: string
}) {
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
    <span className="flex shrink-0 items-center gap-0.5">
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
            // A click, Enter, or a middle-click to a new tab. Copying the link
            // from the right-click menu can't be seen.
            onClick={profileId ? () => reportResumeView(profileId) : undefined}
            onAuxClick={
              profileId ? (event) => event.button === 1 && reportResumeView(profileId) : undefined
            }
          />
        }
      >
        <FileText />
        Resume
      </Button>
      {profileId && <DownloadResume profileId={profileId} name={name} />}
    </span>
  )
}

/** Saves the resume file through a short-lived link the server issues and records. */
function DownloadResume({ profileId, name }: { profileId: string; name: string }) {
  const [pending, setPending] = useState(false)

  async function download() {
    setPending(true)
    try {
      // The link answers "save as", so following it starts a download and
      // leaves this page where it is.
      const link = document.createElement("a")
      link.href = await resumeDownloadUrl(profileId)
      link.rel = "noopener"
      link.click()
    } catch (error) {
      const apiError = error as ApiError
      toast.error(apiError.message ?? "Couldn't download the resume", { description: apiError.detail })
    } finally {
      setPending(false)
    }
  }

  return (
    <Hint label="Download the resume">
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Download the resume for ${name}`}
        disabled={pending}
        onClick={() => void download()}
      >
        {pending ? <Spinner /> : <Download />}
      </Button>
    </Hint>
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
