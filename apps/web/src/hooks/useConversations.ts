'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ConversationResponse, CreateConversationRequest } from '@scoop/types';

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

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiFetch<ConversationResponse[]>('/api/conversations'),
  });
}

export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: ['conversations', id],
    queryFn: () => apiFetch<ConversationResponse & { messages: unknown[] }>(`/api/conversations/${id}`),
    enabled: !!id,
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateConversationRequest) =>
      apiFetch<ConversationResponse>('/api/conversations', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/conversations/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}
