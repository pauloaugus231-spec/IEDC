import { Request } from 'express';
import { UsuarioRole, UsuarioServiceScope } from '../entities/usuario.entity';

export interface AuthUser {
  id: string;
  uuid: string;
  login: string;
  name: string;
  displayName: string;
  role: UsuarioRole;
  roleLabel: string;
  service: UsuarioServiceScope;
  serviceLabel: string;
  homePath: string;
  mustChangePassword: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  requestId?: string;
}
