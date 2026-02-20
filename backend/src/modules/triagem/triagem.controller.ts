import { Controller, Post, Body, Get } from '@nestjs/common';
import { TriagemService } from './triagem.service';

@Controller('triagem')
export class TriagemController {
  constructor(private readonly triagemService: TriagemService) {}

  @Post('encerrar')
  async encerrar(@Body() body: { ausentes: string[] }) {
    return this.triagemService.encerrar(body.ausentes);
  }

  @Post('notificar-encerramento')
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

  @Get('teste')
  async teste() {
    return { message: 'Backend funcionando!', timestamp: new Date().toISOString() };
  }
}
