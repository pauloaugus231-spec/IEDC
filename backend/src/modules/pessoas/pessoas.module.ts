import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Pessoa } from '../../entities/pessoa.entity';
import { Bloqueio } from '../../entities/bloqueio.entity';
import { Ocorrencia } from '../../entities/ocorrencia.entity';
import { PessoasController } from './pessoas.controller';
import { PessoasService } from './pessoas.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pessoa, Bloqueio, Ocorrencia]),
    MulterModule.register({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  ],
  controllers: [PessoasController],
  providers: [PessoasService],
  exports: [PessoasService],
})
export class PessoasModule {}
