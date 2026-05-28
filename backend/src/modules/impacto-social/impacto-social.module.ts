import { Module } from '@nestjs/common';
import { ImpactoSocialController } from './impacto-social.controller';
import { ImpactoSocialService } from './impacto-social.service';

@Module({
  controllers: [ImpactoSocialController],
  providers: [ImpactoSocialService],
})
export class ImpactoSocialModule {}
