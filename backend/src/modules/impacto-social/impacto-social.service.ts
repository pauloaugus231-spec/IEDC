import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { ImpactoSocialLegacyMigrationService } from './impacto-social-legacy-migration.service';

type PeriodoInput = {
  periodo?: string;
  inicio?: string;
  fim?: string;
};

type SeedResposta = {
  sourceKey: string;
  dataReferencia: string;
  situacaoTerritorial: string;
  tempoSemMoradia: string;
  fatoresSemMoradia: string[];
  ajudaPrincipal: string[];
  ajudaPrincipalOutro?: string;
  respeitoUsuarios: string;
  comunicacaoEquipe: string;
  proximoPassoAjuda: string;
  proximosPassos: string[];
  proximoPassoOutro?: string;
  participouOficina: string;
  relatoRepresenta: string;
  melhoriaSugerida: string;
  demandasEquipe: string[];
  demandaOutro?: string;
  acaoEquipe: string[];
  preenchidoPor: string;
  perfilPreenchedor: string;
};

interface RespostaAlbergueInput {
  dataReferencia?: string;
  data_referencia?: string;
  situacaoTerritorial?: string;
  tempoSemMoradia?: string;
  fatoresSemMoradia?: string[] | string;
  fatoresSemMoradiaOutro?: string;
  ajudaPrincipal?: string[] | string;
  ajudaPrincipalOutro?: string;
  respeitoUsuarios?: string;
  comunicacaoEquipe?: string;
  proximoPassoAjuda?: string;
  proximosPassos?: string[] | string;
  proximoPassoOutro?: string;
  participouOficina?: string;
  relatoRepresenta?: string;
  melhoriaSugerida?: string;
  demandasEquipe?: string[] | string;
  demandaOutro?: string;
  acaoEquipe?: string[] | string;
  preenchidoPor?: string;
  perfilPreenchedor?: string;
}

interface RespostaAlbergueRow {
  id: string;
  data_referencia: string;
  situacao_territorial: string;
  tempo_sem_moradia: string;
  fatores_sem_moradia: string[] | null;
  ajuda_principal: string[] | null;
  respeito_usuarios: string;
  comunicacao_equipe: string;
  proximo_passo_ajuda: string;
  proximos_passos: string[] | null;
  participou_oficina: string;
  relato_representa: string | null;
  melhoria_sugerida: string | null;
  demandas_equipe: string[] | null;
  acao_equipe: string[] | null;
  created_at: Date | string;
}

const SEED_RESPOSTAS_PLANILHA: SeedResposta[] = [
  {
    sourceKey: 'planilha-impacto-2026-05-18-01',
    dataReferencia: '2026-05-18',
    situacaoTerritorial: 'Situação de rua',
    tempoSemMoradia: 'Entre 1 e 6 meses',
    fatoresSemMoradia: [
      'Dificuldade para pagar aluguel ou moradia',
      'Rompimento ou conflito familiar',
      'Saída de hospital, abrigo, prisão ou outra instituição',
    ],
    ajudaPrincipal: [
      'Proteção/pernoite',
      'Descanso/segurança',
      'Alimentação',
      'Higiene/vestuário',
      'Escuta/vínculo',
    ],
    respeitoUsuarios: 'Sim',
    comunicacaoEquipe: 'Não se aplica',
    proximoPassoAjuda: 'Sim',
    proximosPassos: [
      'Saúde',
      'Benefício/CadÚnico',
      'Família/rede de apoio',
      'Moradia/acolhimento',
      'Oficina/atividade',
    ],
    participouOficina: 'Não',
    relatoRepresenta: 'Oportunidade',
    melhoriaSugerida: 'Horário de saída. Pelo menos até as 07h.',
    demandasEquipe: ['Segurança/proteção'],
    acaoEquipe: ['Apenas acolhimento imediato'],
    preenchidoPor: 'Paulo',
    perfilPreenchedor: 'Educador',
  },
  {
    sourceKey: 'planilha-impacto-2026-05-18-02',
    dataReferencia: '2026-05-18',
    situacaoTerritorial: 'Situação de rua',
    tempoSemMoradia: 'Entre 1 e 6 meses',
    fatoresSemMoradia: [
      'Dificuldade para pagar aluguel ou moradia',
      'Rompimento ou conflito familiar',
      'Violência doméstica ou familiar',
      'Problemas de saúde',
      'Sofrimento psíquico ou saúde mental',
      'Perda de documentos',
    ],
    ajudaPrincipal: [
      'Proteção/pernoite',
      'Descanso/segurança',
      'Alimentação',
      'Higiene/vestuário',
      'Escuta/vínculo',
      'Orientação',
    ],
    respeitoUsuarios: 'Sim',
    comunicacaoEquipe: 'Sim',
    proximoPassoAjuda: 'Sim',
    proximosPassos: [
      'Saúde',
      'Documentação',
      'Benefício/CadÚnico',
      'Família/rede de apoio',
      'Moradia/acolhimento',
      'Oficina/atividade',
    ],
    participouOficina: 'Sim',
    relatoRepresenta: 'Segurança, organização na vida pessoal.',
    melhoriaSugerida: '',
    demandasEquipe: ['Saúde mental'],
    acaoEquipe: ['Orientação', 'Encaminhamento sugerido'],
    preenchidoPor: 'Paulo',
    perfilPreenchedor: 'Educador',
  },
  {
    sourceKey: 'planilha-impacto-2026-05-18-03',
    dataReferencia: '2026-05-18',
    situacaoTerritorial: 'Situação de rua',
    tempoSemMoradia: 'Mais de 3 anos',
    fatoresSemMoradia: ['Rompimento ou conflito familiar'],
    ajudaPrincipal: [
      'Proteção/pernoite',
      'Descanso/segurança',
      'Alimentação',
      'Higiene/vestuário',
      'Escuta/vínculo',
      'Orientação',
    ],
    respeitoUsuarios: 'Sim',
    comunicacaoEquipe: 'Não se aplica',
    proximoPassoAjuda: 'Sim',
    proximosPassos: [
      'Documentação',
      'Benefício/CadÚnico',
      'Moradia/acolhimento',
      'Oficina/atividade',
    ],
    participouOficina: 'Sim',
    relatoRepresenta: 'Alegria',
    melhoriaSugerida: 'Mais uma hora de sono.',
    demandasEquipe: ['Família/rede de apoio'],
    acaoEquipe: ['Orientação', 'Encaminhamento sugerido'],
    preenchidoPor: 'Paulo',
    perfilPreenchedor: 'Educador',
  },
  {
    sourceKey: 'planilha-impacto-2026-05-18-04',
    dataReferencia: '2026-05-18',
    situacaoTerritorial: 'Situação de rua',
    tempoSemMoradia: 'Entre 1 semana e 1 mês',
    fatoresSemMoradia: [
      'Rompimento ou conflito familiar',
      'Separação conjugal',
    ],
    ajudaPrincipal: [
      'Proteção/pernoite',
      'Descanso/segurança',
      'Alimentação',
      'Higiene/vestuário',
      'Escuta/vínculo',
      'Orientação',
    ],
    respeitoUsuarios: 'Sim',
    comunicacaoEquipe: 'Não',
    proximoPassoAjuda: 'Sim',
    proximosPassos: [
      'Saúde',
      'Família/rede de apoio',
      'Moradia/acolhimento',
    ],
    participouOficina: 'Não',
    relatoRepresenta: 'Paz e tranquilidade.',
    melhoriaSugerida: 'Melhorar convivência entre usuários.',
    demandasEquipe: ['Uso problemático de álcool/outras substâncias'],
    acaoEquipe: ['Orientação'],
    preenchidoPor: 'Paulo',
    perfilPreenchedor: 'Educador',
  },
];

const STOP_WORDS = new Set([
  'a',
  'ao',
  'aos',
  'as',
  'até',
  'com',
  'da',
  'das',
  'de',
  'do',
  'dos',
  'e',
  'em',
  'entre',
  'mais',
  'na',
  'no',
  'o',
  'os',
  'ou',
  'para',
  'pelo',
  'por',
  'que',
  'se',
  'uma',
  'um',
]);

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getPeriodoFiltro(input: PeriodoInput) {
  if (input.inicio && input.fim) {
    return {
      escopo: 'custom',
      inicio: input.inicio,
      fim: input.fim,
    };
  }

  const hoje = new Date();
  const escopo = input.periodo || 'mes';

  if (escopo === 'trimestre') {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return { escopo, inicio: formatDate(inicio), fim: formatDate(fim) };
  }

  if (escopo === 'ano') {
    const inicio = new Date(hoje.getFullYear(), 0, 1);
    const fim = new Date(hoje.getFullYear(), 11, 31);
    return { escopo, inicio: formatDate(inicio), fim: formatDate(fim) };
  }

  if (escopo === 'todos') {
    return { escopo, inicio: '2000-01-01', fim: '2100-12-31' };
  }

  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return { escopo: 'mes', inicio: formatDate(inicio), fim: formatDate(fim) };
}

function toArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeText(value: unknown, fallback = '') {
  return String(value ?? fallback).trim();
}

@Injectable()
export class ImpactoSocialService implements OnModuleInit {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly legacyMigration: ImpactoSocialLegacyMigrationService,
  ) {}

  // Ao subir o modulo: copia o que ainda sobrar da tabela legada em Core
  // (uma unica vez, controlado por albergue_migracoes_legado) e so entao
  // roda o seed de demonstracao e a normalizacao de dado antigo. A estrutura
  // da tabela em si vem da migration 1770000017000, nao e mais criada aqui.
  async onModuleInit() {
    await this.legacyMigration.migrateIfNeeded();
    if (process.env.ENABLE_DEMO_SEED === 'true') {
      await this.seedRespostasPlanilha();
    }
    await this.normalizeSituacaoTerritorialLegada();
  }

  async getDashboardAlbergue(input: PeriodoInput = {}) {
    const periodo = getPeriodoFiltro(input);
    const params = [periodo.inicio, periodo.fim];
    const wherePeriodo = 'data_referencia BETWEEN $1::date AND $2::date';

    const [kpiRow] = await this.dataSource.query(
      `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE 'Proteção/pernoite' = ANY(ajuda_principal))::int AS protecao,
          COUNT(*) FILTER (WHERE 'Descanso/segurança' = ANY(ajuda_principal))::int AS descanso,
          COUNT(*) FILTER (WHERE 'Escuta/vínculo' = ANY(ajuda_principal))::int AS vinculo,
          COUNT(*) FILTER (WHERE respeito_usuarios = 'Sim')::int AS respeito_sim,
          COUNT(*) FILTER (WHERE comunicacao_equipe = 'Sim')::int AS comunicacao_sim,
          COUNT(*) FILTER (WHERE proximo_passo_ajuda = 'Sim')::int AS proximo_passo_sim,
          COUNT(*) FILTER (WHERE participou_oficina = 'Sim')::int AS oficina_sim,
          COUNT(*) FILTER (WHERE relato_representa IS NOT NULL AND btrim(relato_representa) <> '')::int AS relatos,
          COUNT(*) FILTER (WHERE melhoria_sugerida IS NOT NULL AND btrim(melhoria_sugerida) <> '')::int AS melhorias
        FROM impacto_albergue_respostas
        WHERE ${wherePeriodo}
      `,
      params,
    );

    const total = Number(kpiRow?.total || 0);
    const percent = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

    const distribuicoes = {
      situacaoTerritorial: await this.countScalar('situacao_territorial', periodo),
      tempoSemMoradia: await this.countScalar('tempo_sem_moradia', periodo),
      fatoresSemMoradia: await this.countArray('fatores_sem_moradia', periodo),
      ajudaPrincipal: await this.countArray('ajuda_principal', periodo),
      proximosPassos: await this.countArray('proximos_passos', periodo),
      respeitoUsuarios: await this.countScalar('respeito_usuarios', periodo),
      comunicacaoEquipe: await this.countScalar('comunicacao_equipe', periodo),
      proximoPassoAjuda: await this.countScalar('proximo_passo_ajuda', periodo),
      participouOficina: await this.countScalar('participou_oficina', periodo),
      demandasEquipe: await this.countArray('demandas_equipe', periodo),
      acaoEquipe: await this.countArray('acao_equipe', periodo),
    };

    const serieMensal = await this.dataSource.query(
      `
        SELECT
          to_char(date_trunc('month', data_referencia)::date, 'YYYY-MM-DD') AS data,
          to_char(date_trunc('month', data_referencia)::date, 'Mon/YYYY') AS label,
          COUNT(*)::int AS respostas
        FROM impacto_albergue_respostas
        WHERE ${wherePeriodo}
        GROUP BY date_trunc('month', data_referencia)::date
        ORDER BY date_trunc('month', data_referencia)::date
      `,
      params,
    );

    const relatos = await this.getTextRows('relato_representa', periodo);
    const melhorias = await this.getTextRows('melhoria_sugerida', periodo);

    const protecao = Number(kpiRow?.protecao || 0);
    const descanso = Number(kpiRow?.descanso || 0);
    const vinculo = Number(kpiRow?.vinculo || 0);
    const comunicacao = Number(kpiRow?.comunicacao_sim || 0);
    const respeito = Number(kpiRow?.respeito_sim || 0);
    const proximo = Number(kpiRow?.proximo_passo_sim || 0);
    const oficina = Number(kpiRow?.oficina_sim || 0);

    return {
      periodo,
      kpis: {
        totalRespostas: total,
        protecaoPernoite: protecao,
        protecaoPernoitePercentual: percent(protecao),
        respeitoUsuarios: respeito,
        respeitoUsuariosPercentual: percent(respeito),
        comunicacaoClara: comunicacao,
        comunicacaoClaraPercentual: percent(comunicacao),
        proximoPasso: proximo,
        proximoPassoPercentual: percent(proximo),
        oficinaAtividade: oficina,
        oficinaAtividadePercentual: percent(oficina),
        relatos: Number(kpiRow?.relatos || 0),
        melhorias: Number(kpiRow?.melhorias || 0),
      },
      distribuicoes,
      serieMensal,
      radar: [
        { label: 'Proteção', valor: percent(protecao) },
        { label: 'Descanso', valor: percent(descanso) },
        { label: 'Vínculo', valor: percent(vinculo) },
        { label: 'Comunicação', valor: percent(comunicacao) },
        { label: 'Próximos passos', valor: percent(proximo) },
        { label: 'Atividades', valor: percent(oficina) },
      ],
      relatos,
      melhorias,
      palavrasRelatos: this.extractKeywords(relatos.map((item: { texto: string }) => item.texto).join(' ')),
      palavrasMelhorias: this.extractKeywords(melhorias.map((item: { texto: string }) => item.texto).join(' ')),
    };
  }

  async createRespostaAlbergue(body: RespostaAlbergueInput) {
    const dataReferencia = normalizeText(body.dataReferencia || body.data_referencia || formatDate(new Date()));
    const situacaoTerritorial = normalizeText(body.situacaoTerritorial, 'Não informado');
    const tempoSemMoradia = normalizeText(body.tempoSemMoradia, 'Prefiro não responder');
    const respeitoUsuarios = normalizeText(body.respeitoUsuarios, 'Prefiro não responder');
    const comunicacaoEquipe = normalizeText(body.comunicacaoEquipe, 'Não se aplica');
    const proximoPassoAjuda = normalizeText(body.proximoPassoAjuda, 'Ainda não');
    const participouOficina = normalizeText(body.participouOficina, 'Não');

    if (!dataReferencia || !situacaoTerritorial) {
      throw new BadRequestException('Data de referência e situação territorial são obrigatórias.');
    }

    const id = randomUUID();

    const [row] = await this.dataSource.query(
      `
        INSERT INTO impacto_albergue_respostas (
          id,
          source_key,
          origem,
          data_referencia,
          situacao_territorial,
          tempo_sem_moradia,
          fatores_sem_moradia,
          fatores_sem_moradia_outro,
          ajuda_principal,
          ajuda_principal_outro,
          respeito_usuarios,
          comunicacao_equipe,
          proximo_passo_ajuda,
          proximos_passos,
          proximo_passo_outro,
          participou_oficina,
          relato_representa,
          melhoria_sugerida,
          demandas_equipe,
          demanda_outro,
          acao_equipe,
          preenchido_por,
          perfil_preenchedor,
          created_at,
          updated_at
        )
        VALUES (
          $1::uuid,
          $2,
          'sistema',
          $3::date,
          $4,
          $5,
          $6::text[],
          $7,
          $8::text[],
          $9,
          $10,
          $11,
          $12,
          $13::text[],
          $14,
          $15,
          $16,
          $17,
          $18::text[],
          $19,
          $20::text[],
          $21,
          $22,
          NOW(),
          NOW()
        )
        RETURNING *
      `,
      [
        id,
        `sistema-${id}`,
        dataReferencia,
        situacaoTerritorial,
        tempoSemMoradia,
        toArray(body.fatoresSemMoradia),
        normalizeText(body.fatoresSemMoradiaOutro),
        toArray(body.ajudaPrincipal),
        normalizeText(body.ajudaPrincipalOutro),
        respeitoUsuarios,
        comunicacaoEquipe,
        proximoPassoAjuda,
        toArray(body.proximosPassos),
        normalizeText(body.proximoPassoOutro),
        participouOficina,
        normalizeText(body.relatoRepresenta),
        normalizeText(body.melhoriaSugerida),
        toArray(body.demandasEquipe),
        normalizeText(body.demandaOutro),
        toArray(body.acaoEquipe),
        normalizeText(body.preenchidoPor),
        normalizeText(body.perfilPreenchedor),
      ],
    );

    return this.mapResposta(row);
  }

  private async seedRespostasPlanilha() {
    for (const resposta of SEED_RESPOSTAS_PLANILHA) {
      await this.dataSource.query(
        `
          INSERT INTO impacto_albergue_respostas (
            id,
            source_key,
            origem,
            data_referencia,
            situacao_territorial,
            tempo_sem_moradia,
            fatores_sem_moradia,
            fatores_sem_moradia_outro,
            ajuda_principal,
            ajuda_principal_outro,
            respeito_usuarios,
            comunicacao_equipe,
            proximo_passo_ajuda,
            proximos_passos,
            proximo_passo_outro,
            participou_oficina,
            relato_representa,
            melhoria_sugerida,
            demandas_equipe,
            demanda_outro,
            acao_equipe,
            preenchido_por,
            perfil_preenchedor,
            created_at,
            updated_at
          )
          VALUES (
            $1::uuid,
            $2,
            'planilha',
            $3::date,
            $4,
            $5,
            $6::text[],
            '',
            $7::text[],
            $8,
            $9,
            $10,
            $11,
            $12::text[],
            $13,
            $14,
            $15,
            $16,
            $17::text[],
            $18,
            $19::text[],
            $20,
            $21,
            NOW(),
            NOW()
          )
          ON CONFLICT (source_key) DO NOTHING
        `,
        [
          randomUUID(),
          resposta.sourceKey,
          resposta.dataReferencia,
          resposta.situacaoTerritorial,
          resposta.tempoSemMoradia,
          resposta.fatoresSemMoradia,
          resposta.ajudaPrincipal,
          resposta.ajudaPrincipalOutro || '',
          resposta.respeitoUsuarios,
          resposta.comunicacaoEquipe,
          resposta.proximoPassoAjuda,
          resposta.proximosPassos,
          resposta.proximoPassoOutro || '',
          resposta.participouOficina,
          resposta.relatoRepresenta,
          resposta.melhoriaSugerida,
          resposta.demandasEquipe,
          resposta.demandaOutro || '',
          resposta.acaoEquipe,
          resposta.preenchidoPor,
          resposta.perfilPreenchedor,
        ],
      );
    }
  }

  private async normalizeSituacaoTerritorialLegada() {
    await this.dataSource.query(`
      UPDATE impacto_albergue_respostas
      SET
        situacao_territorial = CASE situacao_territorial
          WHEN 'Pessoa em situação de rua em Porto Alegre' THEN 'Situação de rua'
          WHEN 'Pessoa em trânsito/passagem' THEN 'Pessoa em trânsito'
          WHEN 'Migrante de outro município/estado' THEN 'Migrante'
          WHEN 'Imigrante de outro país' THEN 'Imigrante'
          WHEN 'Não informado' THEN 'Ñ informado'
          WHEN 'Prefere não responder' THEN 'Prefiro ñ responder'
          ELSE situacao_territorial
        END,
        updated_at = NOW()
      WHERE situacao_territorial IN (
        'Pessoa em situação de rua em Porto Alegre',
        'Pessoa em trânsito/passagem',
        'Migrante de outro município/estado',
        'Imigrante de outro país',
        'Não informado',
        'Prefere não responder'
      )
    `);
  }

  private async countScalar(column: string, periodo: { inicio: string; fim: string }) {
    const allowedColumns = new Set([
      'situacao_territorial',
      'tempo_sem_moradia',
      'respeito_usuarios',
      'comunicacao_equipe',
      'proximo_passo_ajuda',
      'participou_oficina',
    ]);

    if (!allowedColumns.has(column)) {
      return [];
    }

    return this.dataSource.query(
      `
        SELECT ${column} AS label, COUNT(*)::int AS total
        FROM impacto_albergue_respostas
        WHERE data_referencia BETWEEN $1::date AND $2::date
          AND ${column} IS NOT NULL
          AND btrim(${column}) <> ''
        GROUP BY ${column}
        ORDER BY total DESC, label ASC
      `,
      [periodo.inicio, periodo.fim],
    );
  }

  private async countArray(column: string, periodo: { inicio: string; fim: string }) {
    const allowedColumns = new Set([
      'fatores_sem_moradia',
      'ajuda_principal',
      'proximos_passos',
      'demandas_equipe',
      'acao_equipe',
    ]);

    if (!allowedColumns.has(column)) {
      return [];
    }

    return this.dataSource.query(
      `
        SELECT item AS label, COUNT(*)::int AS total
        FROM impacto_albergue_respostas,
          unnest(${column}) AS u(item)
        WHERE data_referencia BETWEEN $1::date AND $2::date
          AND btrim(item) <> ''
        GROUP BY item
        ORDER BY total DESC, item ASC
      `,
      [periodo.inicio, periodo.fim],
    );
  }

  private async getTextRows(column: string, periodo: { inicio: string; fim: string }) {
    const allowedColumns = new Set(['relato_representa', 'melhoria_sugerida']);

    if (!allowedColumns.has(column)) {
      return [];
    }

    return this.dataSource.query(
      `
        SELECT
          id,
          to_char(data_referencia, 'YYYY-MM-DD') AS data,
          ${column} AS texto
        FROM impacto_albergue_respostas
        WHERE data_referencia BETWEEN $1::date AND $2::date
          AND ${column} IS NOT NULL
          AND btrim(${column}) <> ''
        ORDER BY data_referencia DESC, created_at DESC
        LIMIT 12
      `,
      [periodo.inicio, periodo.fim],
    );
  }

  private extractKeywords(text: string) {
    const counts = new Map<string, number>();

    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
      .forEach((word) => {
        counts.set(word, (counts.get(word) || 0) + 1);
      });

    return Array.from(counts.entries())
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
      .slice(0, 18);
  }

  private mapResposta(row: RespostaAlbergueRow) {
    return {
      id: row.id,
      dataReferencia: row.data_referencia,
      situacaoTerritorial: row.situacao_territorial,
      tempoSemMoradia: row.tempo_sem_moradia,
      fatoresSemMoradia: row.fatores_sem_moradia || [],
      ajudaPrincipal: row.ajuda_principal || [],
      respeitoUsuarios: row.respeito_usuarios,
      comunicacaoEquipe: row.comunicacao_equipe,
      proximoPassoAjuda: row.proximo_passo_ajuda,
      proximosPassos: row.proximos_passos || [],
      participouOficina: row.participou_oficina,
      relatoRepresenta: row.relato_representa,
      melhoriaSugerida: row.melhoria_sugerida,
      demandasEquipe: row.demandas_equipe || [],
      acaoEquipe: row.acao_equipe || [],
      createdAt: row.created_at,
    };
  }
}
