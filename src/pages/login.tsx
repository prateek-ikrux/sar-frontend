import { useEffect, useState } from "react"
import { Navigate, useLocation } from "react-router"
import { useMutation } from "@tanstack/react-query"
import { AlertCircle, ArrowLeft, Clock, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { OTP_MAX_ATTEMPTS, requestOtp, verifyOtp } from "@/services/auth"
import { useAuthStore } from "@/stores/auth-store"
import type { ApiError } from "@/lib/api"
import { APP_NAME, Wordmark } from "@/components/brand/wordmark"

const RESEND_SECONDS = 30
const OTP_LENGTH = 6

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" })

export default function LoginPage() {
  const location = useLocation()
  const setSession = useAuthStore((s) => s.setSession)
  const signedIn = useAuthStore((s) => Boolean(s.token && s.user))
  const endedBecause = useAuthStore((s) => s.endedBecause)
  useDocumentTitle("Sign in")

  const [step, setStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  // Wrong guesses on the current code, counted here since every rejection
  // looks the same from the server.
  const [misses, setMisses] = useState(0)
  const [error, setError] = useState<{ title: string; detail?: string } | null>(null)

  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? "/search"
  const codeSpent = misses >= OTP_MAX_ATTEMPTS

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  const sendOtp = useMutation({
    mutationFn: () => requestOtp(email.trim()),
    onSuccess: (challenge) => {
      if (step === "otp") {
        // The server answers the same for every address, so this can't
        // promise delivery either.
        toast.success("New code sent", {
          description: "If this email has access, it's on its way. Earlier codes no longer work.",
        })
      }
      setStep("otp")
      setOtp("")
      setMisses(0)
      setError(null)
      setExpiresAt(new Date(challenge.expiresAt))
      setSecondsLeft(RESEND_SECONDS)
    },
    onError: (e: ApiError) => setError({ title: e.message, detail: e.detail }),
  })

  const submitOtp = useMutation({
    mutationFn: (code: string) => verifyOtp(email.trim(), code),
    // Storing the session is enough: the signedIn redirect below takes over.
    onSuccess: (session) => setSession(session),
    onError: (e: ApiError) => {
      setOtp("")
      if (e.status === 401) {
        const misses_ = misses + 1
        setMisses(misses_)
        const left = OTP_MAX_ATTEMPTS - misses_
        setError(
          left > 0
            ? {
                title: "That code didn't work",
                detail: `Check it and try again. ${left} ${left === 1 ? "try" : "tries"} left for this code.`,
              }
            : {
                title: "This code can't be used any more",
                detail: "Request a new code to keep going.",
              }
        )
      } else {
        setError({ title: e.message, detail: e.detail })
      }
    },
  })

  // Submit as soon as the sixth digit lands, so there is nothing extra to click.
  function handleOtpChange(value: string) {
    setOtp(value)
    if (value) setError(null)
    if (value.length === OTP_LENGTH && !submitOtp.isPending) {
      submitOtp.mutate(value)
    }
  }

  function changeEmail() {
    setStep("email")
    setOtp("")
    setMisses(0)
    setError(null)
    setSecondsLeft(0)
  }

  // Covers both a signed-in user landing here (a bookmark, the back button)
  // and the moment a code is accepted.
  if (signedIn) {
    return <Navigate to={redirectTo} replace />
  }

  const errorAlert = error && (
    <Alert variant="destructive" className="border-destructive/30">
      <AlertCircle />
      <AlertTitle>{error.title}</AlertTitle>
      {error.detail && <AlertDescription>{error.detail}</AlertDescription>}
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

      {endedBecause === "expired" && step === "email" && (
        <Alert className="w-full max-w-sm">
          <Clock />
          <AlertTitle>Your session expired</AlertTitle>
          <AlertDescription>
            Sign in again to pick up where you left off. Your search and chat
            were kept.
          </AlertDescription>
        </Alert>
      )}

      <Card className="w-full max-w-sm">
        <CardHeader>
          {step === "email" ? (
            <>
              <CardTitle>
                <h1>Sign in</h1>
              </CardTitle>
              <CardDescription>
                Enter your ikrux email and we&rsquo;ll send you a sign-in
                code. There&rsquo;s no password.
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle>
                <h1>Enter your code</h1>
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
                if (email.trim()) sendOtp.mutate()
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
                  disabled={sendOtp.isPending}
                  aria-invalid={Boolean(error) || undefined}
                />
              </div>
              {errorAlert}
              <Button
                type="submit"
                className="w-full"
                disabled={!email.trim() || sendOtp.isPending}
              >
                {sendOtp.isPending && <Loader2 className="animate-spin" />}
                Send code
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3">
                <InputOTP
                  maxLength={OTP_LENGTH}
                  value={otp}
                  onChange={handleOtpChange}
                  autoFocus
                  disabled={submitOtp.isPending || codeSpent}
                  aria-label={`${OTP_LENGTH}-digit sign-in code`}
                  aria-invalid={Boolean(error) || undefined}
                >
                  <InputOTPGroup>
                    {Array.from({ length: OTP_LENGTH }, (_, i) => (
                      <InputOTPSlot key={i} index={i} aria-invalid={Boolean(error) || undefined} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                {submitOtp.isPending ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                    <Loader2 className="size-3.5 animate-spin" />
                    Checking your code
                  </p>
                ) : (
                  expiresAt &&
                  !codeSpent && (
                    <p className="text-xs text-muted-foreground">
                      The code works once and expires at {timeFormat.format(expiresAt)}.
                    </p>
                  )
                )}
              </div>

              {errorAlert}

              {codeSpent ? (
                <Button
                  className="w-full"
                  disabled={sendOtp.isPending}
                  onClick={() => sendOtp.mutate()}
                >
                  {sendOtp.isPending && <Loader2 className="animate-spin" />}
                  Send a new code
                </Button>
              ) : null}

              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={changeEmail}>
                  <ArrowLeft />
                  Change email
                </Button>
                {!codeSpent && (
                  <Button
                    variant="link"
                    size="sm"
                    disabled={secondsLeft > 0 || sendOtp.isPending}
                    onClick={() => sendOtp.mutate()}
                  >
                    {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="max-w-xs text-center text-xs text-muted-foreground">
        Access is by invitation. If your address is not recognised, ask an
        ikrux admin to add you.
      </p>
    </main>
  )
}
