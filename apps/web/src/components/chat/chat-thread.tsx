"use client"

import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ToolResultBlock } from "./tool-result-block"
import type { ChatMessage } from "./use-chat-stream"

/**
 * Scoop assistant avatar — the brand `s_` mark on a dark tile. Mirrors the
 * sidebar logo so the assistant feels like the same entity throughout the
 * app instead of a generic chat bubble.
 */
function ScoopAvatar() {
  return (
    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
      <span className="font-wordmark text-[15px] font-bold leading-none">
        s<sup className="ml-[0.05em] text-[0.55em] align-super">_</sup>
      </span>
    </div>
  )
}

/**
 * Renders the scrolling chat thread: avatar + bubble per message, plus any
 * tool-result blocks that came back on assistant turns. The shell (history
 * sidebar, route header) is the caller's responsibility — this component is
 * intentionally just the column of messages.
 *
 * Auto-scrolls to the latest message on update. We rely on `streamingId` to
 * decide which assistant message gets the typing-dots placeholder (so old
 * empty messages — which shouldn't exist but might if a stream aborted —
 * don't keep bouncing forever).
 */
export function ChatThread({
  messages,
  streamingId,
}: {
  messages: ChatMessage[]
  streamingId: string | null
}) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <ScrollArea className="min-h-0 flex-1 px-4">
      <div className="mx-auto max-w-2xl py-6">
        <div className="flex flex-col gap-6">
          {messages.map((message) => (
            <MessageRow
              key={message.id}
              message={message}
              isStreaming={message.id === streamingId}
            />
          ))}
          <div ref={endRef} />
        </div>
      </div>
    </ScrollArea>
  )
}

function MessageRow({
  message,
  isStreaming,
}: {
  message: ChatMessage
  isStreaming: boolean
}) {
  const isUser = message.role === "user"
  const isEmptyAssistant = !isUser && !message.content && isStreaming

  return (
    <div
      className={`group flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {!isUser && <ScoopAvatar />}

      <div
        className={`flex max-w-[85%] flex-col gap-2 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {/* Text bubble — skip when the message is empty (assistant only renders
            tool results) so we don't show an empty bubble next to cards. */}
        {(message.content || isEmptyAssistant) && (
          <div
            className={`flex min-h-[2.5rem] items-center rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              isUser
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}
          >
            {isEmptyAssistant ? (
              <TypingDots />
            ) : message.content ? (
              formatMessage(message.content)
            ) : null}
          </div>
        )}

        {/* Inline tool result(s). Stack vertically — each renderer decides its
            own internal layout. Width matches the bubble's max so the cards
            don't extend past the column. */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="w-full max-w-[640px] space-y-3">
            {message.toolCalls.map((tc) => (
              <ToolResultBlock key={tc.toolCallId} record={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span
        className="inline-block size-2 animate-bounce rounded-full bg-foreground/70"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="inline-block size-2 animate-bounce rounded-full bg-foreground/70"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="inline-block size-2 animate-bounce rounded-full bg-foreground/70"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  )
}

// Minimal Markdown-ish formatting — code blocks, bold, inline code. Same
// behaviour as the legacy chat-interface.tsx but moved here so both surfaces
// render identically.
function formatMessage(content: string) {
  const parts = content.split(/(```[\s\S]*?```|\*\*.*?\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const code = part.slice(3, -3)
      const firstNewline = code.indexOf("\n")
      const codeContent = firstNewline > -1 ? code.slice(firstNewline + 1) : code
      return (
        <pre
          key={i}
          className="my-3 overflow-x-auto rounded-lg bg-muted/80 p-3 text-xs leading-relaxed"
        >
          <code>{codeContent}</code>
        </pre>
      )
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={i}>{part}</span>
  })
}
