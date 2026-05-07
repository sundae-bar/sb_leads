import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthProvider } from '@/lib/auth';

export async function GET() {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const conversations = data ?? [];
  const ids = conversations.map((c) => c.id);

  let counts: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', ids);
    counts = (msgs ?? []).reduce((acc: Record<string, number>, m) => {
      acc[m.conversation_id] = (acc[m.conversation_id] || 0) + 1;
      return acc;
    }, {});
  }

  return NextResponse.json(
    conversations.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.created_at,
      updatedAt: c.updated_at ?? c.created_at,
      messageCount: counts[c.id] ?? 0,
    })),
  );
}

export async function POST(request: NextRequest) {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const body = await request.json().catch(() => ({}));

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      tenant_id: user.tenantId,
      title: body.title ?? 'New conversation',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
