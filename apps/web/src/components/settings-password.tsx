"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, Eye, EyeOff } from "lucide-react"
import { useChangePassword } from "@/hooks/useUser"
import { toast } from "sonner"

export function SettingsPassword() {
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const changePassword = useChangePassword()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long")
      return
    }

    try {
      await changePassword.mutateAsync({ newPassword })
      toast.success("Password updated successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      toast.error("Failed to update password")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Password</h3>
        <p className="text-sm text-muted-foreground">
          Update your password to keep your account secure
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="current-password" className="text-muted-foreground">
            <Lock className="size-4" />
            Current Password
          </Label>
          <div className="relative">
            <Input
              id="current-password"
              type={showCurrent ? "text" : "password"}
              placeholder="Enter current password"
              className="pr-10"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={changePassword.isPending}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showCurrent ? "Hide password" : "Show password"}
            >
              {showCurrent ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="new-password" className="text-muted-foreground">
            <Lock className="size-4" />
            New Password
          </Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showNew ? "text" : "password"}
              placeholder="Enter new password"
              className="pr-10"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={changePassword.isPending}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showNew ? "Hide password" : "Show password"}
            >
              {showNew ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Must be at least 8 characters long
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-password" className="text-muted-foreground">
            <Lock className="size-4" />
            Confirm New Password
          </Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm new password"
              className="pr-10"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={changePassword.isPending}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-fit"
          disabled={changePassword.isPending}
        >
          {changePassword.isPending ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </div>
  )
}
