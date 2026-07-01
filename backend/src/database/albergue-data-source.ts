import * as path from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { albergueDatabaseConfig } from '../config/database.config';

const migrationsPath = __dirname.includes(`${path.sep}dist${path.sep}`)
  ? 'dist/database/migrations/albergue/*.js'
  : 'src/database/migrations/albergue/*.ts';

export const AlbergueDataSource = new DataSource({
  ...(albergueDatabaseConfig as DataSourceOptions),
  migrations: [migrationsPath],
});
