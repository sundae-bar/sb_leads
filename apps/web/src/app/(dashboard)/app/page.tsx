"use client"

import { useState } from "react"
import { ChatComposer } from "@/components/chat/chat-composer"
import { ChatThread } from "@/components/chat/chat-thread"
import { useChatStream } from "@/components/chat/use-chat-stream"
import { WelcomeState } from "@/components/chat/welcome-state"
import { useSubscription } from "@/hooks/useBilling"

/**
 * Dashboard landing — a chat-driven surface. Empty state shows four preset
 * suggestion cards; once the user sends, the welcome state is replaced
 * in-place by the chat thread.
 *
 * Intentionally *ephemeral*: every visit to /app starts a fresh
 * conversation in component state (no `?conversation=` URL, no history
 * sidebar). If the user wants to revisit a previous chat, they go to
 * /app/chat which has the full history surface. The conversation IS still
 * persisted server-side — it's just not surfaced here.
 */
export default function DashboardPage() {
  const { data: sub } = useSubscription()
  const creditsRemaining = sub?.creditsRemaining ?? 0

  const { messages, isStreaming, streamingId, send } = useChatStream({
    initialConversationId: null,
  })

  // Composer value lives here so preset cards can prefill it ("Find email"
  // → composer reads "Find the email for https://www.linkedin.com/in/" with
  // the caret at the end). The composer is controlled; see chat-composer.tsx.
  const [input, setInput] = useState("")

  const hasMessages = messages.length > 0

  function handlePresetPick(prompt: string, autoSend: boolean) {
    if (autoSend) {
      send(prompt)
    } else {
      setInput(prompt)
      // The composer's effect on `value === "" → non-empty` handles focus +
      // caret placement, so we don't need a ref here.
    }
  }

  function handleSend(text: string) {
    send(text)
    setInput("")
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {hasMessages ? (
        <ChatThread messages={messages} streamingId={streamingId} />
      ) : (
        <WelcomeState onPick={handlePresetPick} />
      )}
      <ChatComposer
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={isStreaming}
        creditsRemaining={creditsRemaining}
        placeholder={
          hasMessages
            ? "Ask a follow-up or paste another URL…"
            : "Paste a LinkedIn URL or ask me anything…"
        }
      />
    </div>
  )
}
