import { useQuery } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"

import { AddUserDialog } from "@/components/users/add-user-dialog"
import { UsersTable } from "@/components/users/users-table"
import { Skeleton } from "@/components/ui/skeleton"
import { listUsers } from "@/services/users"
import type { ApiError } from "@/lib/api"
import type { User } from "@/types"

export default function UsersPage() {
  const { data, isPending, error } = useQuery<User[], ApiError>({
    queryKey: ["users"],
    queryFn: listUsers,
  })

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground">
            Anyone on this list can sign in with a code. Adding an email is all
            it takes.
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
          </div>
        </div>
      )}

      {data && data.length > 0 && <UsersTable users={data} />}

      {data && data.length === 0 && (
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
