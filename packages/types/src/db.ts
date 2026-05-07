export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantMember {
  id: string;
  tenantId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  createdAt: string;
}

export interface Profile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: 'admin' | 'member';
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  tenantId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  metadata: unknown;
  createdAt: string;
}

export interface AgentRun {
  id: string;
  userId: string | null;
  tenantId: string;
  conversationId: string | null;
  triggerType: 'chat' | 'cron' | 'webhook' | 'manual';
  agentName: string;
  status: 'running' | 'completed' | 'failed';
  input: unknown;
  output: unknown;
  error: string | null;
  model: string | null;
  totalTokens: number | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

export interface ApiKey {
  id: string;
  userId: string;
  tenantId: string;
  name: string;
  keyHash: string;
  keyPreview: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
