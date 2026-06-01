import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthUser } from '../../auth/auth.types';
import { UsuarioRole } from '../../entities/usuario.entity';

export type QualidadeAreaId = 'albergue' | 'creche' | 'financeiro';
export type QualidadeSeveridade = 'critico' | 'atencao' | 'informativo';

interface QueryRow {
  total?: number | string | null;
  samples?: unknown;
}

export interface QualidadeSample {
  id: string;
  label: string;
  detail?: string | null;
  path?: string;
}

export interface QualidadeItem {
  id: string;
  area: QualidadeAreaId;
  title: string;
  description: string;
  severity: QualidadeSeveridade;
  total: number;
  status: 'ok' | 'pendente';
  actionLabel: string;
  actionPath: string;
  samples: QualidadeSample[];
}

export interface QualidadeArea {
  id: QualidadeAreaId;
  label: string;
  description: string;
  items: QualidadeItem[];
  summary: {
    total: number;
    criticos: number;
    atencao: number;
    informativos: number;
    status: 'ok' | 'atencao' | 'critico';
  };
}

const AREA_LABELS: Record<QualidadeAreaId, { label: string; description: string }> = {
  albergue: {
    label: 'Albergue',
    description: 'Cadastros, presenças e estadias que sustentam operação e relatórios sociais.',
  },
  creche: {
    label: 'E.E.I.',
    description: 'Cadastros de crianças, responsáveis, turmas e frequência pedagógica.',
  },
  financeiro: {
    label: 'Financeiro comercial',
    description: 'Comandas, retiradas e produtos que sustentam a rotina comercial.',
  },
};

function asNumber(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeSamples(value: unknown): QualidadeSample[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const samples: Array<QualidadeSample | null> = value.map((sample) => {
      if (!sample || typeof sample !== 'object') return null;
      const record = sample as Record<string, unknown>;
      const id = String(record.id || '');
      const label = String(record.label || '');

      if (!id || !label) return null;

      const normalized: QualidadeSample = {
        id,
        label,
        detail: typeof record.detail === 'string' ? record.detail : null,
      };

      if (typeof record.path === 'string') {
        normalized.path = record.path;
      }

      return normalized;
    });

  return samples.filter((sample): sample is QualidadeSample => Boolean(sample));
}

export interface QualidadeDadosResponse {
  generatedAt: string;
  scope: {
    areas: QualidadeAreaId[];
    role: string | null;
  };
  summary: {
    score: number;
    totalItems: number;
    affectedRecords: number;
    criticalItems: number;
    warningItems: number;
    informationalItems: number;
  };
  areas: QualidadeArea[];
}

@Injectable()
export class QualidadeDadosService {
  constructor(private readonly dataSource: DataSource) {}

  async listar(actor: AuthUser | null, area?: string): Promise<QualidadeDadosResponse> {
    const allowedAreas = this.getAllowedAreas(actor);
    const requestedArea = this.normalizeArea(area);
    const areas = requestedArea ? [requestedArea] : allowedAreas;

    if (requestedArea && !allowedAreas.includes(requestedArea)) {
      throw new ForbiddenException('Seu perfil não pode consultar esta área de qualidade de dados.');
    }

    const areaResults = await Promise.all(areas.map((areaId) => this.buildArea(areaId)));
    const visibleAreas = areaResults.filter((areaItem): areaItem is QualidadeArea => Boolean(areaItem));

    const allItems = visibleAreas.flatMap((areaItem) => areaItem.items);
    const pendingItems = allItems.filter((item) => item.total > 0);
    const criticalWeight = pendingItems
      .reduce((sum, item) => sum + Math.min(item.total, 10) * this.severityWeight(item.severity), 0);
    const score = Math.max(0, 100 - criticalWeight * 4);

    return {
      generatedAt: new Date().toISOString(),
      scope: {
        areas,
        role: actor?.role ?? null,
      },
      summary: {
        score,
        totalItems: pendingItems.length,
        affectedRecords: pendingItems.reduce((sum, item) => sum + item.total, 0),
        criticalItems: pendingItems.filter((item) => item.severity === 'critico').length,
        warningItems: pendingItems.filter((item) => item.severity === 'atencao').length,
        informationalItems: pendingItems.filter((item) => item.severity === 'informativo').length,
      },
      areas: visibleAreas,
    };
  }

  private getAllowedAreas(actor: AuthUser | null): QualidadeAreaId[] {
    if (!actor || actor.role === UsuarioRole.GESTORA || actor.role === UsuarioRole.EQUIPE_TECNICA) {
      return ['albergue', 'creche', 'financeiro'];
    }

    if (
      actor.role === UsuarioRole.COORDENADOR_ALBERGUE ||
      actor.role === UsuarioRole.EDUCADOR_ALBERGUE
    ) {
      return ['albergue'];
    }

    if (
      actor.role === UsuarioRole.COORDENADOR_CRECHE ||
      actor.role === UsuarioRole.EDUCADOR_CRECHE
    ) {
      return ['creche'];
    }

    if (actor.role === UsuarioRole.FINANCEIRO) {
      return ['financeiro'];
    }

    return [];
  }

  private normalizeArea(area?: string): QualidadeAreaId | null {
    if (area === 'albergue' || area === 'creche' || area === 'financeiro') {
      return area;
    }

    return null;
  }

  private async buildArea(area: QualidadeAreaId): Promise<QualidadeArea> {
    const items = area === 'albergue'
      ? await this.buildAlbergueItems()
      : area === 'creche'
        ? await this.buildCrecheItems()
        : await this.buildFinanceiroItems();

    return {
      id: area,
      label: AREA_LABELS[area].label,
      description: AREA_LABELS[area].description,
      items,
      summary: this.summarizeArea(items),
    };
  }

  private async buildAlbergueItems(): Promise<QualidadeItem[]> {
    const [cadastro, estadias, presencas] = await Promise.all([
      this.countWithSamples(`
        WITH pendencias AS (
          SELECT DISTINCT
            p.id,
            p.nome,
            CONCAT_WS(', ',
              CASE WHEN p.nis IS NULL OR btrim(p.nis) = '' THEN 'NIS' END,
              CASE WHEN p.data_nascimento IS NULL THEN 'nascimento' END,
              CASE WHEN COALESCE(NULLIF(btrim(p.contato_emergencia), ''), NULLIF(btrim(p.telefone_emergencia), '')) IS NULL THEN 'contato de emergência' END,
              CASE WHEN COALESCE(NULLIF(btrim(p.endereco), ''), NULLIF(btrim(p.cidade), '')) IS NULL THEN 'endereço' END
            ) AS detalhes
          FROM pessoas p
          JOIN estadias e ON e.pessoa_id = p.id AND e.status = 'ativa'
          WHERE p.ativo = true
            AND (
              p.nis IS NULL OR btrim(p.nis) = ''
              OR p.data_nascimento IS NULL
              OR COALESCE(NULLIF(btrim(p.contato_emergencia), ''), NULLIF(btrim(p.telefone_emergencia), '')) IS NULL
              OR COALESCE(NULLIF(btrim(p.endereco), ''), NULLIF(btrim(p.cidade), '')) IS NULL
            )
        )
        SELECT
          (SELECT COUNT(*)::int FROM pendencias) AS total,
          COALESCE(
            json_agg(
              json_build_object('id', id, 'label', nome, 'detail', detalhes, 'path', '/albergue/pessoa/' || id)
              ORDER BY nome
            ) FILTER (WHERE id IS NOT NULL),
            '[]'::json
          ) AS samples
        FROM (SELECT * FROM pendencias ORDER BY nome LIMIT 5) s
      `),
      this.countWithSamples(`
        WITH pendencias AS (
          SELECT e.id, p.nome, to_char(e.data_limite, 'DD/MM/YYYY') AS detalhes
          FROM estadias e
          JOIN pessoas p ON p.id = e.pessoa_id
          WHERE e.status = 'ativa'
            AND e.data_limite < CURRENT_DATE
        )
        SELECT
          (SELECT COUNT(*)::int FROM pendencias) AS total,
          COALESCE(
            json_agg(
              json_build_object('id', id, 'label', nome, 'detail', 'Limite em ' || detalhes, 'path', '/albergue/buscar')
              ORDER BY detalhes
            ) FILTER (WHERE id IS NOT NULL),
            '[]'::json
          ) AS samples
        FROM (SELECT * FROM pendencias ORDER BY detalhes LIMIT 5) s
      `),
      this.countWithSamples(`
        WITH pendencias AS (
          SELECT DISTINCT p.id, p.nome
          FROM pessoas p
          JOIN estadias e ON e.pessoa_id = p.id AND e.status = 'ativa'
          WHERE p.ativo = true
            AND p.presente = false
        )
        SELECT
          (SELECT COUNT(*)::int FROM pendencias) AS total,
          COALESCE(
            json_agg(
              json_build_object('id', id, 'label', nome, 'detail', 'Presença ainda pendente', 'path', '/albergue/presencas')
              ORDER BY nome
            ) FILTER (WHERE id IS NOT NULL),
            '[]'::json
          ) AS samples
        FROM (SELECT * FROM pendencias ORDER BY nome LIMIT 5) s
      `),
    ]);

    return [
      this.makeItem('albergue-cadastros-incompletos', 'albergue', 'Cadastros ativos incompletos', 'Pessoas em estadia ativa com NIS, nascimento, endereço ou contato de emergência pendente.', 'critico', cadastro.total, '/albergue/buscar', 'Revisar cadastros', cadastro.samples),
      this.makeItem('albergue-estadias-vencidas', 'albergue', 'Estadias vencidas', 'Estadias ativas com data limite ultrapassada precisam de decisão operacional.', 'critico', estadias.total, '/albergue/buscar', 'Conferir estadias', estadias.samples),
      this.makeItem('albergue-presencas-pendentes', 'albergue', 'Presenças pendentes', 'Pessoas com estadia ativa ainda sem presença marcada no plantão.', 'atencao', presencas.total, '/albergue/presencas', 'Abrir presença', presencas.samples),
    ];
  }

  private async buildCrecheItems(): Promise<QualidadeItem[]> {
    const [cadastro, turmas, frequencia] = await Promise.all([
      this.countWithSamples(`
        WITH pendencias AS (
          SELECT
            c.id,
            c.nome,
            CONCAT_WS(', ',
              CASE WHEN c.nis IS NULL OR btrim(c.nis) = '' THEN 'NIS' END,
              CASE WHEN c.data_nascimento IS NULL THEN 'nascimento' END,
              CASE WHEN c.turma_id IS NULL THEN 'turma' END,
              CASE WHEN r.id IS NULL THEN 'responsável principal' END
            ) AS detalhes,
            c.codigo
          FROM creche_criancas c
          LEFT JOIN creche_responsaveis r ON r.crianca_id = c.id AND r.responsavel_principal = true
          WHERE c.status = 'ativa'
            AND (
              c.nis IS NULL OR btrim(c.nis) = ''
              OR c.data_nascimento IS NULL
              OR c.turma_id IS NULL
              OR r.id IS NULL
            )
        )
        SELECT
          (SELECT COUNT(*)::int FROM pendencias) AS total,
          COALESCE(
            json_agg(
              json_build_object('id', id, 'label', nome, 'detail', detalhes, 'path', '/creche/criancas/' || codigo)
              ORDER BY nome
            ) FILTER (WHERE id IS NOT NULL),
            '[]'::json
          ) AS samples
        FROM (SELECT * FROM pendencias ORDER BY nome LIMIT 5) s
      `),
      this.countWithSamples(`
        WITH pendencias AS (
          SELECT id, nome
          FROM creche_turmas
          WHERE ativa = true
            AND professora_responsavel_id IS NULL
        )
        SELECT
          (SELECT COUNT(*)::int FROM pendencias) AS total,
          COALESCE(
            json_agg(
              json_build_object('id', id, 'label', nome, 'detail', 'Sem profissional responsável', 'path', '/creche/turmas')
              ORDER BY nome
            ) FILTER (WHERE id IS NOT NULL),
            '[]'::json
          ) AS samples
        FROM (SELECT * FROM pendencias ORDER BY nome LIMIT 5) s
      `),
      this.countWithSamples(`
        WITH pendencias AS (
          SELECT c.id, c.nome, c.codigo
          FROM creche_criancas c
          LEFT JOIN creche_frequencias f ON f.crianca_id = c.id AND f.data = CURRENT_DATE
          WHERE c.status = 'ativa'
            AND f.id IS NULL
        )
        SELECT
          (SELECT COUNT(*)::int FROM pendencias) AS total,
          COALESCE(
            json_agg(
              json_build_object('id', id, 'label', nome, 'detail', 'Sem frequência lançada hoje', 'path', '/creche/frequencia')
              ORDER BY nome
            ) FILTER (WHERE id IS NOT NULL),
            '[]'::json
          ) AS samples
        FROM (SELECT * FROM pendencias ORDER BY nome LIMIT 5) s
      `),
    ]);

    return [
      this.makeItem('creche-cadastros-incompletos', 'creche', 'Cadastros infantis incompletos', 'Crianças ativas com NIS, nascimento, turma ou responsável principal pendente.', 'critico', cadastro.total, '/creche/criancas', 'Revisar crianças', cadastro.samples),
      this.makeItem('creche-turmas-sem-profissional', 'creche', 'Turmas sem responsável', 'Turmas ativas sem profissional responsável definido.', 'atencao', turmas.total, '/creche/turmas', 'Ajustar turmas', turmas.samples),
      this.makeItem('creche-frequencia-pendente', 'creche', 'Frequência do dia pendente', 'Crianças ativas ainda sem frequência registrada hoje.', 'atencao', frequencia.total, '/creche/frequencia', 'Abrir frequência', frequencia.samples),
    ];
  }

  private async buildFinanceiroItems(): Promise<QualidadeItem[]> {
    const [comandas, retiradas, produtos] = await Promise.all([
      this.countWithSamples(`
        WITH totais AS (
          SELECT c.id, c.codigo, cli.nome AS cliente, c.created_at, COALESCE(SUM(i.total_item), 0) AS total
          FROM comercio_comandas c
          JOIN comercio_clientes cli ON cli.id = c.cliente_id
          LEFT JOIN comercio_comanda_itens i ON i.comanda_id = c.id
          WHERE c.status IN ('aberta', 'aguardando_pagamento')
            AND c.created_at < NOW() - INTERVAL '1 day'
          GROUP BY c.id, c.codigo, cli.nome, c.created_at
          HAVING COALESCE(SUM(i.total_item), 0) > 0
        )
        SELECT
          (SELECT COUNT(*)::int FROM totais) AS total,
          COALESCE(
            json_agg(
              json_build_object('id', id, 'label', codigo || ' · ' || cliente, 'detail', 'Aberta há mais de 24h', 'path', '/lojas/secretaria/fila')
              ORDER BY created_at
            ) FILTER (WHERE id IS NOT NULL),
            '[]'::json
          ) AS samples
        FROM (SELECT * FROM totais ORDER BY created_at LIMIT 5) s
      `),
      this.countWithSamples(`
        WITH pendencias AS (
          SELECT r.id, c.codigo, cli.nome AS cliente, r.notificada_em
          FROM comercio_retiradas r
          JOIN comercio_comandas c ON c.id = r.comanda_id
          JOIN comercio_clientes cli ON cli.id = c.cliente_id
          WHERE r.status = 'aguardando_retirada'
        )
        SELECT
          (SELECT COUNT(*)::int FROM pendencias) AS total,
          COALESCE(
            json_agg(
              json_build_object('id', id, 'label', codigo || ' · ' || cliente, 'detail', 'Retirada liberada e pendente', 'path', '/lojas/secretaria/historico')
              ORDER BY notificada_em
            ) FILTER (WHERE id IS NOT NULL),
            '[]'::json
          ) AS samples
        FROM (SELECT * FROM pendencias ORDER BY notificada_em LIMIT 5) s
      `),
      this.countWithSamples(`
        WITH pendencias AS (
          SELECT p.id, p.nome, l.nome AS loja
          FROM comercio_produtos p
          JOIN comercio_lojas l ON l.id = p.loja_id
          WHERE p.ativo = true
            AND (p.preco IS NULL OR p.preco <= 0 OR p.categoria IS NULL OR btrim(p.categoria) = '')
        )
        SELECT
          (SELECT COUNT(*)::int FROM pendencias) AS total,
          COALESCE(
            json_agg(
              json_build_object('id', id, 'label', nome, 'detail', loja, 'path', '/lojas/secretaria')
              ORDER BY loja, nome
            ) FILTER (WHERE id IS NOT NULL),
            '[]'::json
          ) AS samples
        FROM (SELECT * FROM pendencias ORDER BY loja, nome LIMIT 5) s
      `),
    ]);

    return [
      this.makeItem('financeiro-comandas-antigas', 'financeiro', 'Comandas antigas em aberto', 'Comandas com valor e mais de 24 horas sem fechamento financeiro.', 'critico', comandas.total, '/lojas/secretaria/fila', 'Abrir fila', comandas.samples),
      this.makeItem('financeiro-retiradas-pendentes', 'financeiro', 'Retiradas pendentes', 'Pagamentos liberados que ainda aguardam retirada nas lojas.', 'atencao', retiradas.total, '/lojas/secretaria/historico', 'Ver retiradas', retiradas.samples),
      this.makeItem('financeiro-produtos-sem-preco', 'financeiro', 'Produtos sem preço válido', 'Produtos ativos precisam de categoria e preço maior que zero antes de virar comanda.', 'atencao', produtos.total, '/lojas/secretaria', 'Conferir produtos', produtos.samples),
    ];
  }

  private async countWithSamples(query: string, parameters: unknown[] = []) {
    try {
      const rows = await this.dataSource.query(query, parameters) as QueryRow[];
      const row = rows[0] ?? {};
      return {
        total: asNumber(row.total),
        samples: normalizeSamples(row.samples),
      };
    } catch {
      return { total: 0, samples: [] };
    }
  }

  private makeItem(
    id: string,
    area: QualidadeAreaId,
    title: string,
    description: string,
    severity: QualidadeSeveridade,
    total: number,
    actionPath: string,
    actionLabel: string,
    samples: QualidadeSample[],
  ): QualidadeItem {
    return {
      id,
      area,
      title,
      description,
      severity,
      total,
      status: total > 0 ? 'pendente' : 'ok',
      actionPath,
      actionLabel,
      samples,
    };
  }

  private summarizeArea(items: QualidadeItem[]): QualidadeArea['summary'] {
    const pending = items.filter((item) => item.total > 0);
    const criticos = pending.filter((item) => item.severity === 'critico').length;
    const atencao = pending.filter((item) => item.severity === 'atencao').length;
    const informativos = pending.filter((item) => item.severity === 'informativo').length;

    return {
      total: pending.reduce((sum, item) => sum + item.total, 0),
      criticos,
      atencao,
      informativos,
      status: criticos > 0 ? 'critico' : atencao > 0 ? 'atencao' : 'ok',
    };
  }

  private severityWeight(severity: QualidadeSeveridade) {
    if (severity === 'critico') return 3;
    if (severity === 'atencao') return 2;
    return 1;
  }
}
