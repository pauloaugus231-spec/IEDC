import { Controller, Post, Body, Get, Req, Query } from '@nestjs/common';
import { TriagemService } from './triagem.service';
import { Roles } from '../../auth/roles.decorator';
import { ALBERGUE_OPERATION_ROLES, ALBERGUE_OPERATIONAL_READ_ROLES } from '../../auth/albergue-roles';
import { AuthRequest } from '../../auth/auth.types';

@Controller('triagem')
@Roles(...ALBERGUE_OPERATIONAL_READ_ROLES)
export class TriagemController {
  constructor(private readonly triagemService: TriagemService) {}

  @Post('iniciar')
  @Roles(...ALBERGUE_OPERATION_ROLES)
  async iniciar(
    @Body() body: { data_ref?: string },
    @Req() request: AuthRequest,
  ) {
    return this.triagemService.iniciar(request.user, body.data_ref);
  }

  @Post('encerrar')
  @Roles(...ALBERGUE_OPERATION_ROLES)
  async encerrar(
    @Body() body: { ausentes: string[]; observacoes?: string; data_ref?: string },
    @Req() request: AuthRequest,
  ) {
    return this.triagemService.encerrar(body.ausentes, request.user, body.data_ref, body.observacoes);
  }

  @Get('status')
  async status(@Query('data_ref') dataRef?: string) {
    return this.triagemService.getStatus(dataRef);
  }

  @Post('notificar-encerramento')
  @Roles(...ALBERGUE_OPERATION_ROLES)
  async notificarEncerramento(@Body() body: { data_ref?: string }) {
    // Reenvio manual — o relatório automático já sai sozinho dentro de /triagem/encerrar.
    // Recalcula tudo do banco de novo, não usa número nenhum vindo do corpo da requisição.
    return this.triagemService.reenviarRelatorioEncerramento(body?.data_ref);
  }

  @Get('novos-cadastros-hoje')
  async getNovosCadastrosHoje() {
    return this.triagemService.getNovosCadastrosHoje();
  }
}
