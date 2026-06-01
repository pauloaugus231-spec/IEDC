import { apiFetch } from './http';

export type ManagedUserRole =
  | 'gestora'
  | 'suporte'
  | 'coordenador_albergue'
  | 'coordenador_creche'
  | 'equipe_tecnica'
  | 'educador_albergue'
  | 'educador_creche'
  | 'financeiro'
  | 'loja_bazar'
  | 'loja_brecho'
  | 'loja_feirao';

export type ManagedServiceScope =
  | 'gestao'
  | 'suporte'
  | 'albergue'
  | 'creche'
  | 'institucional'
  | 'financeiro'
  | 'bazar'
  | 'brecho'
  | 'feirao';

export interface ManagedUser {
  id: string;
  login: string;
  name: string;
  displayName: string;
  role: ManagedUserRole;
  roleLabel: string;
  service: ManagedServiceScope;
  serviceLabel: string;
  homePath: string;
  ativo: boolean;
  mustChangePassword: boolean;
  passwordUpdatedAt: string | null;
  lastLoginAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CreateManagedUserPayload {
  login: string;
  name: string;
  displayName?: string;
  role: ManagedUserRole;
  temporaryPassword: string;
  ativo?: boolean;
}

export interface UpdateManagedUserPayload {
  name?: string;
  displayName?: string;
  role?: ManagedUserRole;
  ativo?: boolean;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export async function listManagedUsers() {
  return apiFetch<ManagedUser[]>('/api/auth/users');
}

export async function createManagedUser(data: CreateManagedUserPayload) {
  return apiFetch<ManagedUser>('/api/auth/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateManagedUser(id: string, data: UpdateManagedUserPayload) {
  return apiFetch<ManagedUser>(`/api/auth/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function resetManagedUserPassword(id: string, temporaryPassword: string) {
  return apiFetch<ManagedUser>(`/api/auth/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ temporaryPassword }),
  });
}

export async function changeOwnPassword(data: ChangePasswordPayload) {
  return apiFetch('/api/auth/me/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
