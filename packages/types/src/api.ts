import type { AgentRunStep } from './agent.js';

// Chat
export interface ChatStreamRequest {
  conversationId: string;
  message: string;
}

// Conversations
export interface ConversationResponse {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface CreateConversationRequest {
  title?: string;
}

export interface UpdateConversationRequest {
  title: string;
}

// Messages
export interface MessageResponse {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  createdAt: string;
}

// Traces
export interface TraceListItem {
  id: string;
  agentName: string;
  triggerType: string;
  status: string;
  startedAt: string;
  durationMs: number | null;
}

export interface TraceDetailResponse {
  id: string;
  agentName: string;
  triggerType: string;
  status: string;
  input: unknown;
  output: unknown;
  error?: string;
  model?: string;
  totalTokens?: number;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  steps: AgentRunStep[];
}

// Users / Team
export interface UserProfileResponse {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  email: string;
  role: 'admin' | 'member';
  tenantRole: 'owner' | 'admin' | 'member';
  tenantId: string;
  isSuperAdmin: boolean;
}

export interface TenantMemberResponse {
  id: string;
  userId: string;
  tenantId: string;
  role: 'owner' | 'admin' | 'member';
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface UpdateProfileRequest {
  fullName?: string;
  avatarUrl?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Tenants
export interface TenantResponse {
  id: string;
  name: string;
  slug: string;
}

export interface CreateTenantRequest {
  tenantName: string;
}

export interface InviteTenantMemberRequest {
  email: string;
}

// API Keys
export interface ApiKeyResponse {
  id: string;
  name: string;
  keyPreview: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** True for keys auto-minted by the platform (e.g. chat agent's MCP key). */
  isManaged?: boolean;
}

export interface CreateApiKeyRequest {
  name: string;
  expiryDays?: number | null;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  key: string;
  keyPreview: string;
  expiresAt: string | null;
  createdAt: string;
}

// Generic API response wrapper
export interface ApiError {
  error: string;
  details?: unknown;
}
