import { useEffect, useRef, useState } from "react"
import { AlertCircle, Info, MessageSquareText, Search, Send } from "lucide-react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

import { Hint } from "@/components/search/hint"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import type { ChatMessage } from "@/hooks/use-search-session"
import { MIN_QUERY_LENGTH } from "@/services/search"
import { cn } from "@/lib/utils"
import type { SearchProfile } from "@/types"

// Phrasing that asks for different people rather than about these ones. The
// model rightly refuses to look beyond its set, but a user skimming that
// refusal may conclude there are no such candidates at all.
const LOOKS_LIKE_SEARCH =
  /^\s*(?:(?:now|also|and|ok|okay|then)[\s,]+)*(?:find|search(?:\s+for)?|look\s+for|get\s+me|fetch|pull\s+up)\b/i

type Props = {
  /** The pinned set. Null while the first answer is still being retrieved. */
  profiles: SearchProfile[] | null
  messages: ChatMessage[]
  asking: boolean
  /** A search is replacing the set, so questions have to wait. */
  searching: boolean
  ended: boolean
  onAsk: (question: string) => void
  onSearchInstead: (query: string) => void
  onEndChat: () => void
  onNewSearch: () => void
  /** Scrolls to and highlights candidate n (1-based). */
  onCite: (n: number) => void
  /** Hover preview of a citation; null when the pointer leaves. */
  onCiteHover: (n: number | null) => void
}

export function ChatPanel({
  profiles,
  messages,
  asking,
  searching,
  ended,
  onAsk,
  onSearchInstead,
  onEndChat,
  onNewSearch,
  onCite,
  onCiteHover,
}: Props) {
  const [draft, setDraft] = useState("")
  const [intercepted, setIntercepted] = useState<string | null>(null)
  const scrollArea = useRef<HTMLDivElement>(null)
  const count = profiles?.length ?? 0

  // ScrollArea scrolls its viewport, not its root, so pin that to the bottom.
  useEffect(() => {
    const viewport = scrollArea.current?.querySelector<HTMLElement>(
      "[data-slot=scroll-area-viewport]"
    )
    if (viewport) viewport.scrollTop = viewport.scrollHeight
  }, [messages, asking])

  const trimmed = draft.trim()
  const canSend =
    trimmed.length >= MIN_QUERY_LENGTH && !asking && !searching && !ended

  function send(question: string, force = false) {
    if (!force && LOOKS_LIKE_SEARCH.test(question)) {
      setIntercepted(question)
      return
    }
    setIntercepted(null)
    setDraft("")
    onAsk(question)
  }

  const heading = !profiles
    ? "Asking…"
    : count === 0
      ? "No candidates with a resume to ask about"
      : `Ask about ${count === 1 ? "this candidate" : `these ${count}`}`

  return (
    <Card
      size="sm"
      className="h-[75vh] min-h-[26rem] gap-0 py-0 lg:h-[calc(100vh-13rem)] lg:min-h-[30rem]"
    >
      <CardHeader className="border-b py-3 [.border-b]:pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageSquareText className="size-4 text-primary" aria-hidden />
          {heading}
        </CardTitle>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 px-0">
        <ScrollArea ref={scrollArea} className="min-h-0 flex-1">
          <div className="space-y-4 px-4 py-4" aria-live="polite">
            {messages.length === 0 && (
              <Empty className="border-0 py-10">
                <EmptyHeader>
                  <EmptyTitle className="text-sm">
                    Ask anything about these candidates
                  </EmptyTitle>
                  <EmptyDescription className="text-xs">
                    Compare their experience, check for a skill, or ask who
                    fits best. Answers cite candidates by number.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            {messages.map((message) =>
              message.role === "notice" ? (
                <p
                  key={message.id}
                  className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"
                >
                  <Info className="size-3" aria-hidden />
                  {message.text}
                </p>
              ) : message.role === "user" ? (
                <div key={message.id} className="flex flex-col items-end gap-1">
                  <p
                    className={cn(
                      "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap text-primary-foreground",
                      message.status === "pending" && "opacity-80"
                    )}
                  >
                    {message.text}
                  </p>
                  {message.status === "failed" && (
                    <span className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="size-3" aria-hidden />
                      Not answered ·
                      <Button
                        variant="link"
                        size="xs"
                        className="h-auto px-0 text-destructive"
                        disabled={asking || ended}
                        onClick={() => send(message.text, true)}
                      >
                        Retry
                      </Button>
                    </span>
                  )}
                </div>
              ) : (
                <div
                  key={message.id}
                  className="prose-resume max-w-full rounded-2xl rounded-bl-sm bg-muted/60 px-3.5 py-2.5 text-sm"
                >
                  <CitedAnswer
                    text={message.text}
                    profiles={profiles ?? []}
                    onCite={onCite}
                    onCiteHover={onCiteHover}
                  />
                </div>
              )
            )}

            {asking && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Spinner className="size-3.5" />
                Reading {count > 0 ? `${count} resumes` : "resumes"}…
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {ended ? (
        <CardFooter className="flex-wrap justify-between gap-2 border-t py-3 [.border-t]:pt-3">
          <p className="text-xs text-muted-foreground">
            This chat has ended. The candidates stay on screen for reference.
          </p>
          <Button size="sm" onClick={onNewSearch}>
            <Search />
            New search
          </Button>
        </CardFooter>
      ) : (
        <CardFooter className="border-t py-3 [.border-t]:pt-3">
          <form
            className="w-full space-y-2"
            onSubmit={(event) => {
              event.preventDefault()
              if (canSend) send(trimmed)
            }}
          >
            {intercepted && (
              <Alert className="border-primary/30 bg-primary/5">
                <Search />
                <AlertDescription className="space-y-2 text-xs text-foreground">
                  <p>
                    That sounds like a new search. Answers here only cover{" "}
                    {count === 1
                      ? "this candidate"
                      : `these ${count} candidates`}
                    .
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="xs"
                      onClick={() => {
                        setIntercepted(null)
                        setDraft("")
                        onSearchInstead(intercepted)
                      }}
                    >
                      Search for this instead
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => send(intercepted, true)}
                    >
                      Ask about these {count} anyway
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <InputGroup>
              <InputGroupTextarea
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value)
                  if (intercepted) setIntercepted(null)
                }}
                rows={1}
                maxLength={1000}
                disabled={asking || searching}
                aria-label="Ask a follow-up question"
                placeholder={
                  asking ? "Waiting for the answer…" : "Ask a follow-up…"
                }
                className="max-h-32 min-h-9"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    if (canSend) send(trimmed)
                  }
                }}
              />
              <InputGroupAddon align="inline-end" className="self-end pb-1.5">
                <InputGroupButton
                  type="submit"
                  size="icon-sm"
                  variant="default"
                  disabled={!canSend}
                  aria-label="Send"
                >
                  {asking ? <Spinner /> : <Send />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>

            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Answering from {count > 0 ? `these ${count}` : "the matched"}{" "}
                {count === 1 ? "profile" : "profiles"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={onEndChat}
                disabled={asking}
              >
                End chat
              </Button>
            </div>
          </form>
        </CardFooter>
      )}
    </Card>
  )
}

const CITATION = /\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g

/**
 * Turns [n] and [n, m] in the answer into links that the renderer swaps for
 * chips. Numbers outside the set are left as plain text.
 */
function linkCitations(text: string, count: number) {
  return text.replace(CITATION, (match, list: string) => {
    const numbers = list.split(/\s*,\s*/).map(Number)
    if (numbers.some((n) => n < 1 || n > count)) return match
    return numbers.map((n) => `[${n}](#cite-${n})`).join("")
  })
}

function CitedAnswer({
  text,
  profiles,
  onCite,
  onCiteHover,
}: {
  text: string
  profiles: SearchProfile[]
  onCite: (n: number) => void
  onCiteHover: (n: number | null) => void
}) {
  const components: Components = {
    a: ({ href, children }) => {
      const n = href?.startsWith("#cite-") ? Number(href.slice(6)) : NaN
      if (!Number.isInteger(n)) {
        return (
          <a href={href} target="_blank" rel="noreferrer noopener">
            {children}
          </a>
        )
      }
      return (
        <Hint label={profiles[n - 1]?.fileName}>
          <Badge
            variant="secondary"
            render={<button type="button" />}
            onClick={() => onCite(n)}
            onMouseEnter={() => onCiteHover(n)}
            onMouseLeave={() => onCiteHover(null)}
            onFocus={() => onCiteHover(n)}
            onBlur={() => onCiteHover(null)}
            aria-label={`Candidate ${n}`}
            className="mx-px h-4.5 min-w-4.5 cursor-pointer rounded-full bg-primary/15 px-1 align-text-top text-[0.6875rem] text-primary tabular-nums hover:bg-primary hover:text-primary-foreground"
          >
            {n}
          </Badge>
        </Hint>
      )
    },
  }

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {linkCitations(text, profiles.length)}
    </ReactMarkdown>
  )
}
