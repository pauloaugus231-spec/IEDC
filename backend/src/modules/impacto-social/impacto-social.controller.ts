import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ImpactoSocialService } from './impacto-social.service';
import { Roles } from '../../auth/roles.decorator';
import { CreateRespostaAlbergueDto } from './dto/create-resposta-albergue.dto';
import { ALBERGUE_OPERATION_ROLES, ALBERGUE_READ_ROLES } from '../../auth/albergue-roles';

@Controller('impacto-social')
@Roles(...ALBERGUE_READ_ROLES)
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
  @Roles(...ALBERGUE_OPERATION_ROLES)
  createResposta(@Body() body: CreateRespostaAlbergueDto) {
    return this.impactoSocialService.createRespostaAlbergue(body);
  }
}
