import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { LojasCaixaService } from './lojas-caixa.service';
import { LojasService } from './lojas.service';
import { Roles } from '../../auth/roles.decorator';
import { UsuarioRole } from '../../entities/usuario.entity';
import { AuthRequest, AuthUser } from '../../auth/auth.types';
import {
  AdicionarItemDto,
  AbrirCaixaDto,
  AtualizarStatusComandaDto,
  ClienteDto,
  ConfirmarRetiradaDto,
  CriarComandaDto,
  FecharCaixaDto,
  ProdutoDto,
  RegistrarPagamentoDto,
} from './dto/lojas-operacao.dto';

@Controller('lojas')
@Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.FINANCEIRO, UsuarioRole.LOJA_BAZAR, UsuarioRole.LOJA_BRECHO, UsuarioRole.LOJA_FEIRAO)
export class LojasController {
  constructor(
    private readonly lojasService: LojasService,
    private readonly caixaService: LojasCaixaService,
  ) {}

  @Get('dashboard')
  @Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.FINANCEIRO)
  getDashboard(@Query('periodo') periodo?: string) {
    return this.lojasService.getDashboard(periodo);
  }

  @Get('relatorio-financeiro')
  @Roles(UsuarioRole.GESTORA, UsuarioRole.FINANCEIRO)
  getRelatorioFinanceiro(@Query('periodo') periodo?: string) {
    return this.lojasService.getRelatorioFinanceiro(periodo);
  }

  @Get('relatorio-financeiro/drilldown')
  @Roles(UsuarioRole.GESTORA, UsuarioRole.FINANCEIRO)
  getRelatorioFinanceiroDrilldown(
    @Query('periodo') periodo?: string,
    @Query('dimension') dimension?: string,
    @Query('key') key?: string,
  ) {
    return this.lojasService.getRelatorioFinanceiroDrilldown(periodo, dimension, key);
  }

  @Get('caixa')
  @Roles(UsuarioRole.FINANCEIRO)
  getCaixaAtual() {
    return this.caixaService.getCaixaAtual();
  }

  @Post('caixa/abrir')
  @Roles(UsuarioRole.FINANCEIRO)
  abrirCaixa(@Body() body: AbrirCaixaDto) {
    return this.caixaService.abrirCaixa(body);
  }

  @Post('caixa/fechar')
  @Roles(UsuarioRole.FINANCEIRO)
  fecharCaixa(@Body() body: FecharCaixaDto) {
    return this.caixaService.fecharCaixa(body);
  }

  @Get('lojas')
  getLojas() {
    return this.lojasService.getLojas();
  }

  @Get('produtos')
  getProdutos(@Req() req: AuthRequest, @Query('lojaSlug') lojaSlug?: string) {
    return this.lojasService.getProdutos(this.resolveLojaScope(req.user, lojaSlug));
  }

  @Post('produtos')
  createProduto(@Req() req: AuthRequest, @Body() body: ProdutoDto) {
    const lojaSlug = this.resolveLojaScope(req.user, body?.lojaSlug);
    return this.lojasService.createProduto({ ...body, lojaSlug });
  }

  @Patch('produtos/:id')
  updateProduto(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: ProdutoDto) {
    return this.lojasService.updateProduto(id, {
      ...body,
      lojaSlugPermitido: this.getLojaPermitida(req.user),
    });
  }

  @Get('clientes')
  getClientes(@Query('search') search?: string) {
    return this.lojasService.getClientes(search);
  }

  @Post('clientes')
  createCliente(@Body() body: ClienteDto) {
    return this.lojasService.createCliente(body);
  }

  @Patch('clientes/:id')
  updateCliente(@Param('id') id: string, @Body() body: ClienteDto) {
    return this.lojasService.updateCliente(id, body);
  }

  @Get('fechamento/excel')
  @Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.FINANCEIRO)
  async exportFechamentoExcel(@Query('periodo') periodo: string | undefined, @Res() res: Response) {
    const buffer = await this.lojasService.exportFechamentoExcel(periodo);
    const dataAtual = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="fechamento-lojas-${dataAtual}.xlsx"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Get('fechamento/pdf')
  @Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.FINANCEIRO)
  async exportFechamentoPdf(@Query('periodo') periodo: string | undefined, @Res() res: Response) {
    const buffer = await this.lojasService.exportFechamentoPdf(periodo);
    const dataAtual = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="fechamento-lojas-${dataAtual}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Get('comandas')
  getComandas(
    @Req() req: AuthRequest,
    @Query('status') status?: string,
    @Query('lojaSlug') lojaSlug?: string,
    @Query('periodo') periodo?: string,
  ) {
    if (this.getLojaPermitida(req.user) && status === 'recentes') {
      throw new ForbiddenException('A loja não acessa histórico financeiro por período.');
    }

    return this.lojasService.getComandas({
      status,
      lojaSlug: this.resolveLojaScope(req.user, lojaSlug),
      periodo,
    }).then((comandas) => this.maskComandasForStore(req.user, comandas));
  }

  @Post('comandas')
  createComanda(@Body() body: CriarComandaDto) {
    return this.lojasService.createComanda(body);
  }

  @Get('comandas/:id')
  getComanda(@Req() req: AuthRequest, @Param('id') id: string, @Query('lojaSlug') lojaSlug?: string) {
    return this.lojasService.getComandaDetalhe(id, this.resolveLojaScope(req.user, lojaSlug));
  }

  @Post('comandas/:id/itens')
  addItem(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: AdicionarItemDto) {
    const lojaSlug = this.resolveLojaScope(req.user, body?.lojaSlug);
    return this.lojasService.addItem(id, { ...body, lojaSlug });
  }

  @Delete('comandas/:id/itens/:itemId')
  removeItem(@Req() req: AuthRequest, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.lojasService.removeItem(id, itemId, this.getLojaPermitida(req.user));
  }

  @Post('comandas/:id/pagamentos')
  @Roles(UsuarioRole.FINANCEIRO)
  registrarPagamento(@Param('id') id: string, @Body() body: RegistrarPagamentoDto) {
    return this.lojasService.registrarPagamento(id, body);
  }

  @Patch('comandas/:id/status')
  @Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.FINANCEIRO)
  updateStatus(@Param('id') id: string, @Body() body: AtualizarStatusComandaDto) {
    return this.lojasService.updateStatus(id, body);
  }

  @Get('retiradas')
  getRetiradas(
    @Req() req: AuthRequest,
    @Query('lojaSlug') lojaSlug?: string,
    @Query('status') status?: string,
    @Query('periodo') periodo?: string,
  ) {
    return this.lojasService.getRetiradas({
      lojaSlug: this.resolveLojaScope(req.user, lojaSlug),
      status,
      periodo,
    }).then((retiradas) => this.maskRetiradasForStore(req.user, retiradas));
  }

  @Patch('retiradas/:id/confirmar')
  confirmarRetirada(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: ConfirmarRetiradaDto) {
    return this.lojasService.confirmarRetirada(id, {
      ...body,
      lojaSlugPermitido: this.getLojaPermitida(req.user),
    });
  }

  private getLojaPermitida(user?: AuthUser): string | undefined {
    if (user?.role === UsuarioRole.LOJA_BAZAR) return 'bazar';
    if (user?.role === UsuarioRole.LOJA_BRECHO) return 'brecho';
    if (user?.role === UsuarioRole.LOJA_FEIRAO) return 'feirao';
    return undefined;
  }

  private resolveLojaScope(user: AuthUser | undefined, requestedLojaSlug?: string): string | undefined {
    const lojaPermitida = this.getLojaPermitida(user);

    if (!lojaPermitida) {
      return requestedLojaSlug;
    }

    if (requestedLojaSlug && requestedLojaSlug !== lojaPermitida) {
      throw new ForbiddenException('Este perfil não pode acessar dados de outra loja.');
    }

    return lojaPermitida;
  }

  private maskRetiradasForStore(user: AuthUser | undefined, retiradas: Awaited<ReturnType<LojasService['getRetiradas']>>) {
    if (!this.getLojaPermitida(user)) {
      return retiradas;
    }

    return retiradas.map((retirada) => ({
      ...retirada,
      total: 0,
    }));
  }

  private maskComandasForStore(user: AuthUser | undefined, comandas: Awaited<ReturnType<LojasService['getComandas']>>) {
    if (!this.getLojaPermitida(user)) {
      return comandas;
    }

    return comandas.map((comanda) => ({
      ...comanda,
      total: 0,
      pago: 0,
      saldo: 0,
      totalLoja: 0,
    }));
  }
}
