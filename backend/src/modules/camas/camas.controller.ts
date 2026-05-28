import { Controller, Get, Param } from '@nestjs/common';
import { CamasService } from './camas.service';
import { Cama } from '../../entities/cama.entity';
import { Roles } from '../../auth/roles.decorator';
import { UsuarioRole } from '../../entities/usuario.entity';

@Controller('camas')
@Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.COORDENADOR_ALBERGUE, UsuarioRole.EDUCADOR_ALBERGUE)
export class CamasController {
  constructor(private readonly camasService: CamasService) {}

  @Get()
  async findAll(): Promise<Cama[]> {
    return this.camasService.findAll();
  }

  @Get('pessoas/:casa')
  async getPessoasByCasa(@Param('casa') casa: string) {
    return this.camasService.getPessoasByCasa(casa);
  }
}
