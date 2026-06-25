import { Controller, Post, Body, Get } from '@nestjs/common';
import { TriagemService } from './triagem.service';
import { Roles } from '../../auth/roles.decorator';
import { ALBERGUE_OPERATION_ROLES, ALBERGUE_OPERATIONAL_READ_ROLES } from '../../auth/albergue-roles';

@Controller('triagem')
@Roles(...ALBERGUE_OPERATIONAL_READ_ROLES)
export class TriagemController {
  constructor(private readonly triagemService: TriagemService) {}

  @Post('encerrar')
  @Roles(...ALBERGUE_OPERATION_ROLES)
  async encerrar(@Body() body: { ausentes: string[] }) {
    return this.triagemService.encerrar(body.ausentes);
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
