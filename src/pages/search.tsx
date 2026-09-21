import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { SearchX } from "lucide-react"
import { toast } from "sonner"

import { ResultCard } from "@/components/search/result-card"
import { ResultDialog } from "@/components/search/result-dialog"
import { SearchBar } from "@/components/search/search-bar"
import { Skeleton } from "@/components/ui/skeleton"
import { search } from "@/services/search"
import type { ApiError } from "@/lib/api"
import type { SearchResponse, SearchResult } from "@/types"

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<SearchResult | null>(null)

  const run = useMutation<SearchResponse, ApiError, string>({
    mutationFn: (q) => search(q),
    onError: (error) => toast.error(error.message),
  })

  const results = run.data?.results ?? []

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Search</h1>
        <p className="text-sm text-muted-foreground">
          Write the requirement in plain language and we'll find the closest
          matches.
        </p>
      </div>

      <SearchBar
        isPending={run.isPending}
        onSearch={(q) => {
          setQuery(q)
          run.mutate(q)
        }}
      />

      {run.isPending && (
        <ul className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="space-y-3 rounded-lg border border-border p-5">
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
            {run.data.total} {run.data.total === 1 ? "match" : "matches"}
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
