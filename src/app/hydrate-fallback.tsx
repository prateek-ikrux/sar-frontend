import { Loader2 } from "lucide-react"

/**
 * Shown while the router resolves a lazy route on the very first load. Without
 * one, React Router renders null for that pass -- a blank page on any hard
 * refresh, since every page in this app is lazy.
 */
export function HydrateFallback() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-background"
      role="status"
      aria-label="Loading"
    >
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}
