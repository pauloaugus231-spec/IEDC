import { MigrationInterface, QueryRunner } from 'typeorm';

type CamaHouseRow = {
  total: string | number;
};

export class AdjustCamasNumbering1770000012000 implements MigrationInterface {
  name = 'AdjustCamasNumbering1770000012000';

  private readonly ranges = [
    { casa: 'MASCULINA', inicio: 1, fim: 50 },
    { casa: 'IDOSOS', inicio: 51, fim: 66 },
    { casa: 'MISTA_MULHERES', inicio: 77, fim: 96 },
    { casa: 'LGBT', inicio: 97, fim: 100 },
  ] as const;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const totalRows = await queryRunner.query(`SELECT COUNT(*)::int AS total FROM camas`);
    const total = this.toNumber(totalRows?.[0]?.total);

    if (total === 0) {
      return;
    }

    for (const range of this.ranges) {
      const rows = await queryRunner.query(
        `SELECT COUNT(*)::int AS total FROM camas WHERE casa = $1`,
        [range.casa],
      );
      const count = this.toNumber((rows as CamaHouseRow[] | undefined)?.[0]?.total);
      const expectedCount = range.fim - range.inicio + 1;

      if (count !== expectedCount) {
        throw new Error(
          `Nao foi possivel ajustar a numeracao das camas: ${range.casa} possui ${count} registro(s), mas o esperado e ${expectedCount}.`,
        );
      }
    }

    for (const range of this.ranges) {
      await queryRunner.query(
        `
          WITH ordered AS (
            SELECT id, row_number() OVER (ORDER BY numero ASC, id ASC) AS seq
            FROM camas
            WHERE casa = $1
          )
          UPDATE camas AS c
          SET numero = $2 + ordered.seq - 1
          FROM ordered
          WHERE c.id = ordered.id
        `,
        [range.casa, range.inicio],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const totalRows = await queryRunner.query(`SELECT COUNT(*)::int AS total FROM camas`);
    const total = this.toNumber(totalRows?.[0]?.total);

    if (total === 0) {
      return;
    }

    for (const range of this.ranges) {
      const rows = await queryRunner.query(
        `SELECT COUNT(*)::int AS total FROM camas WHERE casa = $1`,
        [range.casa],
      );
      const count = this.toNumber((rows as CamaHouseRow[] | undefined)?.[0]?.total);
      const expectedCount = range.fim - range.inicio + 1;

      if (count !== expectedCount) {
        throw new Error(
          `Nao foi possivel reverter a numeracao das camas: ${range.casa} possui ${count} registro(s), mas o esperado e ${expectedCount}.`,
        );
      }
    }

    for (const range of this.ranges) {
      const base = this.getLegacyBase(range.casa);

      await queryRunner.query(
        `
          WITH ordered AS (
            SELECT id, row_number() OVER (ORDER BY numero ASC, id ASC) AS seq
            FROM camas
            WHERE casa = $1
          )
          UPDATE camas AS c
          SET numero = $2 + ordered.seq - 1
          FROM ordered
          WHERE c.id = ordered.id
        `,
        [range.casa, base],
      );
    }
  }

  private getLegacyBase(casa: string): number {
    switch (casa) {
      case 'MASCULINA':
      case 'IDOSOS':
      case 'MISTA_MULHERES':
      case 'LGBT':
        return 1;
      default:
        return 1;
    }
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
