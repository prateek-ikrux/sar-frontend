import { useEffect, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, Search, TriangleAlert, UserX } from "lucide-react"

import { AddUserDialog } from "@/components/users/add-user-dialog"
import { UsersTable, type SortState } from "@/components/users/users-table"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { listUsers } from "@/services/users"
import type { ApiError } from "@/lib/api"
import type { Role, UserPage } from "@/types"

type RoleFilter = Role | "all"
type StatusFilter = "active" | "disabled" | "all"

const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "All roles" },
  { value: "admin", label: "Admins" },
  { value: "recruiter", label: "Recruiters" },
]

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
]

export default function UsersPage() {
  useDocumentTitle("Users")
  const [page, setPage] = useState(1)
  const [typed, setTyped] = useState("")
  const [q, setQ] = useState("")
  const [role, setRole] = useState<RoleFilter>("all")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [sort, setSort] = useState<SortState>({ by: "created_at", order: "desc" })

  // Searches once typing pauses, not on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(typed.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [typed])

  const filtered = Boolean(q) || role !== "all" || status !== "all"

  const { data, isPending, isFetching, isPlaceholderData, error } = useQuery<UserPage, ApiError>({
    queryKey: ["users", { page, q, role, status, sort }],
    queryFn: () =>
      listUsers({
        page,
        q: q || undefined,
        role: role === "all" ? undefined : role,
        status: status === "all" ? undefined : status,
        sort: sort.by,
        order: sort.order,
      }),
    // Keeps the table on screen while the next page loads, instead of
    // collapsing back to skeletons on every click.
    placeholderData: keepPreviousData,
  })

  // Deleting the only user on the last page leaves `page` past the end, where
  // the server returns an empty list. Step back to the new last page. Set
  // during render (guarded, so it settles in one pass) rather than in an
  // effect, which would paint the empty page first.
  if (data && data.pages >= 1 && page > data.pages) {
    setPage(data.pages)
  }

  function clearFilters() {
    setTyped("")
    setQ("")
    setRole("all")
    setStatus("all")
    setPage(1)
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Users
            {data && !filtered && (
              <span className="ml-2 text-base font-normal text-muted-foreground">
                {data.total}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            Active users sign in with a code emailed to them. Admins can also
            manage this list.
          </p>
        </div>
        <AddUserDialog />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:w-72">
          <InputGroupAddon>
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder="Search by name or email"
            aria-label="Search users by name or email"
          />
        </InputGroup>
        <FilterSelect
          label="Role"
          value={role}
          choices={ROLE_FILTERS}
          onChange={(value) => {
            setRole(value)
            setPage(1)
          }}
        />
        <FilterSelect
          label="Status"
          value={status}
          choices={STATUS_FILTERS}
          onChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
        />
        {filtered && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
        {/* Not while the previous result stands in for the new one. */}
        {data && filtered && !isPlaceholderData && (
          <p className="text-sm text-muted-foreground sm:ml-auto" role="status">
            {data.total} {data.total === 1 ? "match" : "matches"}
          </p>
        )}
      </div>

      {isPending && (
        <div className="space-y-2 rounded-lg border border-border p-4" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div className="space-y-0.5">
            <p className="font-medium text-foreground">Couldn&rsquo;t load users</p>
            <p className="text-sm text-muted-foreground">
              {error.message}
              {error.detail && `. ${error.detail}`}
            </p>
          </div>
        </div>
      )}

      {data && data.users.length > 0 && (
        <div className="space-y-4">
          <UsersTable
            users={data.users}
            sort={sort}
            onSortChange={(next) => {
              setSort(next)
              setPage(1)
            }}
            busy={isFetching}
          />

          {data.pages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
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

      {/* total, not users.length: an empty page past the end is not an
          empty list, and is being corrected above. */}
      {data && data.total === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-14 text-center">
          <UserX className="size-6 text-muted-foreground" aria-hidden />
          {filtered ? (
            <>
              <div>
                <p className="font-medium text-foreground">No users match</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a different name or email, or clear the filters.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </>
          ) : (
            <div>
              <p className="font-medium text-foreground">No users yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add an email address to let someone in.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FilterSelect<T extends string>({
  label,
  value,
  choices,
  onChange,
}: {
  label: string
  value: T
  choices: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <Select
      value={value}
      items={choices}
      onValueChange={(next) => {
        if (next !== null) onChange(next)
      }}
    >
      <SelectTrigger aria-label={label} className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="start">
        {choices.map((choice) => (
          <SelectItem key={choice.value} value={choice.value}>
            {choice.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
