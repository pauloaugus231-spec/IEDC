import { Controller, Get, Param } from '@nestjs/common';
import { CamasService } from './camas.service';
import { Cama } from '../../entities/cama.entity';

@Controller('camas')
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
