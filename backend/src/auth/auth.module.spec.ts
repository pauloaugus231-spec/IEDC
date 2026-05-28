import { resolveJwtSecret } from './auth.module';

describe('resolveJwtSecret', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('exige JWT_SECRET em produção', () => {
    process.env.NODE_ENV = 'production';

    expect(() => resolveJwtSecret()).toThrow('JWT_SECRET precisa ser definido em produção.');
  });

  it('usa JWT_SECRET configurado', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'segredo-longo-para-producao';

    expect(resolveJwtSecret()).toBe('segredo-longo-para-producao');
  });

  it('mantém fallback apenas para desenvolvimento local', () => {
    process.env.NODE_ENV = 'development';

    expect(resolveJwtSecret()).toBe('dev-only-jwt-secret');
  });
});
