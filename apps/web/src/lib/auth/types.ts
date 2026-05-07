export interface AuthUser {
  id: string;
  email: string;
  tenantId: string;
  tenantRole: 'owner' | 'admin' | 'member';
  isSuperAdmin: boolean;
}

export interface AuthProvider {
  /** Server-side: get the current user from the incoming request context (cookies/headers). */
  getCurrentUser(): Promise<AuthUser | null>;
  /** Server-side: validate a raw Bearer token (used by the Express API). */
  verifyToken(token: string): Promise<AuthUser | null>;
}
