import { AddTipoEstadiaToEstadias1770000013000 } from './1770000013000-AddTipoEstadiaToEstadias';

describe('AddTipoEstadiaToEstadias1770000013000', () => {
  it('cria a coluna tipo_estadia quando ela nao existe', async () => {
    const queryRunner = {
      query: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(undefined),
    };

    const migration = new AddTipoEstadiaToEstadias1770000013000();

    await migration.up(queryRunner as never);

    expect(queryRunner.query).toHaveBeenCalledWith('SELECT 1 FROM pg_type WHERE typname = $1', ['estadias_tipo_estadia_enum']);
    expect(queryRunner.query).toHaveBeenCalledWith(expect.stringContaining('ADD COLUMN IF NOT EXISTS tipo_estadia estadias_tipo_estadia_enum NOT NULL DEFAULT \'completa\''));
  });

  it('remove a coluna e o tipo no rollback', async () => {
    const queryRunner = {
      query: jest.fn().mockResolvedValue(undefined),
    };

    const migration = new AddTipoEstadiaToEstadias1770000013000();

    await migration.down(queryRunner as never);

    expect(queryRunner.query).toHaveBeenNthCalledWith(1, 'ALTER TABLE estadias DROP COLUMN IF EXISTS tipo_estadia');
    expect(queryRunner.query).toHaveBeenNthCalledWith(2, 'DROP TYPE IF EXISTS "estadias_tipo_estadia_enum"');
  });
});
