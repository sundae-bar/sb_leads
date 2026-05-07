"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { ProfileForm } from "@/components/profile-form"
import { SettingsPassword } from "@/components/settings-password"
import { SettingsTeam } from "@/components/settings-team"
import { SettingsApiKeys } from "@/components/settings-api-keys"
import { SettingsBilling } from "@/components/settings-billing"
import { User, Lock, Users, Key, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

const settingsNav = [
  { label: "Profile", value: "profile", icon: User },
  { label: "Password", value: "password", icon: Lock },
  { label: "Team", value: "team", icon: Users },
  { label: "API Keys", value: "api-keys", icon: Key },
  { label: "Billing", value: "billing", icon: CreditCard },
]

function SettingsContent() {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get("tab") || "profile"

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex flex-1 gap-8 overflow-hidden">
        {/* Vertical sidebar nav */}
        <nav className="flex shrink-0 flex-col gap-1 border-r px-6 py-6 md:w-48 overflow-y-auto" aria-label="Settings navigation">
          {settingsNav.map((item) => {
            const isActive = activeTab === item.value
            return (
              <Link
                key={item.value}
                href={`/settings?tab=${item.value}`}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Content area */}
        <div className="min-w-0 flex-1 overflow-y-auto px-6 py-6">
          {activeTab === "profile" && (
            <div className="max-w-md">
              <ProfileForm />
            </div>
          )}
          {activeTab === "password" && <SettingsPassword />}
          {activeTab === "team" && <SettingsTeam />}
          {activeTab === "api-keys" && <SettingsApiKeys />}
          {activeTab === "billing" && <SettingsBilling />}
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  )
}
