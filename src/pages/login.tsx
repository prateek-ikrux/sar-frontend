import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router"
import { useMutation } from "@tanstack/react-query"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"

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
import { requestOtp, verifyOtp } from "@/services/auth"
import { useAuthStore } from "@/stores/auth-store"
import type { ApiError } from "@/lib/api"
import { APP_NAME, Wordmark } from "@/components/brand/wordmark"

const RESEND_SECONDS = 30
const OTP_LENGTH = 6

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useAuthStore((s) => s.setSession)

  const [step, setStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [secondsLeft, setSecondsLeft] = useState(0)

  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? "/search"

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  const sendOtp = useMutation({
    mutationFn: () => requestOtp(email.trim()),
    onSuccess: () => {
      setStep("otp")
      setOtp("")
      setSecondsLeft(RESEND_SECONDS)
      toast.success(`We sent a code to ${email}.`)
    },
    onError: (error: ApiError) =>
      toast.error(error.message, { description: error.detail }),
  })

  const submitOtp = useMutation({
    mutationFn: (code: string) => verifyOtp(email.trim(), code),
    onSuccess: (session) => {
      setSession(session)
      navigate(redirectTo, { replace: true })
    },
    onError: (error: ApiError) => {
      setOtp("")
      toast.error(error.message, { description: error.detail })
    },
  })

  // Submit as soon as the sixth digit lands, so there is nothing extra to click.
  function handleOtpChange(value: string) {
    setOtp(value)
    if (value.length === OTP_LENGTH && !submitOtp.isPending) {
      submitOtp.mutate(value)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10">
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
              <CardTitle>Sign in</CardTitle>
              <CardDescription>
                Enter your ikrux email and we&rsquo;ll send you a sign-in
                code.
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle>Enter your code</CardTitle>
              <CardDescription>
                We sent a {OTP_LENGTH}-digit code to{" "}
                <span className="font-medium text-foreground">{email}</span>.
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
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={sendOtp.isPending}
                />
              </div>
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
                  disabled={submitOtp.isPending}
                >
                  <InputOTPGroup>
                    {Array.from({ length: OTP_LENGTH }, (_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                {submitOtp.isPending && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Checking your code
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep("email")
                    setOtp("")
                  }}
                >
                  <ArrowLeft />
                  Change email
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  disabled={secondsLeft > 0 || sendOtp.isPending}
                  onClick={() => sendOtp.mutate()}
                >
                  {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="max-w-xs text-center text-xs text-muted-foreground">
        Access is by invitation. If your address is not recognised, ask an
        ikrux admin to add you.
      </p>
    </div>
  )
}
