import { Module } from '@nestjs/common';
import { CrecheController } from './creche.controller';
import { CrecheService } from './creche.service';

@Module({
  controllers: [CrecheController],
  providers: [CrecheService],
})
export class CrecheModule {}
