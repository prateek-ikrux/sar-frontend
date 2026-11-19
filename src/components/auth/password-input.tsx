import { useState, type ComponentProps } from "react"
import { Eye, EyeOff } from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

type PasswordInputProps = Omit<ComponentProps<"input">, "type">

/**
 * A password field with a show/hide button, so people can check what they
 * typed. Each field toggles on its own: revealing the new password doesn't
 * reveal the current one beside it.
 */
export function PasswordInput({ disabled, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <InputGroup data-disabled={disabled || undefined}>
      <InputGroupInput {...props} type={visible ? "text" : "password"} disabled={disabled} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          aria-controls={props.id}
          disabled={disabled}
          // Keeps focus (and the caret) in the field while toggling.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
