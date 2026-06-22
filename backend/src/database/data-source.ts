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

function resolveDatabaseEnv(name: string, fallback?: string) {
  const value = process.env[name];

  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} precisa ser definido em produção.`);
  }

  return value || fallback;
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: resolveDatabaseEnv('DB_ALBERGUE_HOST', 'localhost'),
  port: parseInt(resolveDatabaseEnv('DB_ALBERGUE_PORT', '5433') || '5433'),
  username: resolveDatabaseEnv('DB_ALBERGUE_USER', 'iedc_albergue_app'),
  password: resolveDatabaseEnv('DB_ALBERGUE_PASSWORD'),
  database: resolveDatabaseEnv('DB_ALBERGUE_NAME', 'iedc_albergue'),
  entities: [
    Pessoa,
    Estadia,
    Bloqueio,
    Ocorrencia,
    Solicitacao,
    Cama,
    Colaborador,
    Turno,
    RegraEscala,
    Plantao,
  ],
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  migrations: ['src/database/migrations/albergue/*.ts'],
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
});
