import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthUser } from '../../auth/auth.types';
import { UsuarioRole } from '../../entities/usuario.entity';
import { ObservabilityService } from '../observability/observability.service';
import { NotificacaoItem, NotificacaoNivel, NotificacoesResponse } from './notificacoes.types';

type LojaSlug = 'bazar' | 'brecho' | 'feirao';
type QueryRow = Record<string, unknown>;

interface FinanceiroResumo {
  pendente: number;
  retiradasPendentes: number;
  desistencias: number;
}

const ROLE_TO_STORE: Partial<Record<UsuarioRole, LojaSlug>> = {
  [UsuarioRole.LOJA_BAZAR]: 'bazar',
  [UsuarioRole.LOJA_BRECHO]: 'brecho',
  [UsuarioRole.LOJA_FEIRAO]: 'feirao',
};

@Injectable()
export class NotificacoesService {
  private readonly logger = new Logger(NotificacoesService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly observabilityService: ObservabilityService,
  ) {}

  async listar(actor: AuthUser | null): Promise<NotificacoesResponse> {
    const generatedAt = new Date().toISOString();
    const role = actor?.role ?? null;
    const items = await this.resolveItems(actor, generatedAt);
    const visibleItems = actor ? await this.filterDismissedItems(actor, items) : items;

    return {
      generatedAt,
      role,
      scopeLabel: this.getScopeLabel(role),
      unreadCount: visibleItems.filter((item) => item.nivel === 'critico' || item.nivel === 'atencao').length,
      receiptPolicy: this.getReceiptPolicy(role),
      items: visibleItems
        .sort((a, b) => this.weightNivel(b.nivel) - this.weightNivel(a.nivel))
        .slice(0, 12),
    };
  }

  async encerrar(actor: AuthUser, notificationId: string) {
    const id = String(notificationId || '').trim();

    if (!id || id.length > 160) {
      throw new BadRequestException('Aviso inválido para encerramento.');
    }

    await this.dataSource.query(
      `
        INSERT INTO notificacoes_encerradas
          (usuario_id, usuario_login, usuario_role, notification_id, context_key, encerrado_em)
        VALUES
          ($1, $2, $3, $4, CURRENT_DATE::text, NOW())
        ON CONFLICT (usuario_id, notification_id, context_key)
        DO UPDATE SET
          usuario_login = EXCLUDED.usuario_login,
          usuario_role = EXCLUDED.usuario_role,
          encerrado_em = NOW()
      `,
      [actor.uuid, actor.login, actor.role, id],
    );

    return {
      ok: true,
      notificationId: id,
      message: 'Aviso encerrado para hoje.',
    };
  }

  private async resolveItems(actor: AuthUser | null, createdAt: string): Promise<NotificacaoItem[]> {
    const role = actor?.role;

    if (!role) {
      return [];
    }

    if (role === UsuarioRole.SUPORTE) {
      return this.buildSuporteItems(createdAt);
    }

    if (role === UsuarioRole.GESTORA) {
      const [albergue, creche, financeiro] = await Promise.all([
        this.buildAlbergueItems(createdAt, 'executiva'),
        this.buildCrecheItems(createdAt, 'executiva'),
        this.buildFinanceiroItems(createdAt),
      ]);
      return [...albergue, ...creche, ...financeiro];
    }

    if (role === UsuarioRole.EQUIPE_TECNICA) {
      const [albergue, creche, financeiro] = await Promise.all([
        this.buildAlbergueItems(createdAt, 'area'),
        this.buildCrecheItems(createdAt, 'area'),
        this.buildFinanceiroItems(createdAt, { hideValues: true }),
      ]);
      return [...albergue, ...creche, ...financeiro];
    }

    if (role === UsuarioRole.COORDENADOR_ALBERGUE) {
      return this.buildAlbergueItems(createdAt, 'area');
    }

    if (role === UsuarioRole.EDUCADOR_ALBERGUE) {
      return this.buildAlbergueItems(createdAt, 'operacional');
    }

    if (role === UsuarioRole.COORDENADOR_CRECHE) {
      return this.buildCrecheItems(createdAt, 'area');
    }

    if (role === UsuarioRole.EDUCADOR_CRECHE) {
      return this.buildCrecheItems(createdAt, 'operacional');
    }

    if (role === UsuarioRole.FINANCEIRO) {
      return this.buildFinanceiroItems(createdAt);
    }

    const lojaSlug = ROLE_TO_STORE[role];
    if (lojaSlug) {
      return this.buildLojaItems(createdAt, lojaSlug);
    }

    return [];
  }

  private async buildSuporteItems(createdAt: string): Promise<NotificacaoItem[]> {
    const items: NotificacaoItem[] = [];
    const status = await this.safeSystemStatus();
    const auditFailures = await this.countAuditFailures();
    const recurringFailures = await this.countRecurringAuditFailures();

    if (status?.status && status.status !== 'ok') {
      items.push(this.item({
        id: 'suporte-saude-sistema',
        nivel: status.status === 'down' ? 'critico' : 'atencao',
        area: 'suporte',
        tipo: 'tecnica',
        title: 'Saúde do sistema exige conferência',
        description: 'Há dependência técnica, backup ou serviço local fora do estado esperado.',
        href: '/suporte/saude',
        actionLabel: 'Abrir saúde',
        createdAt,
      }));
    }

    if (status?.backup.status && status.backup.status !== 'ok') {
      items.push(this.item({
        id: 'suporte-backup',
        nivel: status.backup.status === 'down' ? 'critico' : 'atencao',
        area: 'suporte',
        tipo: 'tecnica',
        title: 'Backup precisa de validação',
        description: status.backup.message || 'O status do backup não está confirmado.',
        href: '/suporte/saude',
        actionLabel: 'Ver backup',
        createdAt,
      }));
    }

    if (status?.recent.frontendErrors24h || status?.recent.backendErrors24h || status?.recent.slowRequests24h) {
      items.push(this.item({
        id: 'suporte-erros-24h',
        nivel: status.recent.backendErrors24h ? 'critico' : 'atencao',
        area: 'suporte',
        tipo: 'tecnica',
        title: 'Eventos técnicos nas últimas 24h',
        description: `${status.recent.frontendErrors24h} erro(s) de interface, ${status.recent.backendErrors24h} erro(s) de backend e ${status.recent.slowRequests24h} requisição(ões) lenta(s).`,
        href: '/suporte/saude',
        actionLabel: 'Analisar eventos',
        createdAt,
      }));
    }

    if (auditFailures > 0) {
      items.push(this.item({
        id: 'suporte-auditoria-falhas',
        nivel: auditFailures > 3 ? 'critico' : 'atencao',
        area: 'suporte',
        tipo: 'tecnica',
        title: 'Falhas registradas na auditoria',
        description: `${auditFailures} evento(s) falharam nas últimas 24h. Verifique usuário, ação e metadados.`,
        href: '/suporte/auditoria',
        actionLabel: 'Abrir auditoria',
        createdAt,
      }));
    }

    if (recurringFailures > 0) {
      items.push(this.item({
        id: 'suporte-falhas-recorrentes',
        nivel: 'critico',
        area: 'suporte',
        tipo: 'tecnica',
        title: 'Falha recorrente detectada',
        description: `${recurringFailures} combinação(ões) de ação e entidade repetiram falha no período.`,
        href: '/suporte/auditoria',
        actionLabel: 'Investigar padrão',
        createdAt,
      }));
    }

    return items;
  }

  private async buildAlbergueItems(
    createdAt: string,
    audience: 'executiva' | 'area' | 'operacional',
  ): Promise<NotificacaoItem[]> {
    const [vencidas, presencasPendentes, cadastrosIncompletos] = await Promise.all([
      this.count(`
        SELECT COUNT(*)::int AS total
        FROM estadias
        WHERE status = 'ativa'
          AND data_limite::date < CURRENT_DATE
      `),
      this.count(`
        SELECT COUNT(*)::int AS total
        FROM estadias e
        JOIN pessoas p ON p.id = e.pessoa_id
        WHERE e.status = 'ativa'
          AND p.presente = false
      `),
      this.count(`
        SELECT COUNT(*)::int AS total
        FROM pessoas
        WHERE ativo = true
          AND (
            data_nascimento IS NULL
            OR nis IS NULL
            OR btrim(nis) = ''
            OR telefone IS NULL
            OR btrim(telefone) = ''
          )
      `),
    ]);
    const items: NotificacaoItem[] = [];

    if (vencidas > 0) {
      items.push(this.item({
        id: `albergue-permanencias-vencidas-${audience}`,
        nivel: 'critico',
        area: 'albergue',
        tipo: audience === 'operacional' ? 'operacional' : 'area',
        title: 'Permanência vencida',
        description: `${vencidas} estadia(s) ultrapassaram o prazo e precisam de decisão registrada.`,
        href: '/albergue/qualidade-dados',
        actionLabel: 'Regularizar',
        createdAt,
      }));
    }

    if (presencasPendentes > 0) {
      items.push(this.item({
        id: `albergue-presenca-${audience}`,
        nivel: 'atencao',
        area: 'albergue',
        tipo: audience === 'operacional' ? 'recibo' : 'area',
        title: 'Presença a conferir',
        description: `${presencasPendentes} pessoa(s) acolhidas ainda aguardam conferência de presença.`,
        href: '/albergue/presencas',
        actionLabel: 'Conferir presença',
        createdAt,
      }));
    }

    if (audience !== 'executiva' && cadastrosIncompletos > 0) {
      items.push(this.item({
        id: `albergue-cadastro-incompleto-${audience}`,
        nivel: 'info',
        area: 'albergue',
        tipo: audience === 'operacional' ? 'operacional' : 'area',
        title: 'Cadastro para completar',
        description: `${cadastrosIncompletos} cadastro(s) ativo(s) têm dados essenciais pendentes.`,
        href: '/albergue/qualidade-dados',
        actionLabel: 'Revisar base',
        createdAt,
      }));
    }

    return items;
  }

  private async buildCrecheItems(
    createdAt: string,
    audience: 'executiva' | 'area' | 'operacional',
  ): Promise<NotificacaoItem[]> {
    const [semNis, frequenciaPendente, riscoEvasao] = await Promise.all([
      this.count(`
        SELECT COUNT(*)::int AS total
        FROM creche_criancas
        WHERE status = 'ativa'
          AND (nis IS NULL OR btrim(nis) = '')
      `),
      this.count(`
        SELECT COUNT(*)::int AS total
        FROM creche_criancas c
        LEFT JOIN creche_frequencias f ON f.crianca_id = c.id AND f.data = CURRENT_DATE
        WHERE c.status = 'ativa'
          AND f.id IS NULL
      `),
      this.count(`
        SELECT COUNT(*)::int AS total
        FROM (
          SELECT c.id
          FROM creche_criancas c
          JOIN creche_frequencias f ON f.crianca_id = c.id
          WHERE c.status = 'ativa'
            AND f.data >= CURRENT_DATE - INTERVAL '30 days'
            AND f.presente = false
          GROUP BY c.id
          HAVING COUNT(*) >= 3
        ) base
      `),
    ]);
    const items: NotificacaoItem[] = [];

    if (semNis > 0) {
      items.push(this.item({
        id: `creche-nis-${audience}`,
        nivel: 'atencao',
        area: 'creche',
        tipo: audience === 'operacional' ? 'operacional' : 'area',
        title: 'NIS pendente na E.E.I.',
        description: `${semNis} criança(s) ativa(s) precisam de NIS para aferição e prestação de contas.`,
        href: '/creche/qualidade-dados',
        actionLabel: 'Completar dados',
        createdAt,
      }));
    }

    if (frequenciaPendente > 0) {
      items.push(this.item({
        id: `creche-frequencia-${audience}`,
        nivel: 'atencao',
        area: 'creche',
        tipo: audience === 'operacional' ? 'recibo' : 'area',
        title: 'Frequência do dia em aberto',
        description: `${frequenciaPendente} criança(s) ativa(s) ainda não têm registro de frequência hoje.`,
        href: '/creche/frequencia',
        actionLabel: 'Registrar frequência',
        createdAt,
      }));
    }

    if (riscoEvasao > 0) {
      items.push(this.item({
        id: `creche-evasao-${audience}`,
        nivel: 'critico',
        area: 'creche',
        tipo: audience === 'operacional' ? 'operacional' : 'area',
        title: 'Risco de evasão escolar',
        description: `${riscoEvasao} criança(s) acumulam faltas relevantes nos últimos 30 dias.`,
        href: '/creche',
        actionLabel: 'Abrir painel',
        createdAt,
      }));
    }

    return items;
  }

  private async buildFinanceiroItems(
    createdAt: string,
    options: { hideValues?: boolean } = {},
  ): Promise<NotificacaoItem[]> {
    const resumo = await this.getFinanceiroResumo();
    const items: NotificacaoItem[] = [];

    if (resumo.pendente > 0) {
      items.push(this.item({
        id: 'financeiro-saldo-pendente',
        nivel: 'atencao',
        area: 'financeiro',
        tipo: 'financeira',
        title: 'Comandas com saldo pendente',
        description: options.hideValues
          ? 'Há comandas abertas aguardando cobrança ou fechamento financeiro.'
          : `Há R$ ${resumo.pendente.toFixed(2)} em saldo aberto para cobrança ou fechamento.`,
        href: '/lojas/secretaria/fila',
        actionLabel: 'Abrir fila',
        createdAt,
      }));
    }

    if (resumo.retiradasPendentes > 0) {
      items.push(this.item({
        id: 'financeiro-retiradas-pendentes',
        nivel: 'atencao',
        area: 'financeiro',
        tipo: 'financeira',
        title: 'Retiradas aguardando baixa',
        description: `${resumo.retiradasPendentes} retirada(s) precisam de confirmação operacional.`,
        href: '/lojas/secretaria/qualidade-dados',
        actionLabel: 'Ver retiradas',
        createdAt,
      }));
    }

    if (resumo.desistencias > 0) {
      items.push(this.item({
        id: 'financeiro-desistencias',
        nivel: 'info',
        area: 'financeiro',
        tipo: 'financeira',
        title: 'Desistências no mês',
        description: `${resumo.desistencias} comanda(s) foram marcadas como desistência no mês atual.`,
        href: options.hideValues ? '/lojas/secretaria' : '/lojas/secretaria/relatorio-executivo',
        actionLabel: options.hideValues ? 'Abrir painel' : 'Ver relatório',
        createdAt,
      }));
    }

    return items;
  }

  private async buildLojaItems(createdAt: string, lojaSlug: LojaSlug): Promise<NotificacaoItem[]> {
    const [retiradas, produtosAtivos] = await Promise.all([
      this.count(
        `
          SELECT COUNT(*)::int AS total
          FROM comercio_retiradas r
          JOIN comercio_lojas l ON l.id = r.loja_id
          WHERE l.slug = $1
            AND r.status = 'aguardando_retirada'
        `,
        [lojaSlug],
      ),
      this.count(
        `
          SELECT COUNT(*)::int AS total
          FROM comercio_produtos p
          JOIN comercio_lojas l ON l.id = p.loja_id
          WHERE l.slug = $1
            AND p.ativo = true
        `,
        [lojaSlug],
      ),
    ]);
    const lojaNome = this.lojaNome(lojaSlug);
    const items: NotificacaoItem[] = [];

    if (retiradas > 0) {
      items.push(this.item({
        id: `loja-${lojaSlug}-retiradas`,
        nivel: 'atencao',
        area: 'loja',
        tipo: 'operacional',
        title: 'Retirada liberada',
        description: `${retiradas} comanda(s) têm item(ns) do ${lojaNome} aguardando entrega.`,
        href: `/lojas/${lojaSlug}`,
        actionLabel: 'Abrir loja',
        createdAt,
      }));
    }

    if (produtosAtivos === 0) {
      items.push(this.item({
        id: `loja-${lojaSlug}-catalogo`,
        nivel: 'info',
        area: 'loja',
        tipo: 'recibo',
        title: 'Catálogo sem produto ativo',
        description: `O ${lojaNome} precisa ter ao menos um produto ativo para montar comandas.`,
        href: `/lojas/${lojaSlug}/produtos`,
        actionLabel: 'Abrir produtos',
        createdAt,
      }));
    }

    return items;
  }

  private async getFinanceiroResumo(): Promise<FinanceiroResumo> {
    const [row] = await this.rows(`
      WITH totais AS (
        SELECT
          c.id,
          c.status,
          c.updated_at,
          COALESCE(SUM(i.total_item), 0)::numeric(12,2) AS total_itens
        FROM comercio_comandas c
        LEFT JOIN comercio_comanda_itens i ON i.comanda_id = c.id
        GROUP BY c.id
      ),
      pagos AS (
        SELECT comanda_id, SUM(valor)::numeric(12,2) AS total_pago
        FROM comercio_pagamentos
        GROUP BY comanda_id
      ),
      abertas AS (
        SELECT
          COALESCE(SUM(GREATEST(t.total_itens - COALESCE(p.total_pago, 0), 0)), 0)::numeric(12,2) AS pendente
        FROM totais t
        LEFT JOIN pagos p ON p.comanda_id = t.id
        WHERE t.status IN ('aberta', 'aguardando_pagamento')
      ),
      desistencias AS (
        SELECT COUNT(*)::int AS desistencias
        FROM totais
        WHERE status = 'desistencia'
          AND updated_at >= date_trunc('month', CURRENT_DATE)
      ),
      retiradas AS (
        SELECT COUNT(*) FILTER (WHERE status = 'aguardando_retirada')::int AS retiradas_pendentes
        FROM comercio_retiradas
      )
      SELECT
        COALESCE(a.pendente, 0)::float AS pendente,
        COALESCE(r.retiradas_pendentes, 0)::int AS "retiradasPendentes",
        COALESCE(d.desistencias, 0)::int AS desistencias
      FROM abertas a
      CROSS JOIN retiradas r
      CROSS JOIN desistencias d
    `);

    return {
      pendente: this.number(row?.pendente),
      retiradasPendentes: this.number(row?.retiradasPendentes),
      desistencias: this.number(row?.desistencias),
    };
  }

  private async countAuditFailures(): Promise<number> {
    return this.count(`
      SELECT COUNT(*)::int AS total
      FROM auditoria
      WHERE criado_em >= NOW() - INTERVAL '24 hours'
        AND status = 'falha'
    `);
  }

  private async countRecurringAuditFailures(): Promise<number> {
    return this.count(`
      SELECT COUNT(*)::int AS total
      FROM (
        SELECT entidade, acao
        FROM auditoria
        WHERE criado_em >= NOW() - INTERVAL '24 hours'
          AND status = 'falha'
        GROUP BY entidade, acao
        HAVING COUNT(*) > 1
      ) recorrencias
    `);
  }

  private async safeSystemStatus(): Promise<Awaited<ReturnType<ObservabilityService['getSystemStatus']>> | null> {
    try {
      return await this.observabilityService.getSystemStatus();
    } catch (error) {
      this.logger.warn(`Falha ao montar notificações técnicas: ${this.errorMessage(error)}`);
      return null;
    }
  }

  private async count(sql: string, params: unknown[] = []): Promise<number> {
    const [row] = await this.rows(sql, params);
    return this.number(row?.total);
  }

  private async rows(sql: string, params: unknown[] = []): Promise<QueryRow[]> {
    try {
      const result = await this.dataSource.query(sql, params);
      return Array.isArray(result) ? (result as QueryRow[]) : [];
    } catch (error) {
      this.logger.debug(`Consulta de notificação ignorada: ${this.errorMessage(error)}`);
      return [];
    }
  }

  private async filterDismissedItems(actor: AuthUser, items: NotificacaoItem[]) {
    if (!items.length) {
      return items;
    }

    const dismissedIds = await this.getDismissedNotificationIds(actor);
    if (!dismissedIds.size) {
      return items;
    }

    return items.filter((item) => !dismissedIds.has(item.id));
  }

  private async getDismissedNotificationIds(actor: AuthUser): Promise<Set<string>> {
    const rows = await this.rows(
      `
        SELECT notification_id
        FROM notificacoes_encerradas
        WHERE usuario_id = $1
          AND context_key = CURRENT_DATE::text
      `,
      [actor.uuid],
    );

    return new Set(
      rows
        .map((row) => String(row.notification_id || '').trim())
        .filter(Boolean),
    );
  }

  private item(input: NotificacaoItem): NotificacaoItem {
    return input;
  }

  private number(value: unknown): number {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private weightNivel(nivel: NotificacaoNivel): number {
    const weights: Record<NotificacaoNivel, number> = {
      critico: 4,
      atencao: 3,
      info: 2,
      sucesso: 1,
    };
    return weights[nivel];
  }

  private getScopeLabel(role: UsuarioRole | null): string {
    if (role === UsuarioRole.SUPORTE) return 'Console técnico e segurança';
    if (role === UsuarioRole.GESTORA) return 'Governança executiva';
    if (role === UsuarioRole.COORDENADOR_ALBERGUE) return 'Coordenação do Albergue';
    if (role === UsuarioRole.COORDENADOR_CRECHE) return 'Coordenação da E.E.I.';
    if (role === UsuarioRole.EQUIPE_TECNICA) return 'Operação institucional';
    if (role === UsuarioRole.EDUCADOR_ALBERGUE) return 'Rotina do Albergue';
    if (role === UsuarioRole.EDUCADOR_CRECHE) return 'Rotina da E.E.I.';
    if (role === UsuarioRole.FINANCEIRO) return 'Financeiro comercial';
    if (role && ROLE_TO_STORE[role]) return `Operação do ${this.lojaNome(ROLE_TO_STORE[role])}`;
    return 'Avisos institucionais';
  }

  private getReceiptPolicy(role: UsuarioRole | null) {
    if (role === UsuarioRole.SUPORTE) {
      return {
        title: 'Camada técnica',
        description: 'Suporte vê falhas, metadados e saúde do sistema para corrigir risco operacional.',
      };
    }

    if (role === UsuarioRole.GESTORA) {
      return {
        title: 'Camada executiva',
        description: 'Gestão recebe pendências institucionais para decisão, sem console técnico de auditoria.',
      };
    }

    if (role === UsuarioRole.FINANCEIRO) {
      return {
        title: 'Camada financeira',
        description: 'Financeiro acompanha previsto, realizado, pendente, desistências e retiradas.',
      };
    }

    if (role && ROLE_TO_STORE[role]) {
      return {
        title: 'Recibos da loja',
        description: 'A loja recebe apenas avisos de operação, estoque e retirada. Totais financeiros ficam fora deste painel.',
      };
    }

    if (role === UsuarioRole.EDUCADOR_ALBERGUE || role === UsuarioRole.EDUCADOR_CRECHE) {
      return {
        title: 'Recibos de rotina',
        description: 'Educadores recebem confirmação e pendências do próprio serviço, sem console de auditoria.',
      };
    }

    return {
      title: 'Camada da área',
      description: 'Coordenações recebem pendências somente do serviço sob sua responsabilidade.',
    };
  }

  private lojaNome(slug?: LojaSlug) {
    if (slug === 'bazar') return 'Bazar';
    if (slug === 'brecho') return 'Brechó';
    return 'Feirão';
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'erro desconhecido';
  }
}
