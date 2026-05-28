import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { OcorrenciasService } from './ocorrencias.service';
import { CreateOcorrenciaDto } from './dto/create-ocorrencia.dto';
import { UpdateOcorrenciaDto } from './dto/update-ocorrencia.dto';
import { Roles } from '../../auth/roles.decorator';
import { UsuarioRole } from '../../entities/usuario.entity';

@Controller('ocorrencias')
@Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.COORDENADOR_ALBERGUE, UsuarioRole.EDUCADOR_ALBERGUE)
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
  @Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.COORDENADOR_ALBERGUE)
  update(@Param('id') id: string, @Body() dto: UpdateOcorrenciaDto) {
    return this.ocorrenciasService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.COORDENADOR_ALBERGUE)
  remove(@Param('id') id: string) {
    return this.ocorrenciasService.remove(id);
  }
}
