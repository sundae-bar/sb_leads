"use client"

import { useRouter } from "next/navigation"
import { Building2, Check, ChevronDown, Plus } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUser } from "@/hooks/useUser"
import { useTenants, useSwitchTenant } from "@/hooks/useTenant"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

/**
 * Workspace dropdown shown in the sidebar header — Crumble-style.
 *
 * - For everyone: shows the current workspace name + chevron in a pill trigger.
 * - For super admins: lists all tenants in the menu so they can switch.
 * - "New workspace" is a placeholder (disabled). Multi-workspace creation
 *   isn't built yet — when it is, swap the disabled item for a real link.
 */
export function WorkspaceSwitcher() {
  const router = useRouter()
  const { data: user } = useUser()
  const isSuperAdmin = user?.isSuperAdmin ?? false
  const { data: tenants } = useTenants(isSuperAdmin)
  const switchTenant = useSwitchTenant()

  async function handleSwitch(tenantId: string) {
    if (tenantId === user?.tenantId) return
    try {
      await switchTenant.mutateAsync(tenantId)
      // Pull a fresh JWT so RLS sees the new active_tenant_id claim.
      const supabase = createClient()
      await supabase.auth.refreshSession()
      router.refresh()
    } catch {
      toast.error("Failed to switch workspace")
    }
  }

  const name = user?.tenantName ?? "Workspace"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group flex w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2.5 py-2 text-sm font-medium text-sidebar-foreground transition hover:bg-sidebar-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Building2 className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-left">{name}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Workspaces
        </DropdownMenuLabel>
        {isSuperAdmin && tenants && tenants.length > 0 ? (
          tenants.map((t) => {
            const isActive = t.id === user?.tenantId
            return (
              <DropdownMenuItem
                key={t.id}
                onClick={() => handleSwitch(t.id)}
                disabled={switchTenant.isPending}
                className="gap-2"
              >
                <Building2 className="size-4 text-muted-foreground" />
                <span className="flex-1 truncate">{t.name}</span>
                {isActive && <Check className="size-4 text-primary" />}
              </DropdownMenuItem>
            )
          })
        ) : (
          <DropdownMenuItem disabled className="gap-2 opacity-100">
            <Building2 className="size-4 text-muted-foreground" />
            <span className="flex-1 truncate">{name}</span>
            <Check className="size-4 text-primary" />
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="gap-2">
          <Plus className="size-4" />
          <span className="flex-1">New workspace</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Soon
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
