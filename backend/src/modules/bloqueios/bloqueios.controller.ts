import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BloqueiosService } from './bloqueios.service';
import { TipoBloqueio } from '../../entities/bloqueio.entity';

@ApiTags('bloqueios')
@Controller('bloqueios')
export class BloqueiosController {
  constructor(private readonly bloqueiosService: BloqueiosService) {}

  @Get('pessoa/:pessoaId')
  @ApiOperation({ summary: 'Listar todos os bloqueios de uma pessoa' })
  @ApiResponse({ status: 200, description: 'Lista de bloqueios' })
  findByPessoa(@Param('pessoaId') pessoaId: string) {
    return this.bloqueiosService.findByPessoa(pessoaId);
  }

  @Get('pessoa/:pessoaId/ativos')
  @ApiOperation({ summary: 'Listar bloqueios ativos de uma pessoa' })
  @ApiResponse({ status: 200, description: 'Lista de bloqueios ativos' })
  findAtivos(@Param('pessoaId') pessoaId: string) {
    return this.bloqueiosService.findAtivos(pessoaId);
  }

  @Get('pessoa/:pessoaId/verificar')
  @ApiOperation({ summary: 'Verificar se pessoa está bloqueada' })
  @ApiResponse({ status: 200, description: 'Status de bloqueio' })
  verificarBloqueio(@Param('pessoaId') pessoaId: string) {
    return this.bloqueiosService.estaBloqueada(pessoaId);
  }

  @Get('ativos')
  @ApiOperation({ summary: 'Listar todos os bloqueios ativos no sistema' })
  @ApiResponse({ status: 200, description: 'Lista de todos os bloqueios ativos' })
  findAllAtivos() {
    return this.bloqueiosService.findAllAtivos();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar bloqueio por ID' })
  @ApiResponse({ status: 200, description: 'Bloqueio encontrado' })
  @ApiResponse({ status: 404, description: 'Bloqueio não encontrado' })
  findById(@Param('id') id: string) {
    return this.bloqueiosService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo bloqueio' })
  @ApiResponse({ status: 201, description: 'Bloqueio criado com sucesso' })
  criar(
    @Body() body: {
      pessoa_id: string;
      tipo: TipoBloqueio;
      motivo: string;
      dias_bloqueio?: number;
      criado_por: string;
      observacoes?: string;
    },
  ) {
    return this.bloqueiosService.criar(body);
  }

  @Patch(':id/liberar')
  @ApiOperation({ summary: 'Liberação antecipada de bloqueio' })
  @ApiResponse({ status: 200, description: 'Bloqueio liberado com sucesso' })
  @ApiResponse({ status: 404, description: 'Bloqueio não encontrado' })
  @ApiResponse({ status: 400, description: 'Bloqueio já encerrado ou já liberado' })
  liberarAntecipadamente(
    @Param('id') id: string,
    @Body() body: { motivo: string; liberado_por: string },
  ) {
    return this.bloqueiosService.liberarAntecipadamente(id, body.motivo, body.liberado_por);
  }

  @Patch(':id/encerrar')
  @ApiOperation({ summary: 'Encerrar bloqueio manualmente' })
  @ApiResponse({ status: 200, description: 'Bloqueio encerrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Bloqueio não encontrado' })
  encerrar(
    @Param('id') id: string,
    @Body() body: { motivo?: string },
  ) {
    return this.bloqueiosService.encerrar(id, body.motivo);
  }
}
