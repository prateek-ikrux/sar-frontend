import { QueryClient } from "@tanstack/react-query"
import { ApiError } from "@/lib/api"

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
