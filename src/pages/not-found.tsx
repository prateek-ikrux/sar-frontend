import { Link } from "react-router"
import { buttonVariants } from "@/components/ui/button"

export default function NotFoundPage() {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
        <p className="text-base text-muted-foreground">
          That route does not exist.
        </p>
      </div>
      <Link to="/" className={buttonVariants({ variant: "outline" })}>
        Back to home
      </Link>
    </section>
  )
}
