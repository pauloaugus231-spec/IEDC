import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ColaboradoresService, ColaboradorResponse, CreateColaboradorDto, UpdateColaboradorDto } from './colaboradores.service';
import { Colaborador } from '../../entities/colaborador.entity';
import { Roles } from '../../auth/roles.decorator';
import { UsuarioRole } from '../../entities/usuario.entity';

@ApiTags('colaboradores')
@Controller('colaboradores')
@Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.COORDENADOR_ALBERGUE)
export class ColaboradoresController {
  constructor(private readonly colaboradoresService: ColaboradoresService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo colaborador' })
  @ApiResponse({ status: 201, description: 'Colaborador criado com sucesso', type: Colaborador })
  create(@Body() createColaboradorDto: CreateColaboradorDto): Promise<ColaboradorResponse> {
    return this.colaboradoresService.create(createColaboradorDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os colaboradores' })
  @ApiResponse({ status: 200, description: 'Lista de colaboradores' })
  findAll(): Promise<ColaboradorResponse[]> {
    return this.colaboradoresService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar colaborador por ID' })
  @ApiResponse({ status: 200, description: 'Colaborador encontrado', type: Colaborador })
  findOne(@Param('id') id: string): Promise<ColaboradorResponse> {
    return this.colaboradoresService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar colaborador' })
  @ApiResponse({ status: 200, description: 'Colaborador atualizado com sucesso', type: Colaborador })
  update(@Param('id') id: string, @Body() updateColaboradorDto: UpdateColaboradorDto): Promise<ColaboradorResponse> {
    return this.colaboradoresService.update(id, updateColaboradorDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover colaborador' })
  @ApiResponse({ status: 200, description: 'Colaborador removido com sucesso' })
  remove(@Param('id') id: string): Promise<void> {
    return this.colaboradoresService.remove(id);
  }
}
