"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react"
import { Wordmark } from "@/components/marketing/wordmark"
import { AuthBackdrop } from "@/components/marketing/auth-backdrop"
import { ThemeToggle } from "@/components/theme-toggle"

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simulate API call - replace with actual password reset logic
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsLoading(false)
    setIsSubmitted(true)
  }

  return (
    <div className="flex min-h-svh flex-col">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="scoop home">
          <Wordmark className="text-lg" />
        </Link>
        <ThemeToggle />
      </header>

      {/* Main content */}
      <AuthBackdrop>
        <Card className="w-full">
          {!isSubmitted ? (
            <>
              <CardHeader className="space-y-1 text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Mail className="h-6 w-6 text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  Forgot password?
                </CardTitle>
                <CardDescription>
                  No worries, we will send you reset instructions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      disabled={isLoading}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Reset password"
                    )}
                  </Button>
                </form>

                <div className="mt-6">
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to sign in
                  </Link>
                </div>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1 text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  Check your email
                </CardTitle>
                <CardDescription>
                  We sent a password reset link to
                </CardDescription>
                <p className="text-sm font-medium text-foreground">{email}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    // Open email client
                    window.location.href = "mailto:"
                  }}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Open email app
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  {"Didn't receive the email? "}
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => {
                      setIsSubmitted(false)
                      setEmail("")
                    }}
                  >
                    Click to resend
                  </button>
                </p>

                <div className="pt-2">
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to sign in
                  </Link>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </AuthBackdrop>
    </div>
  )
}
