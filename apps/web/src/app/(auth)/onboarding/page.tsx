'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { AuthBackdrop } from '@/components/marketing/auth-backdrop';

export default function OnboardingPage() {
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceName.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/create-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantName: workspaceName.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to create workspace');
      }

      // The server just stamped active_tenant_id onto auth.users.app_metadata,
      // but the user's existing JWT cookie was signed before that update and
      // doesn't carry the claim. supabase.auth.refreshSession() *should* mint
      // a new JWT with the latest app_metadata — in practice it often returns
      // a session object with the right metadata in JS memory while the access
      // token cookie itself is unchanged. RLS then blocks every tenant-scoped
      // read (subscription returns 0 credits, etc.).
      //
      // The only reliable way to guarantee a JWT with the new claim is to
      // sign out and re-authenticate. The next sign-in mints a fresh token
      // from the current app_metadata.
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success('Workspace created — please sign in to continue.');
      router.push('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthBackdrop fullHeight innerClassName="max-w-md">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Create your workspace</CardTitle>
          <CardDescription>
            Give your workspace a name to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="workspaceName">Workspace name</Label>
              <Input
                id="workspaceName"
                placeholder="Your workspace"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={isLoading || !workspaceName.trim()}>
              {isLoading ? 'Creating…' : 'Create workspace'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthBackdrop>
  );
}
