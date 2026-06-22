import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Auditoria } from '../entities/auditoria.entity';
import { Bloqueio } from '../entities/bloqueio.entity';
import { Cama } from '../entities/cama.entity';
import { Colaborador } from '../entities/colaborador.entity';
import { Escala } from '../entities/escala.entity';
import { Estadia } from '../entities/estadia.entity';
import { ObservabilityEvent } from '../entities/observability-event.entity';
import { Ocorrencia } from '../entities/ocorrencia.entity';
import { Pessoa } from '../entities/pessoa.entity';
import { Plantao } from '../entities/plantao.entity';
import { RegraEscala } from '../entities/regra-escala.entity';
import { Solicitacao } from '../entities/solicitacao.entity';
import { Turno } from '../entities/turno.entity';
import { Usuario } from '../entities/usuario.entity';

export const CORE_DATABASE_CONNECTION = 'core';

function resolveDatabaseEnv(name: string, fallback?: string) {
  const value = process.env[name];

  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} precisa ser definido em producao.`);
  }

  return value || fallback;
}

const commonOptions = {
  type: 'postgres' as const,
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
};

// A conexao padrao pertence exclusivamente ao dominio Albergue.
export const albergueDatabaseConfig: TypeOrmModuleOptions = {
  ...commonOptions,
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
    Escala,
    Colaborador,
    Turno,
    RegraEscala,
    Plantao,
  ],
  migrations: ['dist/database/migrations/albergue/*.js'],
};

// Core guarda login, auditoria e os modulos ainda nao separados nesta etapa.
export const coreDatabaseConfig: TypeOrmModuleOptions = {
  ...commonOptions,
  name: CORE_DATABASE_CONNECTION,
  host: resolveDatabaseEnv('DB_HOST', 'localhost'),
  port: parseInt(resolveDatabaseEnv('DB_PORT', '5432') || '5432'),
  username: resolveDatabaseEnv('DB_USER', 'postgres'),
  password: resolveDatabaseEnv('DB_PASSWORD'),
  database: resolveDatabaseEnv('DB_NAME', 'iedc'),
  entities: [Usuario, Auditoria, ObservabilityEvent],
  migrations: ['dist/database/migrations/*.js'],
};
