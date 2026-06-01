import { Controller, Get, Query, Req } from '@nestjs/common';
import { AuthRequest } from '../../auth/auth.types';
import { Roles } from '../../auth/roles.decorator';
import { UsuarioRole } from '../../entities/usuario.entity';
import { QualidadeDadosResponse, QualidadeDadosService } from './qualidade-dados.service';

@Controller('qualidade-dados')
@Roles(
  UsuarioRole.GESTORA,
  UsuarioRole.EQUIPE_TECNICA,
  UsuarioRole.COORDENADOR_ALBERGUE,
  UsuarioRole.EDUCADOR_ALBERGUE,
  UsuarioRole.COORDENADOR_CRECHE,
  UsuarioRole.EDUCADOR_CRECHE,
  UsuarioRole.FINANCEIRO,
)
export class QualidadeDadosController {
  constructor(private readonly qualidadeDadosService: QualidadeDadosService) {}

  @Get()
  listar(@Req() request: AuthRequest, @Query('area') area?: string): Promise<QualidadeDadosResponse> {
    return this.qualidadeDadosService.listar(request.user ?? null, area);
  }
}
