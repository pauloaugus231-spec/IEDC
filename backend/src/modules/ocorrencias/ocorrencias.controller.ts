import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { OcorrenciasService } from './ocorrencias.service';
import { CreateOcorrenciaDto } from './dto/create-ocorrencia.dto';
import { UpdateOcorrenciaDto } from './dto/update-ocorrencia.dto';

@Controller('ocorrencias')
export class OcorrenciasController {
  constructor(private readonly ocorrenciasService: OcorrenciasService) {}

  @Post()
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
  update(@Param('id') id: string, @Body() dto: UpdateOcorrenciaDto) {
    return this.ocorrenciasService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ocorrenciasService.remove(id);
  }
}
