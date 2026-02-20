import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegraEscala } from '../../entities/regra-escala.entity';
import { RegrasEscalaController } from './regras-escala.controller';
import { RegrasEscalaService } from './regras-escala.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RegraEscala]),
  ],
  controllers: [RegrasEscalaController],
  providers: [RegrasEscalaService],
  exports: [RegrasEscalaService],
})
export class RegrasEscalaModule {}
