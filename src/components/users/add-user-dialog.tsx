import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createUser } from "@/services/users"
import type { ApiError } from "@/lib/api"

export function AddUserDialog() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const queryClient = useQueryClient()

  const add = useMutation({
    mutationFn: () => createUser({ email, name: name || undefined }),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success(`${user.email} can now sign in.`)
      setOpen(false)
      setEmail("")
      setName("")
    },
    onError: (error: ApiError) => toast.error(error.message),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus />
        Add user
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (email.trim()) add.mutate()
          }}
        >
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              They'll be able to sign in with a code sent to this address. No
              password, nothing for them to set up.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-user-email">Email</Label>
              <Input
                id="new-user-email"
                type="email"
                required
                autoFocus
                placeholder="name@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-name">
                Name <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="new-user-name"
                value={name}
                placeholder="Leave blank to fill in later"
                onChange={(event) => setName(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!email.trim() || add.isPending}>
              {add.isPending && <Loader2 className="animate-spin" />}
              Add user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
