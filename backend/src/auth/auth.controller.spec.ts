import 'reflect-metadata';
import { AuthController } from './auth.controller';
import { IS_PUBLIC_KEY } from './public.decorator';

describe('AuthController public routes', () => {
  it('mantém profiles como rota pública', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, AuthController.prototype.profiles)).toBe(true);
  });

  it('mantém login como rota pública', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, AuthController.prototype.login)).toBe(true);
  });
});
