import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cama } from '../../entities/cama.entity';
import { buildCamasOficiais } from './camas.layout';

@Injectable()
export class CamasService implements OnModuleInit {
  constructor(
    @InjectRepository(Cama)
    private camasRepository: Repository<Cama>,
  ) {}

  async onModuleInit() {
    await this.seedCamas();
  }

  private async seedCamas() {
    const count = await this.camasRepository.count();
    if (count > 0) {
      // As camas já foram criadas
      return;
    }

    const camas: Partial<Cama>[] = buildCamasOficiais();
    await this.camasRepository.save(camas);
    console.log('Camas criadas com sucesso!');
  }

  async findAll(): Promise<Cama[]> {
    return this.camasRepository.find({ order: { casa: 'ASC', numero: 'ASC' } });
  }

  async getPessoasByCasa(casa: string) {
    // Query otimizada: uma única query com LEFT JOINs
    const resultado = await this.camasRepository
      .createQueryBuilder('cama')
      .leftJoin('estadias', 'estadia', 'estadia.cama_id = cama.id AND estadia.status = :status', { status: 'ativa' })
      .leftJoin('pessoas', 'pessoa', 'pessoa.id = estadia.pessoa_id')
      .where('cama.casa = :casa', { casa })
      .orderBy('cama.numero', 'ASC')
      .select([
        'cama.id as id',
        'cama.numero as numero',
        'cama.casa as casa',
        'cama.posicao as posicao',
        'cama.status as status',
        'estadia.id as estadia_id',
        'estadia.data_checkin as estadia_data_checkin',
        'estadia.data_limite as estadia_data_limite',
        'estadia.status as estadia_status',
        'pessoa.id as pessoa_id',
        'pessoa.nome as pessoa_nome',
        'pessoa.nome_social as pessoa_nome_social',
        'pessoa.cpf as pessoa_cpf',
        'pessoa.lgbt as pessoa_lgbt',
        'pessoa.status_cadastro as pessoa_status_cadastro',
      ])
      .getRawMany();

    // Transformar para o formato esperado pelo frontend
    return resultado.map(row => ({
      id: row.id,
      numero: row.numero,
      casa: row.casa,
      posicao: row.posicao,
      status: row.status,
      estadia: row.estadia_id ? {
        id: row.estadia_id,
        data_checkin: row.estadia_data_checkin,
        data_limite: row.estadia_data_limite,
        status: row.estadia_status,
        pessoa: {
          id: row.pessoa_id,
          nome: row.pessoa_nome,
          nome_social: row.pessoa_nome_social,
          cpf: row.pessoa_cpf,
          lgbt: row.pessoa_lgbt,
          status_cadastro: row.pessoa_status_cadastro,
        }
      } : null
    }));
  }
}
