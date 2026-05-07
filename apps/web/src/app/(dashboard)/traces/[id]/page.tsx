"use client"

import { useState } from "react"
import Link from "next/link"
import { notFound, useParams } from "next/navigation"
import {
  ArrowLeft,
  Bot,
  Clock,
  Cpu,
  Wrench,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  MessageSquare,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useTrace } from "@/hooks/useTraces"
import type { TraceStep } from "@/lib/traces-data"

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date)
}

function StatusBadge({ status }: { status: "success" | "error" | "running" }) {
  const variants = {
    success: { label: "Success", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    error: { label: "Error", icon: AlertCircle, className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    running: { label: "Running", icon: Loader2, className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  }
  const v = variants[status]
  const Icon = v.icon
  return (
    <Badge variant="outline" className={cn("gap-1", v.className)}>
      <Icon className={cn("h-3 w-3", status === "running" && "animate-spin")} />
      {v.label}
    </Badge>
  )
}

function StepIcon({ type }: { type: TraceStep["type"] }) {
  const config: Record<TraceStep["type"], { icon: typeof Bot; className: string }> = {
    "llm-call": { icon: Bot, className: "bg-primary/10 text-primary" },
    "tool-call": { icon: Wrench, className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    "tool-result": { icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    "text-output": { icon: MessageSquare, className: "bg-muted text-muted-foreground" },
    error: { icon: AlertCircle, className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  }
  const c = config[type]
  const Icon = c.icon
  return (
    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", c.className)}>
      <Icon className="h-4 w-4" />
    </div>
  )
}

function CodeBlock({ content, language = "json" }: { content: string; language?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group relative w-full min-w-0 max-w-full overflow-hidden">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 z-10 shrink-0"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </Button>
      <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 text-xs w-full min-w-0 max-w-full" style={{ display: 'block' }}>
        <code className={`language-${language} whitespace-pre`} style={{ display: 'block', width: '100%' }}>{content}</code>
      </pre>
    </div>
  )
}

function TimelineStep({ step, isLast }: { step: TraceStep; isLast: boolean }) {
  const [expanded, setExpanded] = useState(step.type === "error")

  const typeLabels: Record<TraceStep["type"], string> = {
    "llm-call": "LLM Call",
    "tool-call": "Tool Call",
    "tool-result": "Tool Result",
    "text-output": "Text Output",
    error: "Error",
  }

  return (
    <div className="relative flex gap-4 min-w-0 w-full">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-4 top-10 h-[calc(100%-2.5rem)] w-px bg-border" />
      )}

      {/* Step icon */}
      <div className="shrink-0">
        <StepIcon type={step.type} />
      </div>

      {/* Step content */}
      <div className="flex-1 min-w-0 pb-6 overflow-hidden w-full">
        <div
          className="flex cursor-pointer items-start justify-between gap-2"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{step.name}</span>
              <Badge variant="secondary" className="text-xs">
                {typeLabels[step.type]}
              </Badge>
              {step.model && (
                <Badge variant="outline" className="font-mono text-xs">
                  {step.model}
                </Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(step.duration)}
              </span>
              {(step.promptTokens || step.completionTokens) && (
                <span className="flex items-center gap-1">
                  <Cpu className="h-3 w-3" />
                  {((step.promptTokens || 0) + (step.completionTokens || 0)).toLocaleString()} tokens
                </span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-3 space-y-3 min-w-0">
            {step.input && (
              <div className="min-w-0">
                <div className="mb-1 text-xs font-medium text-muted-foreground">Input</div>
                <CodeBlock
                  content={typeof step.input === "string" ? step.input : JSON.stringify(step.input, null, 2)}
                />
              </div>
            )}
            {step.output && (
              <div className="min-w-0">
                <div className="mb-1 text-xs font-medium text-muted-foreground">Output</div>
                <CodeBlock
                  content={typeof step.output === "string" ? step.output : JSON.stringify(step.output, null, 2)}
                />
              </div>
            )}
            {(step as any).error && (
              <div className="min-w-0">
                <div className="mb-1 text-xs font-medium text-red-600 dark:text-red-400">Error</div>
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400 break-words overflow-wrap-anywhere">
                  {(step as any).error}
                </div>
              </div>
            )}
            {(step.promptTokens || step.completionTokens) && (
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Input: {(step.promptTokens || 0).toLocaleString()}</span>
                <span>Output: {(step.completionTokens || 0).toLocaleString()}</span>
                <span>Total: {((step.promptTokens || 0) + (step.completionTokens || 0)).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TraceDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { data: trace, isLoading, error } = useTrace(id)

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading trace...</p>
        </div>
      </div>
    )
  }

  if (error) {
    console.error('[trace-detail] error:', error)
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-destructive">Failed to load trace: {error.message}</p>
          <Link href="/traces" className="text-sm text-muted-foreground hover:text-foreground">
            Back to traces
          </Link>
        </div>
      </div>
    )
  }

  if (!trace) {
    notFound()
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-6 p-6 min-w-0 max-w-full">
          {/* Back link */}
          <Link
            href="/traces"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to traces
          </Link>

          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">{(trace as any).name || (trace as any).agentName || 'Trace'}</h1>
              <p className="mt-1 font-mono text-sm text-muted-foreground">{trace.id}</p>
            </div>
            <StatusBadge status={trace.status as "success" | "error" | "running"} />
          </div>

          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Model</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary" className="font-mono">
                  {trace.model || 'N/A'}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Duration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold">{formatDuration((trace as any).duration || (trace as any).durationMs || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Tokens</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold">{(trace.totalTokens || 0).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">
                  {((trace as any).promptTokens || 0).toLocaleString()} in / {((trace as any).completionTokens || 0).toLocaleString()} out
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Timestamp</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm">{formatFullDate(new Date(trace.startedAt || Date.now()))}</div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Execution Timeline</CardTitle>
              <CardDescription>
                Step-by-step breakdown of the agent execution ({((trace as any).steps || []).length} steps)
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <Separator className="mb-6" />
              <div className="relative min-w-0">
                {((trace as any).steps || []).map((step: TraceStep, i: number) => (
                  <TimelineStep
                    key={step.id}
                    step={step}
                    isLast={i === ((trace as any).steps || []).length - 1}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
