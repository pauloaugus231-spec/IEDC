import { SetMetadata } from '@nestjs/common';
import { UsuarioRole } from '../entities/usuario.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UsuarioRole[]) => SetMetadata(ROLES_KEY, roles);
