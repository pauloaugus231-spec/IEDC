import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CORE_DATABASE_CONNECTION } from '../../config/database.config';
import { Repository } from 'typeorm';
import { AuthUser } from '../../auth/auth.types';
import { Auditoria, AuditoriaStatus } from '../../entities/auditoria.entity';
import { UsuarioRole } from '../../entities/usuario.entity';

export interface RegistrarAuditoriaInput {
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  actor?: AuthUser | null;
  usuarioLogin?: string | null;
  usuarioRole?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  status?: AuditoriaStatus;
  httpStatus?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface ListarAuditoriaOptions {
  page?: number;
  limit?: number;
  entidade?: string;
  usuarioLogin?: string;
  status?: AuditoriaStatus;
  acao?: string;
  actor?: AuthUser | null;
}

type AuditAudience = 'suporte' | 'executiva' | 'albergue' | 'creche' | 'financeiro';

const AUDIT_ENTITIES_BY_AUDIENCE: Record<Exclude<AuditAudience, 'suporte' | 'executiva'>, string[]> = {
  albergue: [
    'pessoas',
    'estadias',
    'bloqueios',
    'camas',
    'triagem',
    'plantoes',
    'escala',
    'regras-escala',
    'relatorios',
    'rma',
    'impacto-social',
    'dashboard',
  ],
  creche: ['creche'],
  financeiro: ['lojas'],
};

const EXECUTIVE_AUDIT_ENTITIES = [
  'auth',
  'usuarios',
  'pessoas',
  'estadias',
  'bloqueios',
  'creche',
  'lojas',
  'relatorios',
  'rma',
  'impacto-social',
  'observabilidade',
];

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(
    @InjectRepository(Auditoria, CORE_DATABASE_CONNECTION)
    private readonly auditoriaRepository: Repository<Auditoria>,
  ) {}

  async registrar(input: RegistrarAuditoriaInput): Promise<void> {
    try {
      const auditoria = this.auditoriaRepository.create({
        acao: this.truncate(input.acao, 140),
        entidade: this.truncate(input.entidade, 80),
        entidadeId: this.truncateNullable(input.entidadeId, 120),
        usuarioId: this.truncateNullable(input.actor?.uuid, 120),
        usuarioLogin: this.truncateNullable(input.actor?.login ?? input.usuarioLogin, 80),
        usuarioRole: this.truncateNullable(input.actor?.role ?? input.usuarioRole, 80),
        ip: this.truncateNullable(input.ip, 45),
        userAgent: this.truncateNullable(input.userAgent, 260),
        status: input.status ?? 'sucesso',
        httpStatus: input.httpStatus ?? null,
        metadata: this.sanitizeMetadata(input.metadata),
      });
      await this.auditoriaRepository.save(auditoria);
    } catch (error) {
      this.logger.warn(`Falha ao registrar auditoria: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    }
  }

  async listar(options: ListarAuditoriaOptions = {}) {
    const page = this.clampInteger(options.page, 1, 1, 500);
    const limit = this.clampInteger(options.limit, 50, 1, 100);
    const audience = this.resolveAudience(options.actor);

    const query = this.auditoriaRepository
      .createQueryBuilder('auditoria')
      .orderBy('auditoria.criadoEm', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    this.applyAudienceScope(query, audience);

    if (options.entidade?.trim()) {
      query.andWhere('auditoria.entidade = :entidade', { entidade: options.entidade.trim() });
    }

    if (options.usuarioLogin?.trim()) {
      query.andWhere('auditoria.usuarioLogin = :usuarioLogin', { usuarioLogin: options.usuarioLogin.trim().toLowerCase() });
    }

    if (options.status?.trim()) {
      query.andWhere('auditoria.status = :status', { status: options.status.trim() });
    }

    if (options.acao?.trim()) {
      query.andWhere('LOWER(auditoria.acao) LIKE :acao', { acao: `%${options.acao.trim().toLowerCase()}%` });
    }

    const [data, total] = await query.getManyAndCount();
    const mappedData = data.map((entry) => this.serializeForAudience(entry, audience));
    const recurringFailures = audience === 'suporte' ? this.resolveRecurringFailures(data) : [];

    return {
      data: mappedData,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        audience,
        recurringFailures,
      },
    };
  }

  private resolveAudience(actor?: AuthUser | null): AuditAudience {
    if (!actor || actor.role === UsuarioRole.SUPORTE) return 'suporte';
    if (actor.role === UsuarioRole.GESTORA) return 'executiva';
    if (actor.role === UsuarioRole.COORDENADOR_ALBERGUE) return 'albergue';
    if (actor.role === UsuarioRole.COORDENADOR_CRECHE) return 'creche';
    if (actor.role === UsuarioRole.FINANCEIRO) return 'financeiro';
    return 'executiva';
  }

  private applyAudienceScope(query: ReturnType<Repository<Auditoria>['createQueryBuilder']>, audience: AuditAudience) {
    if (audience === 'suporte') {
      return;
    }

    if (audience === 'executiva') {
      query.andWhere('auditoria.entidade IN (:...executiveEntities)', {
        executiveEntities: EXECUTIVE_AUDIT_ENTITIES,
      });
      query.andWhere(
        `(
          auditoria.status = 'falha'
          OR COALESCE(auditoria.httpStatus, 200) >= 400
          OR LOWER(auditoria.acao) LIKE 'delete %'
          OR auditoria.entidade IN ('auth', 'usuarios', 'lojas', 'relatorios', 'rma')
          OR LOWER(auditoria.acao) LIKE 'patch %'
          OR LOWER(auditoria.acao) LIKE 'put %'
        )`,
      );
      return;
    }

    query.andWhere('auditoria.entidade IN (:...allowedEntities)', {
      allowedEntities: AUDIT_ENTITIES_BY_AUDIENCE[audience],
    });
  }

  private serializeForAudience(entry: Auditoria, audience: AuditAudience) {
    if (audience === 'suporte') {
      return entry;
    }

    return {
      ...entry,
      ip: null,
      userAgent: null,
      metadata: null,
    };
  }

  private resolveRecurringFailures(entries: Auditoria[]) {
    const counts = new Map<string, { entidade: string; acao: string; total: number }>();

    entries
      .filter((entry) => entry.status === 'falha')
      .forEach((entry) => {
        const key = `${entry.entidade}|${entry.acao}`;
        const current = counts.get(key) ?? { entidade: entry.entidade, acao: entry.acao, total: 0 };
        current.total += 1;
        counts.set(key, current);
      });

    return Array.from(counts.values())
      .filter((item) => item.total > 1)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }

  private sanitizeMetadata(metadata?: Record<string, unknown> | null): Record<string, unknown> | null {
    if (!metadata) {
      return null;
    }

    const blockedKeys = new Set(['password', 'senha', 'token', 'authorization', 'accessToken']);
    return Object.fromEntries(
      Object.entries(metadata)
        .filter(([key]) => !blockedKeys.has(key))
        .map(([key, value]) => [key, this.sanitizeValue(value)]),
    );
  }

  private sanitizeValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.slice(0, 30).map((item) => this.sanitizeValue(item));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .slice(0, 30)
          .map(([key, item]) => [key, this.sanitizeValue(item)]),
      );
    }

    if (typeof value === 'string') {
      return this.truncate(value, 500);
    }

    return value;
  }

  private clampInteger(value: number | undefined, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, Math.trunc(parsed)));
  }

  private truncate(value: string, max: number) {
    return value.length > max ? value.slice(0, max) : value;
  }

  private truncateNullable(value: string | null | undefined, max: number) {
    if (!value) {
      return null;
    }
    return this.truncate(String(value), max);
  }
}
