import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"

export type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

function readTheme(storageKey: string, fallback: Theme): Theme {
  try {
    const saved = localStorage.getItem(storageKey)
    return saved === "light" || saved === "dark" || saved === "system" ? saved : fallback
  } catch {
    return fallback
  }
}

/**
 * The class is first set by the inline script in index.html, before the page
 * paints; this keeps it in step afterwards. Both read the same storage key.
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => readTheme(storageKey, defaultTheme))

  useEffect(() => {
    const root = window.document.documentElement
    const apply = (resolved: "dark" | "light") => {
      root.classList.remove("light", "dark")
      root.classList.add(resolved)
    }

    if (theme !== "system") {
      apply(theme)
      return
    }

    // "System" keeps following the OS while the app is open, e.g. when it
    // switches to dark at sunset.
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const sync = () => apply(media.matches ? "dark" : "light")
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      try {
        localStorage.setItem(storageKey, theme)
      } catch {
        // Still applies for this visit.
      }
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
