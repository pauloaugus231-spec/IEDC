import { DataSource } from 'typeorm';
import { Pessoa } from '../entities/pessoa.entity';
import { Estadia } from '../entities/estadia.entity';
import { Bloqueio } from '../entities/bloqueio.entity';
import { Ocorrencia } from '../entities/ocorrencia.entity';
import { Solicitacao } from '../entities/solicitacao.entity';
import { Cama } from '../entities/cama.entity';
import { Colaborador } from '../entities/colaborador.entity';
import { Turno } from '../entities/turno.entity';
import { RegraEscala } from '../entities/regra-escala.entity';
import { Plantao } from '../entities/plantao.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  database: process.env.DB_NAME || 'albergue',
  entities: [Pessoa, Estadia, Bloqueio, Ocorrencia, Solicitacao, Cama, Colaborador, Turno, RegraEscala, Plantao],
  synchronize: true,
  logging: true,
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
});
