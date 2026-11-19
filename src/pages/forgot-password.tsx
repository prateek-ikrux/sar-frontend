import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { useMutation } from "@tanstack/react-query"
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/auth/password-input"
import { Label } from "@/components/ui/label"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { PASSWORD_MIN_LENGTH, forgotPassword, resetPassword } from "@/services/auth"
import type { ApiError } from "@/lib/api"
import { APP_NAME, Wordmark } from "@/components/brand/wordmark"

const RESEND_SECONDS = 30
const OTP_LENGTH = 6

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" })

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  useDocumentTitle("Reset password")

  const [step, setStep] = useState<"email" | "reset">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  // Passwords are never trimmed: spaces are part of them.
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [localError, setLocalError] = useState<{ field: "next" | "confirm"; message: string } | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  const sendCode = useMutation({
    mutationFn: () => forgotPassword(email.trim()),
    onSuccess: (challenge) => {
      if (step === "reset") {
        // The server answers the same for every address, so this can't
        // promise delivery either.
        toast.success("New code sent", {
          description: "If this email has access, it's on its way. Earlier codes no longer work.",
        })
      }
      setStep("reset")
      setOtp("")
      setError(null)
      setExpiresAt(new Date(challenge.expiresAt))
      setSecondsLeft(RESEND_SECONDS)
    },
    onError: (e: ApiError) => setError(e),
  })

  const reset = useMutation({
    mutationFn: () => resetPassword(email.trim(), otp, next),
    onSuccess: () => {
      toast.success("Password reset. Sign in with your new password.")
      navigate("/login", { replace: true })
    },
    onError: (e: ApiError) => setError(e),
  })

  function submitReset() {
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
    reset.mutate()
  }

  function changeEmail() {
    setStep("email")
    setOtp("")
    setNext("")
    setConfirm("")
    setLocalError(null)
    setError(null)
    setSecondsLeft(0)
  }

  function clear() {
    setLocalError(null)
    setError(null)
  }

  const nextError =
    (localError?.field === "next" ? localError.message : undefined) ??
    error?.fields.newPassword
  const confirmError = localError?.field === "confirm" ? localError.message : undefined
  // Anything not tied to a password field is shown above the buttons.
  const formError = error && !error.fields.newPassword ? error : null

  const errorAlert = formError && (
    <Alert variant="destructive" className="border-destructive/30">
      <AlertCircle />
      <AlertTitle>{formError.message}</AlertTitle>
      {formError.detail && <AlertDescription>{formError.detail}</AlertDescription>}
    </Alert>
  )

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
          {step === "email" ? (
            <>
              <CardTitle>
                <h1>Reset your password</h1>
              </CardTitle>
              <CardDescription>
                Enter your ikrux email and we&rsquo;ll email you a code to
                set a new password.
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle>
                <h1>Choose a new password</h1>
              </CardTitle>
              {/* The server answers the same for every address, so this
                  can't claim the code was sent. */}
              <CardDescription>
                If <span className="font-medium text-foreground">{email}</span>{" "}
                has access, we&rsquo;ve sent it a {OTP_LENGTH}-digit code. It
                can take a minute to arrive.
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent>
          {step === "email" ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                if (email.trim() && !sendCode.isPending) sendCode.mutate()
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  required
                  placeholder="you@ikrux.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setError(null)
                  }}
                  disabled={sendCode.isPending}
                  aria-invalid={Boolean(error) || undefined}
                />
              </div>
              {errorAlert}
              <Button
                type="submit"
                className="w-full"
                disabled={!email.trim() || sendCode.isPending}
              >
                {sendCode.isPending && <Loader2 className="animate-spin" />}
                Send code
              </Button>
              <div className="flex justify-center">
                <Link
                  to="/login"
                  className={buttonVariants({ variant: "link", size: "sm" })}
                >
                  Back to sign in
                </Link>
              </div>
            </form>
          ) : (
            <form
              className="space-y-4"
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                if (otp.length === OTP_LENGTH && next && confirm && !reset.isPending) {
                  submitReset()
                }
              }}
            >
              <div className="flex flex-col items-center gap-3">
                <InputOTP
                  maxLength={OTP_LENGTH}
                  value={otp}
                  onChange={(value) => {
                    setOtp(value)
                    clear()
                  }}
                  autoFocus
                  disabled={reset.isPending}
                  aria-label={`${OTP_LENGTH}-digit reset code`}
                  aria-invalid={Boolean(formError) || undefined}
                >
                  <InputOTPGroup>
                    {Array.from({ length: OTP_LENGTH }, (_, i) => (
                      <InputOTPSlot key={i} index={i} aria-invalid={Boolean(formError) || undefined} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                {expiresAt && (
                  <p className="text-xs text-muted-foreground">
                    The code works once and expires at {timeFormat.format(expiresAt)}.
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
                  disabled={reset.isPending}
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
                  disabled={reset.isPending}
                  aria-invalid={Boolean(confirmError) || undefined}
                  aria-describedby={confirmError ? "confirm-password-error" : undefined}
                />
                {confirmError && (
                  <p id="confirm-password-error" className="text-sm text-destructive">
                    {confirmError}
                  </p>
                )}
              </div>

              {errorAlert}

              <Button
                type="submit"
                className="w-full"
                disabled={otp.length !== OTP_LENGTH || !next || !confirm || reset.isPending}
              >
                {reset.isPending && <Loader2 className="animate-spin" />}
                Reset password
              </Button>

              <div className="flex items-center justify-between">
                <Button type="button" variant="ghost" size="sm" onClick={changeEmail}>
                  <ArrowLeft />
                  Change email
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  disabled={secondsLeft > 0 || sendCode.isPending}
                  onClick={() => sendCode.mutate()}
                >
                  {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
