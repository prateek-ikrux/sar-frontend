import { isRouteErrorResponse, useRouteError } from "react-router"

export function RouteError() {
  const error = useRouteError()

  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "Something went wrong"
  const detail =
    error instanceof Error ? error.message : "An unexpected error occurred."

  return (
    <section className="space-y-1 px-6 py-8">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="text-base text-muted-foreground">{detail}</p>
    </section>
  )
}
