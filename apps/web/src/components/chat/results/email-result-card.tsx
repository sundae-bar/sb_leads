"use client"

import { useState } from "react"
import { AlertCircle, CheckCircle2, Copy } from "lucide-react"
import type { NormalizedEmail } from "@scoop/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

/**
 * A single email row in the chat thread. Adapted from the v0 design but
 * wired to the real `NormalizedEmail` shape from the find_email tool.
 *
 * Visual layout (left → right):
 *   [address] [verified icon]      [confidence%] [copy]
 *   [type badge] via [provider]
 */
export function EmailResultCard({ email }: { email: NormalizedEmail }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(email.address).catch(() => {
      /* clipboard may be blocked in some sandboxed envs — silent fail */
    })
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Card className="border border-border/60 bg-card">
      <CardContent className="flex items-start justify-between gap-4 p-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {email.address}
            </span>
            {email.verified ? (
              <CheckCircle2
                className="size-4 shrink-0 text-emerald-500"
                aria-label="Verified"
              />
            ) : (
              <AlertCircle
                className="size-4 shrink-0 text-amber-500"
                aria-label="Unverified"
              />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              {email.type}
            </Badge>
            <span>via {email.source_provider}</span>
            {email.verified_by && email.verified_by !== email.source_provider && (
              <span className="text-muted-foreground/70">
                · verified by {email.verified_by}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {typeof email.confidence === "number" && (
            <div className="text-right">
              <div className="text-sm font-medium text-foreground">
                {Math.round(email.confidence)}%
              </div>
              <div className="text-[10px] text-muted-foreground">
                confidence
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={handleCopy}
            aria-label="Copy email"
          >
            {copied ? (
              <CheckCircle2 className="size-4 text-primary" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
