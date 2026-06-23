import { DataSource } from 'typeorm';

function resolveDatabaseEnv(name: string, fallback?: string) {
  const value = process.env[name];

  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} precisa ser definido em producao.`);
  }

  return value || fallback;
}

export const EscolaDataSource = new DataSource({
  type: 'postgres',
  host: resolveDatabaseEnv('DB_ESCOLA_HOST', 'localhost'),
  port: parseInt(resolveDatabaseEnv('DB_ESCOLA_PORT', '5435') || '5435'),
  username: resolveDatabaseEnv('DB_ESCOLA_USER', 'iedc_escola_app'),
  password: resolveDatabaseEnv('DB_ESCOLA_PASSWORD'),
  database: resolveDatabaseEnv('DB_ESCOLA_NAME', 'iedc_escola'),
  entities: [],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  migrations: ['src/database/migrations/escola/*.ts'],
  migrationsTableName: 'typeorm_migrations',
});
