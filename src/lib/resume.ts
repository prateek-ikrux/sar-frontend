/**
 * The search endpoint returns each resume as one markdown blob, so the fields a
 * recruiter scans have to be pulled back out of the text. Everything here is
 * best-effort and falls back to null -- delete this module once the backend
 * returns structured fields.
 */

/**
 * Labels come out of the PDF with tabs sprinkled through them -- the real text
 * is "Current\tDesignation:\t Software\tDeveloper", and a later repeat of the
 * same label may put a space before the colon. Flatten each line before
 * matching so the label spelling in code stays readable.
 */
function flatten(line: string): string {
  return line.replace(/\s+/g, " ").replace(/ :/g, ":").trim()
}

function labelled(document: string, label: string): string | null {
  const needle = `${label.toLowerCase()}:`

  for (const line of document.split("\n")) {
    const flat = flatten(line)
    const at = flat.toLowerCase().indexOf(needle)
    if (at === -1) continue

    const value = flat.slice(at + needle.length).trim()
    if (!value || value.toLowerCase() === "not mentioned") return null
    return value
  }

  return null
}

/** The candidate's name is the first heading that isn't an email or a number. */
function headingName(document: string): string | null {
  for (const line of document.split("\n")) {
    if (!line.startsWith("##")) continue
    const text = flatten(line.replace(/^#+/, ""))
    if (!text || text.includes("@") || /\d/.test(text)) continue
    return text
  }
  return null
}

export type ResumeSummary = {
  name: string | null
  designation: string | null
  company: string | null
  location: string | null
  experience: string | null
  noticePeriod: string | null
  skills: string[]
}

export function summarise(document: string): ResumeSummary {
  const skills = labelled(document, "Key Skills")
  return {
    name: headingName(document),
    designation: labelled(document, "Current Designation"),
    company: labelled(document, "Current Company"),
    location: labelled(document, "Current Location"),
    experience: labelled(document, "Total Experience"),
    noticePeriod: labelled(document, "Notice period"),
    // PDF line-wrapping repeats entries ("Spring" then "Spring Mvc"), and the
    // card uses each skill as a React key, so they have to be unique.
    skills: skills
      ? [
          ...new Set(
            skills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          ),
        ].slice(0, 8)
      : [],
  }
}

const MARKDOWN_NOISE = /[-#*|_>`]/g

/** A readable one-liner for the result card when nothing else is extractable. */
export function snippet(document: string, length = 220): string {
  const text = document
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(MARKDOWN_NOISE, " ")
    .replace(/\s+/g, " ")
    .trim()

  return text.length > length ? `${text.slice(0, length).trimEnd()}...` : text
}
