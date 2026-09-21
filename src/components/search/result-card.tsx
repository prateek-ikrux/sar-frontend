import { Briefcase, Clock, FileText, Mail, MapPin, Phone } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { summarise, snippet } from "@/lib/resume"
import type { SearchResult } from "@/types"

type Props = {
  result: SearchResult
  onOpen: (result: SearchResult) => void
}

export function ResultCard({ result, onOpen }: Props) {
  const summary = summarise(result.document)
  const facts = [
    { icon: Briefcase, value: summary.designation, label: "Role" },
    { icon: MapPin, value: summary.location, label: "Location" },
    { icon: Clock, value: summary.experience, label: "Experience" },
  ].filter((fact) => fact.value)

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="truncate text-base font-semibold text-foreground">
              {summary.name ?? result.email}
            </h3>
            {summary.company && (
              <p className="truncate text-sm text-muted-foreground">
                {summary.designation
                  ? `${summary.designation} at ${summary.company}`
                  : summary.company}
              </p>
            )}
          </div>
          {typeof result.score === "number" && (
            <Badge variant="secondary" className="shrink-0 tabular-nums">
              {Math.round(result.score * 100)}% match
            </Badge>
          )}
        </div>

        {facts.length > 0 && (
          <dl className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            {facts.map((fact) => (
              <div key={fact.label} className="flex items-center gap-1.5">
                <fact.icon className="size-3.5 shrink-0" aria-hidden />
                <dt className="sr-only">{fact.label}</dt>
                <dd className="truncate">{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {summary.skills.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {summary.skills.map((skill) => (
              <li key={skill}>
                <Badge variant="outline">{skill}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {snippet(result.document)}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <a
              href={`mailto:${result.email}`}
              className="flex items-center gap-1.5 hover:text-foreground"
            >
              <Mail className="size-3.5" aria-hidden />
              {result.email}
            </a>
            {result.phone && (
              <a
                href={`tel:${result.phone}`}
                className="flex items-center gap-1.5 hover:text-foreground"
              >
                <Phone className="size-3.5" aria-hidden />
                {result.phone}
              </a>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpen(result)}>
            <FileText />
            View resume
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
