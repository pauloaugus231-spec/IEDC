import { Module } from '@nestjs/common';
import { ImpactoSocialController } from './impacto-social.controller';
import { ImpactoSocialService } from './impacto-social.service';
import { ImpactoSocialLegacyMigrationService } from './impacto-social-legacy-migration.service';

@Module({
  controllers: [ImpactoSocialController],
  providers: [ImpactoSocialService, ImpactoSocialLegacyMigrationService],
})
export class ImpactoSocialModule {}
