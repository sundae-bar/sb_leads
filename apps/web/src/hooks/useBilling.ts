'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreditLedgerEntry,
  Feature,
  PlanConfig,
  PlanId,
  RedeemCouponResult,
  TopupPresetUsd,
} from '@scoop/types';

/**
 * The single endpoint /api/billing/subscription returns both the new ledger
 * shape AND legacy aliases for older callers (creditsRemaining, planId,
 * plan, etc.). Keep both flavours in the type until every reader has moved
 * to `balance`.
 */
export interface SubscriptionResponse {
  // New shape — ledger-backed
  balance: number;
  recent: CreditLedgerEntry[];
  legacyPlan?: {
    planId: PlanId;
    status: string;
    cycleEndsAt: string | null;
  };
  // Legacy aliases (deprecated — read `balance` / `legacyPlan` instead)
  planId: PlanId;
  plan: PlanConfig;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  creditsRemaining: number;
  cycleEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  autoRebillEnabled: boolean;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useSubscription() {
  return useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: () => apiFetch<SubscriptionResponse>('/api/billing/subscription'),
  });
}

export function useHasFeature(feature: Feature): boolean {
  const { data } = useSubscription();
  if (!data) return false;
  if (data.status === 'canceled' || data.status === 'past_due') return false;
  return data.plan.features.includes(feature);
}

/** Legacy: kick off a monthly subscription checkout. Not advertised in the new UI. */
export function useCheckout() {
  return useMutation({
    mutationFn: async (planId: PlanId) => {
      const { url } = await apiFetch<{ url: string }>('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ planId }),
      });
      if (url) window.location.href = url;
    },
  });
}

/** New: kick off a one-time credit top-up. */
export function useTopupCheckout() {
  return useMutation({
    mutationFn: async (amountUsd: TopupPresetUsd) => {
      const { url } = await apiFetch<{ url: string }>(
        '/api/billing/topup/checkout',
        {
          method: 'POST',
          body: JSON.stringify({ amountUsd }),
        },
      );
      if (url) window.location.href = url;
    },
  });
}

/** Redeem a coupon code. Returns the RPC verdict (success or one of the named errors). */
export function useRedeemCoupon() {
  const qc = useQueryClient();
  return useMutation<RedeemCouponResult, Error, string>({
    mutationFn: async (code: string) => {
      // Note: the route returns 200 on success and 4xx on the failure branches;
      // we want to capture both as the same RedeemCouponResult union so the UI
      // can switch on .error rather than re-parsing message strings.
      const res = await fetch('/api/billing/coupons/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      return (await res.json()) as RedeemCouponResult;
    },
    onSuccess: (result) => {
      if (result.ok) qc.invalidateQueries({ queryKey: ['billing', 'subscription'] });
    },
  });
}

export function useBillingPortal() {
  return useMutation({
    mutationFn: async () => {
      const { url } = await apiFetch<{ url: string }>('/api/billing/portal', {
        method: 'POST',
      });
      if (url) window.location.href = url;
    },
  });
}

/** Force a refetch — useful after returning from Stripe Checkout. */
export function useRefetchSubscription() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['billing', 'subscription'] });
}
