"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react"
import type { IntentSignalsResult } from "@scoop/types"
import { Badge } from "@/components/ui/badge"

/**
 * Minimal placeholder renderer for `get_intent_signals`. The full design for
 * this is out of scope for this loop — we show a compact summary (signal
 * count + company name) with an expandable JSON dump for power users.
 * Replace with a richer renderer in a follow-up.
 */
export function IntentSignalsBlock({ result }: { result: IntentSignalsResult }) {
  const [open, setOpen] = useState(false)
  const company = result.company?.name?.trim() ?? "company"
  const count = result.signals?.length ?? 0

  return (
    <div className="rounded-md border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/40"
      >
        {open ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
        <Sparkles className="size-4 text-amber-500" />
        <span className="font-medium text-foreground">
          {count} intent signal{count === 1 ? "" : "s"}
        </span>
        <span className="text-muted-foreground">· {company}</span>
        <Badge variant="outline" className="ml-auto text-[10px]">
          beta
        </Badge>
      </button>
      {open && (
        <pre className="max-h-72 overflow-auto border-t border-border bg-muted/30 p-3 text-[11px] leading-relaxed">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}
