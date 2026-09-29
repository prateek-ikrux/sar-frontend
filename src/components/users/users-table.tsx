import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Loader2,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserMinus,
  UserX,
} from "lucide-react"
import { toast } from "sonner"

import { EditNameDialog } from "@/components/users/edit-name-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { deleteUser, updateUser, type UserPatch } from "@/services/users"
import { useAuthStore } from "@/stores/auth-store"
import type { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { User, UserSort } from "@/types"

export type SortState = { by: UserSort; order: "asc" | "desc" }

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
})

function formatDate(value: string | null) {
  return value ? dateFormat.format(new Date(value)) : "Never"
}

/** Changes that take away or grant access get a second look; enabling does not. */
type Pending =
  | { kind: "promote" | "demote" | "disable" | "delete"; user: User }
  | null

const CONFIRM = {
  promote: {
    title: (u: User) => `Make ${u.name ?? u.email} an admin?`,
    body: "Admins can add, change and remove every user, including other admins.",
    action: "Make admin",
    destructive: false,
  },
  demote: {
    title: (u: User) => `Make ${u.name ?? u.email} a recruiter?`,
    body: "They keep search, but can no longer manage users.",
    action: "Make recruiter",
    destructive: false,
  },
  disable: {
    title: (u: User) => `Disable ${u.name ?? u.email}?`,
    body: "They're signed out and can't sign in until someone enables them again. Their record stays.",
    action: "Disable",
    destructive: true,
  },
  delete: {
    title: (u: User) => `Remove ${u.name ?? u.email}?`,
    body: "They lose access immediately and this cannot be undone. To keep the record but block sign-in, disable them instead.",
    action: "Remove",
    destructive: true,
  },
} as const

export function UsersTable({
  users,
  sort,
  onSortChange,
  busy,
}: {
  users: User[]
  sort: SortState
  onSortChange: (sort: SortState) => void
  /** A new page or sort is loading over the current rows. */
  busy: boolean
}) {
  const queryClient = useQueryClient()
  const me = useAuthStore((s) => s.user)
  const [pending, setPending] = useState<Pending>(null)
  const [renaming, setRenaming] = useState<User | null>(null)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["users"] })

  const update = useMutation({
    mutationFn: ({ user, patch }: { user: User; patch: UserPatch }) =>
      updateUser(user._id, patch),
    onSuccess: (user, { patch }) => {
      invalidate()
      setPending(null)
      toast.success(
        patch.role !== undefined
          ? `${user.name ?? user.email} is now ${user.role === "admin" ? "an admin" : "a recruiter"}.`
          : user.active
            ? `${user.name ?? user.email} can sign in again.`
            : `${user.name ?? user.email} can no longer sign in.`
      )
    },
    onError: (error: ApiError) => {
      setPending(null)
      toast.error(error.message, { description: error.detail })
      if (error.status === 404) invalidate()
    },
  })

  const remove = useMutation({
    mutationFn: (user: User) => deleteUser(user._id),
    onSuccess: (_data, user) => {
      invalidate()
      toast.success(`${user.name ?? user.email} was removed.`)
      setPending(null)
    },
    onError: (error: ApiError) => {
      setPending(null)
      toast.error(error.message, { description: error.detail })
      if (error.status === 404) invalidate()
    },
  })

  const working = (user: User) =>
    (update.isPending && update.variables?.user._id === user._id) ||
    (remove.isPending && remove.variables?._id === user._id)

  function confirm() {
    if (!pending) return
    const { kind, user } = pending
    if (kind === "delete") remove.mutate(user)
    else if (kind === "disable") update.mutate({ user, patch: { active: false } })
    else update.mutate({ user, patch: { role: kind === "promote" ? "admin" : "recruiter" } })
  }

  const confirming = pending ? CONFIRM[pending.kind] : null
  const confirmBusy = update.isPending || remove.isPending

  const sortable = (by: UserSort, label: string, className?: string) => {
    const active = sort.by === by
    const Icon = !active ? ArrowUpDown : sort.order === "asc" ? ArrowUp : ArrowDown
    return (
      <TableHead
        className={className}
        aria-sort={active ? (sort.order === "asc" ? "ascending" : "descending") : "none"}
      >
        <button
          type="button"
          className="-mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={() =>
            onSortChange({
              by,
              // Dates start newest-first; text starts A-Z.
              order: active
                ? sort.order === "asc" ? "desc" : "asc"
                : by === "created_at" || by === "last_login_at" ? "desc" : "asc",
            })
          }
        >
          {label}
          <Icon className={cn("size-3.5", !active && "text-muted-foreground/60")} aria-hidden />
        </button>
      </TableHead>
    )
  }

  return (
    <>
      <div
        className={cn(
          "overflow-x-auto rounded-lg border border-border transition-opacity",
          busy && "opacity-60"
        )}
        aria-busy={busy}
      >
        <Table>
          <TableHeader>
            <TableRow>
              {sortable("name", "User")}
              {sortable("role", "Role")}
              <TableHead>Status</TableHead>
              {sortable("created_at", "Added", "max-md:hidden")}
              {sortable("last_login_at", "Last sign-in", "max-sm:hidden")}
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isMe = user._id === me?._id
              return (
                <TableRow key={user._id}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {user.name ?? user.email}
                        </span>
                        {isMe && (
                          <Badge variant="secondary" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                      {user.name && (
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.role === "admin" ? (
                      <Badge variant="outline">
                        <ShieldCheck aria-hidden />
                        Admin
                      </Badge>
                    ) : (
                      <span className="text-sm text-foreground">Recruiter</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-sm",
                        user.active ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "size-2 rounded-full",
                          user.active
                            ? "bg-emerald-600 dark:bg-emerald-400"
                            : "border border-muted-foreground bg-transparent"
                        )}
                      />
                      {user.active ? "Active" : "Disabled"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-md:hidden">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-sm:hidden">
                    {formatDate(user.last_login_at)}
                  </TableCell>
                  <TableCell>
                    {working(user) ? (
                      <span className="flex size-8 items-center justify-center" role="status">
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        <span className="sr-only">Saving changes to {user.email}</span>
                      </span>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${user.name ?? user.email}`}
                            />
                          }
                        >
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem onClick={() => setRenaming(user)}>
                            <Pencil />
                            Edit name
                          </DropdownMenuItem>
                          {isMe ? (
                            <>
                              <DropdownMenuSeparator />
                              {/* Said here, rather than as disabled items with no reason. */}
                              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                                You can&rsquo;t change your own role or access. Ask another admin.
                              </p>
                            </>
                          ) : (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  setPending({ kind: user.role === "admin" ? "demote" : "promote", user })
                                }
                              >
                                {user.role === "admin" ? <UserMinus /> : <ShieldCheck />}
                                {user.role === "admin" ? "Make recruiter" : "Make admin"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  user.active
                                    ? setPending({ kind: "disable", user })
                                    : update.mutate({ user, patch: { active: true } })
                                }
                              >
                                {user.active ? <UserX /> : <UserCheck />}
                                {user.active ? "Disable" : "Enable"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setPending({ kind: "delete", user })}
                              >
                                <Trash2 />
                                Remove
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => !open && !confirmBusy && setPending(null)}
      >
        <AlertDialogContent>
          {pending && confirming && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{confirming.title(pending.user)}</AlertDialogTitle>
                <AlertDialogDescription>{confirming.body}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={confirmBusy}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant={confirming.destructive ? "destructive" : "default"}
                  onClick={confirm}
                  disabled={confirmBusy}
                >
                  {confirmBusy && <Loader2 className="animate-spin" />}
                  {confirming.action}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <EditNameDialog user={renaming} onClose={() => setRenaming(null)} />
    </>
  )
}
