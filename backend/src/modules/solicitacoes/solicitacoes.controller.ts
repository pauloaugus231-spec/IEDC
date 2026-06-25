import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SolicitacoesService } from './solicitacoes.service';
import { Solicitacao } from '../../entities/solicitacao.entity';
import { Roles } from '../../auth/roles.decorator';
import { SolicitacaoDto, UpdateSolicitacaoDto } from './dto/solicitacao.dto';
import {
  ALBERGUE_COORDINATION_ROLES,
  ALBERGUE_OPERATION_ROLES,
  ALBERGUE_OPERATIONAL_READ_ROLES,
} from '../../auth/albergue-roles';

@Controller('pedidos')
@Roles(...ALBERGUE_OPERATIONAL_READ_ROLES)
export class SolicitacoesController {
  constructor(private readonly solicitacoesService: SolicitacoesService) {}

  @Get()
  async findAll(): Promise<Solicitacao[]> {
    return this.solicitacoesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Solicitacao | null> {
    return this.solicitacoesService.findOne(id);
  }

  @Post()
  @Roles(...ALBERGUE_OPERATION_ROLES)
  async create(@Body() solicitacaoData: SolicitacaoDto): Promise<Solicitacao> {
    return this.solicitacoesService.create(solicitacaoData);
  }

  @Patch(':id')
  @Roles(...ALBERGUE_OPERATION_ROLES)
  async update(@Param('id') id: string, @Body() solicitacaoData: UpdateSolicitacaoDto): Promise<Solicitacao | null> {
    return this.solicitacoesService.update(id, solicitacaoData);
  }

  @Delete(':id')
  @Roles(...ALBERGUE_COORDINATION_ROLES)
  async remove(@Param('id') id: string): Promise<void> {
    return this.solicitacoesService.remove(id);
  }
}
