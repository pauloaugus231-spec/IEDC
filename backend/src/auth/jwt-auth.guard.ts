import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AuthService } from './auth.service';
import { AuthRequest } from './auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthRequest & { headers: Record<string, string | undefined> }>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token ausente.');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      const user = await this.authService.findAuthUserById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('Usuário inválido.');
      }

      this.assertPasswordGovernance(user, request);
      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }

      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
  }

  private extractToken(request: { headers: Record<string, string | undefined> }): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private assertPasswordGovernance(
    user: { mustChangePassword?: boolean },
    request: { originalUrl?: string; url?: string; path?: string },
  ) {
    if (!user.mustChangePassword) {
      return;
    }

    const path = (request.originalUrl || request.url || request.path || '').split('?')[0].replace(/\/+$/, '');
    const allowedPaths = ['/api/auth/me', '/api/auth/me/change-password'];

    if (allowedPaths.includes(path)) {
      return;
    }

    throw new ForbiddenException('Troca de senha obrigatória antes de acessar o sistema.');
  }
}
