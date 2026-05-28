import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Pessoa } from '../entities/pessoa.entity';
import { Estadia } from '../entities/estadia.entity';
import { Bloqueio } from '../entities/bloqueio.entity';
import { Ocorrencia } from '../entities/ocorrencia.entity';
import { Solicitacao } from '../entities/solicitacao.entity';
import { Cama } from '../entities/cama.entity';
import { Escala } from '../entities/escala.entity';
import { Turno } from '../entities/turno.entity';
import { RegraEscala } from '../entities/regra-escala.entity';
import { Plantao } from '../entities/plantao.entity';
import { Colaborador } from '../entities/colaborador.entity';
import { Usuario } from '../entities/usuario.entity';

function resolveDatabaseEnv(name: string, fallback?: string) {
  const value = process.env[name];

  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} precisa ser definido em produção.`);
  }

  return value || fallback;
}

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: resolveDatabaseEnv('DB_HOST', 'localhost'),
  port: parseInt(resolveDatabaseEnv('DB_PORT', '5432') || '5432'),
  username: resolveDatabaseEnv('DB_USER', 'postgres'),
  password: resolveDatabaseEnv('DB_PASSWORD'),
  database: resolveDatabaseEnv('DB_NAME', 'albergue'),
  entities: [Pessoa, Estadia, Bloqueio, Ocorrencia, Solicitacao, Cama, Escala, Colaborador, Turno, RegraEscala, Plantao, Usuario],
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  migrations: ['dist/database/migrations/*.js'],
  migrationsTableName: 'migrations',
  migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
};
