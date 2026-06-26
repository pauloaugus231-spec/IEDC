import { Controller, Post, Body, Get, Req, Query } from '@nestjs/common';
import { TriagemService } from './triagem.service';
import { Roles } from '../../auth/roles.decorator';
import { ALBERGUE_OPERATION_ROLES, ALBERGUE_OPERATIONAL_READ_ROLES } from '../../auth/albergue-roles';
import { AuthRequest } from '../../auth/auth.types';

@Controller('triagem')
@Roles(...ALBERGUE_OPERATIONAL_READ_ROLES)
export class TriagemController {
  constructor(private readonly triagemService: TriagemService) {}

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
  async notificarEncerramento(@Body() dadosRelatorio: {
    total: number;
    masc: number;
    fem: number;
    idosos: number;
    ausentes: number;
    data: string;
  }) {
    return this.triagemService.notificarEncerramento(dadosRelatorio);
  }

  @Get('novos-cadastros-hoje')
  async getNovosCadastrosHoje() {
    return this.triagemService.getNovosCadastrosHoje();
  }
}
