import type { UserRole } from '../context/AuthContext';

export const ALBERGUE_READ_ROLES: UserRole[] = [
  'gestora',
  'coordenador_albergue',
  'auxiliar_coordenacao_albergue',
  'diretor_albergue',
  'equipe_tecnica_albergue',
  'educador_albergue',
];

export const ALBERGUE_OPERATION_ROLES: UserRole[] = [
  'gestora',
  'coordenador_albergue',
  'auxiliar_coordenacao_albergue',
  'educador_albergue',
];

export const ALBERGUE_PERSON_READ_ROLES: UserRole[] = ALBERGUE_READ_ROLES.filter(
  (role) => role !== 'diretor_albergue',
);

export const ALBERGUE_COORDINATION_ROLES: UserRole[] = [
  'gestora',
  'coordenador_albergue',
  'auxiliar_coordenacao_albergue',
];

export const ALBERGUE_MANAGEMENT_READ_ROLES: UserRole[] = [
  ...ALBERGUE_COORDINATION_ROLES,
  'diretor_albergue',
];

export const ALBERGUE_DATA_QUALITY_ROLES: UserRole[] = [
  ...ALBERGUE_COORDINATION_ROLES,
  'equipe_tecnica_albergue',
];

export function hasAlbergueRole(role: UserRole, allowedRoles: UserRole[]) {
  return allowedRoles.includes(role);
}
