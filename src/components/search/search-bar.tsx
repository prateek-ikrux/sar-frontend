import { Loader2, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type Props = {
  value: string
  onValueChange: (value: string) => void
  onSearch: (query: string) => void
  isPending: boolean
}

/**
 * Controlled so the page can drop an example query straight into the box.
 */
export function SearchBar({
  value,
  onValueChange,
  onSearch,
  isPending,
}: Props) {
  function submit() {
    const query = value.trim()
    if (query) onSearch(query)
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div className="rounded-xl border border-border bg-card p-2 shadow-sm transition-colors focus-within:border-primary/40">
        <Textarea
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          rows={3}
          placeholder="Senior React engineer, 5+ years, fintech background, based in Bangalore..."
          className="resize-y border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
        />
        <div className="flex items-center justify-between gap-3 px-1 pt-1">
          <p className="text-xs text-muted-foreground">
            <kbd className="font-sans font-medium text-foreground">Enter</kbd>{" "}
            to search,{" "}
            <kbd className="font-sans font-medium text-foreground">
              Shift+Enter
            </kbd>{" "}
            for a new line
          </p>
          <Button type="submit" disabled={!value.trim() || isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <Search />}
            Search
          </Button>
        </div>
      </div>
    </form>
  )
}
