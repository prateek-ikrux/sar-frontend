import { NavLink, Outlet, useNavigate } from "react-router"
import { LogOut, Search, Users } from "lucide-react"

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
import logo from "@/assets/images/ikrux_logo_nobg.png"

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
      <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
        <img src={logo} alt="ikrux" className="h-7 w-auto shrink-0" />

        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Account"
                  className="rounded-full bg-muted text-xs font-semibold"
                />
              }
            >
              {initial}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="truncate text-sm font-medium text-foreground">
                  {user?.name ?? "Signed in"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email}
                </p>
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
      </header>

      <main className="px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
