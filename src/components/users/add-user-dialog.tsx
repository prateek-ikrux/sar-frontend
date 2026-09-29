import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createUser } from "@/services/users"
import type { ApiError } from "@/lib/api"
import type { Role } from "@/types"

const ROLES: { value: Role; label: string }[] = [
  { value: "recruiter", label: "Recruiter: search candidates" },
  { value: "admin", label: "Admin: search and manage users" },
]

export function AddUserDialog() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<Role>("recruiter")
  const [error, setError] = useState<ApiError | null>(null)
  const queryClient = useQueryClient()

  function reset() {
    setEmail("")
    setName("")
    setRole("recruiter")
    setError(null)
  }

  const add = useMutation({
    mutationFn: () =>
      createUser({ email: email.trim(), name: name.trim(), role }),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      const who = `${user.name ?? user.email} can now sign in${user.role === "admin" ? " as an admin" : ""}.`
      if (user.invited) {
        toast.success(who, { description: `We've emailed ${user.email} to let them know.` })
      } else {
        toast.warning(who, {
          description: `We couldn't email ${user.email}, so let them know yourself.`,
          duration: 10_000,
        })
      }
      setOpen(false)
      reset()
    },
    onError: (e: ApiError) => setError(e),
  })

  const emailError = error?.fields.email
  const nameError = error?.fields.name
  // Anything not tied to a field is shown above the buttons, inside the
  // dialog, rather than as a toast behind it.
  const formError = error && !emailError && !nameError ? error : null

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus />
        Add user
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            if (email.trim() && name.trim()) add.mutate()
          }}
        >
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              We&rsquo;ll email them to say they have access. They sign in
              with a code sent to this address: no password, nothing to set up.
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
                autoComplete="off"
                placeholder="name@ikrux.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError(null)
                }}
                aria-invalid={Boolean(emailError) || undefined}
                aria-describedby={emailError ? "new-user-email-error" : undefined}
              />
              {emailError && (
                <p id="new-user-email-error" className="text-sm text-destructive">
                  {emailError}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-name">Name</Label>
              <Input
                id="new-user-name"
                required
                maxLength={120}
                value={name}
                placeholder="Their full name"
                onChange={(event) => {
                  setName(event.target.value)
                  setError(null)
                }}
                aria-invalid={Boolean(nameError) || undefined}
                aria-describedby={nameError ? "new-user-name-error" : undefined}
              />
              {nameError && (
                <p id="new-user-name-error" className="text-sm text-destructive">
                  {nameError}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-role">Role</Label>
              <Select
                value={role}
                items={ROLES}
                onValueChange={(next) => {
                  if (next !== null) setRole(next)
                }}
              >
                <SelectTrigger id="new-user-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} align="start">
                  {ROLES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formError && (
              <Alert variant="destructive" className="border-destructive/30">
                <AlertCircle />
                <AlertTitle>{formError.message}</AlertTitle>
                {formError.detail && <AlertDescription>{formError.detail}</AlertDescription>}
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false)
                reset()
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!email.trim() || !name.trim() || add.isPending}
            >
              {add.isPending && <Loader2 className="animate-spin" />}
              Add user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
