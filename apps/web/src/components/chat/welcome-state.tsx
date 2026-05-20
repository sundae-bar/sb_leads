"use client"

import {
  Building2,
  ChevronRight,
  Mail,
  Search,
  Users,
} from "lucide-react"
import { Wordmark } from "@/components/marketing/wordmark"

/**
 * Empty-state shown when the dashboard chat has no messages yet. Four
 * preset suggestion cards. Presets are classified by `autoSend`:
 *   - autoSend: false → fills the composer with a template, focuses it,
 *     waits for the user to complete it (URL / email / list).
 *   - autoSend: true  → fires the prompt straight away (only used for
 *     prompts that need no user completion, e.g. "Show my saved contacts").
 *
 * Without this split, "Find email" was sending `https://www.linkedin.com/in/`
 * (no handle) to the agent — which then politely asked for the handle.
 * Friction; preset should set up the input, not waste a round-trip.
 *
 * Suggestions map roughly to the agent's MCP tools:
 *   Find email      → find_email (single)
 *   Bulk lookup     → find_email (batch — model parses the list)
 *   Saved contacts  → list_contacts (free, no credit)
 *   Verify email    → verify_email
 */
type Preset = {
  icon: typeof Mail
  label: string
  description: string
  prompt: string
  autoSend: boolean
}

const PRESETS: readonly Preset[] = [
  {
    icon: Mail,
    label: "Find email",
    description: "From a LinkedIn profile",
    prompt: "Find the email for https://www.linkedin.com/in/",
    autoSend: false,
  },
  {
    icon: Users,
    label: "Bulk lookup",
    description: "Multiple profiles at once",
    prompt:
      "I have a list of LinkedIn profiles, find emails for each:\n- \n- \n- ",
    autoSend: false,
  },
  {
    icon: Building2,
    label: "Saved contacts",
    description: "Browse what you've already found",
    prompt: "Show me my saved contacts.",
    autoSend: true,
  },
  {
    icon: Search,
    label: "Verify email",
    description: "Check if an email is deliverable",
    prompt: "Verify this email address: ",
    autoSend: false,
  },
]

export function WelcomeState({
  onPick,
}: {
  /**
   * Called with `(prompt, autoSend)`. The parent decides what to do:
   * autoSend=true → send straight away; autoSend=false → prefill composer
   * so the user can complete the prompt.
   */
  onPick: (prompt: string, autoSend: boolean) => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-foreground text-background">
          <span className="font-wordmark text-xl font-bold leading-none">
            s<sup className="ml-[0.05em] text-[0.55em] align-super">_</sup>
          </span>
        </div>
      </div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
        Welcome to <Wordmark className="inline text-2xl" />
      </h1>
      <p className="mb-8 max-w-md text-center text-sm text-muted-foreground">
        Find verified emails from LinkedIn profiles. Paste a URL, or pick a
        starting point below.
      </p>

      <div className="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onPick(p.prompt, p.autoSend)}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <p.icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">{p.label}</div>
              <div className="truncate text-xs text-muted-foreground">
                {p.description}
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  )
}
