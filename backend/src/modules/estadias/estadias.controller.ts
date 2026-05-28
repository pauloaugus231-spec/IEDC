import { Controller, Post, Param, Body, Get, UsePipes, ValidationPipe, Patch, NotFoundException } from '@nestjs/common';
import { EstadiasService } from './estadias.service';
import { CheckoutAutomaticoService } from './checkout-automatico.service';
import { CreateCheckinDto } from './dto/create-checkin.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CreateProrrogacaoDto } from './dto/create-prorrogacao.dto';
import { MotivoSaida } from '../../entities/estadia.entity';
import { Roles } from '../../auth/roles.decorator';
import { UsuarioRole } from '../../entities/usuario.entity';

@Controller('estadias')
@Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.COORDENADOR_ALBERGUE, UsuarioRole.EDUCADOR_ALBERGUE)
export class EstadiasController {
  constructor(
    private readonly estadiasService: EstadiasService,
    private readonly checkoutAutomaticoService: CheckoutAutomaticoService,
  ) {}

  @Post('checkin')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async checkin(@Body() createCheckinDto: CreateCheckinDto) {
    return this.estadiasService.checkin(createCheckinDto);
  }

  @Post('checkout')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async checkout(@Body() createCheckoutDto: CreateCheckoutDto) {
    const { pessoa_id, funcionario, observacoes_checkout, motivo_saida } = createCheckoutDto;
    return this.estadiasService.checkout(pessoa_id, funcionario, observacoes_checkout, motivo_saida as unknown as MotivoSaida);
  }

  @Post('abandono')
  async registrarAbandono(@Body() body: { pessoa_id: string; funcionario?: string; observacoes?: string }) {
    return this.estadiasService.registrarAbandono(body.pessoa_id, body.funcionario, body.observacoes);
  }

  @Get('pessoa/:pessoa_id')
  async getByPessoa(@Param('pessoa_id') pessoa_id: string) {
    return this.estadiasService.findByPessoaId(pessoa_id);
  }

  @Post('checkout-automatico')
  @Roles(UsuarioRole.GESTORA, UsuarioRole.COORDENADOR_ALBERGUE)
  async forcarCheckoutAutomatico() {
    this.assertMaintenanceRoutesEnabled();
    return this.checkoutAutomaticoService.handleCheckoutAutomatico();
  }

  @Get('diagnostico-checkout')
  @Roles(UsuarioRole.GESTORA, UsuarioRole.COORDENADOR_ALBERGUE)
  async diagnosticarCheckout() {
    this.assertMaintenanceRoutesEnabled();
    return this.estadiasService.diagnosticarCheckoutPendente();
  }

  @Post('forcar-checkout/:pessoa_id')
  @Roles(UsuarioRole.GESTORA, UsuarioRole.COORDENADOR_ALBERGUE)
  async forcarCheckoutPorPessoa(@Param('pessoa_id') pessoa_id: string) {
    this.assertMaintenanceRoutesEnabled();
    // Força checkout usando o método testado do service
    try {
      const result = await this.estadiasService.checkout(
        pessoa_id,
        'sistema_forcado',
        'Checkout forçado manualmente via endpoint',
        undefined
      );
      return {
        success: true,
        message: 'Checkout realizado com sucesso',
        estadia: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  @Patch(':id/prorrogar')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async prorrogacao(@Param('id') id: string, @Body() createProrrogacaoDto: CreateProrrogacaoDto) {
    return this.estadiasService.prorrogacao(id, createProrrogacaoDto.dias, createProrrogacaoDto.motivo);
  }

  @Post('trocar-cama')
  async trocarCama(@Body() { estadia_origem_id, cama_destino_id }: { estadia_origem_id: string, cama_destino_id: string }) {
    return this.estadiasService.trocarCama(estadia_origem_id, cama_destino_id);
  }

  @Post('corrigir-duplicacoes')
  @Roles(UsuarioRole.GESTORA, UsuarioRole.COORDENADOR_ALBERGUE)
  async corrigirDuplicacoes() {
    this.assertMaintenanceRoutesEnabled();
    return this.estadiasService.corrigirDuplicacoes();
  }

  @Get('diagnosticar-camas')
  @Roles(UsuarioRole.GESTORA, UsuarioRole.COORDENADOR_ALBERGUE)
  async diagnosticarCamas() {
    this.assertMaintenanceRoutesEnabled();
    return this.estadiasService.diagnosticarCamas();
  }

  private assertMaintenanceRoutesEnabled() {
    if (process.env.ENABLE_MAINTENANCE_ROUTES !== 'true') {
      throw new NotFoundException('Rota indisponível.');
    }
  }
}
