import { createBrowserRouter } from "react-router"
import { RootLayout } from "@/components/layout/root-layout"
import { RouteError } from "@/app/route-error"

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    ErrorBoundary: RouteError,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import("@/pages/home")).default }),
      },
      {
        path: "*",
        lazy: async () => ({
          Component: (await import("@/pages/not-found")).default,
        }),
      },
    ],
  },
])
