import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { LojasService } from './lojas.service';
import { Roles } from '../../auth/roles.decorator';
import { UsuarioRole } from '../../entities/usuario.entity';
import { AuthRequest, AuthUser } from '../../auth/auth.types';

@Controller('lojas')
@Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.FINANCEIRO, UsuarioRole.LOJA_BAZAR, UsuarioRole.LOJA_BRECHO, UsuarioRole.LOJA_FEIRAO)
export class LojasController {
  constructor(private readonly lojasService: LojasService) {}

  @Get('dashboard')
  @Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.FINANCEIRO)
  getDashboard(@Query('periodo') periodo?: string) {
    return this.lojasService.getDashboard(periodo);
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
  createProduto(@Req() req: AuthRequest, @Body() body: any) {
    const lojaSlug = this.resolveLojaScope(req.user, body?.lojaSlug);
    return this.lojasService.createProduto({ ...body, lojaSlug });
  }

  @Patch('produtos/:id')
  updateProduto(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: any) {
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
  createCliente(@Body() body: any) {
    return this.lojasService.createCliente(body);
  }

  @Patch('clientes/:id')
  updateCliente(@Param('id') id: string, @Body() body: any) {
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
    return this.lojasService.getComandas({
      status,
      lojaSlug: this.resolveLojaScope(req.user, lojaSlug),
      periodo,
    });
  }

  @Post('comandas')
  createComanda(@Body() body: any) {
    return this.lojasService.createComanda(body);
  }

  @Get('comandas/:id')
  getComanda(@Req() req: AuthRequest, @Param('id') id: string, @Query('lojaSlug') lojaSlug?: string) {
    return this.lojasService.getComandaDetalhe(id, this.resolveLojaScope(req.user, lojaSlug));
  }

  @Post('comandas/:id/itens')
  addItem(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: any) {
    const lojaSlug = this.resolveLojaScope(req.user, body?.lojaSlug);
    return this.lojasService.addItem(id, { ...body, lojaSlug });
  }

  @Delete('comandas/:id/itens/:itemId')
  removeItem(@Req() req: AuthRequest, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.lojasService.removeItem(id, itemId, this.getLojaPermitida(req.user));
  }

  @Post('comandas/:id/pagamentos')
  @Roles(UsuarioRole.FINANCEIRO)
  registrarPagamento(@Param('id') id: string, @Body() body: any) {
    return this.lojasService.registrarPagamento(id, body);
  }

  @Patch('comandas/:id/status')
  @Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.FINANCEIRO)
  updateStatus(@Param('id') id: string, @Body() body: any) {
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
    });
  }

  @Patch('retiradas/:id/confirmar')
  confirmarRetirada(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: any) {
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
}
