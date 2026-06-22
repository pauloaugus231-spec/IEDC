import { access, readFile } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';
import { Socket } from 'net';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThan, Repository } from 'typeorm';
import { AuthUser } from '../../auth/auth.types';
import { ObservabilityEvent, ObservabilityEventLevel } from '../../entities/observability-event.entity';
import { RegisterFrontendErrorDto } from './dto/register-frontend-error.dto';
import { CORE_DATABASE_CONNECTION } from '../../config/database.config';

type ComponentStatus = 'ok' | 'warning' | 'down' | 'unknown';

interface RegistrarEventoInput {
  tipo: string;
  origem: string;
  nivel?: ObservabilityEventLevel;
  mensagem: string;
  requestId?: string | null;
  actor?: AuthUser | null;
  usuarioLogin?: string | null;
  usuarioRole?: string | null;
  httpStatus?: number | null;
  durationMs?: number | null;
  metadata?: Record<string, unknown> | null;
}

interface ListarEventosOptions {
  page?: number;
  limit?: number;
  tipo?: string;
  origem?: string;
  nivel?: ObservabilityEventLevel | '';
  horas?: number;
}

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);

  constructor(
    @InjectRepository(ObservabilityEvent, CORE_DATABASE_CONNECTION)
    private readonly eventsRepository: Repository<ObservabilityEvent>,
    @InjectDataSource(CORE_DATABASE_CONNECTION)
    private readonly dataSource: DataSource,
  ) {}

  async registrarEvento(input: RegistrarEventoInput): Promise<void> {
    try {
      const event = this.eventsRepository.create({
        tipo: this.truncate(input.tipo, 40),
        origem: this.truncate(input.origem, 40),
        nivel: input.nivel ?? 'info',
        mensagem: this.truncate(input.mensagem, 240),
        requestId: this.truncateNullable(input.requestId, 120),
        usuarioLogin: this.truncateNullable(input.actor?.login ?? input.usuarioLogin, 80),
        usuarioRole: this.truncateNullable(input.actor?.role ?? input.usuarioRole, 80),
        httpStatus: input.httpStatus ?? null,
        durationMs: input.durationMs ?? null,
        metadata: this.sanitizeMetadata(input.metadata),
      });
      await this.eventsRepository.save(event);
    } catch (error) {
      this.logger.warn({
        event: 'observability.persist_failed',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  async registrarFrontendError(
    body: RegisterFrontendErrorDto,
    context: { requestId?: string; ip?: string; userAgent?: string; actor?: AuthUser | null },
  ) {
    await this.registrarEvento({
      tipo: 'frontend_error',
      origem: 'frontend',
      nivel: 'erro',
      mensagem: body.message || 'Erro no frontend',
      requestId: context.requestId,
      actor: context.actor ?? null,
      metadata: {
        source: body.source,
        stack: body.stack,
        componentStack: body.componentStack,
        url: body.url,
        release: body.release,
        ip: context.ip,
        userAgent: context.userAgent,
        extra: body.metadata,
      },
    });
  }

  async listarEventos(options: ListarEventosOptions = {}) {
    const page = this.clampInteger(options.page, 1, 1, 500);
    const limit = this.clampInteger(options.limit, 30, 1, 100);
    const query = this.eventsRepository
      .createQueryBuilder('event')
      .orderBy('event.criadoEm', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (options.tipo?.trim()) {
      query.andWhere('event.tipo = :tipo', { tipo: options.tipo.trim() });
    }

    if (options.origem?.trim()) {
      query.andWhere('event.origem = :origem', { origem: options.origem.trim() });
    }

    if (options.nivel?.trim()) {
      query.andWhere('event.nivel = :nivel', { nivel: options.nivel.trim() });
    }

    if (options.horas) {
      const since = new Date(Date.now() - this.clampInteger(options.horas, 24, 1, 720) * 60 * 60 * 1000);
      query.andWhere('event.criadoEm >= :since', { since });
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSystemStatus() {
    const [database, redis, uploads, backup, recentCounts] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkUploads(),
      this.getBackupStatus(),
      this.getRecentCounts(),
    ]);

    return {
      status: this.resolveOverallStatus([database.status, redis.status, uploads.status, backup.status]),
      checkedAt: new Date().toISOString(),
      service: 'iedc-backend',
      version: process.env.APP_VERSION || 'local',
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.round(process.uptime()),
      memory: this.getMemoryUsage(),
      dependencies: {
        database,
        redis,
        uploads,
      },
      backup,
      recent: recentCounts,
    };
  }

  async getReadinessStatus() {
    const [database, uploads] = await Promise.all([this.checkDatabase(), this.checkUploads()]);
    const status = database.status === 'ok' && uploads.status === 'ok' ? 'ok' : 'down';

    return {
      status,
      checkedAt: new Date().toISOString(),
      dependencies: {
        database,
        uploads,
      },
    };
  }

  async getBackupStatus() {
    const statusPath = this.resolveBackupStatusPath();

    try {
      const raw = await readFile(statusPath, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const status = this.normalizeBackupStatus(parsed.status);
      const finishedAt = this.stringifyNullable(parsed.finishedAt) || this.stringifyNullable(parsed.finished_at);
      const ageHours = finishedAt ? this.calculateAgeHours(finishedAt) : null;
      const staleAfterHours = this.clampInteger(Number(process.env.BACKUP_STALE_AFTER_HOURS), 30, 6, 720);

      return {
        status: status === 'ok' && ageHours !== null && ageHours > staleAfterHours ? 'warning' : status,
        message:
          status === 'ok' && ageHours !== null && ageHours > staleAfterHours
            ? `Último backup concluído há ${Math.round(ageHours)}h.`
            : this.stringifyNullable(parsed.message) || this.defaultBackupMessage(status),
        statusPath,
        startedAt: this.stringifyNullable(parsed.startedAt) || this.stringifyNullable(parsed.started_at),
        finishedAt,
        durationSeconds: this.numberOrNull(parsed.durationSeconds) ?? this.numberOrNull(parsed.duration_seconds),
        backupPath: this.stringifyNullable(parsed.backupPath) || this.stringifyNullable(parsed.backup_path),
        remoteStatus: this.stringifyNullable(parsed.remoteStatus) || this.stringifyNullable(parsed.remote_status),
        databaseBytes: this.numberOrNull(parsed.databaseBytes) ?? this.numberOrNull(parsed.database_bytes),
        uploadsBytes: this.numberOrNull(parsed.uploadsBytes) ?? this.numberOrNull(parsed.uploads_bytes),
        ageHours,
      };
    } catch (error) {
      return {
        status: 'unknown' as ComponentStatus,
        message: error instanceof SyntaxError ? 'Status de backup inválido.' : 'Nenhum status de backup registrado.',
        statusPath,
        startedAt: null,
        finishedAt: null,
        durationSeconds: null,
        backupPath: null,
        remoteStatus: null,
        databaseBytes: null,
        uploadsBytes: null,
        ageHours: null,
      };
    }
  }

  private async checkDatabase() {
    const startedAt = Date.now();

    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'ok' as ComponentStatus,
        latencyMs: Date.now() - startedAt,
        message: 'Banco respondeu ao ping técnico.',
      };
    } catch (error) {
      return {
        status: 'down' as ComponentStatus,
        latencyMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : 'Banco indisponível.',
      };
    }
  }

  private async checkRedis() {
    const host = process.env.REDIS_HOST;
    const port = Number(process.env.REDIS_PORT || 6379);

    if (!host) {
      return {
        status: 'unknown' as ComponentStatus,
        latencyMs: null,
        message: 'Redis não configurado para este ambiente.',
      };
    }

    const startedAt = Date.now();

    return new Promise<{ status: ComponentStatus; latencyMs: number; message: string }>((resolve) => {
      const socket = new Socket();
      let resolved = false;

      const finish = (status: ComponentStatus, message: string) => {
        if (resolved) {
          return;
        }

        resolved = true;
        socket.destroy();
        resolve({ status, latencyMs: Date.now() - startedAt, message });
      };

      socket.setTimeout(700);
      socket.once('connect', () => finish('ok', 'Redis aceitou conexão TCP.'));
      socket.once('timeout', () => finish('down', 'Redis não respondeu dentro do limite.'));
      socket.once('error', (error) => finish('down', error.message));
      socket.connect(Number.isFinite(port) ? port : 6379, host);
    });
  }

  private async checkUploads() {
    const uploadsPath = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');

    try {
      await access(uploadsPath, constants.R_OK | constants.W_OK);
      return {
        status: 'ok' as ComponentStatus,
        path: uploadsPath,
        message: 'Diretório de uploads acessível para leitura e escrita.',
      };
    } catch (error) {
      return {
        status: 'down' as ComponentStatus,
        path: uploadsPath,
        message: error instanceof Error ? error.message : 'Uploads indisponíveis.',
      };
    }
  }

  private async getRecentCounts() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [events24h, frontendErrors24h, backendErrors24h, slowRequests24h] = await Promise.all([
      this.eventsRepository.count({ where: { criadoEm: MoreThan(since) } }),
      this.eventsRepository.count({ where: { tipo: 'frontend_error', criadoEm: MoreThan(since) } }),
      this.eventsRepository.count({ where: { tipo: 'backend_error', criadoEm: MoreThan(since) } }),
      this.eventsRepository.count({ where: { tipo: 'slow_request', criadoEm: MoreThan(since) } }),
    ]);

    return {
      events24h,
      frontendErrors24h,
      backendErrors24h,
      slowRequests24h,
    };
  }

  private getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rssMb: Math.round(usage.rss / 1024 / 1024),
      heapUsedMb: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(usage.heapTotal / 1024 / 1024),
    };
  }

  private resolveOverallStatus(statuses: ComponentStatus[]) {
    if (statuses.includes('down')) {
      return 'down';
    }

    if (statuses.includes('warning') || statuses.includes('unknown')) {
      return 'warning';
    }

    return 'ok';
  }

  private resolveBackupStatusPath() {
    return process.env.BACKUP_STATUS_PATH || join(process.env.BACKUP_ROOT || '/var/backups/iedc', 'backup-status.json');
  }

  private normalizeBackupStatus(value: unknown): ComponentStatus {
    if (value === 'success' || value === 'ok') return 'ok';
    if (value === 'running') return 'warning';
    if (value === 'failed' || value === 'error' || value === 'erro') return 'down';
    return 'unknown';
  }

  private defaultBackupMessage(status: ComponentStatus) {
    if (status === 'ok') return 'Último backup concluído.';
    if (status === 'down') return 'Último backup falhou.';
    if (status === 'warning') return 'Backup em execução ou exigindo conferência.';
    return 'Status de backup desconhecido.';
  }

  private calculateAgeHours(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return Math.max(0, (Date.now() - date.getTime()) / 3_600_000);
  }

  private sanitizeMetadata(metadata?: Record<string, unknown> | null): Record<string, unknown> | null {
    if (!metadata) {
      return null;
    }

    const blockedKeys = /(password|senha|token|secret|authorization|cookie|api[_-]?key)/i;
    return Object.fromEntries(
      Object.entries(metadata)
        .slice(0, 40)
        .map(([key, value]) => [key, blockedKeys.test(key) ? '[REDACTED]' : this.sanitizeValue(value)]),
    );
  }

  private sanitizeValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.slice(0, 20).map((item) => this.sanitizeValue(item));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .slice(0, 20)
          .map(([key, item]) => [key, /(password|senha|token|secret|authorization|cookie)/i.test(key) ? '[REDACTED]' : this.sanitizeValue(item)]),
      );
    }

    if (typeof value === 'string') {
      return this.truncate(value, 1000);
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

  private stringifyNullable(value: unknown) {
    return typeof value === 'string' && value.trim() ? value : null;
  }

  private numberOrNull(value: unknown) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
}
