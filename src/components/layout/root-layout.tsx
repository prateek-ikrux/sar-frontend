import { NavLink, Outlet, useNavigate } from "react-router"
import { LogOut, Search, Users } from "lucide-react"

import { Lockup } from "@/components/brand/wordmark"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/stores/auth-store"
import { cn } from "@/lib/utils"

export function RootLayout() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const navItems = [
    { to: "/search", label: "Search", icon: Search },
    ...(user?.role === "admin"
      ? [{ to: "/users", label: "Users", icon: Users }]
      : []),
  ]

  const initial = (user?.name ?? user?.email ?? "?").charAt(0).toUpperCase()

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
          {/* The product name is the first thing to go when space is tight --
              the wordmark alone still says whose tool this is. */}
          <Lockup nameClassName="hidden sm:inline" />

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                <item.icon className="size-4" aria-hidden />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <ModeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Account"
                    className="rounded-full bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/15"
                  />
                }
              >
                {initial}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
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
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    logout()
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

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
