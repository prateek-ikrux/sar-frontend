import { Link } from "react-router"
import { ShieldAlert, TriangleAlert } from "lucide-react"

import { flagText, flagWhen, isSignInFlag } from "@/lib/flags"
import type { ActivityFlag } from "@/types"

/**
 * Unusual activity, newest first. Each line carries an icon and words, never
 * colour alone. With `named`, each starts with the person, linked to their page.
 */
export function FlagList({ flags, named = true }: { flags: ActivityFlag[]; named?: boolean }) {
  if (!flags.length) {
    return <p className="text-sm text-muted-foreground">Nothing unusual in this period.</p>
  }
  return (
    <ol className="divide-y divide-border">
      {flags.map((flag, index) => {
        const Icon = isSignInFlag(flag) ? ShieldAlert : TriangleAlert
        const text = flagText(flag)
        return (
          <li key={`${flag.kind}-${flag.userId}-${flag.at}-${index}`} className="flex items-start gap-3 py-2 text-sm">
            <Icon className="mt-0.5 size-4 shrink-0 text-team-foreground" aria-hidden />
            <p className="min-w-0 flex-1 text-foreground">
              {named ? (
                <>
                  <Link
                    to={`/users/${flag.userId}`}
                    className="rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {flag.name}
                  </Link>{" "}
                  {text}
                </>
              ) : (
                text[0].toUpperCase() + text.slice(1)
              )}
            </p>
            <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">{flagWhen(flag)}</span>
          </li>
        )
      })}
    </ol>
  )
}
