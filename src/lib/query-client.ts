import { QueryClient } from "@tanstack/react-query"
import { ApiError } from "@/lib/api"
import { searchSessionKey, tabStore } from "@/lib/storage"
import { useAuthStore } from "@/stores/auth-store"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Client errors are not worth retrying.
        if (error instanceof ApiError && error.status && error.status < 500) {
          return false
        }
        return failureCount < 2
      },
    },
  },
})

// Everything fetched belongs to whoever was signed in: their shortlist, the
// contact details they revealed, the admin pages. When a session ends it all
// goes, so the next person on this device never sees any of it. Choosing to
// sign out also forgets this tab's saved search, from whichever page it
// happens on; an expiry keeps it for when the same person signs back in.
useAuthStore.subscribe((state, prev) => {
  if (!prev.token || state.token) return
  queryClient.clear()
  if (state.endedBecause === "signed-out" && prev.user) {
    tabStore.write(searchSessionKey(prev.user._id), null)
  }
})
