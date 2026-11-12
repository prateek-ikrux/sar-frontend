import { useSearchParams } from "react-router"

import type { ActivityRange } from "@/types"

export const ACTIVITY_RANGES: ActivityRange[] = [7, 30, 90]
const DEFAULT: ActivityRange = 30

/** The period in the URL (?days=7), so a link keeps it. 30 days by default. */
export function useActivityRange(): [ActivityRange, (days: ActivityRange) => void] {
  const [params, setParams] = useSearchParams()
  const asked = Number(params.get("days")) as ActivityRange
  const days = ACTIVITY_RANGES.includes(asked) ? asked : DEFAULT
  return [days, (next) => setParams(next === DEFAULT ? {} : { days: String(next) }, { replace: true })]
}
