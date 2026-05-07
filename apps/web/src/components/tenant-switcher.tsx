"use client"

import { useRouter } from "next/navigation"
import { Building2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTenants, useSwitchTenant } from "@/hooks/useTenant"
import { useUser } from "@/hooks/useUser"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export function TenantSwitcher() {
  const router = useRouter()
  const { data: user } = useUser()
  const { data: tenants, isLoading } = useTenants(user?.isSuperAdmin ?? false)
  const switchTenant = useSwitchTenant()

  if (!user?.isSuperAdmin) return null

  async function handleSwitch(tenantId: string) {
    if (tenantId === user?.tenantId) return
    try {
      await switchTenant.mutateAsync(tenantId)
      // Pull a fresh JWT so RLS sees the new active_tenant_id claim.
      const supabase = createClient()
      await supabase.auth.refreshSession()
      router.refresh()
    } catch {
      toast.error("Failed to switch tenant")
    }
  }

  return (
    <div className="flex flex-col gap-1.5 px-2 py-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
        <Building2 className="size-3" />
        <span>Super Admin — Tenant</span>
      </div>
      <Select
        value={user?.tenantId}
        onValueChange={handleSwitch}
        disabled={isLoading || switchTenant.isPending}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Select tenant…" />
        </SelectTrigger>
        <SelectContent>
          {tenants?.map((t) => (
            <SelectItem key={t.id} value={t.id} className="text-xs">
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
