"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Key, Plus, Copy, Check, MoreHorizontal, Trash2, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { useApiKeys, useCreateApiKey, useDeleteApiKey } from "@/hooks/useApiKeys"
import { toast } from "sonner"

type ExpiryOption = "never" | "1" | "7" | "30" | "365"

const expiryOptions: { value: ExpiryOption; label: string }[] = [
  { value: "never", label: "Never" },
  { value: "1", label: "1 day" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "365", label: "365 days" },
]


function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getExpiryStatus(expiresAt: string | null): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (!expiresAt) {
    return { label: "Never expires", variant: "secondary" }
  }
  const now = new Date()
  const expiryDate = new Date(expiresAt)
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysUntilExpiry < 0) {
    return { label: "Expired", variant: "destructive" }
  }
  if (daysUntilExpiry <= 7) {
    return { label: `Expires in ${daysUntilExpiry}d`, variant: "destructive" }
  }
  if (daysUntilExpiry <= 30) {
    return { label: `Expires in ${daysUntilExpiry}d`, variant: "outline" }
  }
  return { label: `Expires ${formatDate(expiresAt)}`, variant: "secondary" }
}

export function SettingsApiKeys() {
  const { data: apiKeys = [], isLoading, error } = useApiKeys()
  const createApiKey = useCreateApiKey()
  const deleteApiKey = useDeleteApiKey()
  
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null)
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeyExpiry, setNewKeyExpiry] = useState<ExpiryOption>("never")
  const [generatedKey, setGeneratedKey] = useState("")
  const [copied, setCopied] = useState(false)
  const [showKey, setShowKey] = useState(false)

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      return
    }

    const expiryDays = newKeyExpiry === "never" ? null : parseInt(newKeyExpiry)
    
    try {
      const result = await createApiKey.mutateAsync({
        name: newKeyName.trim() || "Untitled Key",
        expiryDays,
      })
      
      setGeneratedKey(result.key)
      setIsCreateOpen(false)
      setIsSuccessOpen(true)
      setNewKeyName("")
      setNewKeyExpiry("never")
      toast.success("API key created successfully")
    } catch (err: any) {
      console.error('Failed to create API key:', err)
      toast.error(err.message || "Failed to create API key")
    }
  }

  const handleDeleteClick = (id: string) => {
    setKeyToDelete(id)
    setIsDeleteOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!keyToDelete) return
    
    try {
      await deleteApiKey.mutateAsync(keyToDelete)
      setIsDeleteOpen(false)
      setKeyToDelete(null)
      toast.success("API key deleted")
    } catch (err: any) {
      console.error('Failed to delete API key:', err)
      toast.error(err.message || "Failed to delete API key")
    }
  }

  const handleCopyKey = async () => {
    await navigator.clipboard.writeText(generatedKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCloseSuccess = () => {
    setIsSuccessOpen(false)
    setGeneratedKey("")
    setShowKey(false)
    setCopied(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">API Keys</h3>
          <p className="text-sm text-muted-foreground">
            Manage API keys for programmatic access to your account
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="shrink-0">
          <Plus className="mr-2 size-4" />
          Create Key
        </Button>
      </div>

      <Separator />

      {/* API Keys List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Loading API keys...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12">
          <div className="text-center">
            <p className="text-sm font-medium text-destructive">Failed to load API keys</p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Key className="size-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">No API keys yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first API key to get started
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Active Keys ({apiKeys.length})
          </div>
          {apiKeys.map((apiKey) => {
            const expiryStatus = getExpiryStatus(apiKey.expiresAt)
            return (
              <div
                key={apiKey.id}
                className="flex items-center gap-4 rounded-lg px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Key className="size-4" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {apiKey.name}
                    </span>
                    <Badge variant={expiryStatus.variant} className="shrink-0 text-xs">
                      {expiryStatus.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                      {apiKey.keyPreview}
                    </code>
                    <span>Created {formatDate(apiKey.createdAt)}</span>
                    {apiKey.lastUsedAt && (
                      <span>Last used {formatDate(apiKey.lastUsedAt)}</span>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0">
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDeleteClick(apiKey.id)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Key Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for programmatic access. Store it securely as you
              won{"'"}t be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                placeholder="e.g. Production API"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="key-expiry">Expiration</Label>
              <Select value={newKeyExpiry} onValueChange={(v) => setNewKeyExpiry(v as ExpiryOption)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select expiration" />
                </SelectTrigger>
                <SelectContent>
                  {expiryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateKey} disabled={createApiKey.isPending}>
              {createApiKey.isPending ? 'Creating...' : 'Create Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog with Generated Key */}
      <Dialog open={isSuccessOpen} onOpenChange={handleCloseSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Your new API key has been created. Copy it now as you won{"'"}t be able to
              see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Label>Your API Key</Label>
            <div className="relative">
              <Input
                readOnly
                value={showKey ? generatedKey : generatedKey.replace(/./g, "*")}
                className="pr-20 font-mono text-sm"
              />
              <div className="absolute right-1 top-1/2 flex -translate-y-1/2 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  <span className="sr-only">{showKey ? "Hide" : "Show"} key</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("size-7", copied && "text-emerald-600")}
                  onClick={handleCopyKey}
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  <span className="sr-only">Copy key</span>
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Make sure to copy your API key now. You won{"'"}t be able to see it again!
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleCloseSuccess}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this API key? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDeleteOpen(false)
              setKeyToDelete(null)
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={deleteApiKey.isPending}
            >
              {deleteApiKey.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
