import { NextRequest, NextResponse } from 'next/server';
import type { ApiKeyResponse, CreateApiKeyRequest, CreateApiKeyResponse } from '@scoop/types';
import { callApi } from '@/lib/api-proxy';

export async function GET() {
  const r = await callApi<ApiKeyResponse[]>('/api/v1/api-keys', { refresh: true });
  if (!r.ok) return r.response;
  return NextResponse.json(r.data);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateApiKeyRequest;
  const r = await callApi<CreateApiKeyResponse>('/api/v1/api-keys', {
    method: 'POST',
    body,
    refresh: true,
  });
  if (!r.ok) return r.response;
  return NextResponse.json(r.data, { status: 201 });
}
