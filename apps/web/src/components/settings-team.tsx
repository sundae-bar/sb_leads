"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Mail, UserPlus, Trash2, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTeam, useInviteUser, useRemoveUser, useUser } from "@/hooks/useUser"
import { toast } from "sonner"

function roleBadgeVariant(role: string) {
  switch (role) {
    case "owner":
      return "default"
    case "admin":
      return "secondary"
    default:
      return "outline"
  }
}

function getInitials(fullName: string | null | undefined, email?: string): string {
  if (fullName) {
    return fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }
  if (email) {
    return email[0].toUpperCase()
  }
  return "?"
}

export function SettingsTeam() {
  const [inviteEmail, setInviteEmail] = useState("")
  const { data: currentUser } = useUser()
  const { data: team, isLoading } = useTeam()
  const inviteUser = useInviteUser()
  const removeUser = useRemoveUser()
  const canManageTeam = currentUser?.tenantRole === 'owner' || currentUser?.tenantRole === 'admin'

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    try {
      await inviteUser.mutateAsync(inviteEmail)
      toast.success(`Invitation sent to ${inviteEmail}`)
      setInviteEmail("")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to send invitation")
    }
  }

  async function handleRemove(userId: string, email: string) {
    if (!confirm(`Are you sure you want to remove ${email}?`)) return

    try {
      await removeUser.mutateAsync(userId)
      toast.success("User removed successfully")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to remove user")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Team</h3>
        <p className="text-sm text-muted-foreground">
          Manage your team members and invitations
        </p>
      </div>

      {/* Invite Section */}
      {canManageTeam && (
        <form onSubmit={handleInvite} className="flex max-w-md flex-col gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <UserPlus className="size-4" />
            Invite a team member
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="pl-9"
                disabled={inviteUser.isPending}
              />
            </div>
            <Button
              type="submit"
              disabled={!inviteEmail.trim() || inviteUser.isPending}
            >
              {inviteUser.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </form>
      )}

      <Separator />

      {/* Team Members List */}
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-medium text-muted-foreground">
          Members ({team?.length || 0})
        </h4>
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-4">Loading team members...</div>
        ) : (
          <div className="flex flex-col gap-1 mt-2">
            {team?.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/50"
              >
                <Avatar className="size-9">
                  <AvatarImage src={member.avatarUrl ?? undefined} alt={member.fullName || member.email} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                    {getInitials(member.fullName, member.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {member.fullName || member.email}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {member.email}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={roleBadgeVariant(member.role)}>
                    {member.role === "owner" ? "Owner" : member.role === "admin" ? "Admin" : "Member"}
                  </Badge>
                  {canManageTeam && member.role !== "owner" && member.userId !== currentUser?.id ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="cursor-pointer h-8 w-8 p-0"
                          disabled={removeUser.isPending}
                        >
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleRemove(member.userId, member.email)}
                          className="text-destructive cursor-pointer"
                        >
                          <Trash2 className="mr-2 size-4" />
                          Remove user
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div className="h-8 w-8" />
                  )}
                </div>
              </div>
            ))}
            {(!team || team.length === 0) && (
              <div className="text-sm text-muted-foreground py-4">No team members yet</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
