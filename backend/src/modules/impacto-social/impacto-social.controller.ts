import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ImpactoSocialService } from './impacto-social.service';
import { Roles } from '../../auth/roles.decorator';
import { UsuarioRole } from '../../entities/usuario.entity';
import { CreateRespostaAlbergueDto } from './dto/create-resposta-albergue.dto';

@Controller('impacto-social')
@Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.COORDENADOR_ALBERGUE, UsuarioRole.EDUCADOR_ALBERGUE)
export class ImpactoSocialController {
  constructor(private readonly impactoSocialService: ImpactoSocialService) {}

  @Get('albergue')
  getDashboard(
    @Query('periodo') periodo?: string,
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
  ) {
    return this.impactoSocialService.getDashboardAlbergue({ periodo, inicio, fim });
  }

  @Post('albergue/respostas')
  createResposta(@Body() body: CreateRespostaAlbergueDto) {
    return this.impactoSocialService.createRespostaAlbergue(body);
  }
}
