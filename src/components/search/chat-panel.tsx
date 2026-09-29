import { useEffect, useRef, useState } from "react"
import { AlertCircle, Info, MessageSquareText, Send, Square } from "lucide-react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

import { Hint } from "@/components/search/hint"
import { candidateName } from "@/components/search/result-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
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
// model rightly answers only from its set, so an answer to this may read as
// "there are no such candidates" -- a suggestion to search again goes with it.
const LOOKS_LIKE_SEARCH =
  /^\s*(?:(?:now|also|and|ok|okay|then)[\s,]+)*(?:find|search(?:\s+for)?|look\s+for|get\s+me|fetch|pull\s+up)\b(?!\s+(?:the|which|who|one|any\s+of|among))/i

// One-click starting points once a set is on screen.
const STARTERS = [
  "Who fits this role best, and why?",
  "Compare their years of relevant experience",
  "Which of them have led a team?",
]

/** A listed candidate, as a citation resolves to it. */
export type CitedCandidate = { profile: SearchProfile; number: number | undefined }

type Props = {
  /** How many candidates the chat can see. Null while the set is still being retrieved. */
  count: number | null
  messages: ChatMessage[]
  asking: boolean
  /** A search is replacing the set, so questions have to wait. */
  searching: boolean
  onAsk: (question: string) => void
  onStop: () => void
  onSearchInstead: (query: string) => void
  /** Finds a cited candidate in the current list, by profile id. */
  lookup: (id: string) => CitedCandidate | undefined
  /** Shows candidate `id` in the list. */
  onCite: (id: string) => void
  /** Hover preview of a citation; null when the pointer leaves. */
  onCiteHover: (id: string | null) => void
  className?: string
}

export function ChatPanel({
  count,
  messages,
  asking,
  searching,
  onAsk,
  onStop,
  onSearchInstead,
  lookup,
  onCite,
  onCiteHover,
  className,
}: Props) {
  const [draft, setDraft] = useState("")
  const scrollArea = useRef<HTMLDivElement>(null)
  const pinnedToBottom = useRef(true)

  const viewport = () =>
    scrollArea.current?.querySelector<HTMLElement>("[data-slot=scroll-area-viewport]")

  // Follow the answer as it is written, unless the reader has scrolled up to
  // read something else. ScrollArea scrolls its viewport, not its root.
  useEffect(() => {
    const el = viewport()
    if (!el) return
    const onScroll = () => {
      pinnedToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const el = viewport()
    if (el && pinnedToBottom.current) el.scrollTop = el.scrollHeight
  }, [messages, asking])

  const trimmed = draft.trim()
  const canSend = trimmed.length >= MIN_QUERY_LENGTH && !asking && !searching && count !== 0

  function send(question: string) {
    pinnedToBottom.current = true
    setDraft("")
    onAsk(question)
  }

  const latest = messages.at(-1)
  const waitingForWords =
    asking && !(latest?.role === "assistant" && latest.streaming && latest.text)
  const lastAnswer = messages.findLast((m) => m.role === "assistant")

  const heading =
    count === null
      ? "Finding candidates…"
      : count === 0
        ? "No candidates with a resume to ask about"
        : `Ask about ${count === 1 ? "this candidate" : `these ${count} candidates`}`

  return (
    <Card size="sm" className={cn("gap-0 py-0", className)}>
      <CardHeader className="border-b py-3 [.border-b]:pb-3">
        <h2 className="flex items-center gap-2 font-heading text-sm font-medium">
          <MessageSquareText className="size-4 text-primary" aria-hidden />
          {heading}
        </h2>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 px-0">
        <ScrollArea ref={scrollArea} className="min-h-0 flex-1">
          <div className="space-y-4 px-4 py-4">
            {messages.length === 0 && (
              <div className="space-y-3 py-6 text-center">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Ask anything about {count === 1 ? "this candidate" : "these candidates"}
                  </p>
                  <p className="mx-auto max-w-sm text-xs text-muted-foreground">
                    Compare their experience, check for a skill, or ask who fits
                    best. Answers point to candidates by number.
                  </p>
                </div>
                {count !== null && count > 0 && (
                  <ul className="flex flex-wrap justify-center gap-2">
                    {STARTERS.map((starter) => (
                      <li key={starter}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-auto rounded-full py-1 font-normal whitespace-normal text-muted-foreground"
                          disabled={asking || searching}
                          onClick={() => send(starter)}
                        >
                          {starter}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {messages.map((message) => {
              if (message.role === "notice") {
                return (
                  <p
                    key={message.id}
                    className="flex items-start justify-center gap-1.5 text-center text-xs text-muted-foreground"
                  >
                    <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
                    {message.text}
                  </p>
                )
              }

              if (message.role === "user") {
                return (
                  <div key={message.id} className="flex flex-col items-end gap-1">
                    <p
                      className={cn(
                        "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap text-primary-foreground",
                        message.status === "pending" && "opacity-80"
                      )}
                    >
                      {message.text}
                    </p>
                    {(message.status === "failed" || message.status === "stopped") && (
                      <span
                        className={cn(
                          "flex items-center gap-1 text-xs",
                          message.status === "failed" ? "text-destructive" : "text-muted-foreground"
                        )}
                      >
                        {message.status === "failed" && <AlertCircle className="size-3" aria-hidden />}
                        {message.status === "failed" ? "Not answered" : "Stopped"} ·
                        <Button
                          variant="link"
                          size="xs"
                          className={cn(
                            "h-auto px-0",
                            message.status === "failed" && "text-destructive"
                          )}
                          disabled={asking || searching}
                          onClick={() => send(message.text)}
                        >
                          {message.status === "failed" ? "Try again" : "Ask again"}
                        </Button>
                      </span>
                    )}
                  </div>
                )
              }

              return (
                <div key={message.id} className="space-y-1.5">
                  <div className="prose-answer max-w-full rounded-2xl rounded-bl-sm bg-muted/60 px-3.5 py-2.5 text-sm">
                    <CitedAnswer
                      text={message.text}
                      citations={message.citations}
                      lookup={lookup}
                      onCite={onCite}
                      onCiteHover={onCiteHover}
                    />
                  </div>
                  {message.streaming && message.text && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-hidden>
                      <Spinner className="size-3" />
                      Writing…
                    </p>
                  )}
                  {message.stopped && (
                    <p className="text-xs text-muted-foreground">
                      Stopped before finishing. The assistant won&rsquo;t remember this part-answer.
                    </p>
                  )}
                  {!message.streaming && LOOKS_LIKE_SEARCH.test(message.question) && (
                    <p className="flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
                      Answers only cover the candidates listed. Looking for different people?
                      <Button
                        variant="link"
                        size="xs"
                        className="h-auto px-0"
                        disabled={searching}
                        onClick={() => onSearchInstead(message.question)}
                      >
                        Search for this instead
                      </Button>
                    </p>
                  )}
                </div>
              )
            })}

            {waitingForWords && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Spinner className="size-3.5" />
                Reading {count ? `${count} ${count === 1 ? "resume" : "resumes"}` : "resumes"}…
              </p>
            )}
          </div>
        </ScrollArea>
        {/* Announced once per answer, not per token as a live transcript would be. */}
        <p role="status" className="sr-only">
          {asking ? "Writing an answer" : lastAnswer && !lastAnswer.streaming ? "Answer ready" : ""}
        </p>
      </CardContent>

      <CardFooter className="border-t py-3 [.border-t]:pt-3">
        <form
          className="w-full space-y-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (canSend) send(trimmed)
          }}
        >
          <InputGroup>
            <InputGroupTextarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={1}
              maxLength={1000}
              disabled={count === 0}
              aria-label="Ask a follow-up question"
              placeholder={asking ? "Type your next question…" : "Ask a follow-up…"}
              className="max-h-32 min-h-9"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  if (canSend) send(trimmed)
                }
              }}
            />
            <InputGroupAddon align="inline-end" className="self-end pb-1.5">
              {asking ? (
                <Hint label="Stop answering">
                  <InputGroupButton
                    size="icon-sm"
                    variant="outline"
                    aria-label="Stop answering"
                    onClick={onStop}
                  >
                    <Square className="fill-current" />
                  </InputGroupButton>
                </Hint>
              ) : (
                <InputGroupButton
                  type="submit"
                  size="icon-sm"
                  variant="default"
                  disabled={!canSend}
                  aria-label="Send"
                >
                  <Send />
                </InputGroupButton>
              )}
            </InputGroupAddon>
          </InputGroup>

          <p className="text-xs text-muted-foreground">
            {count
              ? `Answers use only ${count === 1 ? "this candidate's resume" : `these ${count} candidates' resumes`}.`
              : "Answers use only the listed candidates' resumes."}
          </p>
        </form>
      </CardFooter>
    </Card>
  )
}

const CITATION = /\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g

/**
 * Turns [n] and [n, m] in the answer into links that the renderer swaps for
 * chips. Numbers outside the answer's set are left as plain text.
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
  citations,
  lookup,
  onCite,
  onCiteHover,
}: {
  text: string
  citations: string[]
  lookup: (id: string) => CitedCandidate | undefined
  onCite: (id: string) => void
  onCiteHover: (id: string | null) => void
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

      const id = citations[n - 1]
      const cited = id ? lookup(id) : undefined

      // The candidate was in the list this answer was written about, but a
      // later re-run replaced it: say so rather than point at someone else.
      if (!id || !cited) {
        return (
          <Hint label="No longer in the list">
            <span className="mx-px inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-dashed border-border px-1 align-text-bottom text-xs text-muted-foreground tabular-nums">
              {n}
              <span className="sr-only"> (no longer in the list)</span>
            </span>
          </Hint>
        )
      }

      // Show the number the candidate has in the list now, so chip and row agree.
      const shown = cited.number ?? n
      const name = candidateName(cited.profile)
      return (
        <Hint label={name}>
          <button
            type="button"
            onClick={() => onCite(id)}
            onMouseEnter={() => onCiteHover(id)}
            onMouseLeave={() => onCiteHover(null)}
            onFocus={() => onCiteHover(id)}
            onBlur={() => onCiteHover(null)}
            aria-label={`Candidate ${shown}: ${name}`}
            // The ::after pad widens the tap target without changing line height.
            className="relative mx-px inline-flex h-5 min-w-5 cursor-pointer items-center justify-center rounded-full bg-primary/10 px-1 align-text-bottom text-xs font-medium text-foreground tabular-nums ring-1 ring-primary/40 transition-colors outline-none after:absolute after:-inset-1.5 hover:bg-primary hover:text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {shown}
          </button>
        </Hint>
      )
    },
  }

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {linkCitations(text, citations.length)}
    </ReactMarkdown>
  )
}
