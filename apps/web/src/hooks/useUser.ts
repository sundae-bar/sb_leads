'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserProfileResponse, UpdateProfileRequest, TenantMemberResponse } from '@sundae/types';

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

export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: () => apiFetch<UserProfileResponse>('/api/user/profile'),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) =>
      apiFetch<UserProfileResponse>('/api/user/profile', { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user'] }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { newPassword: string }) =>
      apiFetch('/api/user/password', { method: 'PUT', body: JSON.stringify(body) }),
  });
}

export function useTeam() {
  return useQuery({
    queryKey: ['team'],
    queryFn: () => apiFetch<TenantMemberResponse[]>('/api/users'),
  });
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) =>
      apiFetch('/api/users', { method: 'POST', body: JSON.stringify({ email }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}

export function useRemoveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}
