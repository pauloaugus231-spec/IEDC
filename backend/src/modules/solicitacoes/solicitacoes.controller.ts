import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SolicitacoesService } from './solicitacoes.service';
import { Solicitacao } from '../../entities/solicitacao.entity';

@Controller('pedidos')
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
  async create(@Body() solicitacaoData: Partial<Solicitacao>): Promise<Solicitacao> {
    return this.solicitacoesService.create(solicitacaoData);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() solicitacaoData: Partial<Solicitacao>): Promise<Solicitacao | null> {
    return this.solicitacoesService.update(id, solicitacaoData);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.solicitacoesService.remove(id);
  }
}
