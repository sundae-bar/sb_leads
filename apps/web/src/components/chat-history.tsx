"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  MessageSquare,
  Plus,
  MoreHorizontal,
  Trash2,
  Search,
  Loader2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { useConversations, useDeleteConversation } from "@/hooks/useConversations"
import { toast } from "sonner"
import { useModal } from "@/contexts/modal-context"

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  
  // Reset time to midnight for accurate day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  const diffTime = today.getTime() - dateOnly.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 14) return "Last week"
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

export function ChatHistory({
  isOpen,
  activeId,
  onSelect,
}: {
  isOpen: boolean
  onToggle: () => void
  activeId?: string | null
  onSelect: (id: string | null) => void
}) {
  const router = useRouter()
  const modal = useModal()
  const [searchQuery, setSearchQuery] = useState("")
  const { data: conversations, isLoading } = useConversations()
  const deleteConversation = useDeleteConversation()

  async function handleCreate() {
    // Don't create a conversation - just navigate to /chat
    // Conversation will be created when first message is sent
    onSelect(null)
  }

  function handleDelete(id: string, title: string, e: React.MouseEvent) {
    e.stopPropagation()
    
    modal.confirm({
      title: "Delete conversation",
      description: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await deleteConversation.mutateAsync(id)
          if (activeId === id) {
            // Redirect to /chat when deleting the active conversation
            router.push("/chat")
            router.refresh()
          }
          toast.success("Conversation deleted")
        } catch (error: any) {
          toast.error(error.message || "Failed to delete conversation")
          throw error // Re-throw so the modal stays open if there's an error
        }
      },
    })
  }

  // Sort conversations by updated_at descending (latest first)
  const sortedConversations = [...(conversations ?? [])].sort((a, b) => {
    const aTime = new Date((a as any).updated_at || (a as any).created_at).getTime()
    const bTime = new Date((b as any).updated_at || (b as any).created_at).getTime()
    return bTime - aTime
  })

  const filteredConversations = sortedConversations.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group conversations by date
  const grouped = filteredConversations.reduce(
    (acc, conv) => {
      const dateLabel = formatDate((conv as any).updated_at || (conv as any).created_at)
      if (!acc[dateLabel]) acc[dateLabel] = []
      acc[dateLabel].push(conv)
      return acc
    },
    {} as Record<string, typeof conversations>
  )

  return (
    <div
      className={cn(
        "flex h-full shrink-0 flex-col border-r bg-sidebar transition-all duration-300 overflow-hidden",
        isOpen ? "w-80" : "w-0 border-r-0"
      )}
    >
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-3">
        <h2 className="truncate text-sm font-semibold text-sidebar-foreground">
          Conversations
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label="New conversation"
          onClick={handleCreate}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="shrink-0 px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="h-8 bg-sidebar-accent pl-8 text-xs"
          />
        </div>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 px-2 py-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {Object.entries(grouped).map(([date, convs]) => (
                <div key={date} className="flex flex-col gap-0.5">
                  <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {date}
                  </p>
                  {(convs ?? []).map((conversation) => {
                    const isActive = conversation.id === activeId
                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => onSelect(conversation.id)}
                        className={cn(
                          "group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="truncate text-sm font-medium max-w-[200px]">
                            {conversation.title}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div
                              role="button"
                              tabIndex={0}
                              className="shrink-0 rounded p-0.5 opacity-0 hover:bg-sidebar-accent group-hover:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.stopPropagation()
                                }
                              }}
                              aria-label="Conversation options"
                            >
                              <MoreHorizontal className="size-3.5" />
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start">
                            <DropdownMenuItem
                              onClick={(e) => handleDelete(conversation.id, conversation.title, e)}
                              className="text-destructive cursor-pointer"
                            >
                              <Trash2 className="mr-2 size-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </button>
                    )
                  })}
                </div>
              ))}
              {filteredConversations.length === 0 && !isLoading && (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  {searchQuery ? "No conversations found" : "No conversations yet"}
                </p>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
