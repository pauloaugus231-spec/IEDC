import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { StatusSolicitacao, TipoSolicitacao } from '../../../entities/solicitacao.entity';

export class SolicitacaoDto {
  @IsUUID('4')
  pessoa_id!: string;

  @IsEnum(TipoSolicitacao)
  tipo!: TipoSolicitacao;

  @IsOptional()
  @IsEnum(StatusSolicitacao)
  status?: StatusSolicitacao;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  titulo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  justificativa!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  solicitado_por!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  analisado_por?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  data_analise?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  parecer?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  dias_prorrogacao?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nova_data_limite?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  data_inicio_bloqueio?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  data_fim_bloqueio?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  motivo_bloqueio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoes?: string;
}

export class UpdateSolicitacaoDto extends PartialType(SolicitacaoDto) {}
