import { resolveCorsOrigin } from './cors-origin';

describe('resolveCorsOrigin', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CORS_ORIGIN;
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('bloqueia CORS amplo em produção quando CORS_ORIGIN não foi definido', () => {
    process.env.NODE_ENV = 'production';

    expect(resolveCorsOrigin()).toBe(false);
  });

  it('libera CORS amplo somente fora de produção quando CORS_ORIGIN não foi definido', () => {
    process.env.NODE_ENV = 'development';

    expect(resolveCorsOrigin()).toBe(true);
  });

  it('normaliza lista explícita de origens permitidas', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGIN = 'https://iedc.org.br, https://sistema.iedc.local ';

    expect(resolveCorsOrigin()).toEqual(['https://iedc.org.br', 'https://sistema.iedc.local']);
  });
});
