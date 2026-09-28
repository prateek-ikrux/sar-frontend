import { useRef, useState } from "react"
import { Search, SearchX, Sparkles } from "lucide-react"

import { ChatPanel } from "@/components/search/chat-panel"
import { ResultCard } from "@/components/search/result-card"
import { SearchBar } from "@/components/search/search-bar"
import { Hint } from "@/components/search/hint"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { useSearchSession } from "@/hooks/use-search-session"

// Shown before the first search, as a hint at the level of detail that works
// and as one-click starting points.
const EXAMPLES = [
  "Senior backend engineer with Node.js and MongoDB, 5+ years",
  "React developer who has shipped a design system",
  "Data analyst comfortable with SQL and Power BI, Pune or Mumbai",
]

/**
 * Two panes over one pinned set: candidates on the left, questions about them
 * on the right. The left pane never changes while a conversation is open, so
 * an answer's [n] and candidate n always refer to the same person.
 */
export default function SearchPage() {
  const session = useSearchSession()
  const [draft, setDraft] = useState("")
  const [hovered, setHovered] = useState<number | null>(null)
  const [flashed, setFlashed] = useState<number | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const rows = useRef(new Map<number, HTMLDivElement>())
  const input = useRef<HTMLTextAreaElement>(null)

  const { profiles, messages, searching, asking } = session
  const idle = !profiles && !searching && messages.length === 0
  const loadingSet = !profiles && (searching || asking)
  // Rows are numbered by their place in the pinned set, which is what [n] in
  // an answer counts. A profile without a resume file (only listed when
  // "Only with resume" is off) is never pinned, so it gets no number.
  const numberOf = new Map(session.pinnedIds.map((id, i) => [id, i + 1]))
  const pinned = profiles
    ? profiles.filter((p) => numberOf.has(p.id))
    : null
  const unpinned = (profiles?.length ?? 0) - (pinned?.length ?? 0)

  function clearHighlight() {
    setHovered(null)
    setFlashed(null)
    clearTimeout(flashTimer.current)
  }

  function newSearch() {
    clearHighlight()
    session.reset()
    setDraft("")
    input.current?.focus()
  }

  function searchFor(query: string) {
    clearHighlight()
    setDraft(query)
    void session.search(query)
  }

  function cite(n: number) {
    rows.current.get(n)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    setFlashed(n)
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlashed(null), 1600)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Search candidates
        </h1>
        <p className="text-sm text-muted-foreground">
          Describe the person you need, then ask questions about the matches.
          Every resume is searched on meaning, not keywords.
        </p>
      </div>

      <SearchBar
        inputRef={input}
        value={draft}
        onValueChange={setDraft}
        onSearch={searchFor}
        onAsk={
          idle
            ? (question) => {
                setDraft("")
                void session.ask(question)
              }
            : undefined
        }
        isPending={searching}
        options={session.options}
        onOptionsChange={session.setOptions}
        locked={session.locked}
        onNewSearch={newSearch}
      />

      {idle && (
        <section className="space-y-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            Try one of these
          </p>
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
      )}

      {profiles?.length === 0 && messages.length === 0 && (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No matches</EmptyTitle>
            <EmptyDescription>
              Nothing came back for &ldquo;{session.query}&rdquo;. Try
              different wording or drop a requirement or two.
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

      {!idle && !(profiles?.length === 0 && messages.length === 0) && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Card size="sm" className="gap-0 py-0 lg:h-[calc(100vh-13rem)] lg:min-h-[30rem]">
            <CardHeader className="gap-0.5 border-b py-3 [.border-b]:pb-3">
              <CardTitle className="text-sm">
                Candidates
                {profiles && (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    ({profiles.length})
                  </span>
                )}
              </CardTitle>
              {session.query && (
                <Hint label={session.query}>
                  <CardDescription className="truncate text-xs">
                    for &ldquo;{session.query}&rdquo;
                  </CardDescription>
                </Hint>
              )}
              {unpinned > 0 && (
                <CardDescription className="text-xs">
                  {unpinned} without a resume file{" "}
                  {unpinned === 1 ? "is" : "are"} listed but not in the chat
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="min-h-0 flex-1 px-0">
              <ScrollArea className="min-h-0 flex-1">
                {loadingSet ? (
                  <ul className="divide-y divide-border">
                    {Array.from({ length: Math.min(session.options.limit, 5) }, (_, i) => (
                      <li key={i} className="flex gap-3 px-4 py-3">
                        <Skeleton className="size-6 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-56" />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ol className="divide-y divide-border">
                    {profiles?.map((profile) => {
                      const n = numberOf.get(profile.id)
                      return (
                        <li key={profile.id}>
                          <ResultCard
                            profile={profile}
                            number={n}
                            highlighted={n !== undefined && (hovered === n || flashed === n)}
                            ref={(el) => {
                              if (n === undefined) return
                              if (el) rows.current.set(n, el)
                              else rows.current.delete(n)
                            }}
                          />
                        </li>
                      )
                    })}
                  </ol>
                )}
              </ScrollArea>
            </CardContent>

            <CardFooter className="border-t py-3 [.border-t]:pt-3">
              <Button variant="outline" className="w-full" onClick={newSearch}>
                <Search />
                New search
              </Button>
            </CardFooter>
          </Card>

          <ChatPanel
            profiles={pinned}
            messages={messages}
            asking={asking}
            searching={searching}
            ended={session.ended}
            onAsk={(question) => void session.ask(question)}
            onSearchInstead={searchFor}
            onEndChat={session.endChat}
            onNewSearch={newSearch}
            onCite={cite}
            onCiteHover={setHovered}
          />
        </div>
      )}
    </div>
  )
}
