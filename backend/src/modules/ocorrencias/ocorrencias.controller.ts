import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { OcorrenciasService } from './ocorrencias.service';
import { CreateOcorrenciaDto } from './dto/create-ocorrencia.dto';
import { UpdateOcorrenciaDto } from './dto/update-ocorrencia.dto';
import { Roles } from '../../auth/roles.decorator';
import {
  ALBERGUE_COORDINATION_ROLES,
  ALBERGUE_OPERATION_ROLES,
  ALBERGUE_OPERATIONAL_READ_ROLES,
} from '../../auth/albergue-roles';

@Controller('ocorrencias')
@Roles(...ALBERGUE_OPERATIONAL_READ_ROLES)
export class OcorrenciasController {
  constructor(private readonly ocorrenciasService: OcorrenciasService) {}

  @Post()
  @Roles(...ALBERGUE_OPERATION_ROLES)
  create(@Body() dto: CreateOcorrenciaDto) {
    return this.ocorrenciasService.create(dto);
  }

  @Get()
  findAll() {
    return this.ocorrenciasService.findAll();
  }

  @Get('pessoa/:pessoa_id')
  findByPessoa(@Param('pessoa_id') pessoa_id: string) {
    return this.ocorrenciasService.findByPessoa(pessoa_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ocorrenciasService.findOne(id);
  }

  @Patch(':id')
  @Roles(...ALBERGUE_COORDINATION_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdateOcorrenciaDto) {
    return this.ocorrenciasService.update(id, dto);
  }

  @Delete(':id')
  @Roles(...ALBERGUE_COORDINATION_ROLES)
  remove(@Param('id') id: string) {
    return this.ocorrenciasService.remove(id);
  }
}
