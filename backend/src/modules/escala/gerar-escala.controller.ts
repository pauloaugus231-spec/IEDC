import { Controller, Post, Body } from '@nestjs/common';
import { EscalaService } from './escala.service';
import { Roles } from '../../auth/roles.decorator';
import { ALBERGUE_COORDINATION_ROLES } from '../../auth/albergue-roles';

@Controller()
@Roles(...ALBERGUE_COORDINATION_ROLES)
export class GerarEscalaController {
  constructor(private readonly escalaService: EscalaService) {}

  @Post('gerar-escala-automatica')
  async gerar(@Body() body: { mes_ano: string }) {
    const { mes_ano } = body;
    const result = await this.escalaService.gerarEscalaAutomatica(mes_ano);
    return result;
  }
}
