"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowUp, Sparkles, Copy, Check, PanelLeftClose, PanelLeft, Loader2 } from "lucide-react"
import { ChatHistory } from "@/components/chat-history"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useConversation } from "@/hooks/useConversations"
import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

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
        <code
          key={i}
          className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 opacity-0 transition-opacity group-hover:opacity-100"
      onClick={handleCopy}
      aria-label="Copy message"
    >
      {copied ? (
        <Check className="size-3.5 text-primary" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </Button>
  )
}

export function ChatInterface() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [input, setInput] = useState("")
  const conversationIdFromUrl = searchParams.get("conversation")
  const [conversationId, setConversationId] = useState<string | null>(conversationIdFromUrl)
  const [messages, setMessages] = useState<Message[]>([])
  const [historyOpen, setHistoryOpen] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)
  const [assistantMessageId, setAssistantMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const { data: conversationData, isLoading: isLoadingConversation } = useConversation(conversationId || undefined)

  // Sync conversationId with URL
  useEffect(() => {
    if (conversationIdFromUrl !== conversationId) {
      setConversationId(conversationIdFromUrl)
    }
  }, [conversationIdFromUrl, conversationId])

  // Load messages when conversation changes (but not while streaming)
  useEffect(() => {
    // Don't overwrite messages while streaming - we're managing them manually
    if (isStreaming) return
    
    if (conversationData && (conversationData as any).messages) {
      const msgs = ((conversationData as any).messages || []).map((m: any) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
      }))
      setMessages(msgs)
    } else if (!conversationId) {
      setMessages([])
    }
  }, [conversationData, conversationId, isStreaming])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || isStreaming) return

    const messageText = input.trim()
    setInput("")

    // Add user message to UI immediately
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: messageText,
    }
    setMessages((prev) => [...prev, userMessage])

    // Start streaming response
    setIsStreaming(true)
    const tempAssistantMessageId = `temp-assistant-${Date.now()}`
    setAssistantMessageId(tempAssistantMessageId)
    let assistantContent = ""
    let currentConvId = conversationId

    try {
      // If no conversation, pass null and let the API create one
      const response = await apiClient.stream("/api/v1/chat/stream", {
        conversationId: currentConvId || null,
        message: messageText,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to send message")
      }

      // Check if we got a conversation ID from the response (for new conversations)
      // The API might return it in headers or we'll get it after the first message
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No response body")
      }

      // Add assistant message placeholder (will show loading dots)
      setMessages((prev) => [
        ...prev,
        { id: tempAssistantMessageId, role: "assistant", content: "" },
      ])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") {
              break
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                assistantContent += parsed.text
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === tempAssistantMessageId
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                )
              }
              // Check if we got a conversationId back (for new conversations)
              if (parsed.conversationId && !currentConvId) {
                currentConvId = parsed.conversationId
                setConversationId(currentConvId)
                // Update URL without triggering navigation that might refetch
                router.replace(`/chat?conversation=${currentConvId}`, { scroll: false })
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // Refresh conversation to get real message IDs
      if (currentConvId) {
        queryClient.invalidateQueries({ queryKey: ['conversations', currentConvId] })
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    } catch (error: any) {
      toast.error(error.message || "Failed to send message")
      // Remove the user message and placeholder assistant message on error
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== userMessage.id && msg.id !== tempAssistantMessageId)
      )
    } finally {
      setIsStreaming(false)
      setAssistantMessageId(null)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full">
      {/* Conversation history sidebar */}
      <ChatHistory
        isOpen={historyOpen}
        onToggle={() => setHistoryOpen(!historyOpen)}
        activeId={conversationId || undefined}
        onSelect={(id) => {
          if (id) {
            setConversationId(id)
            router.push(`/chat?conversation=${id}`)
            router.refresh()
          } else {
            setConversationId(null)
            router.push("/chat")
            router.refresh()
          }
        }}
      />

      {/* Main chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Chat toolbar */}
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
            {(conversationData as any)?.title || "New conversation"}
          </h2>
        </div>

        {/* Messages */}
        <ScrollArea className="min-h-0 flex-1 px-4">
          {isLoadingConversation && conversationId ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="flex flex-col items-center justify-center text-center">
                <Sparkles className="mb-4 size-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Start a conversation by sending a message
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl py-6">
              <div className="flex flex-col gap-6">
                {messages.map((message) => (
                <div
                  key={message.id}
                  className={`group flex gap-3 ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="mt-0.5 size-8 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        <Sparkles className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`flex max-w-[85%] flex-col gap-1 ${
                      message.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed min-h-[2.5rem] flex items-center ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {message.role === "assistant" && (!message.content || message.content === "") && (message.id === assistantMessageId || isStreaming) ? (
                        <div className="flex items-center gap-1.5 py-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-foreground/70 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="inline-block w-2 h-2 rounded-full bg-foreground/70 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="inline-block w-2 h-2 rounded-full bg-foreground/70 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : message.content ? (
                        formatMessage(message.content)
                      ) : null}
                    </div>
                    {message.role === "assistant" && message.content && (
                      <CopyButton text={message.content} />
                    )}
                  </div>
                </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Input area */}
        <div className="shrink-0 border-t bg-background p-4">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Send a message..."
                rows={1}
                className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none"
                disabled={isStreaming}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = "auto"
                  target.style.height =
                    Math.min(target.scrollHeight, 120) + "px"
                }}
              />
              <Button
                size="icon"
                className="size-8 shrink-0 rounded-xl"
                disabled={!input.trim() || isStreaming}
                onClick={handleSend}
                aria-label="Send message"
              >
                {isStreaming ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowUp className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
