import { useState, type Ref } from "react"
import { Lock, RotateCcw, Search, Sparkles } from "lucide-react"

import { Hint } from "@/components/search/hint"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import {
  READING_DEPTHS,
  RESULT_COUNTS,
  fitOptions,
} from "@/lib/search-options"
import { MIN_QUERY_LENGTH, type SearchOptions } from "@/services/search"

type Props = {
  value: string
  onValueChange: (value: string) => void
  onSearch: (query: string) => void
  /**
   * Ask a question with no prior search: the server retrieves and pins in one
   * call. Omitted once a set exists, since questions then go to the chat.
   */
  onAsk?: (question: string) => void
  isPending: boolean
  options: SearchOptions
  onOptionsChange: (options: SearchOptions) => void
  /** Questions have been asked, so the settings are fixed until a new search. */
  locked: boolean
  /** There are results on screen that "New search" would clear. */
  hasResults: boolean
  onNewSearch: () => void
  inputRef?: Ref<HTMLTextAreaElement>
}

/**
 * Controlled so the page can drop an example straight into the box. Both
 * endpoints validate the text the same way: 3-1000 characters.
 */
export function SearchBar({
  value,
  onValueChange,
  onSearch,
  onAsk,
  isPending,
  options,
  onOptionsChange,
  locked,
  hasResults,
  onNewSearch,
  inputRef,
}: Props) {
  const [note, setNote] = useState<string | null>(null)
  const trimmed = value.trim()
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_QUERY_LENGTH
  const canSubmit = trimmed.length >= MIN_QUERY_LENGTH && !isPending

  function change(next: SearchOptions, changed: "limit" | "charsPerDocument" | "requireResume") {
    const fitted =
      changed === "requireResume" ? { options: next, note: null } : fitOptions(next, changed)
    setNote(fitted.note)
    onOptionsChange(fitted.options)
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (canSubmit) onSearch(trimmed)
      }}
    >
      <InputGroup className="bg-card">
        <InputGroupTextarea
          ref={inputRef}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          rows={1}
          maxLength={1000}
          aria-label="Describe the candidate you need"
          aria-invalid={tooShort || undefined}
          aria-describedby="search-hint"
          placeholder="Senior React engineer, 5+ years, fintech background, based in Bangalore"
          className="min-h-10"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              if (canSubmit) onSearch(trimmed)
            }
          }}
        />
        <InputGroupAddon align="block-end" className="flex-wrap justify-between gap-y-1">
          <span id="search-hint" className="text-xs font-normal text-muted-foreground">
            {tooShort ? (
              <span className="text-destructive">
                Type at least {MIN_QUERY_LENGTH} characters
              </span>
            ) : (
              <span className="max-sm:hidden">Enter to search, Shift+Enter for a new line</span>
            )}
          </span>
          <span className="ml-auto flex items-center gap-1">
            {hasResults && (
              <InputGroupButton size="sm" onClick={onNewSearch}>
                <RotateCcw />
                New search
              </InputGroupButton>
            )}
            {onAsk && (
              <Hint label="Get a written answer, with the candidates it's based on">
                <InputGroupButton
                  size="sm"
                  disabled={!canSubmit}
                  onClick={() => onAsk(trimmed)}
                >
                  <Sparkles />
                  Ask directly
                </InputGroupButton>
              </Hint>
            )}
            <InputGroupButton type="submit" size="sm" variant="default" disabled={!canSubmit}>
              {isPending ? <Spinner /> : <Search />}
              Search
            </InputGroupButton>
          </span>
        </InputGroupAddon>
      </InputGroup>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-xs text-muted-foreground">
        <OptionSelect
          id="search-limit"
          label="Results"
          value={options.limit}
          choices={RESULT_COUNTS.map((n) => ({ value: n, label: String(n) }))}
          disabled={locked}
          onChange={(limit) => change({ ...options, limit }, "limit")}
        />
        <OptionSelect
          id="search-depth"
          label="Reading"
          value={options.charsPerDocument}
          choices={READING_DEPTHS.map((d) => ({
            value: d.value,
            label: d.label,
            description: d.description,
          }))}
          disabled={locked}
          onChange={(charsPerDocument) => change({ ...options, charsPerDocument }, "charsPerDocument")}
        />
        <span className="flex items-center gap-1.5">
          <Switch
            id="search-require-resume"
            size="sm"
            checked={options.requireResume}
            disabled={locked}
            onCheckedChange={(requireResume) => change({ ...options, requireResume }, "requireResume")}
          />
          <Label
            htmlFor="search-require-resume"
            className="text-xs font-normal text-muted-foreground"
          >
            Only candidates with a resume file
          </Label>
        </span>

        {locked ? (
          <span className="flex items-center gap-1">
            <Lock className="size-3" aria-hidden />
            Settings are fixed once you ask a question. Start a new search to change them.
          </span>
        ) : (
          note && (
            <span role="status" className="text-foreground">
              {note}
            </span>
          )
        )}
      </div>
    </form>
  )
}

function OptionSelect({
  id,
  label,
  value,
  choices,
  disabled,
  onChange,
}: {
  id: string
  label: string
  value: number
  choices: { value: number; label: string; description?: string }[]
  disabled: boolean
  onChange: (value: number) => void
}) {
  return (
    <span className="flex items-center gap-1.5">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <Select
        value={value}
        disabled={disabled}
        items={choices.map(({ value, label }) => ({ value, label }))}
        onValueChange={(next) => {
          if (next !== null) onChange(next)
        }}
      >
        <SelectTrigger id={id} size="sm" className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} align="start">
          {choices.map((choice) => (
            <SelectItem key={choice.value} value={choice.value} className="text-xs">
              {choice.description ? (
                <span className="flex flex-col">
                  <span>{choice.label}</span>
                  <span className="text-muted-foreground">{choice.description}</span>
                </span>
              ) : (
                choice.label
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  )
}
