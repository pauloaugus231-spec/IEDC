import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { AdicionarItemDto } from './lojas-operacao.dto';

describe('lojas-operacao.dto', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: AdicionarItemDto,
    data: '',
  };

  it('aceita o campo usuario no item da comanda', async () => {
    const payload = {
      lojaSlug: 'bazar',
      descricao: 'Camiseta',
      quantidade: 1,
      valorUnitario: 25,
      usuario: 'Maria Silva',
    };

    await expect(pipe.transform(payload, metadata)).resolves.toMatchObject({
      usuario: 'Maria Silva',
      lojaSlug: 'bazar',
      descricao: 'Camiseta',
    });
  });

  it('aceita o campo lancadoPor no item da comanda', async () => {
    const payload = {
      lojaSlug: 'bazar',
      descricao: 'Calca',
      quantidade: 1,
      valorUnitario: 30,
      lancadoPor: 'Joao Silva',
    };

    await expect(pipe.transform(payload, metadata)).resolves.toMatchObject({
      lancadoPor: 'Joao Silva',
      lojaSlug: 'bazar',
      descricao: 'Calca',
    });
  });

  it('rejeita campos realmente desconhecidos', async () => {
    const payload = {
      lojaSlug: 'bazar',
      descricao: 'Meia',
      quantidade: 1,
      valorUnitario: 10,
      usuario: 'Maria Silva',
      foo: 'bar',
    };

    try {
      await pipe.transform(payload, metadata);
      throw new Error('Esperava rejeicao do ValidationPipe.');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);

      const response = error as { response?: { message?: unknown } };
      expect(JSON.stringify(response.response?.message ?? '')).toContain('foo');
    }
  });
});
