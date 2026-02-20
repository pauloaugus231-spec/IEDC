import { Type } from 'class-transformer';
import { IsOptional, IsPositive, Max, Min } from 'class-validator';

/**
 * DTO para paginação de resultados
 * Uso: @Query() pagination: PaginationDto
 */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  @Max(100) // Limitar a 100 registros por página (previne sobrecarga)
  limit?: number = 20;

  /**
   * Calcula quantos registros pular
   * @returns número de registros para skip no TypeORM
   */
  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20);
  }

  /**
   * Retorna o limit para usar no TypeORM
   */
  get take(): number {
    return this.limit ?? 20;
  }
}

/**
 * Interface para resultado paginado
 * Contém os dados e metadados de paginação
 */
export interface PaginatedResult<T> {
  /** Dados da página atual */
  data: T[];
  
  /** Total de registros no banco */
  total: number;
  
  /** Página atual */
  page: number;
  
  /** Registros por página */
  limit: number;
  
  /** Total de páginas */
  totalPages: number;
  
  /** Tem próxima página? */
  hasNextPage: boolean;
  
  /** Tem página anterior? */
  hasPreviousPage: boolean;
}

/**
 * Helper para criar resultado paginado
 * @param data - Dados da página
 * @param total - Total de registros
 * @param page - Página atual
 * @param limit - Registros por página
 * @returns Objeto PaginatedResult
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
