"use client"

import { AlertCircle, CheckCircle2, XCircle } from "lucide-react"
import type { VerifyEmailResult } from "@scoop/types"
import { Badge } from "@/components/ui/badge"

/**
 * Minimal inline status for `verify_email` tool results. Designed to sit
 * under an assistant message without taking much vertical space — the model
 * already explains the result in prose; this is the at-a-glance signal.
 */
export function VerifyEmailPill({ result }: { result: VerifyEmailResult }) {
  const tone = toneFor(result)
  const Icon = tone.icon

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
      <Icon className={`size-4 ${tone.iconClass}`} />
      <span className="font-mono text-xs text-foreground">{result.email}</span>
      <Badge variant={tone.badgeVariant} className="text-[10px] uppercase">
        {result.status}
      </Badge>
      {typeof result.score === "number" && (
        <span className="text-xs text-muted-foreground">
          score {Math.round(result.score)}
        </span>
      )}
      <span className="ml-auto text-[10px] text-muted-foreground">
        via {result.source_provider}
      </span>
    </div>
  )
}

function toneFor(result: VerifyEmailResult) {
  if (result.valid) {
    return {
      icon: CheckCircle2,
      iconClass: "text-emerald-500",
      badgeVariant: "secondary" as const,
    }
  }
  if (result.status === "risky" || result.status === "unknown") {
    return {
      icon: AlertCircle,
      iconClass: "text-amber-500",
      badgeVariant: "outline" as const,
    }
  }
  return {
    icon: XCircle,
    iconClass: "text-destructive",
    badgeVariant: "destructive" as const,
  }
}
