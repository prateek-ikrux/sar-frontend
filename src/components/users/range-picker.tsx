import { ACTIVITY_RANGES } from "@/hooks/use-activity-range"
import { cn } from "@/lib/utils"
import type { ActivityRange } from "@/types"

export function RangePicker({ days, onChange }: { days: ActivityRange; onChange: (days: ActivityRange) => void }) {
  return (
    <div role="group" aria-label="Period" className="flex gap-1 rounded-lg bg-muted p-1">
      {ACTIVITY_RANGES.map((range) => (
        <button
          key={range}
          type="button"
          aria-pressed={range === days}
          onClick={() => onChange(range)}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            range === days ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {range} days
        </button>
      ))}
    </div>
  )
}
