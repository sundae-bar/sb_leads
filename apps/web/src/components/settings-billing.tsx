'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Coins,
  CreditCard,
  ExternalLink,
  Loader2,
  Sparkles,
  TicketPercent,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CREDITS_PER_USD,
  TOPUP_PRESETS_USD,
  type CreditEntryKind,
  type TopupPresetUsd,
  usdToCredits,
} from '@scoop/types';
import {
  useBillingPortal,
  useRedeemCoupon,
  useRefetchSubscription,
  useSubscription,
  useTopupCheckout,
} from '@/hooks/useBilling';
import { toast } from 'sonner';

// Per-provider, per-action credit cost — sourced from
// apps/api/src/providers/credits.ts. Inlined here (rather than imported from
// the api package) because @scoop/web doesn't depend on @scoop/api at build
// time. Update both if you change one.
const PROVIDER_COSTS = [
  { name: 'Aleads', enabled: true, find: 1, verify: 1, intent: 1 },
  { name: 'Apollo', enabled: true, find: 1, verify: 1, intent: 1 },
  { name: 'Nymeria', enabled: true, find: 1, verify: 1, intent: 1 },
  { name: 'ContactOut', enabled: true, find: 1, verify: 1, intent: 1 },
  { name: 'Hunter.io', enabled: true, find: 1, verify: 1, intent: 1 },
  { name: 'People Data Labs', enabled: false, find: 1, verify: 1, intent: 1 },
  { name: 'Snov.io', enabled: false, find: 1, verify: 1, intent: 1 },
  { name: 'Lusha', enabled: false, find: 1, verify: 1, intent: 1 },
  { name: 'RocketReach', enabled: false, find: 1, verify: 1, intent: 1 },
  { name: 'ZoomInfo', enabled: false, find: 1, verify: 1, intent: 1 },
] as const;

const KIND_LABEL: Record<CreditEntryKind, string> = {
  grant: 'Grant',
  adjustment: 'Adjustment',
  coupon: 'Coupon',
  topup: 'Top-up',
  refund: 'Refund',
  debit_find: 'Find email',
  debit_verify: 'Verify email',
  debit_intent: 'Intent signals',
};

export function SettingsBilling() {
  const { data: sub, isLoading } = useSubscription();
  const portal = useBillingPortal();
  const topup = useTopupCheckout();
  const redeem = useRedeemCoupon();
  const refetch = useRefetchSubscription();
  const searchParams = useSearchParams();
  const [couponCode, setCouponCode] = useState('');

  // Returning from Stripe Checkout — refresh.
  useEffect(() => {
    const topupParam = searchParams.get('topup');
    if (topupParam === 'success') {
      toast.success('Credits added');
      const t1 = setTimeout(refetch, 1000);
      const t2 = setTimeout(refetch, 5000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    if (topupParam === 'cancel') {
      toast.info('Top-up cancelled');
    }
  }, [searchParams, refetch]);

  if (isLoading || !sub) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const balance = sub.balance;
  const balanceUsd = balance / CREDITS_PER_USD;

  async function handlePortal() {
    try {
      await portal.mutateAsync();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open billing portal');
    }
  }

  async function handleBuy(amount: TopupPresetUsd) {
    try {
      await topup.mutateAsync(amount);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout');
    }
  }

  async function handleRedeem() {
    const code = couponCode.trim();
    if (!code) return;
    const result = await redeem.mutateAsync(code);
    if (result.ok) {
      toast.success(`Added ${result.amount.toLocaleString()} credits`);
      setCouponCode('');
    } else {
      const messages: Record<typeof result.error, string> = {
        unauthenticated: 'Sign in to redeem a coupon',
        no_active_tenant: 'No active workspace',
        invalid_code: 'Invalid code',
        disabled: 'This code is no longer active',
        expired: 'This code has expired',
        exhausted: 'This code has been fully redeemed',
        already_redeemed: 'You\'ve already redeemed this code',
      };
      toast.error(messages[result.error]);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Billing</h2>
        <p className="text-sm text-muted-foreground">
          Credits, top-ups, and coupon codes. 1 credit = ${(1 / CREDITS_PER_USD).toFixed(2)}.
        </p>
      </div>

      {/* Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="size-4" /> Current balance
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <p className="text-4xl font-semibold tracking-tight">
            {balance.toLocaleString()}
            <span className="ml-2 text-base font-normal text-muted-foreground">credits</span>
          </p>
          <p className="text-sm text-muted-foreground">
            ≈ ${balanceUsd.toFixed(2)} of value
          </p>
        </CardContent>
      </Card>

      {/* Legacy subscription banner (grandfathered subscribers only) */}
      {sub.legacyPlan && sub.legacyPlan.planId !== 'free' && (
        <Card className="border-dashed">
          <CardContent className="flex items-start gap-3 py-4">
            <CreditCard className="mt-0.5 size-5 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                Legacy plan: {sub.legacyPlan.planId}
              </p>
              <p className="text-sm text-muted-foreground">
                You're on a monthly subscription from before we moved to
                credit packs. Cancel anytime in the Stripe portal — your
                existing credits stay yours.
                {sub.legacyPlan.cycleEndsAt && (
                  <> Renews {new Date(sub.legacyPlan.cycleEndsAt).toLocaleDateString()}.</>
                )}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handlePortal} disabled={portal.isPending}>
              <ExternalLink className="size-4" /> Manage
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Buy credits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="size-4" /> Buy credits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {TOPUP_PRESETS_USD.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="lg"
                className="flex h-auto flex-col items-center gap-0.5 py-3"
                onClick={() => handleBuy(amount)}
                disabled={topup.isPending}
              >
                <span className="text-base font-semibold">${amount}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {usdToCredits(amount).toLocaleString()} credits
                </span>
              </Button>
            ))}
          </div>
          {topup.isPending && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Redirecting to Stripe…
            </p>
          )}
        </CardContent>
      </Card>

      {/* Redeem coupon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TicketPercent className="size-4" /> Redeem a coupon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="e.g. WELCOME50"
              className="flex-1 uppercase"
              autoCapitalize="characters"
              spellCheck={false}
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleRedeem();
                }
              }}
            />
            <Button
              onClick={handleRedeem}
              disabled={!couponCode.trim() || redeem.isPending}
            >
              {redeem.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Redeeming…
                </>
              ) : (
                'Redeem'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Provider cost matrix */}
      <div>
        <h3 className="mb-1 text-base font-semibold">Credit cost by provider</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          What each tool call costs. The waterfall tries providers in order and
          stops on the first hit — you only pay once per query.
        </p>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Find email</TableHead>
                <TableHead className="text-right">Verify</TableHead>
                <TableHead className="text-right">Intent signals</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PROVIDER_COSTS.map((p) => (
                <TableRow key={p.name} className={p.enabled ? '' : 'opacity-50'}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.find}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.verify}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.intent}</TableCell>
                  <TableCell className="text-right">
                    {p.enabled ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="size-3" /> Live
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Coming soon</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Separator />

      {/* Recent activity */}
      <div>
        <h3 className="mb-1 text-base font-semibold">Recent activity</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          Last {sub.recent.length} ledger entries for this workspace.
        </p>
        {sub.recent.length === 0 ? (
          <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
            No activity yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead className="max-w-[280px]">Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sub.recent.map((e) => {
                  const positive = e.amount >= 0;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(e.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-xs">
                          {positive ? (
                            <CheckCircle2 className="size-3 text-emerald-600" />
                          ) : (
                            <XCircle className="size-3 text-muted-foreground" />
                          )}
                          {KIND_LABEL[e.kind] ?? e.kind}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate text-sm text-muted-foreground">
                        {e.description ?? '—'}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${positive ? 'text-emerald-600' : 'text-muted-foreground'}`}
                      >
                        {positive ? '+' : ''}
                        {e.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
