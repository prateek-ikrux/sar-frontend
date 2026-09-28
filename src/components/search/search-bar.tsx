import type { Ref } from "react"
import { Lock, Search, Sparkles } from "lucide-react"

import { Hint } from "@/components/search/hint"
import { Button } from "@/components/ui/button"
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
import { MIN_QUERY_LENGTH, type SearchOptions } from "@/services/search"

const LIMITS = [3, 5, 10, 15, 20, 40]
const DEPTHS = [2000, 4000, 8000, 12000, 20000]

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
  /** A conversation is open, so size and depth are fixed until a new search. */
  locked: boolean
  onNewSearch: () => void
  inputRef?: Ref<HTMLTextAreaElement>
}

const LOCKED_HINT = "Start a new search to change this."

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
  onNewSearch,
  inputRef,
}: Props) {
  const trimmed = value.trim()
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_QUERY_LENGTH
  const canSubmit = trimmed.length >= MIN_QUERY_LENGTH && !isPending

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
          placeholder="Senior React engineer, 5+ years, fintech background, based in Bangalore..."
          className="min-h-10"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              if (canSubmit) onSearch(trimmed)
            }
          }}
        />
        <InputGroupAddon align="block-end" className="justify-between">
          <span className="text-xs text-muted-foreground">
            {tooShort ? (
              <span className="text-destructive">
                At least {MIN_QUERY_LENGTH} characters
              </span>
            ) : (
              "Enter to search, Shift+Enter for a new line"
            )}
          </span>
          <span className="flex items-center gap-1">
            {onAsk && (
              <Hint label="Ask this as a question: the answer comes with the profiles it drew on">
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
          choices={LIMITS}
          format={(n) => String(n)}
          disabled={locked}
          onChange={(limit) => onOptionsChange({ ...options, limit })}
        />
        <OptionSelect
          id="search-depth"
          label="Depth"
          value={options.charsPerDocument}
          choices={DEPTHS}
          format={(n) => `${n.toLocaleString()} chars`}
          disabled={locked}
          onChange={(charsPerDocument) =>
            onOptionsChange({ ...options, charsPerDocument })
          }
        />
        <Hint
          label={
            locked
              ? LOCKED_HINT
              : "Skip candidates whose resume PDF is missing, and fill the results with ones that have it"
          }
        >
          <span className="flex items-center gap-1.5">
            <Switch
              id="search-require-resume"
              size="sm"
              checked={options.requireResume}
              disabled={locked}
              onCheckedChange={(requireResume) =>
                onOptionsChange({ ...options, requireResume })
              }
            />
            <Label
              htmlFor="search-require-resume"
              className="text-xs font-normal text-muted-foreground"
            >
              Only with resume
            </Label>
          </span>
        </Hint>
        {locked && (
          <span className="flex items-center gap-1">
            <Lock className="size-3" aria-hidden />
            Fixed for this chat ·
            <Button
              type="button"
              variant="link"
              size="xs"
              className="h-auto px-0"
              onClick={onNewSearch}
            >
              New search
            </Button>
          </span>
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
  format,
  disabled,
  onChange,
}: {
  id: string
  label: string
  value: number
  choices: number[]
  format: (n: number) => string
  disabled: boolean
  onChange: (value: number) => void
}) {
  return (
    // Disabled controls swallow pointer events, so the hint sits on a wrapper.
    <Hint label={disabled ? LOCKED_HINT : undefined}>
      <span className="flex items-center gap-1.5">
        <Label
          htmlFor={id}
          className="text-xs font-normal text-muted-foreground"
        >
          {label}
        </Label>
        <Select
          value={value}
          disabled={disabled}
          items={choices.map((n) => ({ value: n, label: format(n) }))}
          onValueChange={(next) => {
            if (next !== null) onChange(next)
          }}
        >
          <SelectTrigger id={id} size="sm" className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} align="start">
            {choices.map((n) => (
              <SelectItem key={n} value={n} className="text-xs">
                {format(n)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </span>
    </Hint>
  )
}
