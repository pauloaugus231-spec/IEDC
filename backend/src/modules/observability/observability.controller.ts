import { Body, Controller, Get, HttpCode, Post, Query, Req } from '@nestjs/common';
import { Public } from '../../auth/public.decorator';
import { Roles } from '../../auth/roles.decorator';
import { AuthRequest } from '../../auth/auth.types';
import { UsuarioRole } from '../../entities/usuario.entity';
import { ObservabilityEventLevel } from '../../entities/observability-event.entity';
import { RegisterFrontendErrorDto } from './dto/register-frontend-error.dto';
import { ObservabilityService } from './observability.service';

@Controller('observabilidade')
export class ObservabilityController {
  constructor(private readonly observabilityService: ObservabilityService) {}

  @Public()
  @Post('frontend-errors')
  @HttpCode(202)
  async registrarFrontendError(@Body() body: RegisterFrontendErrorDto, @Req() request: AuthRequest) {
    await this.observabilityService.registrarFrontendError(body, {
      requestId: request.requestId,
      ip: request.ip,
      userAgent: typeof request.get === 'function' ? request.get('user-agent') : undefined,
      actor: request.user ?? null,
    });

    return { status: 'accepted', requestId: request.requestId };
  }

  @Roles(UsuarioRole.SUPORTE)
  @Get('sistema/status')
  getSystemStatus() {
    return this.observabilityService.getSystemStatus();
  }

  @Roles(UsuarioRole.SUPORTE)
  @Get('backups/status')
  getBackupStatus() {
    return this.observabilityService.getBackupStatus();
  }

  @Roles(UsuarioRole.SUPORTE)
  @Get('eventos')
  listarEventos(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tipo') tipo?: string,
    @Query('origem') origem?: string,
    @Query('nivel') nivel?: ObservabilityEventLevel | '',
    @Query('horas') horas?: string,
  ) {
    return this.observabilityService.listarEventos({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      tipo,
      origem,
      nivel,
      horas: horas ? Number(horas) : undefined,
    });
  }
}
