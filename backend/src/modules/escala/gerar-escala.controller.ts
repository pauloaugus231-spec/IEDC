import { Controller, Post, Body } from '@nestjs/common';
import { EscalaService } from './escala.service';

@Controller()
export class GerarEscalaController {
  constructor(private readonly escalaService: EscalaService) {}

  @Post('gerar-escala-automatica')
  async gerar(@Body() body: { mes_ano: string }) {
    const { mes_ano } = body;
    const result = await this.escalaService.gerarEscalaAutomatica(mes_ano);
    return result;
  }
}
