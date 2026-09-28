import type { ReactElement, ReactNode } from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * A text tooltip on any element. `children` becomes the trigger itself, so a
 * disabled control needs a wrapping element: it swallows pointer events.
 */
export function Hint({
  label,
  children,
}: {
  label: ReactNode
  children: ReactElement
}) {
  if (!label) return children
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent className="max-w-64">{label}</TooltipContent>
    </Tooltip>
  )
}
