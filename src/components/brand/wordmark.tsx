import wordmarkLight from "@/assets/images/ikrux_wordmark.png"
import wordmarkDark from "@/assets/images/ikrux_wordmark_dark.png"
import { cn } from "@/lib/utils"

/** The product this is, as opposed to ikrux, the organisation that runs it. */
export const APP_NAME = "Candidate Search & Retrieval"

/**
 * The ikrux wordmark. Two files rather than a CSS filter: the mark is black
 * with a teal accent, and inverting it for dark mode would drag the teal to
 * magenta, so the dark copy has the accent left untouched.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <>
      <img
        src={wordmarkLight}
        alt="ikrux"
        className={cn("w-auto dark:hidden", className)}
      />
      <img
        src={wordmarkDark}
        alt="ikrux"
        className={cn("hidden w-auto dark:block", className)}
      />
    </>
  )
}

/**
 * Wordmark plus product name, divided. Used wherever the app introduces
 * itself -- the header and the sign-in card.
 */
export function Lockup({
  className,
  nameClassName,
}: {
  className?: string
  nameClassName?: string
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Wordmark className="h-4" />
      <span aria-hidden className="h-4 w-px shrink-0 bg-border" />
      <span
        className={cn(
          "text-sm font-medium tracking-tight text-foreground",
          nameClassName
        )}
      >
        {APP_NAME}
      </span>
    </div>
  )
}
