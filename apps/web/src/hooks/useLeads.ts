'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FindEmailResult, ProviderName, EmailType } from '@/types';

export interface FindEmailParams {
  linkedin_url: string;
  providers: ProviderName[];
  waterfall: boolean;
  email_types: EmailType[];
  verify: boolean;
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
  return res.json();
}

export function useLeads() {
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => apiFetch<FindEmailResult[]>('/api/contacts'),
  });

  const search = useMutation({
    mutationFn: async (params: FindEmailParams) => {
      const result = await apiFetch<FindEmailResult>('/api/find-email', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      await apiFetch('/api/contacts', {
        method: 'POST',
        body: JSON.stringify(result),
      });
      return result;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['contacts'], (old: FindEmailResult[] = []) => {
        const idx = old.findIndex((c) => c.linkedin_url === result.linkedin_url);
        if (idx >= 0) {
          const next = [...old];
          next[idx] = result;
          return next;
        }
        return [result, ...old];
      });
      queryClient.invalidateQueries({ queryKey: ['billing', 'subscription'] });
    },
  });

  return { contacts, contactsLoading, search };
}
