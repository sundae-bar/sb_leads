"use client"

import { useCallback, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, PanelLeft, PanelLeftClose, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ChatHistory } from "@/components/chat-history"
import { ChatComposer } from "@/components/chat/chat-composer"
import { ChatThread } from "@/components/chat/chat-thread"
import { useChatStream } from "@/components/chat/use-chat-stream"
import { useConversation } from "@/hooks/useConversations"

/**
 * Full chat surface at /app/chat. Wraps the shared chat primitives with:
 *   - a history sidebar (ChatHistory) for switching conversations,
 *   - URL-synced conversationId (so refresh restores the active thread),
 *   - a top toolbar with title + history toggle.
 *
 * The dashboard at /app uses the same hook + primitives without these — see
 * apps/web/src/app/(dashboard)/app/page.tsx for the ephemeral variant.
 */
export function ChatInterface() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const conversationIdFromUrl = searchParams.get("conversation")

  const [historyOpen, setHistoryOpen] = useState(true)

  const { data: conversationData, isLoading: isLoadingConversation } =
    useConversation(conversationIdFromUrl || undefined)

  // Sync URL → hook when the user picks a conversation in the sidebar, and
  // hook → URL when the server creates one mid-stream (so a refresh keeps
  // the user on the same thread).
  const onConversationCreated = useCallback(
    (id: string) => {
      router.replace(`/app/chat?conversation=${id}`, { scroll: false })
    },
    [router],
  )

  const { messages, isStreaming, streamingId, send } = useChatStream({
    initialConversationId: conversationIdFromUrl,
    initialMessages: conversationData?.messages,
    onConversationCreated,
  })

  // Composer is controlled — see chat-composer.tsx. /app/chat doesn't have
  // preset prefill, but we still need to manage the value for the
  // controlled-input contract.
  const [input, setInput] = useState("")

  function handleSend(text: string) {
    send(text)
    setInput("")
  }

  return (
    <div className="flex h-full">
      <ChatHistory
        isOpen={historyOpen}
        onToggle={() => setHistoryOpen(!historyOpen)}
        activeId={conversationIdFromUrl || undefined}
        onSelect={(id) => {
          if (id) {
            router.push(`/app/chat?conversation=${id}`)
          } else {
            router.push("/app/chat")
          }
          router.refresh()
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setHistoryOpen(!historyOpen)}
                  aria-label={historyOpen ? "Close history" : "Open history"}
                >
                  {historyOpen ? (
                    <PanelLeftClose className="size-4" />
                  ) : (
                    <PanelLeft className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {historyOpen ? "Close history" : "Open history"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <h2 className="truncate text-sm font-medium text-foreground">
            {conversationData?.title ?? "New conversation"}
          </h2>
        </div>

        {isLoadingConversation && conversationIdFromUrl ? (
          <div className="flex min-h-[400px] flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex min-h-[400px] flex-1 items-center justify-center">
            <div className="flex flex-col items-center justify-center text-center">
              <Sparkles className="mb-4 size-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Start a conversation by sending a message
              </p>
            </div>
          </div>
        ) : (
          <ChatThread messages={messages} streamingId={streamingId} />
        )}

        <ChatComposer
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={isStreaming}
        />
      </div>
    </div>
  )
}
