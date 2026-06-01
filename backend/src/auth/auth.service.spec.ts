import { AuthService } from './auth.service';
import { Usuario, UsuarioRole } from '../entities/usuario.entity';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';

describe('AuthService bootstrap users', () => {
  const originalEnv = process.env;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...originalEnv, IEDC_DEFAULT_PASSWORD: 'senha-temporaria-segura' };
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('cria apenas o usuario suporte no primeiro boot', async () => {
    const repository = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation(async (usuarios) => usuarios),
    };
    const service = new AuthService(
      repository as unknown as Repository<Usuario>,
      {} as JwtService,
    );

    await service.onModuleInit();

    expect(repository.save).toHaveBeenCalledTimes(1);
    const usuariosCriados = repository.save.mock.calls[0][0];
    expect(usuariosCriados).toHaveLength(1);
    expect(usuariosCriados[0]).toMatchObject({
      login: 'suporte',
      role: UsuarioRole.SUPORTE,
      ativo: true,
      mustChangePassword: true,
      createdBy: 'system',
      updatedBy: 'system',
    });
  });

  it('nao cria novo suporte quando ele ja existe', async () => {
    const repository = {
      find: jest.fn().mockResolvedValue([{ login: 'suporte' }]),
      save: jest.fn(),
    };
    const service = new AuthService(
      repository as unknown as Repository<Usuario>,
      {} as JwtService,
    );

    await service.onModuleInit();

    expect(repository.save).not.toHaveBeenCalled();
  });
});
