import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import { Clock, Download, Link2, Search, SearchX, Sparkles, X } from "lucide-react"
import { toast } from "sonner"

import { ChatPanel, type CitedCandidate } from "@/components/search/chat-panel"
import { Hint } from "@/components/search/hint"
import { candidateName, ResultCard } from "@/components/search/result-card"
import { SearchBar } from "@/components/search/search-bar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { DESKTOP_QUERY, REDUCED_MOTION_QUERY, useMediaQuery } from "@/hooks/use-media-query"
import { useRecentSearches } from "@/hooks/use-recent-searches"
import { useSearchSession } from "@/hooks/use-search-session"
import { useShortlist } from "@/hooks/use-shortlist"
import { downloadCsv, slug } from "@/lib/csv"
import { depthLabel, optionsFromParams, searchParamsFor } from "@/lib/search-options"
import { cn } from "@/lib/utils"
import type { SearchOptions } from "@/services/search"
import { useAuthStore } from "@/stores/auth-store"
import type { SearchProfile } from "@/types"

// Shown before the first search, as a hint at the level of detail that works
// and as one-click starting points.
const EXAMPLES = [
  "Senior backend engineer with Node.js and MongoDB, 5+ years",
  "React developer who has shipped a design system",
  "Data analyst comfortable with SQL and Power BI, Pune or Mumbai",
]

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text

/**
 * Two panes over one pinned set: candidates on the left, questions about them
 * on the right (tabs below the lg breakpoint). Answers cite candidates by
 * profile id, so a citation always points at the person it was written about.
 */
export default function SearchPage() {
  const userId = useAuthStore((s) => s.user?._id)
  const session = useSearchSession(userId)
  const recent = useRecentSearches(userId)
  const shortlist = useShortlist()
  const [params, setParams] = useSearchParams()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const reduceMotion = useMediaQuery(REDUCED_MOTION_QUERY)

  const [draft, setDraft] = useState(session.query)
  const [tab, setTab] = useState<"candidates" | "chat">(
    session.hasQuestions ? "chat" : "candidates"
  )
  const [hovered, setHovered] = useState<string | null>(null)
  const [flashed, setFlashed] = useState<string | null>(null)
  const [preview, setPreview] = useState<CitedCandidate | null>(null)
  const [pendingDiscard, setPendingDiscard] = useState<{
    run: () => void
    decline?: () => void
  } | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const rows = useRef(new Map<string, HTMLDivElement>())
  const input = useRef<HTMLTextAreaElement>(null)

  const { profiles, messages, searching, asking } = session
  const idle = !profiles && !searching && messages.length === 0
  const loadingSet = !profiles && (searching || asking)
  const noMatches = profiles?.length === 0 && messages.length === 0
  const showResults = !idle && !noMatches

  useDocumentTitle(session.query ? `${truncate(session.query, 40)} · Search` : "Search")

  // Rows are numbered by their place in the pinned set, which is what [n] in
  // the latest answers counts. A profile without a resume file (only listed
  // when "Only candidates with a resume file" is off) is never pinned, so it
  // gets no number.
  const numberOf = new Map(session.pinnedIds.map((id, i) => [id, i + 1]))
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]))
  const pinnedCount = profiles ? profiles.filter((p) => numberOf.has(p.id)).length : null
  const unpinned = (profiles?.length ?? 0) - (pinnedCount ?? 0)

  const lookup = (id: string): CitedCandidate | undefined => {
    const profile = byId.get(id)
    return profile ? { profile, number: numberOf.get(id) } : undefined
  }

  // A link (bookmark, shared URL, back button) names a search this tab isn't
  // showing: run it. The tab's own searches write the URL as they start, so
  // they never trigger this.
  // A tab restored without a query in its URL (the nav link drops it) gets
  // it back, so the address bar can always be shared.
  const linkedQuery = params.get("q")
  useEffect(() => {
    if (!linkedQuery && session.query && profiles) {
      setParams(searchParamsFor(session.query, session.pinnedOptions), { replace: true })
      return
    }
    if (!linkedQuery || linkedQuery === session.query) return
    const options = optionsFromParams(params)
    guard(
      () => {
        setDraft(linkedQuery)
        void runSearch(linkedQuery, options)
      },
      // Declined: put the address back to what's on screen.
      () => setParams(searchParamsFor(session.query, session.pinnedOptions), { replace: true })
    )
    // Only a change of link should start a search, not every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedQuery])

  function clearHighlight() {
    setHovered(null)
    setFlashed(null)
    clearTimeout(flashTimer.current)
  }

  /** Runs `action` now, or after confirming, when it would clear a chat. */
  function guard(action: () => void, onDecline?: () => void) {
    if (session.hasQuestions) setPendingDiscard({ run: action, decline: onDecline })
    else action()
  }

  async function runSearch(query: string, options: SearchOptions) {
    clearHighlight()
    setTab("candidates")
    setParams(searchParamsFor(query, options), { replace: true })
    if (await session.search(query, options)) recent.add(query, options)
  }

  function newSearch() {
    guard(() => {
      clearHighlight()
      session.reset()
      setDraft("")
      setParams({}, { replace: true })
      input.current?.focus()
    })
  }

  function searchFor(query: string, options: SearchOptions = session.options) {
    guard(() => {
      setDraft(query)
      void runSearch(query, options)
    })
  }

  // Before any question, a settings change re-runs the search, so what's on
  // screen always matches the settings shown.
  function changeOptions(next: SearchOptions) {
    if (profiles && !session.hasQuestions && session.query && !searching) {
      void runSearch(session.query, next)
    } else {
      session.setOptions(next)
    }
  }

  async function askDirectly(question: string) {
    setDraft("")
    setTab("chat")
    setParams(searchParamsFor(question, session.options), { replace: true })
    if (await session.ask(question)) recent.add(question, session.options)
  }

  function flash(id: string) {
    const row = rows.current.get(id)
    row?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" })
    setFlashed(id)
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlashed(null), 1600)
  }

  // Side by side, a citation scrolls the list. On a phone the list is on the
  // other tab, so the candidate opens over the chat instead.
  function cite(id: string) {
    if (isDesktop) {
      flash(id)
      return
    }
    const cited = lookup(id)
    if (cited) setPreview(cited)
  }

  function showInList(id: string) {
    setPreview(null)
    setTab("candidates")
    // After the tab has rendered, so the row is on screen to scroll to.
    setTimeout(() => flash(id), 50)
  }

  function exportCsv() {
    if (!profiles?.length) return
    downloadCsv(`candidates-${slug(session.query)}.csv`, [
      ["#", "Candidate", "Resume file", "Email", "Phone", "Relevance", "Resume link (expires within 24 hours)"],
      ...profiles.map((p) => [
        numberOf.get(p.id) ?? "",
        candidateName(p),
        p.fileName,
        p.email,
        p.phone,
        p.score.toFixed(3),
        p.resumeUrl ?? "",
      ]),
    ])
  }

  async function copyLink() {
    const url = new URL(window.location.href)
    url.search = searchParamsFor(session.query, session.pinnedOptions).toString()
    try {
      await navigator.clipboard.writeText(url.toString())
      toast.success("Link copied", {
        description: "Anyone with access who opens it will see this search run again.",
      })
    } catch {
      toast.error("Couldn't copy the link", { description: "Copy it from the address bar instead." })
    }
  }

  const status = searching
    ? "Searching…"
    : profiles
      ? profiles.length === 0
        ? "No matches"
        : `${profiles.length} ${profiles.length === 1 ? "candidate" : "candidates"} found`
      : ""

  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        // Fill the viewport below the header (3.5rem plus its 1px border)
        // and the main padding (2 x 2rem), so each pane scrolls on its own
        // however tall the search box grows.
        showResults && "lg:h-[calc(100dvh-7.5rem-1px)] lg:min-h-[36rem]"
      )}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Search candidates
        </h1>
        <p className="text-sm text-muted-foreground">
          Describe the person you need, then ask questions about the matches.
          Resumes are searched by meaning, not just keywords.
        </p>
      </div>

      <SearchBar
        inputRef={input}
        value={draft}
        onValueChange={setDraft}
        onSearch={(query) => searchFor(query)}
        onAsk={idle ? (question) => void askDirectly(question) : undefined}
        isPending={searching}
        options={session.options}
        onOptionsChange={changeOptions}
        locked={session.locked}
        hasResults={!idle}
        onNewSearch={newSearch}
      />

      <p role="status" className="sr-only">
        {status}
      </p>

      {idle && (
        <div className={cn("grid gap-6", recent.items.length > 0 && "md:grid-cols-2")}>
          <section className="space-y-3" aria-labelledby="examples-heading">
            <h2
              id="examples-heading"
              className="flex items-center gap-1.5 text-sm font-medium text-foreground"
            >
              <Sparkles className="size-3.5 text-primary" aria-hidden />
              Try one of these
            </h2>
            <ul className="flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <li key={example}>
                  <Button
                    variant="outline"
                    className="h-auto rounded-full py-1.5 font-normal whitespace-normal text-muted-foreground"
                    onClick={() => searchFor(example)}
                  >
                    {example}
                  </Button>
                </li>
              ))}
            </ul>
          </section>

          {recent.items.length > 0 && (
            <section className="space-y-3" aria-labelledby="recent-heading">
              <div className="flex items-center justify-between gap-2">
                <h2
                  id="recent-heading"
                  className="flex items-center gap-1.5 text-sm font-medium text-foreground"
                >
                  <Clock className="size-3.5 text-primary" aria-hidden />
                  Recent searches
                </h2>
                <Button variant="ghost" size="xs" onClick={recent.clear}>
                  Clear
                </Button>
              </div>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {recent.items.map((item) => (
                  <li key={item.query} className="flex items-center gap-1 pr-1">
                    <button
                      type="button"
                      className="min-w-0 flex-1 rounded-md px-3 py-2 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                      onClick={() => searchFor(item.query, item.options)}
                    >
                      <span className="block truncate text-sm text-foreground">{item.query}</span>
                      <span className="block text-xs text-muted-foreground">
                        {item.options.limit} results · {depthLabel(item.options.charsPerDocument)} reading
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Remove "${item.query}" from recent searches`}
                      onClick={() => recent.remove(item.query)}
                    >
                      <X />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {noMatches && (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No matches</EmptyTitle>
            <EmptyDescription>
              Nothing came back for &ldquo;{session.query}&rdquo;. Try
              different wording or drop a requirement or two.
              {session.options.requireResume && (
                <> You could also include candidates without a resume file.</>
              )}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={newSearch}>
              <Search />
              New search
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {showResults && (
        <>
          <div role="tablist" aria-label="Results" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 lg:hidden">
            {(
              [
                ["candidates", `Candidates${profiles ? ` (${profiles.length})` : ""}`],
                ["chat", `Chat${messages.length ? ` (${messages.filter((m) => m.role === "user").length})` : ""}`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                id={`tab-${value}`}
                aria-selected={tab === value}
                aria-controls={`panel-${value}`}
                onClick={() => setTab(value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  tab === value
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <Card
              size="sm"
              id="panel-candidates"
              role={isDesktop ? undefined : "tabpanel"}
              aria-labelledby={isDesktop ? undefined : "tab-candidates"}
              className={cn("gap-0 py-0 lg:h-full lg:min-h-0", tab !== "candidates" && "max-lg:hidden")}
            >
              <CardHeader className="gap-0.5 border-b py-3 [.border-b]:pb-3">
                <h2 className="font-heading text-sm font-medium">
                  Candidates
                  {profiles && (
                    <span className="font-normal text-muted-foreground"> ({profiles.length})</span>
                  )}
                </h2>
                {session.query && (
                  <Hint label={session.query}>
                    <CardDescription className="truncate text-xs">
                      for &ldquo;{session.query}&rdquo;
                    </CardDescription>
                  </Hint>
                )}
                {unpinned > 0 && (
                  <CardDescription className="text-xs">
                    {unpinned} without a resume file {unpinned === 1 ? "is" : "are"} listed
                    but not in the chat
                  </CardDescription>
                )}
                {profiles && profiles.length > 0 && (
                  <CardAction className="flex gap-1">
                    <Hint label="Copy a link to this search">
                      <Button variant="ghost" size="icon-sm" aria-label="Copy a link to this search" onClick={() => void copyLink()}>
                        <Link2 />
                      </Button>
                    </Hint>
                    <Hint label="Download these candidates as a spreadsheet (CSV)">
                      <Button variant="ghost" size="icon-sm" aria-label="Download candidates as CSV" onClick={exportCsv}>
                        <Download />
                      </Button>
                    </Hint>
                  </CardAction>
                )}
              </CardHeader>

              <CardContent className="min-h-0 flex-1 px-0">
                <ScrollArea className="min-h-0 flex-1">
                  {loadingSet ? (
                    <ul className="divide-y divide-border" aria-hidden>
                      {Array.from({ length: Math.min(session.options.limit, 5) }, (_, i) => (
                        <li key={i} className="flex gap-3 px-4 py-3">
                          <Skeleton className="size-6 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-56" />
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ol className="divide-y divide-border">
                      {profiles?.map((profile, index) => (
                        <li key={profile.id}>
                          <ResultCard
                            profile={profile}
                            number={numberOf.get(profile.id)}
                            rank={index + 1}
                            highlighted={hovered === profile.id || flashed === profile.id}
                            saved={shortlist.isSaved(profile.id)}
                            onToggleSave={() => shortlist.toggle(profile, session.query)}
                            ref={(el) => {
                              if (el) rows.current.set(profile.id, el)
                              else rows.current.delete(profile.id)
                            }}
                          />
                        </li>
                      ))}
                    </ol>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <ChatPanel
              className={cn(
                "h-[70dvh] min-h-[26rem] lg:h-full lg:min-h-0",
                tab !== "chat" && "max-lg:hidden"
              )}
              count={pinnedCount}
              messages={messages}
              asking={asking}
              searching={searching}
              onAsk={(question) => void session.ask(question)}
              onStop={session.stop}
              onSearchInstead={(query) => searchFor(query)}
              lookup={lookup}
              onCite={cite}
              onCiteHover={isDesktop ? setHovered : () => {}}
            />
          </div>
        </>
      )}

      <AlertDialog
        open={pendingDiscard !== null}
        onOpenChange={(open) => {
          if (open) return
          pendingDiscard?.decline?.()
          setPendingDiscard(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a new search?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears the current candidates and your chat about them.
              Your past searches stay under Recent searches.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep this chat</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                pendingDiscard?.run()
                setPendingDiscard(null)
              }}
            >
              Start new search
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CandidatePreview
        saved={preview ? shortlist.isSaved(preview.profile.id) : false}
        onToggleSave={() => preview && shortlist.toggle(preview.profile, session.query)}
        cited={preview}
        onClose={() => setPreview(null)}
        onShowInList={showInList}
      />
    </div>
  )
}

/** A cited candidate, opened over the chat on small screens. */
function CandidatePreview({
  cited,
  saved,
  onToggleSave,
  onClose,
  onShowInList,
}: {
  cited: CitedCandidate | null
  saved: boolean
  onToggleSave: () => void
  onClose: () => void
  onShowInList: (id: string) => void
}) {
  // Keeps the last candidate while the dialog animates closed.
  const [shown, setShown] = useState<SearchProfile | null>(null)
  const [number, setNumber] = useState<number | undefined>(undefined)
  if (cited && cited.profile !== shown) {
    setShown(cited.profile)
    setNumber(cited.number)
  }

  return (
    <Dialog open={cited !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-4 p-0 pt-6">
        <DialogHeader className="px-6">
          <DialogTitle>
            {number !== undefined ? `Candidate ${number}` : "Candidate"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Details of the candidate cited in the answer.
          </DialogDescription>
        </DialogHeader>
        {shown && (
          <ResultCard
            profile={shown}
            number={number}
            rank={number ?? 0}
            saved={saved}
            onToggleSave={onToggleSave}
          />
        )}
        <DialogFooter className="px-6 pb-6">
          {shown && (
            <Button variant="outline" onClick={() => onShowInList(shown.id)}>
              Show in list
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
