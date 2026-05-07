'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PricingTable } from '@/components/billing/pricing-table';
import {
  useBillingPortal,
  useRefetchSubscription,
  useSubscription,
} from '@/hooks/useBilling';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';

export function SettingsBilling() {
  const { data: user } = useUser();
  const { data: sub, isLoading } = useSubscription();
  const portal = useBillingPortal();
  const refetch = useRefetchSubscription();
  const searchParams = useSearchParams();

  // Returning from Stripe Checkout — refresh subscription.
  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      toast.success('Subscription activated');
      // Webhook may take a moment; refetch a couple of times.
      const t1 = setTimeout(refetch, 1000);
      const t2 = setTimeout(refetch, 5000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    if (checkout === 'cancel') {
      toast.info('Checkout cancelled');
    }
  }, [searchParams, refetch]);

  if (user?.tenantRole === 'member') {
    return (
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Billing</h2>
        <p className="text-sm text-muted-foreground">
          Only owners and admins can view billing.
        </p>
      </div>
    );
  }

  if (isLoading || !sub) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const isPastDue = sub.status === 'past_due';
  const isCanceled = sub.status === 'canceled';
  const total = sub.plan.creditsPerCycle;
  const used = total - sub.creditsRemaining;
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;

  async function handlePortal() {
    try {
      await portal.mutateAsync();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open billing portal');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Billing</h2>
        <p className="text-sm text-muted-foreground">
          Manage your plan, payment method, and invoices.
        </p>
      </div>

      {isPastDue && (
        <Card className="border-destructive">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="size-5 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Payment failed</p>
              <p className="text-sm text-muted-foreground">
                Update your payment method to keep your subscription active.
              </p>
            </div>
            <Button size="sm" onClick={handlePortal} disabled={portal.isPending}>
              Update card
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Current plan: {sub.plan.name}</span>
            {sub.cancelAtPeriodEnd && (
              <span className="text-xs font-normal text-muted-foreground">
                Cancels at period end
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="text-sm">
              {sub.creditsRemaining.toLocaleString()} / {total.toLocaleString()} credits remaining
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          {sub.cycleEndsAt && (
            <p className="text-xs text-muted-foreground">
              Next renewal: {new Date(sub.cycleEndsAt).toLocaleDateString()}
            </p>
          )}
          {!isCanceled && sub.plan.id !== 'free' && (
            <Button variant="outline" onClick={handlePortal} disabled={portal.isPending}>
              <ExternalLink className="size-4" />
              Manage billing
            </Button>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div>
        <h3 className="text-base font-semibold mb-4">
          {sub.plan.id === 'free' ? 'Choose a plan' : 'Switch plans'}
        </h3>
        <PricingTable currentPlanId={sub.planId} />
      </div>
    </div>
  );
}
