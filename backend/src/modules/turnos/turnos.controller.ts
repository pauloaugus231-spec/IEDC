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
import { TurnosService, CreateTurnoDto, UpdateTurnoDto } from './turnos.service';
import { Turno } from '../../entities/turno.entity';
import { Roles } from '../../auth/roles.decorator';
import { UsuarioRole } from '../../entities/usuario.entity';

@ApiTags('turnos')
@Controller('turnos')
@Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.COORDENADOR_ALBERGUE)
export class TurnosController {
  constructor(private readonly turnosService: TurnosService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo turno' })
  @ApiResponse({ status: 201, description: 'Turno criado com sucesso', type: Turno })
  create(@Body() createTurnoDto: CreateTurnoDto): Promise<Turno> {
    return this.turnosService.create(createTurnoDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os turnos' })
  @ApiResponse({ status: 200, description: 'Lista de turnos' })
  findAll(): Promise<Turno[]> {
    return this.turnosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar turno por ID' })
  @ApiResponse({ status: 200, description: 'Turno encontrado', type: Turno })
  findOne(@Param('id') id: string): Promise<Turno> {
    return this.turnosService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar turno' })
  @ApiResponse({ status: 200, description: 'Turno atualizado com sucesso', type: Turno })
  update(@Param('id') id: string, @Body() updateTurnoDto: UpdateTurnoDto): Promise<Turno> {
    return this.turnosService.update(id, updateTurnoDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover turno' })
  @ApiResponse({ status: 200, description: 'Turno removido com sucesso' })
  remove(@Param('id') id: string): Promise<void> {
    return this.turnosService.remove(id);
  }
}
