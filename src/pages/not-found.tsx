import { Link } from "react-router"
import { buttonVariants } from "@/components/ui/button"
import { useDocumentTitle } from "@/hooks/use-document-title"

export default function NotFoundPage() {
  useDocumentTitle("Page not found")

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
        <p className="text-base text-muted-foreground">
          The address may be mistyped, or the page may have moved.
        </p>
      </div>
      <Link to="/search" className={buttonVariants({ variant: "outline" })}>
        Go to search
      </Link>
    </section>
  )
}
