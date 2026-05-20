"use client"

import { forwardRef, useEffect, useRef, useState } from "react"
import { ArrowUp, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Bottom-anchored chat input. Auto-grows the textarea up to a max height,
 * Enter sends, Shift+Enter inserts a newline. Optional credits footer mirrors
 * v0's "8 credits remaining · 1 credit per search" affordance.
 *
 * The composer is *controlled* — the parent owns `value`. That's so welcome
 * presets can pre-fill the input ("Find the email for ") for the user to
 * complete, rather than auto-sending an incomplete prompt.
 *
 * When `value` changes from empty to non-empty externally (e.g. preset
 * click), the textarea auto-focuses and the caret jumps to the end. Pure
 * user typing doesn't re-focus (the input is already focused).
 */
export const ChatComposer = forwardRef<HTMLTextAreaElement, ChatComposerProps>(
  function ChatComposer(
    {
      value,
      onChange,
      onSend,
      disabled,
      placeholder = "Paste a LinkedIn URL or ask me anything…",
      creditsRemaining,
    },
    forwardedRef,
  ) {
    const internalRef = useRef<HTMLTextAreaElement | null>(null)
    const prevValueRef = useRef(value)

    // When a prefill arrives (empty → non-empty change driven by the parent),
    // focus the textarea, drop the cursor at the end, and re-run auto-grow.
    useEffect(() => {
      const prev = prevValueRef.current
      prevValueRef.current = value
      if (prev === "" && value !== "" && internalRef.current) {
        const el = internalRef.current
        el.focus()
        el.setSelectionRange(value.length, value.length)
        el.style.height = "auto"
        el.style.height = Math.min(el.scrollHeight, 160) + "px"
      }
    }, [value])

    function handleSubmit() {
      const trimmed = value.trim()
      if (!trimmed || disabled) return
      onSend(trimmed)
      onChange("")
      // Reset auto-grow so the box snaps back to a single line.
      if (internalRef.current) internalRef.current.style.height = "auto"
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    }

    return (
      <div className="shrink-0 border-t bg-background p-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring">
            <textarea
              ref={(node) => {
                internalRef.current = node
                if (typeof forwardedRef === "function") forwardedRef(node)
                else if (forwardedRef) forwardedRef.current = node
              }}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement
                t.style.height = "auto"
                t.style.height = Math.min(t.scrollHeight, 160) + "px"
              }}
              placeholder={placeholder}
              rows={1}
              disabled={disabled}
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
            />
            <Button
              type="button"
              size="icon"
              className="size-8 shrink-0 rounded-xl"
              disabled={!value.trim() || disabled}
              onClick={handleSubmit}
              aria-label="Send message"
            >
              {disabled ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUp className="size-4" />
              )}
            </Button>
          </div>
          {typeof creditsRemaining === "number" && (
            <div className="mt-2 flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <span>{creditsRemaining} credits remaining</span>
              <span>·</span>
              <span>1 credit per find_email</span>
            </div>
          )}
        </div>
      </div>
    )
  },
)

interface ChatComposerProps {
  value: string
  onChange: (v: string) => void
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
  creditsRemaining?: number
}

/**
 * Small convenience hook so callers that don't need to drive the value
 * externally can still use the composer with one line. Returns `{ value,
 * setValue }` to spread onto `<ChatComposer>`.
 */
export function useComposerValue(initial = "") {
  const [value, setValue] = useState(initial)
  return { value, onChange: setValue }
}
