import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CrecheService } from './creche.service';
import { Roles } from '../../auth/roles.decorator';
import { UsuarioRole } from '../../entities/usuario.entity';
import {
  AtualizarCriancaTurmaDto,
  AtualizarTurmaProfessoraDto,
  CriarAcompanhamentoDto,
  CriarCriancaDto,
  ProfessoraDto,
  SalvarFrequenciaTurmaDto,
} from './dto/creche-operacao.dto';

@Controller(['escola', 'creche'])
@Roles(UsuarioRole.GESTORA, UsuarioRole.COORDENADOR_CRECHE, UsuarioRole.EDUCADOR_CRECHE)
export class CrecheController {
  constructor(private readonly crecheService: CrecheService) {}

  @Get('dashboard')
  getDashboard(
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
    @Query('periodo') periodo?: string,
  ) {
    return this.crecheService.getDashboard(inicio, fim, periodo);
  }

  @Get('afericao')
  getAfericao(@Query('inicio') inicio?: string, @Query('fim') fim?: string) {
    return this.crecheService.getAfericao(inicio, fim);
  }

  @Get('turmas')
  getTurmas() {
    return this.crecheService.getTurmas();
  }

  @Get('turmas/:id')
  getTurmaDetalhe(@Param('id') id: string) {
    return this.crecheService.getTurmaDetalhe(id);
  }

  @Patch('turmas/:id/professora')
  updateTurmaProfessora(@Param('id') id: string, @Body() body: AtualizarTurmaProfessoraDto) {
    return this.crecheService.updateTurmaProfessora(id, body);
  }

  @Get('professoras')
  getProfessoras() {
    return this.crecheService.getProfessoras();
  }

  @Post('professoras')
  createProfessora(@Body() body: ProfessoraDto) {
    return this.crecheService.createProfessora(body);
  }

  @Patch('professoras/:id')
  updateProfessora(@Param('id') id: string, @Body() body: ProfessoraDto) {
    return this.crecheService.updateProfessora(id, body);
  }

  @Get('criancas')
  getCriancas(
    @Query('search') search?: string,
    @Query('turmaId') turmaId?: string,
    @Query('status') status?: string,
  ) {
    return this.crecheService.getCriancas({ search, turmaId, status });
  }

  @Post('criancas')
  createCrianca(@Body() body: CriarCriancaDto) {
    return this.crecheService.createCrianca(body);
  }

  @Get('criancas/:codigo')
  getCriancaDetalhe(@Param('codigo') codigo: string) {
    return this.crecheService.getCriancaDetalhe(codigo);
  }

  @Patch('criancas/:codigo/turma')
  updateCriancaTurma(@Param('codigo') codigo: string, @Body() body: AtualizarCriancaTurmaDto) {
    return this.crecheService.updateCriancaTurma(codigo, body);
  }

  @Post('criancas/:codigo/acompanhamentos')
  createAcompanhamento(@Param('codigo') codigo: string, @Body() body: CriarAcompanhamentoDto) {
    return this.crecheService.createAcompanhamento(codigo, body);
  }

  @Get('frequencias')
  getFrequenciaTurma(@Query('turmaId') turmaId: string, @Query('data') data: string) {
    return this.crecheService.getFrequenciaTurma(turmaId, data);
  }

  @Post('frequencias')
  saveFrequenciaTurma(@Body() body: SalvarFrequenciaTurmaDto) {
    return this.crecheService.saveFrequenciaTurma(body);
  }
}
