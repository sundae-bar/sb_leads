"use client"

import Link from "next/link"
import { CheckCircle2, ExternalLink } from "lucide-react"
import type { FindEmailResult, FindEmailToolResult } from "@scoop/types"
import { Button } from "@/components/ui/button"
import { EmailResultCard } from "./email-result-card"

/**
 * Wraps one or more `FindEmailResult`s into an inline block beneath an
 * assistant message. Handles both single-lookup and batch results from the
 * `find_email` MCP tool — batch results get flattened into one card group
 * per lead, separated by a thin divider.
 */
export function EmailResultsCard({ result }: { result: FindEmailToolResult }) {
  const items = Array.isArray((result as { results?: FindEmailResult[] }).results)
    ? (result as { results: FindEmailResult[] }).results
    : [result as FindEmailResult]

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <SingleLeadBlock key={`${item.linkedin_url}-${idx}`} result={item} />
      ))}
      <div className="flex items-center gap-2 px-1">
        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
          <Link href="/app/leads">
            <ExternalLink className="mr-1.5 size-3" />
            View in Leads
          </Link>
        </Button>
      </div>
    </div>
  )
}

function SingleLeadBlock({ result }: { result: FindEmailResult }) {
  const name = result.person?.full_name?.trim()
  const company = result.company?.name?.trim()
  const hasEmails = result.emails.length > 0
  // Name-mode results may come back without a LinkedIn URL — in that case
  // the contact isn't persisted to the leads table (contacts is URL-keyed).
  // Surface that to the user so it's not a silent gap.
  const notSaved = hasEmails && !result.linkedin_url?.trim()

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-muted-foreground">
        <CheckCircle2 className="size-3 text-emerald-500" />
        {hasEmails ? (
          <span>
            Found {result.emails.length}{" "}
            {result.emails.length === 1 ? "email" : "emails"}
            {name ? ` for ${name}` : ""}
            {company ? ` · ${company}` : ""}
          </span>
        ) : (
          <span>
            No emails found
            {name ? ` for ${name}` : ""}
            {company ? ` · ${company}` : ""} · credit refunded
          </span>
        )}
      </div>

      {hasEmails ? (
        <div className="space-y-2">
          {result.emails.map((e, i) => (
            <EmailResultCard key={`${e.address}-${e.source_provider}-${i}`} email={e} />
          ))}
        </div>
      ) : (
        <ProvidersAttemptedSummary
          attempts={result.providers_attempted}
        />
      )}

      {notSaved && (
        <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
          Not saved to leads — provider didn't return a LinkedIn URL. The
          email is still available above; just won't appear in your saved
          contacts table.
        </div>
      )}
    </div>
  )
}

function ProvidersAttemptedSummary({
  attempts,
}: {
  attempts: { provider: string; found: boolean; error: string | null }[]
}) {
  if (attempts.length === 0) return null
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      Tried: {attempts.map((a) => a.provider).join(", ")}
    </div>
  )
}
