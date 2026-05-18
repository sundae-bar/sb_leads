// Agent types
export interface AgentRunStep {
  id: string;
  stepType: 'llm_call' | 'tool_call' | 'tool_result' | 'error';
  stepName: string;
  input: unknown;
  output: unknown;
  error?: string;
  sequence: number;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  tenantId: string;
  tenantRole: 'owner' | 'admin' | 'member';
  isSuperAdmin: boolean;
}

// DB types
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

// API types
export interface ChatStreamRequest {
  conversationId: string;
  message: string;
}

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

export interface MessageResponse {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  createdAt: string;
}

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

export interface ApiKeyResponse {
  id: string;
  name: string;
  keyPreview: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface ApiError {
  error: string;
  details?: unknown;
}

// Billing types
export type PlanId = 'free' | 'growth' | 'business';
export type Feature = 'api_keys' | 'team_unlimited';

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  priceMonthlyUsd: number;
  priceAnnualUsd: number;
  stripePriceId: string | null;
  stripePriceIdAnnual: string | null;
  creditsPerCycle: number;
  features: readonly Feature[];
  limits?: { teamMembers?: number };
  rebillThreshold?: number;
  minRebillIntervalSeconds?: number;
  trialDays?: number;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Try it out',
    priceMonthlyUsd: 0,
    priceAnnualUsd: 0,
    stripePriceId: null,
    stripePriceIdAnnual: null,
    creditsPerCycle: 10,
    features: ['api_keys', 'team_unlimited'],
    limits: { teamMembers: 1 },
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    description: 'For growing teams',
    priceMonthlyUsd: 49,
    priceAnnualUsd: 39,
    stripePriceId: process.env.STRIPE_PRICE_GROWTH ?? null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_GROWTH_ANNUAL ?? null,
    creditsPerCycle: 4000,
    features: ['api_keys', 'team_unlimited'],
    minRebillIntervalSeconds: 600,
    trialDays: 14,
  },
  business: {
    id: 'business',
    name: 'Business',
    description: 'For large teams',
    priceMonthlyUsd: 299,
    priceAnnualUsd: 249,
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS ?? null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL ?? null,
    creditsPerCycle: 30000,
    features: ['api_keys', 'team_unlimited'],
    minRebillIntervalSeconds: 600,
  },
};

export const PAID_PLAN_IDS: PlanId[] = ['growth', 'business'];

export function meterAgentRun(_run: {
  totalTokens?: number;
  agentName?: string;
}): number {
  return 1;
}

export function planIdFromStripePriceId(priceId: string): PlanId | null {
  for (const plan of Object.values(PLANS)) {
    if (plan.stripePriceId === priceId) return plan.id;
  }
  return null;
}

// Leads types
export type ProviderName = 'aleads' | 'apollo' | 'nymeria' | 'contactout' | 'hunterio';

export type EmailType = 'work' | 'personal';

export interface NormalizedEmail {
  address: string;
  type: EmailType;
  verified: boolean;
  verification_status?: string;
  confidence?: number;
  source_provider: ProviderName;
  verified_by?: ProviderName | null;
}

export interface Person {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  title?: string;
  location?: string;
  linkedin_url?: string;
}

export interface Company {
  name?: string;
  domain?: string;
  industry?: string;
  linkedin_url?: string;
}

export interface IntentSignal {
  type: string;
  value?: string | number | boolean;
  description?: string;
  date?: string;
  url?: string;
  snippet?: string;
  source_provider: ProviderName;
}

export interface ProviderAttempt {
  provider: ProviderName;
  found: boolean;
  error: string | null;
}

export interface FindEmailResult {
  linkedin_url: string;
  emails: NormalizedEmail[];
  person?: Person;
  company?: Company;
  providers_attempted: ProviderAttempt[];
  credits_used: number;
}

export interface VerifyEmailResult {
  email: string;
  valid: boolean;
  status: string;
  score?: number;
  checks?: {
    mx?: boolean;
    smtp?: boolean;
    disposable?: boolean;
    webmail?: boolean;
    accept_all?: boolean;
  };
  source_provider: ProviderName;
  credits_used: number;
}

export interface IntentSignalsResult {
  company: Company;
  signals: IntentSignal[];
  providers_attempted: ProviderAttempt[];
  credits_used: number;
}

export interface FindEmailHints {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  company_domain?: string;
  document_id?: string;
}

export type HintsByUrl = Partial<Record<string, FindEmailHints>>;
