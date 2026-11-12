import { useEffect } from "react"

import urls from "@/constants/urls"
import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"

const INTERVAL_MS = 60_000
// Reading a long answer is still using the page; three quiet minutes isn't.
const IDLE_MS = 3 * 60_000

const INPUTS = ["pointerdown", "pointermove", "keydown", "wheel", "scroll", "touchstart"] as const

/**
 * Tells the server, about once a minute, that the signed-in user is on the
 * page: only while the tab is visible and they've used it lately, so a tab
 * left open overnight counts for nothing. The server turns these check-ins
 * into time on the platform.
 */
export function useActivityHeartbeat() {
  const signedIn = useAuthStore((s) => Boolean(s.token))

  useEffect(() => {
    if (!signedIn) return
    let lastInput = Date.now()
    const touched = () => {
      lastInput = Date.now()
    }

    const beat = () => {
      if (document.visibilityState !== "visible") return
      if (Date.now() - lastInput > IDLE_MS) return
      // Losing one is harmless; a session simply runs a minute shorter.
      api.post(urls.activityHeartbeat).catch(() => {})
    }

    for (const input of INPUTS) window.addEventListener(input, touched, { passive: true, capture: true })
    beat()
    const timer = setInterval(beat, INTERVAL_MS)

    return () => {
      clearInterval(timer)
      for (const input of INPUTS) window.removeEventListener(input, touched, { capture: true })
    }
  }, [signedIn])
}
