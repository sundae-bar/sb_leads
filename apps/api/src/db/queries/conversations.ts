import type { SupabaseClient } from '@supabase/supabase-js';
import type { Conversation } from '@scoop/types';

// All read queries rely on RLS for tenant scoping (policies in 0009/0010).
// Writes still set user_id / tenant_id explicitly so the row is correctly tagged
// and the policy's WITH CHECK passes.

export async function listConversations(supabase: SupabaseClient): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toConversation);
}

export async function getConversation(
  supabase: SupabaseClient,
  id: string,
): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return toConversation(data);
}

export async function createConversation(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  title = 'New conversation',
): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, tenant_id: tenantId, title })
    .select()
    .single();

  if (error) throw error;
  return toConversation(data);
}

export async function updateConversation(
  supabase: SupabaseClient,
  id: string,
  title: string,
): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return null;
  return toConversation(data);
}

export async function deleteConversation(supabase: SupabaseClient, id: string): Promise<boolean> {
  const { error } = await supabase.from('conversations').delete().eq('id', id);
  return !error;
}

function toConversation(row: Record<string, unknown>): Conversation {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    tenantId: row.tenant_id as string,
    title: row.title as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
