"use client"

import { useState, useRef, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { useSubscription } from '@/hooks/useBilling'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  ArrowUp, 
  Sparkles, 
  Mail, 
  Users, 
  Building2, 
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  Linkedin
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types for our mock data
type ContactEmail = {
  address: string
  type: 'work' | 'personal'
  verified: boolean
  confidence: number
  source_provider: string
}

type ContactResult = {
  linkedin_url: string
  emails: ContactEmail[]
  person: {
    full_name: string
    title: string
    location: string
  }
  company: {
    name: string
    domain: string
    industry: string
  }
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  contactResults?: ContactResult[]
}

// Preset action suggestions
const PRESET_ACTIONS = [
  { icon: Mail, label: 'Find email for a LinkedIn profile', prompt: 'Find the email for https://linkedin.com/in/' },
  { icon: Users, label: 'Find decision makers at a company', prompt: 'Find decision makers at ' },
  { icon: Building2, label: 'Get company contacts', prompt: 'Get all contacts for ' },
  { icon: Search, label: 'Search by name and company', prompt: 'Find email for ' },
]

// Mock contact results for demo
const MOCK_CONTACT_RESULTS: ContactResult[] = [
  {
    linkedin_url: 'https://linkedin.com/in/johndoe',
    emails: [
      { address: 'john.doe@acme.com', type: 'work', verified: true, confidence: 95, source_provider: 'apollo' },
      { address: 'johnd@gmail.com', type: 'personal', verified: false, confidence: 78, source_provider: 'contactout' },
    ],
    person: { full_name: 'John Doe', title: 'VP of Sales', location: 'San Francisco, CA' },
    company: { name: 'Acme Corp', domain: 'acme.com', industry: 'Technology' },
  },
]

function ContactCard({ contact }: { contact: ContactResult }) {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)

  const handleCopy = (email: string) => {
    navigator.clipboard.writeText(email)
    setCopiedEmail(email)
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  return (
    <div className="my-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Avatar className="size-12 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
            {contact.person.full_name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-foreground">{contact.person.full_name}</h4>
              <p className="text-sm text-muted-foreground">{contact.person.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {contact.company.name} &middot; {contact.person.location}
              </p>
            </div>
            <a 
              href={contact.linkedin_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
            >
              <Linkedin className="size-5" />
            </a>
          </div>

          {/* Emails */}
          <div className="mt-3 space-y-2">
            {contact.emails.map((email, i) => (
              <div 
                key={i} 
                className="flex items-center gap-2 text-sm"
              >
                <div className="flex items-center gap-1.5">
                  {email.verified ? (
                    <CheckCircle2 className="size-4 text-green-600" />
                  ) : (
                    <XCircle className="size-4 text-muted-foreground" />
                  )}
                  <span className="font-medium text-foreground">{email.address}</span>
                </div>
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  email.type === 'work' 
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                )}>
                  {email.type}
                </span>
                <span className="text-xs text-muted-foreground">
                  {email.confidence}% confidence
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 ml-auto"
                  onClick={() => handleCopy(email.address)}
                >
                  {copiedEmail === email.address ? (
                    <Check className="size-3.5 text-green-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn(
      "flex gap-3",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {!isUser && (
        <Avatar className="size-8 shrink-0 mt-0.5">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn(
        "flex flex-col gap-1 max-w-[85%]",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-foreground"
        )}>
          {message.content}
        </div>
        {message.contactResults && message.contactResults.length > 0 && (
          <div className="w-full max-w-md">
            {message.contactResults.map((contact, i) => (
              <ContactCard key={i} contact={contact} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: user } = useUser()
  const { data: sub } = useSubscription()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const hasStartedChat = messages.length > 0
  const firstName = user?.fullName?.split(' ')[0] || 'there'

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Simulate AI response with contact results
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: "I found the following contact information:",
        contactResults: MOCK_CONTACT_RESULTS,
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handlePresetClick = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0">
        {!hasStartedChat ? (
          /* Welcome state - centered content */
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
            <div className="w-full max-w-2xl text-center">
              {/* Greeting */}
              <div className="mb-2">
                <Sparkles className="size-12 text-primary mx-auto mb-4" />
              </div>
              <h1 className="text-3xl font-semibold text-foreground mb-2 tracking-tight">
                Good {getTimeOfDay()}, {firstName}
              </h1>
              <p className="text-muted-foreground text-lg mb-8">
                How can I help you find leads today?
              </p>

              {/* Preset actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {PRESET_ACTIONS.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handlePresetClick(action.prompt)}
                    className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left hover:bg-accent hover:border-primary/20 transition-all group"
                  >
                    <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <action.icon className="size-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{action.label}</span>
                  </button>
                ))}
              </div>

              {/* Credits display */}
              <p className="text-xs text-muted-foreground">
                {sub?.creditsRemaining?.toLocaleString() ?? 0} credits remaining
              </p>
            </div>
          </div>
        ) : (
          /* Chat state - full screen messages */
          <ScrollArea className="flex-1 px-4">
            <div className="mx-auto max-w-2xl py-6">
              <div className="flex flex-col gap-6">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <Avatar className="size-8 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Sparkles className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-2xl bg-muted px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block size-2 rounded-full bg-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="inline-block size-2 rounded-full bg-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="inline-block size-2 rounded-full bg-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Input area - always at bottom */}
      <div className="shrink-0 border-t bg-background p-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/20 focus-within:border-primary/30 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me to find emails, contacts, or company information..."
              rows={1}
              className="flex-1 resize-none bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
              disabled={isLoading}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = Math.min(target.scrollHeight, 120) + 'px'
              }}
            />
            <Button
              size="icon"
              className="size-9 shrink-0 rounded-xl"
              disabled={!input.trim() || isLoading}
              onClick={handleSend}
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUp className="size-4" />
              )}
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}

function getTimeOfDay(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
