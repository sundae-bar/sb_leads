"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Activity, Clock, Cpu, Zap, Search, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from "lucide-react"
import { useTraces } from "@/hooks/useTraces"
import type { Trace } from "@/lib/traces-data"

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function StatusBadge({ status }: { status: Trace["status"] }) {
  const variants: Record<Trace["status"], { label: string; className: string }> = {
    success: { label: "Success", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    error: { label: "Error", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    running: { label: "Running", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  }
  const v = variants[status]
  return <Badge variant="outline" className={v.className}>{v.label}</Badge>
}

export default function TracesPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<"timestamp" | "duration" | "totalTokens">("timestamp")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  // Fetch traces with status filter
  const { data: traces = [], isLoading, error } = useTraces({
    status: statusFilter !== "all" ? statusFilter : undefined,
  })

  const filteredTraces = useMemo(() => {
    let result = [...traces]

    // Filter by search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.model.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q)
      )
    }

    // Sort
    result.sort((a, b) => {
      let aVal: number
      let bVal: number

      if (sortField === "timestamp") {
        // Use startedAt (which is a string) - always convert to Date
        aVal = new Date(a.startedAt).getTime()
        bVal = new Date(b.startedAt).getTime()
      } else {
        aVal = a[sortField] as number
        bVal = b[sortField] as number
      }

      return sortDir === "asc" ? aVal - bVal : bVal - aVal
    })

    return result
  }, [traces, search, sortField, sortDir])

  const stats = useMemo(() => {
    if (traces.length === 0) {
      return { total: 0, successful: 0, avgDuration: 0, totalTokens: 0, successRate: 0 }
    }
    const total = traces.length
    const successful = traces.filter((t) => t.status === "success").length
    const avgDuration = traces.reduce((sum, t) => sum + t.duration, 0) / total
    const totalTokens = traces.reduce((sum, t) => sum + t.totalTokens, 0)
    return { total, successful, avgDuration, totalTokens, successRate: (successful / total) * 100 }
  }, [traces])

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null
    return sortDir === "asc" ? (
      <ChevronUp className="ml-1 inline h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 inline h-4 w-4" />
    )
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-6 p-6">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Traces</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">{stats.successful} successful</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatDuration(stats.avgDuration)}</div>
                <p className="text-xs text-muted-foreground">Per trace</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTokens.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Input + output</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>AI Traces</CardTitle>
              <CardDescription>
                Monitor and debug your AI agent executions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, model, or ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Name</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 font-medium"
                          onClick={() => toggleSort("duration")}
                        >
                          Duration
                          <SortIcon field="duration" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 font-medium"
                          onClick={() => toggleSort("totalTokens")}
                        >
                          Tokens
                          <SortIcon field="totalTokens" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-mr-3 h-8 font-medium"
                          onClick={() => toggleSort("timestamp")}
                        >
                          Time
                          <SortIcon field="timestamp" />
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <div className="flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">Loading traces...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-destructive">
                          Failed to load traces. Please try again.
                        </TableCell>
                      </TableRow>
                    ) : filteredTraces.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          {search || statusFilter !== "all" ? "No traces found matching your filters." : "No traces found."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTraces.map((trace) => {
                        const timestamp = new Date(trace.startedAt)
                        const inputTokens = trace.inputTokens ?? trace.promptTokens
                        const outputTokens = trace.outputTokens ?? trace.completionTokens

                        return (
                          <TableRow key={trace.id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell>
                              <Link href={`/traces/${trace.id}`} className="block">
                                <div className="font-medium">{trace.name}</div>
                                <div className="text-xs text-muted-foreground font-mono">{trace.id}</div>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Link href={`/traces/${trace.id}`} className="block">
                                <Badge variant="secondary" className="font-mono text-xs">
                                  {trace.model}
                                </Badge>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Link href={`/traces/${trace.id}`} className="block">
                                <StatusBadge status={trace.status} />
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Link href={`/traces/${trace.id}`} className="block font-mono text-sm">
                                {formatDuration(trace.duration)}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Link href={`/traces/${trace.id}`} className="block">
                                <span className="font-mono text-sm">{trace.totalTokens.toLocaleString()}</span>
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({inputTokens}+{outputTokens})
                                </span>
                              </Link>
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={`/traces/${trace.id}`} className="block text-sm text-muted-foreground">
                                {formatDate(timestamp)}
                              </Link>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
