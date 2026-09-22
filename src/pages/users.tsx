import { useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react"

import { AddUserDialog } from "@/components/users/add-user-dialog"
import { UsersTable } from "@/components/users/users-table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { listUsers } from "@/services/users"
import type { ApiError } from "@/lib/api"
import type { UserPage } from "@/types"

export default function UsersPage() {
  const [page, setPage] = useState(1)

  const { data, isPending, error } = useQuery<UserPage, ApiError>({
    queryKey: ["users", page],
    queryFn: () => listUsers({ page }),
    // Keeps the table on screen while the next page loads, instead of
    // collapsing back to skeletons on every click.
    placeholderData: keepPreviousData,
  })

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Users
          </h1>
          <p className="text-sm text-muted-foreground">
            Everyone here can sign in with an emailed code. Admins can also
            manage this list.
          </p>
        </div>
        <AddUserDialog />
      </div>

      {isPending && (
        <div className="space-y-2 rounded-lg border border-border p-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div className="space-y-0.5">
            <p className="font-medium text-foreground">Could not load users</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            {error.detail && (
              <p className="text-sm text-muted-foreground">{error.detail}</p>
            )}
          </div>
        </div>
      )}

      {data && data.users.length > 0 && (
        <div className="space-y-4">
          <UsersTable users={data.users} />

          {data.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {data.page} of {data.pages} &middot; {data.total} users
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page >= data.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {data && data.users.length === 0 && (
        <div className="rounded-lg border border-dashed border-border px-6 py-14 text-center">
          <p className="font-medium text-foreground">No users yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add an email address to let someone in.
          </p>
        </div>
      )}
    </div>
  )
}
