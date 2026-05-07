import { Suspense } from "react"
import { ChatInterface } from "@/components/chat-interface"

function ChatPageContent() {
  return (
    <div className="flex h-full flex-col">
      <ChatInterface />
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center">Loading...</div>}>
      <ChatPageContent />
    </Suspense>
  )
}
