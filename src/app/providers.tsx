import type { ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { queryClient } from "@/lib/query-client"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{children}</TooltipProvider>
        {/* Top right, below the 56px header: clear of the nav and account
            menu, and of the chat box, which sits at the bottom right. */}
        <Toaster position="top-right" offset={{ top: 68 }} mobileOffset={{ top: 64 }} />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
