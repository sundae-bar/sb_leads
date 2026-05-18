'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PlanConfig, PlanId, Feature } from '@/types';

export interface SubscriptionResponse {
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
