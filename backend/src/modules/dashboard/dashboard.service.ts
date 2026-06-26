import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Estadia, StatusEstadia } from '../../entities/estadia.entity';
import { Cama } from '../../entities/cama.entity';
import { Pessoa } from '../../entities/pessoa.entity';
import { OcupacaoDiaria } from '../../entities/ocupacao-diaria.entity';

function toDateKey(value = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  const localDate = new Date(date);
  return [
    localDate.getFullYear(),
    String(localDate.getMonth() + 1).padStart(2, '0'),
    String(localDate.getDate()).padStart(2, '0'),
  ].join('-');
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Estadia)
    private readonly estadiaRepo: Repository<Estadia>,
    @InjectRepository(Cama)
    private readonly camaRepo: Repository<Cama>,
    @InjectRepository(Pessoa)
    private readonly pessoaRepo: Repository<Pessoa>,
    @InjectRepository(OcupacaoDiaria)
    private readonly ocupacaoDiariaRepo: Repository<OcupacaoDiaria>,
  ) {}

  async getOcupacao() {
    // 1. Contar estadias ativas agrupadas por casa
    const ocupacaoPorCasa = await this.estadiaRepo
      .createQueryBuilder('estadia')
      .innerJoin(Cama, 'cama', 'estadia.cama_id = cama.id')
      .select('cama.casa', 'casa')
      .addSelect('COUNT(estadia.id)', 'ocupadas')
      .where('estadia.status = :status', { status: StatusEstadia.ATIVA })
      .groupBy('cama.casa')
      .getRawMany();

    // 2. Contar o total de camas por casa
    const capacidadePorCasa = await this.camaRepo
      .createQueryBuilder('cama')
      .select('cama.casa', 'casa')
      .addSelect('COUNT(cama.id)', 'total')
      .groupBy('cama.casa')
      .getRawMany();

    // 3. Consolidar os dados no formato esperado pelo frontend
    const casas: { [key: string]: { ocupadas: number; total: number } } = {};
    let totalOcupadas = 0;
    let totalVagas = 0;

    capacidadePorCasa.forEach(c => {
      const casaNome = c.casa;
      const capacidade = parseInt(c.total, 10);
      casas[casaNome] = {
        ocupadas: 0, // Inicializa com 0
        total: capacidade,
      };
      totalVagas += capacidade;
    });

    ocupacaoPorCasa.forEach(o => {
      const casaNome = o.casa;
      const ocupadas = parseInt(o.ocupadas, 10);
      if (casas[casaNome]) {
        casas[casaNome].ocupadas = ocupadas;
      }
      totalOcupadas += ocupadas;
    });

    return {
      casas,
      total: {
        ocupadas: totalOcupadas,
        total: totalVagas,
      },
    };
  }

  async getOcupacaoHistorico(periodo?: string) {
    const periodosPermitidos = [7, 30, 90, 180, 365];
    const periodoNumerico = Number(periodo);
    const dias = periodosPermitidos.includes(periodoNumerico) ? periodoNumerico : 30;
    const capacidade = await this.camaRepo.count();

    return this.estadiaRepo.query(
      `
        WITH dias AS (
          SELECT generate_series(
            (CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day'))::date,
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS data
        )
        SELECT
          to_char(d.data, 'YYYY-MM-DD') AS data,
          COALESCE(snapshot.ocupadas, LEAST(ocupacao.ocupadas, $2::int))::int AS ocupadas,
          COALESCE(snapshot.capacidade, $2::int)::int AS total,
          COALESCE(
            snapshot.percentual,
            ROUND(100.0 * LEAST(ocupacao.ocupadas, $2::int) / NULLIF($2::int, 0))::int,
            0
          ) AS percentual,
          COALESCE(snapshot.ingressos, ingressos.ingressos)::int AS ingressos
        FROM dias d
        LEFT JOIN ocupacao_diaria snapshot ON snapshot.data_ref = d.data
        LEFT JOIN LATERAL (
          SELECT COUNT(e.id)::int AS ocupadas
          FROM estadias e
          WHERE e.data_checkin::date <= d.data
            AND e.status <> 'cancelada'
            AND (
                 (d.data = CURRENT_DATE AND e.status = 'ativa')
                 OR (
                   d.data < CURRENT_DATE
                   AND COALESCE(
                     e.data_checkout::date,
                     CASE
                       WHEN e.status = 'ativa' THEN CURRENT_DATE
                       ELSE e.updated_at::date
                     END
                   ) >= d.data
                 )
               )
        ) ocupacao ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(i.id)::int AS ingressos
          FROM estadias i
          WHERE i.data_checkin::date = d.data
            AND i.status <> 'cancelada'
        ) ingressos ON true
        ORDER BY d.data
      `,
      [dias, capacidade],
    );
  }

  async gerarSnapshotDiario(dataRef = toDateKey(), origem = 'triagem'): Promise<OcupacaoDiaria> {
    const [capacidadeRows, ocupacaoRows, movimentoRows, duplicadasRows, historicoExcedidoRows] = await Promise.all([
      this.camaRepo.query(`
        SELECT casa, COUNT(*)::int AS total
        FROM camas
        GROUP BY casa
      `),
      this.estadiaRepo.query(`
        SELECT c.casa, COUNT(e.id)::int AS total
        FROM estadias e
        JOIN camas c ON c.id = e.cama_id
        WHERE e.status = 'ativa'
        GROUP BY c.casa
      `),
      this.estadiaRepo.query(`
        SELECT
          COUNT(*) FILTER (WHERE data_checkin::date = $1::date)::int AS ingressos,
          COUNT(*) FILTER (WHERE data_checkout::date = $1::date)::int AS saidas
        FROM estadias
        WHERE status <> 'cancelada'
      `, [dataRef]),
      this.estadiaRepo.query(`
        SELECT COUNT(*)::int AS total
        FROM (
          SELECT cama_id
          FROM estadias
          WHERE status = 'ativa' AND cama_id IS NOT NULL
          GROUP BY cama_id
          HAVING COUNT(*) > 1
        ) duplicadas
      `),
      this.estadiaRepo.query(`
        WITH ocupacao AS (
          SELECT COUNT(e.id)::int AS total
          FROM estadias e
          WHERE e.data_checkin::date <= $1::date
            AND e.status <> 'cancelada'
            AND COALESCE(e.data_checkout::date, $1::date) >= $1::date
        )
        SELECT total FROM ocupacao
      `, [dataRef]),
    ]);

    const capacidadePorCasa = this.rowsToCasaMap(capacidadeRows);
    const ocupadasPorCasa = this.rowsToCasaMap(ocupacaoRows);
    const capacidade = Object.values(capacidadePorCasa).reduce((sum, value) => sum + value, 0);
    const ocupadas = Object.values(ocupadasPorCasa).reduce((sum, value) => sum + value, 0);
    const movimento = movimentoRows[0] ?? {};
    const duplicadas = Number(duplicadasRows[0]?.total || 0);
    const historicoExcedido = Number(historicoExcedidoRows[0]?.total || 0);
    const alertas: string[] = [];

    if (ocupadas > capacidade) {
      alertas.push('ocupacao_atual_acima_da_capacidade');
    }

    if (historicoExcedido > capacidade) {
      alertas.push('historico_bruto_acima_da_capacidade');
    }

    if (duplicadas > 0) {
      alertas.push('camas_com_mais_de_uma_estadia_ativa');
    }

    const percentual = capacidade > 0 ? Math.min(100, Math.round((ocupadas / capacidade) * 100)) : 0;
    const snapshot = this.ocupacaoDiariaRepo.create({
      data_ref: new Date(`${dataRef}T00:00:00`),
      ocupadas: Math.min(ocupadas, capacidade || ocupadas),
      capacidade,
      percentual,
      ingressos: Number(movimento.ingressos || 0),
      saidas: Number(movimento.saidas || 0),
      ocupadas_por_casa: ocupadasPorCasa,
      capacidade_por_casa: capacidadePorCasa,
      inconsistente: alertas.length > 0,
      alertas,
      origem,
      gerado_em: new Date(),
    });

    await this.ocupacaoDiariaRepo.upsert(snapshot, ['data_ref']);
    return this.ocupacaoDiariaRepo.findOneOrFail({ where: { data_ref: snapshot.data_ref } });
  }

  private rowsToCasaMap(rows: Array<Record<string, unknown>>): Record<string, number> {
    return rows.reduce<Record<string, number>>((acc, row) => {
      const casa = String(row.casa || '');
      if (casa) {
        acc[casa] = Number(row.total || 0);
      }
      return acc;
    }, {});
  }

  async getRelatoriosSociais(inicio?: string, fim?: string) {
    const dataInicio = inicio ? new Date(inicio) : new Date('2023-01-01');
    const dataFim = fim ? new Date(fim) : new Date();

    // Total de cadastros
    const totalCadastros = await this.pessoaRepo.count({ where: { ativo: true } });

    // Novos cadastros no período
    const novosCadastros = await this.pessoaRepo.count({
      where: {
        ativo: true,
        created_at: Between(dataInicio, dataFim),
      },
    });

    // Distribuição por gênero
    const generoQuery = await this.pessoaRepo
      .createQueryBuilder('pessoa')
      .select('pessoa.genero', 'genero')
      .addSelect('COUNT(pessoa.id)', 'count')
      .where('pessoa.ativo = true')
      .andWhere('pessoa.genero IS NOT NULL')
      .groupBy('pessoa.genero')
      .getRawMany();

    const genero: { [key: string]: number } = {};
    generoQuery.forEach(g => {
      genero[g.genero] = parseInt(g.count, 10);
    });

    // Distribuição por sexo
    const sexoQuery = await this.pessoaRepo
      .createQueryBuilder('pessoa')
      .select('pessoa.sexo', 'sexo')
      .addSelect('COUNT(pessoa.id)', 'count')
      .where('pessoa.ativo = true')
      .andWhere('pessoa.sexo IS NOT NULL')
      .groupBy('pessoa.sexo')
      .getRawMany();

    const sexo: { [key: string]: number } = {};
    sexoQuery.forEach(s => {
      sexo[s.sexo] = parseInt(s.count, 10);
    });

    // Ocupação atual
    const ocupacao = await this.getOcupacao();

    return {
      totalCadastros,
      novosCadastros,
      ocupacao: ocupacao.total,
      genero,
      sexo,
    };
  }

  async getSaidasPrevistasHoje(): Promise<number> {
    // Retorna quantidade de hóspedes que SAIRÃO AMANHÃ
    // LÓGICA CORRIGIDA: data_limite = AMANHÃ significa última noite é HOJE
    // Útil para planejar: "Quantas vagas terei livres amanhã de manhã?"
    
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1); // Amanhã
    amanha.setHours(0, 0, 0, 0);
    const amanhaFmt = amanha.toISOString().split('T')[0]; // YYYY-MM-DD

    const count = await this.estadiaRepo
      .createQueryBuilder('estadia')
      .where('estadia.status = :status', { status: StatusEstadia.ATIVA })
      .andWhere('DATE(estadia.data_limite) = :amanha', { amanha: amanhaFmt })
      .getCount();

    return count;
  }
}
