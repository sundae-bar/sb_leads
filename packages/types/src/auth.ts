export interface AuthUser {
  id: string;
  email: string;
  tenantId: string;
  tenantRole: 'owner' | 'admin' | 'member';
  isSuperAdmin: boolean;
}
