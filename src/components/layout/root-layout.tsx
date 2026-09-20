import { NavLink, Outlet } from "react-router"
import { ModeToggle } from "@/components/mode-toggle"
import { cn } from "@/lib/utils"
import logo from "@/assets/images/ikrux_logo_nobg.png"

const navItems = [{ to: "/", label: "Home" }]

export function RootLayout() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="flex h-14 items-center gap-6 border-b border-border px-6">
        <img src={logo} alt="ikrux" className="h-7 w-auto" />
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto">
          <ModeToggle />
        </div>
      </header>
      <main className="px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
