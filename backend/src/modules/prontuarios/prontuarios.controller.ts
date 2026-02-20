import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProntuariosService } from './prontuarios.service';
import { CreateProntuarioDto } from './dto/create-prontuario.dto';
import { UpdateProntuarioDto } from './dto/update-prontuario.dto';
import { Prontuario, TipoProntuario, StatusProntuario } from '../../entities/prontuario.entity';

@ApiTags('prontuarios')
@Controller('prontuarios')
export class ProntuariosController {
  constructor(private readonly prontuariosService: ProntuariosService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo prontuário' })
  @ApiResponse({ status: 201, description: 'Prontuário criado com sucesso', type: Prontuario })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@Body() createDto: CreateProntuarioDto): Promise<Prontuario> {
    return this.prontuariosService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os prontuários com filtros' })
  @ApiQuery({ name: 'pessoa_id', required: false, type: String })
  @ApiQuery({ name: 'tipo', required: false, enum: TipoProntuario })
  @ApiQuery({ name: 'status', required: false, enum: StatusProntuario })
  @ApiQuery({ name: 'modulo_origem', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de prontuários' })
  async findAll(
    @Query('pessoa_id') pessoa_id?: string,
    @Query('tipo') tipo?: TipoProntuario,
    @Query('status') status?: StatusProntuario,
    @Query('modulo_origem') modulo_origem?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{ prontuarios: Prontuario[]; total: number }> {
    return this.prontuariosService.findAll({
      pessoa_id,
      tipo,
      status,
      modulo_origem,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('pessoa/:pessoa_id')
  @ApiOperation({ summary: 'Buscar prontuários de uma pessoa' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de prontuários da pessoa' })
  async findByPessoa(
    @Param('pessoa_id') pessoa_id: string,
    @Query('limit') limit?: string,
  ): Promise<Prontuario[]> {
    return this.prontuariosService.findByPessoa(
      pessoa_id,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get('estatisticas')
  @ApiOperation({ summary: 'Obter estatísticas de prontuários' })
  @ApiQuery({ name: 'pessoa_id', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Estatísticas de prontuários' })
  async getEstatisticas(@Query('pessoa_id') pessoa_id?: string) {
    return this.prontuariosService.getEstatisticas(pessoa_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar prontuário por ID' })
  @ApiResponse({ status: 200, description: 'Prontuário encontrado', type: Prontuario })
  @ApiResponse({ status: 404, description: 'Prontuário não encontrado' })
  async findOne(@Param('id') id: string): Promise<Prontuario> {
    return this.prontuariosService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar prontuário' })
  @ApiResponse({ status: 200, description: 'Prontuário atualizado com sucesso', type: Prontuario })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProntuarioDto,
  ): Promise<Prontuario> {
    return this.prontuariosService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar prontuário' })
  @ApiResponse({ status: 200, description: 'Prontuário deletado com sucesso' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.prontuariosService.remove(id);
  }
}
