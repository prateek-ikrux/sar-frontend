import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MoreHorizontal, Trash2, UserCheck, UserX } from "lucide-react"
import { toast } from "sonner"

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
import { deleteUser, updateUser } from "@/services/users"
import { useAuthStore } from "@/stores/auth-store"
import type { ApiError } from "@/lib/api"
import type { User } from "@/types"

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
})

function formatDate(value: string | null) {
  return value ? dateFormat.format(new Date(value)) : "Never"
}

export function UsersTable({ users }: { users: User[] }) {
  const queryClient = useQueryClient()
  const myId = useAuthStore((s) => s.user?.sub)
  const [pendingDelete, setPendingDelete] = useState<User | null>(null)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["users"] })

  const toggleActive = useMutation({
    mutationFn: (user: User) =>
      updateUser(user._id, { active: !user.active }),
    onSuccess: (user) => {
      invalidate()
      toast.success(
        user.active
          ? `${user.email} can sign in again.`
          : `${user.email} can no longer sign in.`
      )
    },
    onError: (error: ApiError) => toast.error(error.message),
  })

  const remove = useMutation({
    mutationFn: (user: User) => deleteUser(user._id),
    onSuccess: (_data, user) => {
      invalidate()
      toast.success(`${user.email} was removed.`)
      setPendingDelete(null)
    },
    onError: (error: ApiError) => toast.error(error.message),
  })

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead>Last sign-in</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isMe = user._id === myId
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
                  <TableCell className="capitalize">{user.role}</TableCell>
                  <TableCell>
                    <Badge variant={user.active ? "secondary" : "outline"}>
                      {user.active ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.last_login_at)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${user.email}`}
                            disabled={isMe}
                          />
                        }
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => toggleActive.mutate(user)}
                        >
                          {user.active ? <UserX /> : <UserCheck />}
                          {user.active ? "Disable" : "Enable"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setPendingDelete(user)}
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {pendingDelete?.email}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They lose access immediately and this cannot be undone. To keep
              the record but block sign-in, disable them instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && remove.mutate(pendingDelete)}
              disabled={remove.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
