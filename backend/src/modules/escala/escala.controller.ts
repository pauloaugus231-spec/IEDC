import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EscalaService } from './escala.service';
import { Escala } from '../../entities/escala.entity';
import { Roles } from '../../auth/roles.decorator';
import { ALBERGUE_COORDINATION_ROLES } from '../../auth/albergue-roles';
import { EscalaDto, GerarEscalaAutomaticaDto, GerarEscalaDto, UpdateEscalaDto } from './dto/escala.dto';

@Controller('escala')
@Roles(...ALBERGUE_COORDINATION_ROLES)
export class EscalaController {
  constructor(private readonly escalaService: EscalaService) {}

  @Post('gerar-escala')
  async gerarEscala(@Body() body: GerarEscalaDto) {
    const { mes, ano } = body;
    const result = await this.escalaService.gerarEscalaMensal(mes, ano);
    return result;
  }

  @Post('gerar-escala-automatica')
  async gerarEscalaAutomatica(@Body() body: GerarEscalaAutomaticaDto) {
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
  async create(@Body() escalaData: EscalaDto): Promise<Escala> {
    return this.escalaService.create(escalaData);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() escalaData: UpdateEscalaDto): Promise<Escala | null> {
    return this.escalaService.update(id, escalaData);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.escalaService.remove(id);
  }
}
