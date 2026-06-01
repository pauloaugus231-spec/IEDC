import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BloqueiosService } from './bloqueios.service';
import { Roles } from '../../auth/roles.decorator';
import { UsuarioRole } from '../../entities/usuario.entity';
import { CriarBloqueioDto } from './dto/criar-bloqueio.dto';
import { LiberarBloqueioDto } from './dto/liberar-bloqueio.dto';
import { EncerrarBloqueioDto } from './dto/encerrar-bloqueio.dto';

@ApiTags('bloqueios')
@Controller('bloqueios')
@Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.COORDENADOR_ALBERGUE, UsuarioRole.EDUCADOR_ALBERGUE)
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
  @Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.COORDENADOR_ALBERGUE)
  @ApiOperation({ summary: 'Criar novo bloqueio' })
  @ApiResponse({ status: 201, description: 'Bloqueio criado com sucesso' })
  criar(
    @Body() body: CriarBloqueioDto,
  ) {
    return this.bloqueiosService.criar(body);
  }

  @Patch(':id/liberar')
  @Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.COORDENADOR_ALBERGUE)
  @ApiOperation({ summary: 'Liberação antecipada de bloqueio' })
  @ApiResponse({ status: 200, description: 'Bloqueio liberado com sucesso' })
  @ApiResponse({ status: 404, description: 'Bloqueio não encontrado' })
  @ApiResponse({ status: 400, description: 'Bloqueio já encerrado ou já liberado' })
  liberarAntecipadamente(
    @Param('id') id: string,
    @Body() body: LiberarBloqueioDto,
  ) {
    return this.bloqueiosService.liberarAntecipadamente(id, body.motivo, body.liberado_por);
  }

  @Patch(':id/encerrar')
  @Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.COORDENADOR_ALBERGUE)
  @ApiOperation({ summary: 'Encerrar bloqueio manualmente' })
  @ApiResponse({ status: 200, description: 'Bloqueio encerrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Bloqueio não encontrado' })
  encerrar(
    @Param('id') id: string,
    @Body() body: EncerrarBloqueioDto,
  ) {
    return this.bloqueiosService.encerrar(id, body.motivo);
  }
}
