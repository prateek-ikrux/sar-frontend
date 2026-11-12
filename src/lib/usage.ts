/** "2h 15m", "45m", "under a minute". */
export function formatDuration(seconds: number) {
  if (seconds < 60) return seconds > 0 ? "under a minute" : "0m"
  const minutes = Math.round(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${minutes}m`
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

/** A short name for a browser from its user agent: "Chrome on Windows". */
export function browserOf(userAgent: string | null) {
  if (!userAgent) return "Unknown browser"
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /OPR\/|Opera/.test(userAgent)
      ? "Opera"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Chrome\/|CriOS\//.test(userAgent)
          ? "Chrome"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : "A browser"
  const os = /Windows/.test(userAgent)
    ? "Windows"
    : /iPhone|iPad|iPod/.test(userAgent)
      ? "iOS"
      : /Mac OS X|Macintosh/.test(userAgent)
        ? "macOS"
        : /Android/.test(userAgent)
          ? "Android"
          : /Linux/.test(userAgent)
            ? "Linux"
            : null
  return os ? `${browser} on ${os}` : browser
}


export const FAILED_SIGN_IN: Record<string, string> = {
  wrong_code: "wrong code",
  no_valid_code: "no valid code (expired, used, or too many tries)",
  disabled: "account disabled",
}
