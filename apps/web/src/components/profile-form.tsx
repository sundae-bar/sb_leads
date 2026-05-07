"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Check, Pencil, Lock, User, Mail } from "lucide-react"
import { useUser, useUpdateProfile } from "@/hooks/useUser"
import { toast } from "sonner"

export function ProfileForm() {
  const { data: user } = useUser()
  const updateProfile = useUpdateProfile()
  const [name, setName] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (user?.fullName) {
      setName(user.fullName)
    }
  }, [user])

  async function handleSave() {
    try {
      await updateProfile.mutateAsync({ fullName: name })
      setIsEditing(false)
      toast.success("Profile updated successfully")
    } catch (error) {
      toast.error("Failed to update profile")
    }
  }

  function handleCancel() {
    setName(user?.fullName || "")
    setIsEditing(false)
  }

  function getInitials(fullName: string) {
    return fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Avatar Section */}
      <div className="flex flex-col items-center gap-4">
        <Avatar className="size-24 border-4 border-background shadow-lg">
          <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.fullName || "User"} />
          <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
            {getInitials(user?.fullName || "User")}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">{user?.fullName || "User"}</h2>
          <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
        </div>
      </div>

      <Separator />

      {/* Form Fields */}
      <div className="flex flex-col gap-6">
        {/* Name Field */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="name" className="text-muted-foreground">
            <User className="size-4" />
            Full Name
          </Label>
          {isEditing ? (
            <div className="flex flex-col gap-3">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                autoFocus
                className="bg-background"
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleSave} 
                  className="gap-1.5"
                  disabled={updateProfile.isPending}
                >
                  <Check className="size-4" />
                  {updateProfile.isPending ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="group flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm transition-colors hover:border-primary/50 hover:bg-accent"
            >
              <span className="text-foreground">{user?.fullName || "No name set"}</span>
              <Pencil className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )}
          {!isEditing && (
            <p className="text-xs text-muted-foreground">
              Click to edit your name
            </p>
          )}
        </div>

        {/* Email Field */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-muted-foreground">
            <Mail className="size-4" />
            Email Address
          </Label>
          <div className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2">
            <span className="flex-1 text-sm text-muted-foreground">
              {user?.email || ""}
            </span>
            <Lock className="size-3.5 text-muted-foreground/60" />
          </div>
          <p className="text-xs text-muted-foreground">
            Email cannot be changed
          </p>
        </div>
      </div>
    </div>
  )
}
