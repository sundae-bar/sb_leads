"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"
import type {
  ListContactsResult,
  ListContactsRow,
  NormalizedEmail,
  ProviderAttempt,
} from "@scoop/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const MAX_ROWS = 10

/**
 * Compact contacts table for when the chat agent runs `list_contacts`.
 * Pure HTML markup (not TanStack) so it stays light in the chat thread.
 * Columns: Name · Company · Best email · Providers (badges).
 *
 * The provider badges are coloured based on whether that provider actually
 * returned an email for this lead — green = found, muted = attempted but
 * empty. That lets the user see at a glance how saturated each lead is
 * without opening the full leads view.
 */
export function InlineContactsTable({ result }: { result: ListContactsResult }) {
  const rows = (result.contacts ?? []).slice(0, MAX_ROWS)
  const hiddenCount = Math.max(0, result.total - rows.length)

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
        No saved contacts match that query yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Company</th>
              <th className="px-3 py-2 font-medium">Best email</th>
              <th className="px-3 py-2 font-medium">Providers</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <ContactRow key={row.linkedin_url} row={row} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span>
          Showing {rows.length} of {result.total}
          {hiddenCount > 0 && ` (${hiddenCount} more not shown)`}
        </span>
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
          <Link href="/app/leads">
            <ExternalLink className="mr-1.5 size-3" />
            View all in Leads
          </Link>
        </Button>
      </div>
    </div>
  )
}

function ContactRow({ row }: { row: ListContactsRow }) {
  const name = row.person?.full_name?.trim() || "—"
  const company = row.company?.name?.trim() || "—"
  const best = pickBestEmail(row.emails)

  return (
    <tr className="bg-card hover:bg-muted/30 transition-colors">
      <td className="px-3 py-2">
        <a
          href={row.linkedin_url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground hover:underline"
        >
          {name}
        </a>
      </td>
      <td className="px-3 py-2 text-muted-foreground">{company}</td>
      <td className="px-3 py-2">
        {best ? (
          <span className="font-mono text-xs text-foreground">{best.address}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        <ProviderBadges
          attempts={row.providers_attempted}
          emails={row.emails}
        />
      </td>
    </tr>
  )
}

function pickBestEmail(emails: NormalizedEmail[]): NormalizedEmail | null {
  if (!emails || emails.length === 0) return null
  // Verified first, then work over personal, then highest confidence.
  const ranked = [...emails].sort((a, b) => {
    if (a.verified !== b.verified) return a.verified ? -1 : 1
    if ((a.type === "work") !== (b.type === "work")) {
      return a.type === "work" ? -1 : 1
    }
    return (b.confidence ?? 0) - (a.confidence ?? 0)
  })
  return ranked[0] ?? null
}

function ProviderBadges({
  attempts,
  emails,
}: {
  attempts: ProviderAttempt[]
  emails: NormalizedEmail[]
}) {
  if (!attempts || attempts.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  const foundSet = new Set(emails.map((e) => e.source_provider))

  return (
    <div className="flex flex-wrap gap-1">
      {attempts.map((a) => {
        const found = foundSet.has(a.provider) || a.found
        return (
          <Badge
            key={a.provider}
            variant={found ? "default" : "outline"}
            className={
              found
                ? "h-5 bg-emerald-500/15 px-1.5 text-[10px] text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400"
                : "h-5 px-1.5 text-[10px] text-muted-foreground"
            }
          >
            {a.provider}
          </Badge>
        )
      })}
    </div>
  )
}
