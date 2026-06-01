import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { TipoBloqueio } from '../../../entities/bloqueio.entity';

export class CriarBloqueioDto {
  @IsUUID('4', { message: 'Pessoa precisa ser um UUID válido.' })
  pessoa_id!: string;

  @IsEnum(TipoBloqueio)
  tipo!: TipoBloqueio;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  motivo!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  dias_bloqueio?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  criado_por!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string;
}
