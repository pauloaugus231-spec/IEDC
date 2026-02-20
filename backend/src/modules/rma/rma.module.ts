import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { RmaController } from './rma.controller';
import { RmaService } from './rma.service';
import { Pessoa } from '../../entities/pessoa.entity';
import { Estadia } from '../../entities/estadia.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pessoa, Estadia]),
    MulterModule.register({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  ],
  controllers: [RmaController],
  providers: [RmaService],
  exports: [RmaService],
})
export class RmaModule {}
