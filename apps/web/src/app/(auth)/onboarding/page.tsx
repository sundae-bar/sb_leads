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

      // The server just stamped active_tenant_id onto auth.users.app_metadata.
      // The JWT cookie was signed before that, so it still carries no
      // active_tenant_id claim — RLS would block every tenant-scoped read
      // (tenant_credits, conversations, etc.) and the new workspace would
      // appear empty + credit-less. refreshSession() mints a new JWT against
      // the latest app_metadata and writes it back via the @supabase/ssr 0.10
      // getAll/setAll cookie callbacks, so the next request carries the claim.
      const supabase = createClient();
      await supabase.auth.refreshSession();
      toast.success('Workspace ready.');
      router.push('/app');
      router.refresh();
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
