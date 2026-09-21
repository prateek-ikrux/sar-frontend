import { useState } from "react"
import { Loader2, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type Props = {
  onSearch: (query: string) => void
  isPending: boolean
}

export function SearchBar({ onSearch, isPending }: Props) {
  const [value, setValue] = useState("")

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
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={3}
        placeholder="Describe what you're looking for - the role, the skills, how much experience..."
        className="resize-y"
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            submit()
          }
        }}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Enter to search, Shift+Enter for a new line.
        </p>
        <Button type="submit" disabled={!value.trim() || isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : <Search />}
          Search
        </Button>
      </div>
    </form>
  )
}
