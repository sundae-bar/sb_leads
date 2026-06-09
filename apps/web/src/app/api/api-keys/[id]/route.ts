import { NextRequest, NextResponse } from 'next/server';
import { callApi } from '@/lib/api-proxy';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }
  const r = await callApi(`/api/v1/api-keys/${id}`, { method: 'DELETE' });
  if (!r.ok) return r.response;
  return new NextResponse(null, { status: 204 });
}
