import type { Ref } from "react"
import { FileText, FileX, Mail, Phone } from "lucide-react"

import { Hint } from "@/components/search/hint"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { SearchProfile } from "@/types"

/** Strips the extension so the file name reads as a label, not a path. */
function label(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "")
}

type Props = {
  profile: SearchProfile
  /**
   * 1-based, matching the [n] citations in answers. Undefined for a profile
   * the conversation doesn't hold (no resume file), which the chat can't see.
   */
  number?: number
  highlighted?: boolean
  ref?: Ref<HTMLDivElement>
}

export function ResultCard({ profile, number, highlighted, ref }: Props) {
  return (
    <div
      ref={ref}
      id={number !== undefined ? `candidate-${number}` : undefined}
      className={cn(
        "flex gap-3 px-4 py-3 transition-colors duration-300",
        highlighted && "bg-primary/10",
        number === undefined && "opacity-70"
      )}
    >
      <Hint
        label={
          number === undefined
            ? "No resume file, so the chat can't see this candidate"
            : undefined
        }
      >
        <Badge
          variant={highlighted ? "default" : "outline"}
          className="mt-0.5 size-6 shrink-0 rounded-full px-0 tabular-nums"
          aria-label={number !== undefined ? `Candidate ${number}` : "Not in chat"}
        >
          {number ?? "–"}
        </Badge>
      </Hint>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <Hint label={profile.fileName}>
            <h3 className="truncate text-sm font-semibold text-foreground">
              {label(profile.fileName)}
            </h3>
          </Hint>
          {/* Scores cluster tightly, so the rank is the signal. Keep this quiet. */}
          <Hint label={`Relevance ${profile.score.toFixed(3)}`}>
            <span className="flex shrink-0 items-center gap-1.5">
              <Progress
                value={Math.round(profile.score * 100)}
                aria-label="Relevance"
                className="w-10 [&_[data-slot=progress-indicator]]:bg-muted-foreground/50 [&_[data-slot=progress-track]]:h-1"
              />
              <span className="text-xs text-muted-foreground tabular-nums">
                {profile.score.toFixed(3)}
              </span>
            </span>
          </Hint>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <a
              href={`mailto:${profile.email}`}
              className="flex min-w-0 items-center gap-1 hover:text-foreground"
            >
              <Mail className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{profile.email}</span>
            </a>
            {profile.phone && (
              <a
                href={`tel:${profile.phone}`}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Phone className="size-3" aria-hidden />
                {profile.phone}
              </a>
            )}
          </div>
          <ResumeLink url={profile.resumeUrl} />
        </div>
      </div>
    </div>
  )
}

/**
 * Three states: a link, a disabled "no file" when the PDF is missing from
 * object storage (null), or nothing when no link was issued (absent). Never an
 * enabled link without a URL. Links are presigned and expire, which is why
 * they come from the server rather than being built here.
 */
function ResumeLink({ url }: { url: string | null | undefined }) {
  if (url === undefined) return null

  if (url === null) {
    return (
      // The wrapper carries the tooltip: a disabled button gets no hover.
      <Hint label="The resume file is missing from storage">
        <span>
          <Button variant="ghost" size="xs" disabled>
            <FileX />
            No file
          </Button>
        </span>
      </Hint>
    )
  }

  return (
    <Button
      variant="outline"
      size="xs"
      nativeButton={false}
      render={<a href={url} target="_blank" rel="noreferrer noopener" />}
    >
      <FileText />
      PDF
    </Button>
  )
}
