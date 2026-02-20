import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EscalaService } from './escala.service';
import { Escala } from '../../entities/escala.entity';

@Controller('escala')
export class EscalaController {
  constructor(private readonly escalaService: EscalaService) {}

  @Post('gerar-escala')
  async gerarEscala(@Body() body: { mes: number; ano: number }) {
    const { mes, ano } = body;
    const result = await this.escalaService.gerarEscalaMensal(mes, ano);
    return result;
  }

  @Post('gerar-escala-automatica')
  async gerarEscalaAutomatica(@Body() body: { mes_ano: string }) {
    const { mes_ano } = body;
    const result = await this.escalaService.gerarEscalaAutomatica(mes_ano);
    return result;
  }

  @Get()
  async findAll(): Promise<Escala[]> {
    return this.escalaService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Escala | null> {
    return this.escalaService.findOne(id);
  }

  @Post()
  async create(@Body() escalaData: Partial<Escala>): Promise<Escala> {
    return this.escalaService.create(escalaData);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() escalaData: Partial<Escala>): Promise<Escala | null> {
    return this.escalaService.update(id, escalaData);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.escalaService.remove(id);
  }
}
