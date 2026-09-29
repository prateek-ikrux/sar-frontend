type Cell = string | number | null | undefined

// A cell starting with one of these is run as a formula by Excel and Sheets,
// so resume-derived text is defused with a leading apostrophe.
const FORMULA_START = /^[=+\-@\t\r]/

function cell(value: Cell) {
  if (value === null || value === undefined) return ""
  let text = String(value)
  if (typeof value === "string" && FORMULA_START.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Saves rows as a CSV file. The BOM makes Excel read it as UTF-8. */
export function downloadCsv(fileName: string, rows: Cell[][]) {
  const csv = rows.map((row) => row.map(cell).join(",")).join("\r\n")
  const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** A short, filesystem-safe slug for a file name. */
export const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "search"
