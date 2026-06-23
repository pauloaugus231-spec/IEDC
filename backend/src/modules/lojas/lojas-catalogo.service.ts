import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { MASTER_DATABASE_CONNECTION } from '../../config/database.config';
import { ProdutoDto } from './dto/lojas-operacao.dto';
import { LojasEventsService } from './lojas-events.service';
import { LojasSchemaService } from './lojas-schema.service';
import { asMoney, LojaComercial } from './lojas-shared';

interface ProdutoRow {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  ativo: boolean;
  lojaId?: string;
  lojaSlug?: string;
  loja?: string;
}

@Injectable()
export class LojasCatalogoService {
  constructor(
    @InjectDataSource(MASTER_DATABASE_CONNECTION) private readonly dataSource: DataSource,
    private readonly schema: LojasSchemaService,
    private readonly events: LojasEventsService,
  ) {}

  async getLojas() {
    await this.schema.ensureEstrutura();

    return this.dataSource.query(
      `
        SELECT id, slug, nome, ativa
        FROM comercial.lojas
        WHERE ativa = true
        ORDER BY CASE slug WHEN 'bazar' THEN 1 WHEN 'brecho' THEN 2 WHEN 'feirao' THEN 3 ELSE 99 END
      `,
    );
  }

  async getProdutos(lojaSlug?: string) {
    await this.schema.ensureEstrutura();

    const params: unknown[] = [];
    const where = ['p.ativo = true'];

    if (lojaSlug) {
      params.push(lojaSlug);
      where.push(`l.slug = $${params.length}`);
    }

    return this.dataSource.query(
      `
        SELECT
          p.id,
          p.nome,
          p.categoria,
          p.preco::float AS preco,
          p.ativo,
          l.id AS "lojaId",
          l.slug AS "lojaSlug",
          l.nome AS loja
        FROM comercial.produtos p
        JOIN comercial.lojas l ON l.id = p.loja_id
        WHERE ${where.join(' AND ')}
        ORDER BY l.nome, p.categoria, p.nome
      `,
      params,
    );
  }

  async createProduto(body: ProdutoDto) {
    await this.schema.ensureEstrutura();

    if (!body?.nome?.trim()) {
      throw new BadRequestException('Nome do produto é obrigatório.');
    }

    const loja = await this.resolveLoja(body.lojaSlug, body.lojaId);
    const preco = asMoney(body.preco);

    if (preco <= 0) {
      throw new BadRequestException('Preço do produto deve ser maior que zero.');
    }

    const result = await this.dataSource.query(
      `
        INSERT INTO comercial.produtos (
          id, loja_id, nome, categoria, preco, ativo, created_at, updated_at
        )
        VALUES ($1, $2::uuid, $3, $4, $5, true, NOW(), NOW())
        RETURNING id, nome, categoria, preco::float AS preco, ativo
      `,
      [
        randomUUID(),
        loja.id,
        body.nome.trim(),
        body.categoria?.trim() || 'Diversos',
        preco,
      ],
    );
    const produto = Array.isArray(result?.[0]) ? result[0][0] : result?.[0] as ProdutoRow;

    const response = {
      ...produto,
      lojaId: loja.id,
      lojaSlug: loja.slug,
      loja: loja.nome,
    };

    this.events.emitLojas('produto_criado', { produtoId: response.id, loja: loja.slug, nome: response.nome });

    return response;
  }

  async updateProduto(id: string, body: ProdutoDto) {
    await this.schema.ensureEstrutura();

    if (!body?.nome?.trim()) {
      throw new BadRequestException('Nome do produto é obrigatório.');
    }

    const preco = asMoney(body.preco);

    if (preco <= 0) {
      throw new BadRequestException('Preço do produto deve ser maior que zero.');
    }

    const result = await this.dataSource.query(
      `
        UPDATE comercial.produtos p
        SET nome = $2,
            categoria = $3,
            preco = $4,
            ativo = COALESCE($5::boolean, p.ativo),
            updated_at = NOW()
        FROM comercial.lojas l
        WHERE p.id = $1::uuid
          AND l.id = p.loja_id
          AND ($6::varchar IS NULL OR l.slug = $6::varchar)
        RETURNING
          p.id,
          p.nome,
          p.categoria,
          p.preco::float AS preco,
          p.ativo,
          l.id AS "lojaId",
          l.slug AS "lojaSlug",
          l.nome AS loja
      `,
      [
        id,
        body.nome.trim(),
        body.categoria?.trim() || 'Diversos',
        preco,
        typeof body.ativo === 'boolean' ? body.ativo : null,
        body.lojaSlugPermitido || null,
      ],
    );
    const produto = Array.isArray(result?.[0]) ? result[0][0] : result?.[0] as ProdutoRow | undefined;

    if (!produto) {
      throw new NotFoundException('Produto não encontrado ou fora do escopo da loja.');
    }

    this.events.emitLojas('produto_atualizado', { produtoId: produto.id, loja: produto.lojaSlug, nome: produto.nome });

    return produto;
  }

  async resolveLoja(lojaSlug?: string, lojaId?: string): Promise<LojaComercial> {
    const params: string[] = [];
    let where = '';

    if (lojaId) {
      params.push(lojaId);
      where = 'id = $1::uuid';
    } else if (lojaSlug) {
      params.push(lojaSlug);
      where = 'slug = $1';
    } else {
      throw new BadRequestException('Loja é obrigatória.');
    }

    const [loja] = await this.dataSource.query(
      `
        SELECT id, slug, nome
        FROM comercial.lojas
        WHERE ${where} AND ativa = true
      `,
      params,
    ) as LojaComercial[];

    if (!loja) {
      throw new BadRequestException('Loja não encontrada.');
    }

    return loja;
  }
}
