import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { SearchX, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { ResultCard } from "@/components/search/result-card"
import { ResultDialog } from "@/components/search/result-dialog"
import { SearchBar } from "@/components/search/search-bar"
import { Skeleton } from "@/components/ui/skeleton"
import { search } from "@/services/search"
import type { ApiError } from "@/lib/api"
import type { SearchResponse, SearchResult } from "@/types"

// Shown before the first search, both as a hint at the level of detail that
// works and as one-click starting points.
const EXAMPLES = [
  "Senior backend engineer with Node.js and MongoDB, 5+ years",
  "React developer who has shipped a design system",
  "Data analyst comfortable with SQL and Power BI, Pune or Mumbai",
  "DevOps engineer with AWS and Kubernetes, open to relocation",
]

export default function SearchPage() {
  const [draft, setDraft] = useState("")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<SearchResult | null>(null)

  const run = useMutation<SearchResponse, ApiError, string>({
    mutationFn: (q) => search(q),
    onError: (error) =>
      toast.error(error.message, { description: error.detail }),
  })

  const results = run.data?.results ?? []

  function runSearch(q: string) {
    setDraft(q)
    setQuery(q)
    run.mutate(q)
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Search candidates
        </h1>
        <p className="text-sm text-muted-foreground">
          Describe the person you need in plain language. Every resume ikrux
          holds is searched on meaning, not keywords.
        </p>
      </div>

      <SearchBar
        value={draft}
        onValueChange={setDraft}
        onSearch={runSearch}
        isPending={run.isPending}
      />

      {run.isIdle && (
        <section className="space-y-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            Try one of these
          </p>
          <ul className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <li key={example}>
                <button
                  type="button"
                  onClick={() => runSearch(example)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {example}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {run.isPending && (
        <ul className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <li
              key={i}
              className="space-y-3 rounded-lg border border-border p-5"
            >
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-14" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {run.isSuccess && results.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-14 text-center">
          <SearchX className="size-6 text-muted-foreground" aria-hidden />
          <p className="font-medium text-foreground">No matches</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Nothing came back for &ldquo;{query}&rdquo;. Try describing the role
            in different words or dropping a requirement or two.
          </p>
        </div>
      )}

      {run.isSuccess && results.length > 0 && (
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {run.data.total} {run.data.total === 1 ? "match" : "matches"} for
            &ldquo;{query}&rdquo;
          </p>
          <ul className="space-y-3">
            {results.map((result) => (
              <li key={result._id}>
                <ResultCard result={result} onOpen={setSelected} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <ResultDialog
        result={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  )
}
