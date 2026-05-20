"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { MessageResponse, ToolCallRecord } from "@scoop/types"
import { apiClient } from "@/lib/api-client"

/**
 * In-memory shape of a chat message. Mirrors MessageResponse but allows
 * temporary IDs (e.g. `temp-…`) while we stream, before the server returns
 * persistent UUIDs. The renderer doesn't care which it is.
 */
export type ChatMessage = {
  id: string
  role: "user" | "assistant" | "tool"
  content: string
  toolCalls?: ToolCallRecord[]
}

interface UseChatStreamParams {
  /**
   * Existing conversation to attach to. Pass `null` for ephemeral mode (the
   * /app dashboard): a new conversation is created server-side on first send
   * but the id is kept in component state rather than written to the URL.
   * Switching this to a real id triggers a history load.
   */
  initialConversationId: string | null
  /**
   * Optional initial messages from a server-loaded conversation history.
   * Used by /app/chat when reopening a saved conversation.
   */
  initialMessages?: MessageResponse[]
  /**
   * Called once after the server creates a new conversation. Lets the
   * surface (e.g. /app/chat) sync the conversationId into the URL.
   */
  onConversationCreated?: (id: string) => void
}

/**
 * Owns chat state + the SSE parsing loop. Splitting this out of
 * chat-interface.tsx makes it reusable by the dashboard's ephemeral chat at
 * /app, which has the same wire protocol but a simpler shell.
 *
 * SSE frames we handle (all `data: <json>\n\n`):
 *   { conversationId }        — server-issued for new conversations
 *   { text }                  — text delta, appended to current assistant msg
 *   { tool: ToolCallRecord }  — tool result, pushed onto current assistant msg
 *   { error }                 — terminal error from the agent
 *   [DONE]                    — sentinel
 */
export function useChatStream({
  initialConversationId,
  initialMessages,
  onConversationCreated,
}: UseChatStreamParams) {
  const queryClient = useQueryClient()

  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId,
  )
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => initialMessages?.map(fromResponse) ?? [],
  )
  const [isStreaming, setIsStreaming] = useState(false)
  // The id of the assistant message currently being filled by the stream.
  // Needed so a typing-dots placeholder only renders for the *in-flight*
  // message, not stale empty ones.
  const [streamingId, setStreamingId] = useState<string | null>(null)

  // Track conversationId in a ref so the long-lived `send` closure can read
  // the latest value without having to be re-created on every change.
  const conversationIdRef = useRef(conversationId)
  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  // When the caller changes initialConversationId (e.g. user picks a
  // different conversation in the history sidebar), reset local state.
  useEffect(() => {
    setConversationId(initialConversationId)
  }, [initialConversationId])

  // Seed messages when initialMessages arrives or changes (history load).
  // Skip during streaming so we don't clobber the in-flight assistant
  // message with a partially-saved server copy.
  useEffect(() => {
    if (isStreaming) return
    if (initialMessages) {
      setMessages(initialMessages.map(fromResponse))
    }
  }, [initialMessages, isStreaming])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isStreaming) return

      const userMessage: ChatMessage = {
        id: `temp-user-${Date.now()}`,
        role: "user",
        content: trimmed,
      }
      const assistantId = `temp-assistant-${Date.now()}`
      setMessages((prev) => [
        ...prev,
        userMessage,
        { id: assistantId, role: "assistant", content: "" },
      ])
      setStreamingId(assistantId)
      setIsStreaming(true)

      let currentConvId = conversationIdRef.current

      try {
        const response = await apiClient.stream("/api/v1/chat/stream", {
          conversationId: currentConvId || null,
          message: trimmed,
        })
        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}))
          throw new Error(errBody.error ?? "Failed to send message")
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error("No response body")
        const decoder = new TextDecoder()

        // SSE frames can split across chunks. Buffer until we see a blank
        // line terminator and flush complete events.
        let buffer = ""
        let assistantText = ""

        outer: while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split("\n")
          buffer = lines.pop() ?? "" // last partial line stays in buffer

          for (const rawLine of lines) {
            const line = rawLine.trimEnd()
            if (!line.startsWith("data: ")) continue
            const data = line.slice(6)
            if (data === "[DONE]") break outer

            let parsed: {
              text?: string
              tool?: ToolCallRecord
              conversationId?: string
              error?: string
            }
            try {
              parsed = JSON.parse(data)
            } catch {
              continue
            }

            if (parsed.error) {
              throw new Error(parsed.error)
            }

            if (parsed.conversationId && !currentConvId) {
              currentConvId = parsed.conversationId
              setConversationId(currentConvId)
              if (onConversationCreated) onConversationCreated(currentConvId)
            }

            if (parsed.text) {
              assistantText += parsed.text
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: assistantText } : m,
                ),
              )
            }

            if (parsed.tool) {
              const toolRecord = parsed.tool
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        toolCalls: [...(m.toolCalls ?? []), toolRecord],
                      }
                    : m,
                ),
              )
            }
          }
        }

        // Refresh conversation lists / detail so the next history load picks
        // up the real message ids (server already persisted them).
        if (currentConvId) {
          queryClient.invalidateQueries({
            queryKey: ["conversations", currentConvId],
          })
        }
        queryClient.invalidateQueries({ queryKey: ["conversations"] })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to send message"
        toast.error(msg)
        // Strip the optimistic user msg + placeholder assistant on hard fail
        // so the user can retry without ghost messages.
        setMessages((prev) =>
          prev.filter((m) => m.id !== userMessage.id && m.id !== assistantId),
        )
      } finally {
        setIsStreaming(false)
        setStreamingId(null)
      }
    },
    [isStreaming, onConversationCreated, queryClient],
  )

  return {
    conversationId,
    messages,
    isStreaming,
    streamingId,
    send,
    /** Imperative reset — used when the user picks "New conversation" in the sidebar. */
    reset: useCallback(() => {
      setMessages([])
      setConversationId(null)
    }, []),
  }
}

function fromResponse(m: MessageResponse): ChatMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    toolCalls: m.toolCalls,
  }
}
