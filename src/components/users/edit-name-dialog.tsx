import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateUser } from "@/services/users"
import { useAuthStore } from "@/stores/auth-store"
import type { ApiError } from "@/lib/api"
import type { User } from "@/types"

/** Renames a user. Open while `user` is set. */
export function EditNameDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const me = useAuthStore((s) => s.user)
  const setMe = useAuthStore((s) => s.setUser)
  const [name, setName] = useState("")
  const [editing, setEditing] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Starts from the current name each time a different user is opened.
  if (user && user !== editing) {
    setEditing(user)
    setName(user.name ?? "")
    setError(null)
  }

  const save = useMutation({
    mutationFn: () => updateUser(user!._id, { name: name.trim() }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      if (updated._id === me?._id) setMe(updated)
      toast.success("Name updated.")
      onClose()
    },
    onError: (e: ApiError) => setError(e.fields.name ?? [e.message, e.detail].filter(Boolean).join(". ")),
  })

  const unchanged = name.trim() === (user?.name ?? "")

  return (
    <Dialog open={user !== null} onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form
          className="grid gap-6"
          onSubmit={(event) => {
            event.preventDefault()
            if (name.trim() && !unchanged) save.mutate()
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit name</DialogTitle>
            <DialogDescription>
              For {editing?.email}. It&rsquo;s shown in this list and used to greet them in emails.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="edit-user-name">Name</Label>
            <Input
              id="edit-user-name"
              required
              autoFocus
              maxLength={120}
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? "edit-user-name-error" : undefined}
            />
            {error && (
              <p id="edit-user-name-error" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || unchanged || save.isPending}>
              {save.isPending && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
