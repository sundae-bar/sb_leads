import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthProvider } from '@/lib/auth';
import type { MessageResponse, ToolCallRecord } from '@scoop/types';

// Map a raw `messages` row into the camelCase MessageResponse shape, lifting
// `tool_calls` out of metadata so the UI can re-render inline result cards
// without having to parse arbitrary metadata. We keep this on the route
// boundary (rather than the DB query) so the DB types stay snake_case-free of
// product concepts.
function toMessageResponse(row: Record<string, unknown>): MessageResponse {
  const metadata = (row.metadata ?? {}) as { tool_calls?: ToolCallRecord[] };
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    role: row.role as 'user' | 'assistant' | 'tool',
    content: row.content as string,
    toolCalls: Array.isArray(metadata.tool_calls) ? metadata.tool_calls : undefined,
    createdAt: row.created_at as string,
  };
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();

  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    ...conversation,
    messages: (messages ?? []).map(toMessageResponse),
  });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { title } = await request.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('conversations')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase.from('conversations').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
