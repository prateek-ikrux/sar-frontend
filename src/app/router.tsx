import { createBrowserRouter, Navigate } from "react-router"

import { RequireAdmin } from "@/components/auth/require-admin"
import { RequireAuth } from "@/components/auth/require-auth"
import { RootLayout } from "@/components/layout/root-layout"
import { RouteError } from "@/app/route-error"

const lazyPage = (load: () => Promise<{ default: React.ComponentType }>) =>
  async () => ({ Component: (await load()).default })

export const router = createBrowserRouter([
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
          { index: true, element: <Navigate to="/search" replace /> },
          {
            path: "search",
            lazy: lazyPage(() => import("@/pages/search")),
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
])
