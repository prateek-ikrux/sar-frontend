import { useEffect, useRef } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router"
import { Bookmark, LogOut, Monitor, Moon, Search, Sun, Users } from "lucide-react"

import { Lockup } from "@/components/brand/wordmark"
import { useTheme, type Theme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useShortlist } from "@/hooks/use-shortlist"
import { useAuthStore } from "@/stores/auth-store"
import { cn } from "@/lib/utils"

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Match system", icon: Monitor },
]

export function RootLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { theme, setTheme } = useTheme()
  const saved = useShortlist().items.length
  const main = useRef<HTMLElement>(null)
  const lastPath = useRef(pathname)

  // After an in-app navigation, move focus to the new page so screen readers
  // start reading there, as they would on a full page load. Compared with the
  // last path rather than skipping a "first run", which StrictMode repeats.
  useEffect(() => {
    if (lastPath.current === pathname) return
    lastPath.current = pathname
    main.current?.focus({ preventScroll: true })
  }, [pathname])

  const navItems = [
    { to: "/search", label: "Search", icon: Search, count: 0 },
    { to: "/shortlist", label: "Shortlist", icon: Bookmark, count: saved },
    ...(user?.role === "admin"
      ? [{ to: "/users", label: "Users", icon: Users, count: 0 }]
      : []),
  ]

  const initial = (user?.name ?? user?.email ?? "?").charAt(0).toUpperCase()

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm font-medium text-foreground ring-2 ring-ring focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
          {/* The product name is the first thing to go when space is tight --
              the wordmark alone still says whose tool this is. */}
          <Lockup nameClassName="hidden sm:inline" />

          {/* One destination needs no navigation. */}
          {navItems.length > 1 && (
            <nav aria-label="Main" className="flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )
                  }
                >
                  <item.icon className="size-4" aria-hidden />
                  {/* Icons alone on a phone; the name stays for screen readers. */}
                  <span className="max-sm:sr-only">{item.label}</span>
                  {item.count > 0 && (
                    <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground tabular-nums">
                      <span className="sr-only">, </span>
                      {item.count}
                      <span className="sr-only"> saved</span>
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Account and settings for ${user?.name ?? user?.email ?? "you"}`}
                    className="rounded-full bg-primary/10 text-sm font-semibold text-primary hover:bg-primary/15"
                  />
                }
              >
                {initial}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-1.5">
                  <p className="truncate text-sm font-medium text-foreground">
                    {user?.name ?? "Signed in"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                  {user?.role && (
                    <p className="mt-1 text-xs capitalize text-muted-foreground">
                      {user.role}
                    </p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Theme</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={theme}
                    onValueChange={(value) => setTheme(value as Theme)}
                  >
                    {THEMES.map((option) => (
                      <DropdownMenuRadioItem key={option.value} value={option.value}>
                        <option.icon aria-hidden />
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout("signed-out")
                    navigate("/login", { replace: true })
                  }}
                >
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main
        id="main"
        ref={main}
        tabIndex={-1}
        className="mx-auto max-w-6xl px-4 py-8 outline-none sm:px-6"
      >
        <Outlet />
      </main>
    </div>
  )
}
