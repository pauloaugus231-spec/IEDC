import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import { AuthUser } from './auth.types';
import { UsuarioRole, UsuarioServiceScope } from '../entities/usuario.entity';

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

function createGuard(user: AuthUser) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(false),
  };
  const jwtService = {
    verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-id' }),
  };
  const authService = {
    findAuthUserById: jest.fn().mockResolvedValue(user),
  };

  return new JwtAuthGuard(
    reflector as unknown as Reflector,
    jwtService as unknown as JwtService,
    authService as unknown as AuthService,
  );
}

function createUser(mustChangePassword: boolean): AuthUser {
  return {
    id: 'claudia',
    uuid: 'user-id',
    login: 'claudia',
    name: 'Claudia',
    displayName: 'Claudia',
    role: UsuarioRole.GESTORA,
    roleLabel: 'Gestao',
    service: UsuarioServiceScope.GESTAO,
    serviceLabel: 'Gestao institucional',
    homePath: '/gestao',
    mustChangePassword,
  };
}

describe('JwtAuthGuard password governance', () => {
  it('bloqueia rotas protegidas quando a troca de senha e obrigatoria', async () => {
    const guard = createGuard(createUser(true));
    const request = {
      headers: { authorization: 'Bearer token' },
      originalUrl: '/api/dashboard/ocupacao',
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(ForbiddenException);
  });

  it('permite consultar a propria conta antes da troca de senha', async () => {
    const guard = createGuard(createUser(true));
    const request = {
      headers: { authorization: 'Bearer token' },
      originalUrl: '/api/auth/me',
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });

  it('permite trocar a propria senha antes de acessar o sistema', async () => {
    const guard = createGuard(createUser(true));
    const request = {
      headers: { authorization: 'Bearer token' },
      originalUrl: '/api/auth/me/change-password',
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });

  it('permite rotas protegidas depois da troca de senha', async () => {
    const guard = createGuard(createUser(false));
    const request = {
      headers: { authorization: 'Bearer token' },
      originalUrl: '/api/dashboard/ocupacao',
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });
});
