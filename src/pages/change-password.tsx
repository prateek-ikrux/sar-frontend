import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { useMutation } from "@tanstack/react-query"
import { AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PasswordInput } from "@/components/auth/password-input"
import { Label } from "@/components/ui/label"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { PASSWORD_MIN_LENGTH, changePassword } from "@/services/auth"
import { useAuthStore } from "@/stores/auth-store"
import type { ApiError } from "@/lib/api"
import { APP_NAME, Wordmark } from "@/components/brand/wordmark"

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  useDocumentTitle("Change password")

  // Passwords are never trimmed: spaces are part of them.
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [localError, setLocalError] = useState<{ field: "next" | "confirm"; message: string } | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  const change = useMutation({
    mutationFn: () => changePassword(current, next),
    // The old token stops working once the password changes, so the new
    // session has to replace it.
    onSuccess: (session) => {
      setSession(session)
      toast.success("Password changed")
      navigate("/search", { replace: true })
    },
    onError: (e: ApiError) => setError(e),
  })

  function submit() {
    if (next.length < PASSWORD_MIN_LENGTH) {
      setLocalError({
        field: "next",
        message: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
      })
      return
    }
    if (next !== confirm) {
      setLocalError({ field: "confirm", message: "The two passwords don't match." })
      return
    }
    setLocalError(null)
    setError(null)
    change.mutate()
  }

  const currentError = error?.fields.currentPassword
  const nextError =
    (localError?.field === "next" ? localError.message : undefined) ??
    error?.fields.newPassword
  const confirmError = localError?.field === "confirm" ? localError.message : undefined
  // Anything not tied to a field is shown above the buttons.
  const formError =
    error && !currentError && !error.fields.newPassword ? error : null

  function clear() {
    setLocalError(null)
    setError(null)
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <div className="flex flex-col items-center gap-2.5">
        <Wordmark className="h-5" />
        <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {APP_NAME}
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1>Change password</h1>
          </CardTitle>
          <CardDescription>
            You&rsquo;ll stay signed in on this device, and signed out everywhere else.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            className="space-y-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              if (current && next && confirm && !change.isPending) submit()
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <PasswordInput
                id="current-password"
                autoComplete="current-password"
                autoFocus
                required
                value={current}
                onChange={(event) => {
                  setCurrent(event.target.value)
                  clear()
                }}
                disabled={change.isPending}
                aria-invalid={Boolean(currentError) || undefined}
                aria-describedby={currentError ? "current-password-error" : undefined}
              />
              {currentError && (
                <p id="current-password-error" className="text-sm text-destructive">
                  {currentError}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                required
                value={next}
                onChange={(event) => {
                  setNext(event.target.value)
                  clear()
                }}
                disabled={change.isPending}
                aria-invalid={Boolean(nextError) || undefined}
                aria-describedby={nextError ? "new-password-error" : undefined}
              />
              <p className="text-xs text-muted-foreground">
                At least {PASSWORD_MIN_LENGTH} characters, and not your email address.
              </p>
              {nextError && (
                <p id="new-password-error" className="text-sm text-destructive">
                  {nextError}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(event) => {
                  setConfirm(event.target.value)
                  clear()
                }}
                disabled={change.isPending}
                aria-invalid={Boolean(confirmError) || undefined}
                aria-describedby={confirmError ? "confirm-password-error" : undefined}
              />
              {confirmError && (
                <p id="confirm-password-error" className="text-sm text-destructive">
                  {confirmError}
                </p>
              )}
            </div>

            {formError && (
              <Alert variant="destructive" className="border-destructive/30">
                <AlertCircle />
                <AlertTitle>{formError.message}</AlertTitle>
                {formError.detail && <AlertDescription>{formError.detail}</AlertDescription>}
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={!current || !next || !confirm || change.isPending}
            >
              {change.isPending && <Loader2 className="animate-spin" />}
              Change password
            </Button>

            <div className="flex justify-center">
              <Link
                to="/search"
                className={buttonVariants({ variant: "link", size: "sm" })}
              >
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
