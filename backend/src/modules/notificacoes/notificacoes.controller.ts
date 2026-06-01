import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Roles } from '../../auth/roles.decorator';
import { AuthRequest } from '../../auth/auth.types';
import { UsuarioRole } from '../../entities/usuario.entity';
import { NotificacoesService } from './notificacoes.service';

@Controller('notificacoes')
@Roles(
  UsuarioRole.GESTORA,
  UsuarioRole.SUPORTE,
  UsuarioRole.COORDENADOR_ALBERGUE,
  UsuarioRole.COORDENADOR_CRECHE,
  UsuarioRole.EQUIPE_TECNICA,
  UsuarioRole.EDUCADOR_ALBERGUE,
  UsuarioRole.EDUCADOR_CRECHE,
  UsuarioRole.FINANCEIRO,
  UsuarioRole.LOJA_BAZAR,
  UsuarioRole.LOJA_BRECHO,
  UsuarioRole.LOJA_FEIRAO,
)
export class NotificacoesController {
  constructor(private readonly notificacoesService: NotificacoesService) {}

  @Get()
  listar(@Req() request: AuthRequest) {
    return this.notificacoesService.listar(request.user ?? null);
  }

  @Post(':id/encerrar')
  encerrar(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.notificacoesService.encerrar(request.user!, id);
  }
}
