"use client"

import type {
  FindEmailToolResult,
  IntentSignalsResult,
  ListContactsResult,
  ToolCallRecord,
  VerifyEmailResult,
} from "@scoop/types"
import { EmailResultsCard } from "./results/email-results-card"
import { InlineContactsTable } from "./results/inline-contacts-table"
import { VerifyEmailPill } from "./results/verify-email-pill"
import { IntentSignalsBlock } from "./results/intent-signals-block"

/**
 * Switchboard for inline tool results. Lives outside chat-thread.tsx so each
 * renderer can be edited / restyled independently without touching the chat
 * shell. Unknown tool names fall through to a neutral "tool ran" pill — we
 * never throw on a result we don't recognise.
 */
export function ToolResultBlock({ record }: { record: ToolCallRecord }) {
  switch (record.toolName) {
    case "find_email":
      return <EmailResultsCard result={record.result as FindEmailToolResult} />
    case "list_contacts":
      return <InlineContactsTable result={record.result as ListContactsResult} />
    case "verify_email":
      return <VerifyEmailPill result={record.result as VerifyEmailResult} />
    case "get_intent_signals":
      return <IntentSignalsBlock result={record.result as IntentSignalsResult} />
    default:
      return (
        <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
          {record.toolName} ran
        </div>
      )
  }
}
