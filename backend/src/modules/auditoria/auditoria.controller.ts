import { Controller, Get, Query, Req } from '@nestjs/common';
import { Roles } from '../../auth/roles.decorator';
import { UsuarioRole } from '../../entities/usuario.entity';
import { AuditoriaStatus } from '../../entities/auditoria.entity';
import { AuditoriaService } from './auditoria.service';
import { AuthRequest } from '../../auth/auth.types';

@Controller('auditoria')
@Roles(UsuarioRole.SUPORTE)
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  listar(
    @Req() request: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('entidade') entidade?: string,
    @Query('usuarioLogin') usuarioLogin?: string,
    @Query('status') status?: AuditoriaStatus,
    @Query('acao') acao?: string,
  ) {
    return this.auditoriaService.listar({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      entidade,
      usuarioLogin,
      status,
      acao,
      actor: request.user ?? null,
    });
  }
}
