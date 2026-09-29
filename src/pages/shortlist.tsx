import { useState } from "react"
import { Link } from "react-router"
import { Bookmark, Download, Search, TriangleAlert, X } from "lucide-react"

import { ContactDetails, Highlighted, ResumeLink, fileLabel } from "@/components/search/result-card"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { useShortlist } from "@/hooks/use-shortlist"
import { downloadCsv } from "@/lib/csv"
import { DEFAULT_OPTIONS, searchParamsFor } from "@/lib/search-options"
import type { ApiError } from "@/lib/api"
import type { ShortlistItem } from "@/types"

const NOTE_MAX = 1000

const dateFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" })

const nameOf = (item: ShortlistItem) =>
  item.summary.name ?? (item.fileName ? fileLabel(item.fileName) : "Unnamed candidate")

export default function ShortlistPage() {
  useDocumentTitle("Shortlist")
  const shortlist = useShortlist()
  const [filter, setFilter] = useState("")

  const needle = filter.trim().toLowerCase()
  const shown = needle
    ? shortlist.items.filter((item) =>
        [nameOf(item), item.fileName, item.email, item.note, item.query]
          .filter(Boolean)
          .some((text) => text!.toLowerCase().includes(needle))
      )
    : shortlist.items

  function exportCsv() {
    downloadCsv("shortlist.csv", [
      ["Candidate", "Resume file", "Email", "Phone", "Saved from search", "Saved on", "Note", "Resume link (expires within 24 hours)"],
      ...shown.map((item) => [
        nameOf(item),
        item.fileName,
        item.email,
        item.phone,
        item.query,
        dateFormat.format(new Date(item.savedAt)),
        item.note,
        item.resumeUrl ?? "",
      ]),
    ])
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Shortlist
            {shortlist.items.length > 0 && (
              <span className="ml-2 text-base font-normal text-muted-foreground">
                {shortlist.items.length}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            Candidates you&rsquo;ve saved from searches. Only you can see this list.
          </p>
        </div>
        {shortlist.items.length > 0 && (
          <Button variant="outline" onClick={exportCsv}>
            <Download />
            Download CSV
          </Button>
        )}
      </div>

      {shortlist.items.length > 3 && (
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="w-full sm:w-80">
            <InputGroupAddon>
              <Search aria-hidden />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter by name, email, note or search"
              aria-label="Filter your shortlist"
            />
          </InputGroup>
          {needle && (
            <p className="text-sm text-muted-foreground" role="status">
              {shown.length} of {shortlist.items.length}
            </p>
          )}
        </div>
      )}

      {shortlist.isPending && (
        <div className="space-y-3" aria-hidden>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      )}

      {shortlist.error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div className="space-y-0.5">
            <p className="font-medium text-foreground">Couldn&rsquo;t load your shortlist</p>
            <p className="text-sm text-muted-foreground">
              {shortlist.error.message}
              {shortlist.error.detail && `. ${shortlist.error.detail}`}
            </p>
          </div>
        </div>
      )}

      {!shortlist.isPending && !shortlist.error && shortlist.items.length === 0 && (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Bookmark />
            </EmptyMedia>
            <EmptyTitle>Nothing saved yet</EmptyTitle>
            <EmptyDescription>
              In search results, select the bookmark on a candidate to keep
              them here, with a note, across searches and devices.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link to="/search" className={buttonVariants()}>
              <Search />
              Search candidates
            </Link>
          </EmptyContent>
        </Empty>
      )}

      {needle && shown.length === 0 && shortlist.items.length > 0 && (
        <p className="rounded-lg border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          No saved candidates match &ldquo;{filter.trim()}&rdquo;.
        </p>
      )}

      {shown.length > 0 && (
        <ul className="space-y-3">
          {shown.map((item) => (
            <li key={item.profileId}>
              <ShortlistCard
                item={item}
                onRemove={() => shortlist.remove(item)}
                onSaveNote={(text) => shortlist.saveNote(item.profileId, text)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ShortlistCard({
  item,
  onRemove,
  onSaveNote,
}: {
  item: ShortlistItem
  onRemove: () => void
  onSaveNote: (text: string) => Promise<string>
}) {
  const name = nameOf(item)
  const searchLink = item.query
    ? `/search?${searchParamsFor(item.query, DEFAULT_OPTIONS).toString()}`
    : null

  return (
    <article className="space-y-3 rounded-xl bg-card px-5 py-4 text-sm ring-1 ring-foreground/10">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-semibold text-foreground" title={name}>
              {name}
            </h2>
            {item.missing && (
              <Badge variant="outline" className="text-muted-foreground">
                No longer in the library
              </Badge>
            )}
          </div>
          {item.summary.name && item.fileName && (
            <p className="truncate text-xs text-muted-foreground">{item.fileName}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${name} from your shortlist`}
          onClick={onRemove}
          className="-mt-1 -mr-2 text-muted-foreground"
        >
          <X />
        </Button>
      </div>

      {item.summary.snippet && (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          <Highlighted text={item.summary.snippet} terms={item.summary.terms} />
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <ContactDetails email={item.email} phone={item.phone} />
        {!item.missing && <ResumeLink url={item.resumeUrl} name={name} />}
      </div>

      <NoteEditor profileId={item.profileId} note={item.note} name={name} onSave={onSaveNote} />

      <p className="text-xs text-muted-foreground">
        Saved {dateFormat.format(new Date(item.savedAt))}
        {searchLink && (
          <>
            {" "}from{" "}
            <Link to={searchLink} className="text-foreground underline-offset-4 hover:underline">
              &ldquo;{item.query}&rdquo;
            </Link>
          </>
        )}
      </p>
    </article>
  )
}

/** A note on a saved candidate: shown as text, edited in place. */
function NoteEditor({
  profileId,
  note,
  name,
  onSave,
}: {
  profileId: string
  note: string
  name: string
  onSave: (text: string) => Promise<string>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const id = `note-${profileId}`

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await onSave(draft.trim())
      setEditing(false)
    } catch (e) {
      const apiError = e as ApiError
      setError(apiError.fields?.note ?? apiError.message ?? "Couldn't save the note.")
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return note ? (
      <div className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2">
        <p className="min-w-0 flex-1 text-sm whitespace-pre-wrap text-foreground">{note}</p>
        <Button
          variant="ghost"
          size="xs"
          aria-label={`Edit the note on ${name}`}
          onClick={() => {
            setDraft(note)
            setEditing(true)
          }}
        >
          Edit
        </Button>
      </div>
    ) : (
      <Button
        variant="ghost"
        size="xs"
        className="-ml-2 text-muted-foreground"
        onClick={() => {
          setDraft("")
          setEditing(true)
        }}
      >
        Add a note
      </Button>
    )
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <label htmlFor={id} className="sr-only">
        Note on {name}
      </label>
      <Textarea
        id={id}
        autoFocus
        value={draft}
        maxLength={NOTE_MAX}
        rows={2}
        placeholder="Availability, notice period, what you discussed…"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setEditing(false)
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void save()
        }}
        aria-invalid={Boolean(error) || undefined}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={saving || draft.trim() === note}>
          {saving ? "Saving…" : "Save note"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
          Cancel
        </Button>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {draft.length}/{NOTE_MAX}
        </span>
      </div>
    </form>
  )
}
