// import { Get, Query } from '@nestjs/common';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PessoasService } from './pessoas.service';
import { CreatePessoaDto } from './dto/create-pessoa.dto';
import { UpdatePessoaDto } from './dto/update-pessoa.dto';
import { Pessoa, StatusCadastro } from '../../entities/pessoa.entity';
import { Roles } from '../../auth/roles.decorator';
import { UsuarioRole } from '../../entities/usuario.entity';
import { FILE_LIMITS } from '../../common/upload/file-validation';
import { UpdatePresencaDto } from './dto/update-presenca.dto';
import { LiberarAntecipadamenteDto } from './dto/liberar-antecipadamente.dto';

@ApiTags('pessoas')
@Controller('pessoas')
@Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.COORDENADOR_ALBERGUE, UsuarioRole.EDUCADOR_ALBERGUE)
export class PessoasController {
  constructor(private readonly pessoasService: PessoasService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova pessoa' })
  @ApiResponse({ status: 201, description: 'Pessoa criada com sucesso', type: Pessoa })
  create(@Body() createPessoaDto: CreatePessoaDto): Promise<Pessoa> {
    return this.pessoasService.create(createPessoaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar pessoas com paginação e filtros' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: StatusCadastro })
  @ApiResponse({ status: 200, description: 'Lista de pessoas' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    // Garante que page e limit são numéricos
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 10;
    
    // Converte string para enum StatusCadastro
    let statusEnum: StatusCadastro | undefined;
    if (status) {
      statusEnum = Object.values(StatusCadastro).find(s => s === status) as StatusCadastro;
    }
    
    return this.pessoasService.findAll(pageNum, limitNum, search, statusEnum);
  }

  @Get('ativos')
  @ApiOperation({ summary: 'Listar pessoas ativas (com estadias ativas)' })
  @ApiResponse({ status: 200, description: 'Lista de pessoas ativas' })
  findAtivos(): Promise<Pessoa[]> {
    return this.pessoasService.findAtivos();
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar pessoas por nome ou CPF' })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Resultados da busca', type: [Pessoa] })
  search(@Query('q') query?: string): Promise<Pessoa[]> {
    return this.pessoasService.search(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar pessoa por ID' })
  @ApiResponse({ status: 200, description: 'Pessoa encontrada', type: Pessoa })
  @ApiResponse({ status: 404, description: 'Pessoa não encontrada' })
  findOne(@Param('id') id: string): Promise<Pessoa> {
    return this.pessoasService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar dados da pessoa' })
  @ApiResponse({ status: 200, description: 'Pessoa atualizada com sucesso', type: Pessoa })
  @ApiResponse({ status: 404, description: 'Pessoa não encontrada' })
  update(
    @Param('id') id: string,
    @Body() updatePessoaDto: UpdatePessoaDto,
  ): Promise<Pessoa> {
    return this.pessoasService.update(id, updatePessoaDto);
  }

  @Delete(':id')
  @Roles(UsuarioRole.GESTORA, UsuarioRole.COORDENADOR_ALBERGUE, UsuarioRole.EQUIPE_TECNICA)
  @ApiOperation({ summary: 'Excluir pessoa (soft delete)' })
  @ApiResponse({ status: 200, description: 'Pessoa excluída com sucesso' })
  @ApiResponse({ status: 404, description: 'Pessoa não encontrada' })
  remove(@Param('id') id: string): Promise<void> {
    return this.pessoasService.remove(id);
  }

  @Patch(':id/presenca')
  @ApiOperation({ summary: 'Atualizar presença da pessoa' })
  @ApiResponse({ status: 200, description: 'Presença atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Pessoa não encontrada' })
  async updatePresenca(
    @Param('id') id: string,
    @Body() { presente }: UpdatePresencaDto,
  ): Promise<Pessoa> {
    return this.pessoasService.updatePresenca(id, presente);
  }

  @Post(':id/liberar-antecipadamente')
  @ApiOperation({ summary: 'Liberar pessoa antecipadamente (libera bloqueio também)' })
  @ApiResponse({ status: 200, description: 'Pessoa liberada antecipadamente com sucesso' })
  @ApiResponse({ status: 404, description: 'Pessoa não encontrada' })
  async liberarAntecipadamente(
    @Param('id') id: string,
    @Body() body: LiberarAntecipadamenteDto
  ): Promise<Pessoa> {
    return this.pessoasService.liberarAntecipadamente(id, body?.funcionario);
  }

  @Post(':id/foto')
  @UseInterceptors(FileInterceptor('foto', { limits: { fileSize: FILE_LIMITS.pessoaFoto } }))
  @ApiOperation({ summary: 'Upload de foto da pessoa' })
  @ApiResponse({ status: 200, description: 'Foto enviada com sucesso' })
  @ApiResponse({ status: 400, description: 'Arquivo inválido' })
  async uploadFoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Pessoa> {
    return this.pessoasService.uploadFoto(id, file);
  }

  @Delete(':id/foto')
  @Roles(UsuarioRole.GESTORA, UsuarioRole.COORDENADOR_ALBERGUE, UsuarioRole.EQUIPE_TECNICA)
  @ApiOperation({ summary: 'Remover foto da pessoa' })
  @ApiResponse({ status: 200, description: 'Foto removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Pessoa não encontrada' })
  async deleteFoto(@Param('id') id: string): Promise<Pessoa> {
    return this.pessoasService.deleteFoto(id);
  }
}
