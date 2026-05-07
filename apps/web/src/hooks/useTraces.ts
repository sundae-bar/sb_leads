'use client';

import { useQuery } from '@tanstack/react-query';
import type { Trace } from '@/lib/traces-data';

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useTraces(filters?: { status?: string; agentName?: string }) {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.set('status', filters.status);
  if (filters?.agentName) queryParams.set('agentName', filters.agentName);

  return useQuery({
    queryKey: ['traces', filters],
    queryFn: () => apiFetch<Trace[]>(`/api/traces?${queryParams.toString()}`),
  });
}

export function useTrace(id: string | undefined) {
  return useQuery({
    queryKey: ['traces', id],
    queryFn: () => apiFetch<Trace>(`/api/traces/${id}`),
    enabled: !!id,
  });
}
