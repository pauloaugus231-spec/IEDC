import { IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateOcorrenciaDto {
  @IsUUID()
  @IsNotEmpty()
  pessoa_id!: string;

  @IsString()
  @IsNotEmpty()
  tipo!: string;

  @IsString()
  @IsNotEmpty()
  descricao!: string;

  @IsString()
  @IsOptional()
  criado_por?: string;
}
