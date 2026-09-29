import { useState } from "react"
import { browserStore } from "@/lib/storage"
import type { SearchOptions } from "@/services/search"

export type RecentSearch = { query: string; options: SearchOptions; at: number }

const MAX_RECENT = 8

/**
 * The last few searches, per user and per browser. Only the query and its
 * settings are kept -- never results, which hold candidate details.
 */
export function useRecentSearches(userId: string | undefined) {
  const key = userId ? `sar-recent:${userId}` : null
  const [items, setItems] = useState<RecentSearch[]>(
    () => (key && browserStore.read<RecentSearch[]>(key)) || []
  )

  function save(next: RecentSearch[]) {
    setItems(next)
    if (key) browserStore.write(key, next.length ? next : null)
  }

  return {
    items,
    add(query: string, options: SearchOptions) {
      const rest = items.filter((item) => item.query.toLowerCase() !== query.toLowerCase())
      save([{ query, options, at: Date.now() }, ...rest].slice(0, MAX_RECENT))
    },
    remove(query: string) {
      save(items.filter((item) => item.query !== query))
    },
    clear() {
      save([])
    },
  }
}
