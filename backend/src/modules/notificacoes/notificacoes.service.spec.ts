import { DataSource } from 'typeorm';
import { AuthUser } from '../../auth/auth.types';
import { UsuarioRole, UsuarioServiceScope } from '../../entities/usuario.entity';
import { ObservabilityService } from '../observability/observability.service';
import { NotificacoesService } from './notificacoes.service';

function user(role: UsuarioRole): AuthUser {
  return {
    id: role,
    uuid: role,
    login: role,
    name: role,
    displayName: role,
    role,
    roleLabel: role,
    service: UsuarioServiceScope.GESTAO,
    serviceLabel: 'Teste',
    homePath: '/',
    mustChangePassword: false,
  };
}

describe('NotificacoesService', () => {
  const systemStatus = {
    status: 'warning',
    checkedAt: new Date().toISOString(),
    service: 'iedc-backend',
    version: 'test',
    environment: 'test',
    uptimeSeconds: 1,
    memory: { rssMb: 1, heapUsedMb: 1, heapTotalMb: 1 },
    dependencies: {
      database: { status: 'ok', latencyMs: 1, message: 'ok' },
      redis: { status: 'unknown', latencyMs: null, message: 'não configurado' },
      uploads: { status: 'ok', path: '/tmp', message: 'ok' },
    },
    backup: {
      status: 'warning',
      message: 'Status de backup pendente.',
      statusPath: '/tmp/backup-status.json',
      startedAt: null,
      finishedAt: null,
      durationSeconds: null,
      backupPath: null,
      remoteStatus: null,
      databaseBytes: null,
      uploadsBytes: null,
      ageHours: null,
    },
    recent: {
      events24h: 5,
      frontendErrors24h: 1,
      backendErrors24h: 0,
      slowRequests24h: 2,
    },
  } as Awaited<ReturnType<ObservabilityService['getSystemStatus']>>;

  function serviceWithQuery(query: jest.Mock) {
    return new NotificacoesService(
      { query } as unknown as DataSource,
      { getSystemStatus: jest.fn().mockResolvedValue(systemStatus) } as unknown as ObservabilityService,
    );
  }

  it('não expõe totalizadores financeiros para perfil de loja', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('comercio_retiradas')) return [{ total: 2 }];
      if (sql.includes('comercio_produtos')) return [{ total: 0 }];
      return [{ total: 0 }];
    });
    const service = serviceWithQuery(query);

    const response = await service.listar(user(UsuarioRole.LOJA_BAZAR));
    const serialized = JSON.stringify(response);

    expect(response.scopeLabel).toBe('Operação do Bazar');
    expect(serialized).not.toContain('R$');
    expect(serialized).not.toContain('/relatorio');
    expect(response.receiptPolicy.description).toContain('Totais financeiros ficam fora');
  });

  it('mantém educadores fora de console de auditoria', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('JOIN pessoas')) return [{ total: 3 }];
      return [{ total: 0 }];
    });
    const service = serviceWithQuery(query);

    const response = await service.listar(user(UsuarioRole.EDUCADOR_ALBERGUE));
    const serialized = JSON.stringify(response);

    expect(response.items.length).toBeGreaterThan(0);
    expect(serialized).not.toContain('/auditoria');
    expect(response.receiptPolicy.title).toBe('Recibos de rotina');
  });

  it('entrega alertas técnicos para suporte', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('GROUP BY entidade, acao')) return [{ total: 1 }];
      if (sql.includes("status = 'falha'")) return [{ total: 4 }];
      return [{ total: 0 }];
    });
    const service = serviceWithQuery(query);

    const response = await service.listar(user(UsuarioRole.SUPORTE));

    expect(response.scopeLabel).toBe('Console técnico e segurança');
    expect(response.items.some((item) => item.href === '/suporte/auditoria')).toBe(true);
    expect(response.items.some((item) => item.href === '/suporte/saude')).toBe(true);
  });

  it('oculta aviso encerrado no dia para o usuário', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('notificacoes_encerradas')) return [{ notification_id: 'albergue-presenca-operacional' }];
      if (sql.includes('JOIN pessoas')) return [{ total: 3 }];
      return [{ total: 0 }];
    });
    const service = serviceWithQuery(query);

    const response = await service.listar(user(UsuarioRole.EDUCADOR_ALBERGUE));

    expect(response.items.some((item) => item.id === 'albergue-presenca-operacional')).toBe(false);
    expect(response.unreadCount).toBe(0);
  });
});
