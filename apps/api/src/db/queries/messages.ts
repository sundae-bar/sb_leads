import type { SupabaseClient } from '@supabase/supabase-js';
import type { Message } from '@sundae/types';

export async function listMessages(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toMessage);
}

export async function createMessage(
  supabase: SupabaseClient,
  params: {
    conversationId: string;
    role: 'user' | 'assistant' | 'tool';
    content: string;
    metadata?: unknown;
  },
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: params.conversationId,
      role: params.role,
      content: params.content,
      metadata: params.metadata ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return toMessage(data);
}

function toMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    role: row.role as 'user' | 'assistant' | 'tool',
    content: row.content as string,
    metadata: row.metadata,
    createdAt: row.created_at as string,
  };
}
