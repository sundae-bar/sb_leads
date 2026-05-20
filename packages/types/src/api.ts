import type { AgentRunStep } from './agent.js';
import type {
  Company,
  FindEmailResult,
  IntentSignalsResult,
  NormalizedEmail,
  Person,
  ProviderAttempt,
  VerifyEmailResult,
} from './leads.js';

// Chat
export interface ChatStreamRequest {
  conversationId: string;
  message: string;
}

// Tool calls — rendered inline beneath assistant messages. The shape is a
// discriminated union on `toolName` so the client can route to the right
// renderer. `result` mirrors what the MCP tool returns (see
// apps/api/src/mcp/tools.ts) — keep the shapes in sync.
export interface ListContactsRow {
  linkedin_url: string;
  person: Person | null;
  company: Company | null;
  emails: NormalizedEmail[];
  providers_attempted: ProviderAttempt[];
  updated_at: string;
}

export interface ListContactsResult {
  total: number;
  offset: number;
  limit: number;
  contacts: ListContactsRow[];
}

export type FindEmailToolResult =
  | FindEmailResult
  | { results: FindEmailResult[]; credits_used: number };

export type ToolCallRecord =
  | { toolName: 'find_email'; toolCallId: string; result: FindEmailToolResult }
  | { toolName: 'list_contacts'; toolCallId: string; result: ListContactsResult }
  | { toolName: 'verify_email'; toolCallId: string; result: VerifyEmailResult }
  | { toolName: 'get_intent_signals'; toolCallId: string; result: IntentSignalsResult }
  // Unknown / future tools — render a minimal "tool ran" pill, no crash.
  | { toolName: string; toolCallId: string; result: unknown };

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
  /** Inline tool-call renderings (find_email cards, list_contacts table, etc.). */
  toolCalls?: ToolCallRecord[];
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
  tenantName: string;
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
