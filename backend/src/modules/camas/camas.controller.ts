import { Controller, Get, Param } from '@nestjs/common';
import { CamasService } from './camas.service';
import { Cama } from '../../entities/cama.entity';
import { Roles } from '../../auth/roles.decorator';
import { ALBERGUE_OPERATIONAL_READ_ROLES } from '../../auth/albergue-roles';

@Controller('camas')
@Roles(...ALBERGUE_OPERATIONAL_READ_ROLES)
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
