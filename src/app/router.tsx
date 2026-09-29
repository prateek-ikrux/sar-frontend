import { createBrowserRouter, Navigate } from "react-router"

import { RequireAdmin } from "@/components/auth/require-admin"
import { RequireAuth } from "@/components/auth/require-auth"
import { RootLayout } from "@/components/layout/root-layout"
import { HydrateFallback } from "@/app/hydrate-fallback"
import { RouteError } from "@/app/route-error"

const lazyPage = (load: () => Promise<{ default: React.ComponentType }>) =>
  async () => ({ Component: (await load()).default })

export const router = createBrowserRouter([
  {
    // A pathless root so the fallback covers every branch below it, login
    // included. React Router looks for the topmost one while it resolves the
    // matched lazy route.
    HydrateFallback,
    ErrorBoundary: RouteError,
    children: [
      {
        path: "/login",
        lazy: lazyPage(() => import("@/pages/login")),
        ErrorBoundary: RouteError,
      },
      {
        Component: RequireAuth,
        ErrorBoundary: RouteError,
        children: [
          {
            Component: RootLayout,
            children: [
              {
                // Inside the layout, so a page that fails keeps the header
                // and its way back.
                ErrorBoundary: RouteError,
                children: [
                  { index: true, element: <Navigate to="/search" replace /> },
                  {
                    path: "search",
                    lazy: lazyPage(() => import("@/pages/search")),
                  },
                  {
                    path: "shortlist",
                    lazy: lazyPage(() => import("@/pages/shortlist")),
                  },
                  {
                    Component: RequireAdmin,
                    children: [
                      {
                        path: "users",
                        lazy: lazyPage(() => import("@/pages/users")),
                      },
                    ],
                  },
                  {
                    path: "*",
                    lazy: lazyPage(() => import("@/pages/not-found")),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
])
