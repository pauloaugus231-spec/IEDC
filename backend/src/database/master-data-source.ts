import { DataSource } from 'typeorm';

function resolveDatabaseEnv(name: string, fallback?: string) {
  const value = process.env[name];

  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} precisa ser definido em producao.`);
  }

  return value || fallback;
}

export const MasterDataSource = new DataSource({
  type: 'postgres',
  host: resolveDatabaseEnv('DB_MASTER_HOST', 'localhost'),
  port: parseInt(resolveDatabaseEnv('DB_MASTER_PORT', '5434') || '5434'),
  username: resolveDatabaseEnv('DB_MASTER_USER', 'iedc_master_app'),
  password: resolveDatabaseEnv('DB_MASTER_PASSWORD'),
  database: resolveDatabaseEnv('DB_MASTER_NAME', 'iedc_master'),
  entities: [],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  migrations: ['src/database/migrations/master/*.ts'],
  migrationsTableName: 'typeorm_migrations',
});
