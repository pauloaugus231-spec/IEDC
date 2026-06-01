import { Module } from '@nestjs/common';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../entities/usuario.entity';
import { AuditoriaModule } from '../modules/auditoria/auditoria.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

export function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET precisa ser definido em produção.');
  }

  return secret || 'dev-only-jwt-secret';
}

export function resolveJwtExpiresIn(): JwtSignOptions['expiresIn'] {
  return (process.env.JWT_EXPIRES_IN || '12h') as JwtSignOptions['expiresIn'];
}

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario]),
    AuditoriaModule,
    JwtModule.register({
      secret: resolveJwtSecret(),
      signOptions: { expiresIn: resolveJwtExpiresIn() },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
