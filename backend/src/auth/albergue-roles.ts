import { UsuarioRole } from '../entities/usuario.entity';

export const ALBERGUE_READ_ROLES = [
  UsuarioRole.GESTORA,
  UsuarioRole.COORDENADOR_ALBERGUE,
  UsuarioRole.AUXILIAR_COORDENACAO_ALBERGUE,
  UsuarioRole.DIRETOR_ALBERGUE,
  UsuarioRole.EQUIPE_TECNICA_ALBERGUE,
  UsuarioRole.EDUCADOR_ALBERGUE,
] as const;

export const ALBERGUE_OPERATION_ROLES = [
  UsuarioRole.GESTORA,
  UsuarioRole.COORDENADOR_ALBERGUE,
  UsuarioRole.AUXILIAR_COORDENACAO_ALBERGUE,
  UsuarioRole.EDUCADOR_ALBERGUE,
] as const;

export const ALBERGUE_OPERATIONAL_READ_ROLES = ALBERGUE_READ_ROLES.filter(
  (role) => role !== UsuarioRole.DIRETOR_ALBERGUE,
);

export const ALBERGUE_COORDINATION_ROLES = [
  UsuarioRole.GESTORA,
  UsuarioRole.COORDENADOR_ALBERGUE,
  UsuarioRole.AUXILIAR_COORDENACAO_ALBERGUE,
] as const;

export const ALBERGUE_MANAGEMENT_READ_ROLES = [
  ...ALBERGUE_COORDINATION_ROLES,
  UsuarioRole.DIRETOR_ALBERGUE,
] as const;

export const ALBERGUE_DATA_QUALITY_ROLES = [
  ...ALBERGUE_COORDINATION_ROLES,
  UsuarioRole.EQUIPE_TECNICA_ALBERGUE,
] as const;
