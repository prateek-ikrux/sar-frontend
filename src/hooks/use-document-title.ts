import { useEffect } from "react"
import { APP_NAME } from "@/components/brand/wordmark"

/**
 * Names the browser tab after the page, so tabs, history and screen readers
 * can tell pages apart. Pass null to show just the product name.
 */
export function useDocumentTitle(title: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : `${APP_NAME} · ikrux`
  }, [title])
}
