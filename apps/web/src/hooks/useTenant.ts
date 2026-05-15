'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TenantResponse } from '@scoop/types';

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

export function useTenants(enabled = false) {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: () => apiFetch<TenantResponse[]>('/api/admin/tenants'),
    enabled,
  });
}

export function useSwitchTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tenantId: string) =>
      apiFetch('/api/admin/switch-tenant', {
        method: 'POST',
        body: JSON.stringify({ tenantId }),
      }),
    onSuccess: () => {
      qc.clear();
    },
  });
}
