import { useSyncExternalStore } from "react"

/** Tracks a CSS media query, e.g. "(min-width: 64rem)". */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener("change", onChange)
      return () => media.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches
  )
}

/** Tailwind's lg breakpoint, where the search page shows both panes side by side. */
export const DESKTOP_QUERY = "(min-width: 64rem)"

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"
