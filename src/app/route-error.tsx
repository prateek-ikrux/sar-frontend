import { isRouteErrorResponse, Link, useRouteError } from "react-router"
import { RotateCcw, TriangleAlert } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { useDocumentTitle } from "@/hooks/use-document-title"

/**
 * Shown when a page crashes or fails to load (a new release can make an open
 * tab's old code chunks disappear). Says what to do next; the technical
 * detail is logged, and shown only in development.
 */
export function RouteError() {
  const error = useRouteError()
  useDocumentTitle("Something went wrong")

  const notFound = isRouteErrorResponse(error) && error.status === 404
  const staleChunk =
    error instanceof Error && /dynamically imported module|Loading chunk/i.test(error.message)

  if (!notFound) console.error(error)

  const title = notFound ? "Page not found" : "Something went wrong"
  const detail = notFound
    ? "The address may be mistyped, or the page may have moved."
    : staleChunk
      ? "A new version of the app is available. Reload to get it."
      : "This page ran into a problem. Reloading usually fixes it; if it doesn't, tell an admin."

  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-16 text-center">
      <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
        <TriangleAlert className="size-5 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="text-base text-muted-foreground">{detail}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {!notFound && (
          <Button onClick={() => window.location.reload()}>
            <RotateCcw />
            Reload
          </Button>
        )}
        <Link to="/search" className={buttonVariants({ variant: notFound ? "default" : "outline" })}>
          Go to search
        </Link>
      </div>
      {import.meta.env.DEV && error instanceof Error && (
        <pre className="mt-4 max-w-full overflow-x-auto rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
          {error.message}
        </pre>
      )}
    </section>
  )
}
