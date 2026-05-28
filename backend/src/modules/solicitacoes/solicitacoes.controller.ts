import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SolicitacoesService } from './solicitacoes.service';
import { Solicitacao } from '../../entities/solicitacao.entity';
import { Roles } from '../../auth/roles.decorator';
import { UsuarioRole } from '../../entities/usuario.entity';

@Controller('pedidos')
@Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.COORDENADOR_ALBERGUE, UsuarioRole.EDUCADOR_ALBERGUE)
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
