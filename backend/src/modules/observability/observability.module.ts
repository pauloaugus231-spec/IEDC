import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservabilityEvent } from '../../entities/observability-event.entity';
import { CORE_DATABASE_CONNECTION } from '../../config/database.config';
import { ObservabilityController } from './observability.controller';
import { ObservabilityService } from './observability.service';

@Module({
  imports: [TypeOrmModule.forFeature([ObservabilityEvent], CORE_DATABASE_CONNECTION)],
  controllers: [ObservabilityController],
  providers: [ObservabilityService],
  exports: [ObservabilityService],
})
export class ObservabilityModule {}
