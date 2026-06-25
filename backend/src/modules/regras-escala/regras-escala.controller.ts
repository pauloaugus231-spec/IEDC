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
import { RegrasEscalaService, CreateRegraEscalaDto, UpdateRegraEscalaDto } from './regras-escala.service';
import { RegraEscala } from '../../entities/regra-escala.entity';
import { Roles } from '../../auth/roles.decorator';
import { ALBERGUE_COORDINATION_ROLES } from '../../auth/albergue-roles';

@ApiTags('escala/regras')
@Controller('regras-escala')
@Roles(...ALBERGUE_COORDINATION_ROLES)
export class RegrasEscalaController {
  constructor(private readonly regrasEscalaService: RegrasEscalaService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova regra de escala' })
  @ApiResponse({ status: 201, description: 'Regra criada com sucesso', type: RegraEscala })
  create(@Body() createRegraEscalaDto: CreateRegraEscalaDto): Promise<RegraEscala> {
    return this.regrasEscalaService.create(createRegraEscalaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as regras de escala' })
  @ApiResponse({ status: 200, description: 'Lista de regras de escala' })
  findAll(): Promise<RegraEscala[]> {
    return this.regrasEscalaService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar regra de escala por ID' })
  @ApiResponse({ status: 200, description: 'Regra encontrada', type: RegraEscala })
  findOne(@Param('id') id: string): Promise<RegraEscala> {
    return this.regrasEscalaService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar regra de escala' })
  @ApiResponse({ status: 200, description: 'Regra atualizada com sucesso', type: RegraEscala })
  update(@Param('id') id: string, @Body() updateRegraEscalaDto: UpdateRegraEscalaDto): Promise<RegraEscala> {
    return this.regrasEscalaService.update(id, updateRegraEscalaDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover regra de escala' })
  @ApiResponse({ status: 200, description: 'Regra removida com sucesso' })
  remove(@Param('id') id: string): Promise<void> {
    return this.regrasEscalaService.remove(id);
  }
}
