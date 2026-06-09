import { NextRequest, NextResponse } from 'next/server';
import { callApi } from '@/lib/api-proxy';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  // find-email is the raw Express route (no /api/v1 prefix). refresh so the
  // forwarded JWT carries the current active_tenant_id claim.
  const r = await callApi('/find-email', {
    method: 'POST',
    body,
    refresh: true,
    errorMessage: 'Failed to find email',
  });
  if (!r.ok) return r.response;
  return NextResponse.json(r.data);
}
