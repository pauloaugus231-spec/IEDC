import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cama } from '../../entities/cama.entity';
import { CamasService } from './camas.service';
import { CamasController } from './camas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Cama])],
  providers: [CamasService],
  controllers: [CamasController],
  exports: [CamasService],
})
export class CamasModule {}
